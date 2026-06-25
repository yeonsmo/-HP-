// 수압시험 BEP 관리 - Tauri 데스크톱 백엔드 (Rust)
//
// 기존 Node 서버의 데이터 계층을 Rust 로 옮긴 것. 동작은 동일하다.
//  - NAS 의 SQLite 파일에만 읽고 쓴다(외부 네트워크 없음).
//  - 단일 프로세스가 파일을 소유하므로 동시 쓰기 충돌이 없다.
//  - 네트워크 공유(NAS) 안전: WAL 미사용(journal_mode=DELETE), synchronous=FULL.
//  - 데이터는 months/variable_records/meta 세 테이블에 JSON 블롭으로 저장.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::Connection;
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

struct Db(Mutex<Connection>);

/// exe 와 같은 폴더의 .env 에서 DB_PATH 를 읽는다(포터블).
/// 지정이 없으면 exe 옆 data/bep.db 를 사용한다.
fn resolve_db_path() -> PathBuf {
    let base = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    if let Ok(text) = fs::read_to_string(base.join(".env")) {
        for line in text.lines() {
            let line = line.trim();
            if line.starts_with('#') {
                continue;
            }
            if let Some(rest) = line.strip_prefix("DB_PATH") {
                if let Some(val) = rest.trim_start().strip_prefix('=') {
                    let mut v = val.trim().to_string();
                    if (v.starts_with('"') && v.ends_with('"'))
                        || (v.starts_with('\'') && v.ends_with('\''))
                    {
                        v = v[1..v.len() - 1].to_string();
                    }
                    if !v.is_empty() {
                        return PathBuf::from(v);
                    }
                }
            }
        }
    }
    base.join("data").join("bep.db")
}

fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.pragma_update(None, "journal_mode", "DELETE").ok();
    conn.pragma_update(None, "synchronous", "FULL").ok();
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS months (month TEXT PRIMARY KEY, data TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS variable_records (id TEXT PRIMARY KEY, data TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);",
    )
    .map_err(|e| format!("테이블 생성 실패: {e}"))
}

fn open_db(path: &PathBuf) -> Result<Connection, String> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("DB 폴더 생성 실패: {e}"))?;
    }
    let conn = Connection::open(path).map_err(|e| format!("DB 열기 실패: {e}"))?;
    init_schema(&conn)?;
    Ok(conn)
}

/// "YYYY-MM" 형식 검증 (월 01~12)
fn is_month_key(v: Option<&str>) -> bool {
    match v {
        Some(s) => {
            let b = s.as_bytes();
            s.len() == 7
                && b[4] == b'-'
                && b[..4].iter().all(u8::is_ascii_digit)
                && b[5..].iter().all(u8::is_ascii_digit)
                && {
                    let mm: u32 = s[5..].parse().unwrap_or(0);
                    (1..=12).contains(&mm)
                }
        }
        None => false,
    }
}

fn read_all(conn: &Connection, sql: &str) -> Result<Vec<Value>, String> {
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows {
        let s = row.map_err(|e| e.to_string())?;
        out.push(serde_json::from_str(&s).map_err(|e| e.to_string())?);
    }
    Ok(out)
}

// ----- 핵심 데이터 로직 (테스트 대상; 커맨드는 이 함수들을 감싼다) -----

fn state_json(conn: &Connection) -> Result<Value, String> {
    let months = read_all(conn, "SELECT data FROM months ORDER BY month")?;
    let variable_records = read_all(conn, "SELECT data FROM variable_records")?;
    let last_month: Option<String> = conn
        .query_row(
            "SELECT value FROM meta WHERE key='lastSelectedMonth'",
            [],
            |r| r.get(0),
        )
        .ok();
    Ok(json!({
        "months": months,
        "variableRecords": variable_records,
        "lastMonth": last_month,
    }))
}

fn upsert_month(conn: &Connection, data: &Value) -> Result<(), String> {
    let month = data.get("month").and_then(Value::as_str);
    if !is_month_key(month) {
        return Err("월(YYYY-MM) 형식이 올바르지 않습니다.".into());
    }
    let text = serde_json::to_string(data).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO months(month, data) VALUES(?1, ?2) ON CONFLICT(month) DO UPDATE SET data=?2",
        rusqlite::params![month.unwrap(), text],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn upsert_variable(conn: &Connection, data: &Value) -> Result<(), String> {
    let id = data.get("id").and_then(Value::as_str);
    let month = data.get("month").and_then(Value::as_str);
    if id.is_none() || !is_month_key(month) {
        return Err("변동비 기록의 id/월(YYYY-MM)이 올바르지 않습니다.".into());
    }
    let text = serde_json::to_string(data).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO variable_records(id, data) VALUES(?1, ?2) ON CONFLICT(id) DO UPDATE SET data=?2",
        rusqlite::params![id.unwrap(), text],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn set_last_month_row(conn: &Connection, month: &str) -> Result<(), String> {
    if !is_month_key(Some(month)) {
        return Err("월(YYYY-MM) 형식이 올바르지 않습니다.".into());
    }
    conn.execute(
        "INSERT INTO meta(key, value) VALUES('lastSelectedMonth', ?1) \
         ON CONFLICT(key) DO UPDATE SET value=?1",
        rusqlite::params![month],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn restore_all(conn: &mut Connection, months: &[Value], records: &[Value]) -> Result<(), String> {
    // 기존 데이터를 지우기 전에 전체를 먼저 검증한다(잘못되면 데이터를 건드리지 않음).
    for m in months {
        if !is_month_key(m.get("month").and_then(Value::as_str)) {
            return Err("월(YYYY-MM) 키가 올바르지 않은 항목이 있습니다.".into());
        }
    }
    for r in records {
        if r.get("id").and_then(Value::as_str).is_none()
            || !is_month_key(r.get("month").and_then(Value::as_str))
        {
            return Err("변동비 기록의 형식/월(YYYY-MM)이 올바르지 않은 항목이 있습니다.".into());
        }
    }
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM months", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM variable_records", [])
        .map_err(|e| e.to_string())?;
    for m in months {
        let month = m.get("month").and_then(Value::as_str).unwrap();
        let text = serde_json::to_string(m).map_err(|e| e.to_string())?;
        tx.execute(
            "INSERT INTO months(month, data) VALUES(?1, ?2)",
            rusqlite::params![month, text],
        )
        .map_err(|e| e.to_string())?;
    }
    for r in records {
        let id = r.get("id").and_then(Value::as_str).unwrap();
        let text = serde_json::to_string(r).map_err(|e| e.to_string())?;
        tx.execute(
            "INSERT INTO variable_records(id, data) VALUES(?1, ?2)",
            rusqlite::params![id, text],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

// ----- Tauri 커맨드 (프런트엔드 invoke 대상) -----

#[tauri::command]
fn get_state(db: State<Db>) -> Result<Value, String> {
    let conn = db.0.lock().map_err(|_| "DB 잠금 실패".to_string())?;
    state_json(&conn)
}

#[tauri::command]
fn put_month(db: State<Db>, data: Value) -> Result<(), String> {
    let conn = db.0.lock().map_err(|_| "DB 잠금 실패".to_string())?;
    upsert_month(&conn, &data)
}

#[tauri::command]
fn delete_month(db: State<Db>, month: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|_| "DB 잠금 실패".to_string())?;
    conn.execute("DELETE FROM months WHERE month=?1", rusqlite::params![month])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn put_variable(db: State<Db>, data: Value) -> Result<(), String> {
    let conn = db.0.lock().map_err(|_| "DB 잠금 실패".to_string())?;
    upsert_variable(&conn, &data)
}

#[tauri::command]
fn delete_variable(db: State<Db>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|_| "DB 잠금 실패".to_string())?;
    conn.execute(
        "DELETE FROM variable_records WHERE id=?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_last_month(db: State<Db>, month: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|_| "DB 잠금 실패".to_string())?;
    set_last_month_row(&conn, &month)
}

#[tauri::command]
fn restore(db: State<Db>, months: Value, variable_records: Value) -> Result<(), String> {
    let months = months.as_array().ok_or("백업 구조가 올바르지 않습니다.")?.clone();
    let records = variable_records
        .as_array()
        .ok_or("백업 구조가 올바르지 않습니다.")?
        .clone();
    let mut conn = db.0.lock().map_err(|_| "DB 잠금 실패".to_string())?;
    restore_all(&mut conn, &months, &records)
}

fn main() {
    let path = resolve_db_path();
    let conn = open_db(&path).unwrap_or_else(|e| {
        // 파일을 못 열어도 앱은 띄운다(메모리 DB). 사용자는 빈 화면 + 저장 실패로 인지.
        eprintln!("[오류] {e} (경로: {})", path.display());
        let c = Connection::open_in_memory().expect("메모리 DB 생성 실패");
        init_schema(&c).expect("스키마 생성 실패");
        c
    });
    tauri::Builder::default()
        .manage(Db(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            get_state,
            put_month,
            delete_month,
            put_variable,
            delete_variable,
            set_last_month,
            restore
        ])
        .run(tauri::generate_context!())
        .expect("Tauri 앱 실행 오류");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mem() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        init_schema(&c).unwrap();
        c
    }

    #[test]
    fn month_key_validation() {
        assert!(is_month_key(Some("2026-06")));
        assert!(is_month_key(Some("2026-12")));
        assert!(!is_month_key(Some("2026-13")));
        assert!(!is_month_key(Some("2026-00")));
        assert!(!is_month_key(Some("2026-6")));
        assert!(!is_month_key(Some("")));
        assert!(!is_month_key(None));
    }

    #[test]
    fn upsert_and_read_back() {
        let conn = mem();
        upsert_month(&conn, &json!({"month":"2026-06","employees":[],"v":1})).unwrap();
        // 같은 월 다시 저장 → 갱신(중복 아님)
        upsert_month(&conn, &json!({"month":"2026-06","employees":[],"v":2})).unwrap();
        upsert_variable(&conn, &json!({"id":"a1","month":"2026-06","amount":100})).unwrap();
        set_last_month_row(&conn, "2026-06").unwrap();

        let s = state_json(&conn).unwrap();
        assert_eq!(s["months"].as_array().unwrap().len(), 1);
        assert_eq!(s["months"][0]["v"], 2); // 갱신 확인
        assert_eq!(s["variableRecords"].as_array().unwrap().len(), 1);
        assert_eq!(s["variableRecords"][0]["amount"], 100);
        assert_eq!(s["lastMonth"], "2026-06");
    }

    #[test]
    fn rejects_invalid_month() {
        let conn = mem();
        assert!(upsert_month(&conn, &json!({"month":"2026-6"})).is_err());
        assert!(upsert_variable(&conn, &json!({"id":"x","month":""})).is_err());
        assert!(upsert_variable(&conn, &json!({"month":"2026-06"})).is_err()); // id 없음
    }

    #[test]
    fn restore_replaces_all() {
        let conn_box = &mut mem();
        upsert_month(conn_box, &json!({"month":"2026-01","x":1})).unwrap();
        upsert_variable(conn_box, &json!({"id":"old","month":"2026-01","amount":9})).unwrap();

        let months = vec![json!({"month":"2026-07","x":7})];
        let recs = vec![json!({"id":"new","month":"2026-07","amount":77})];
        restore_all(conn_box, &months, &recs).unwrap();

        let s = state_json(conn_box).unwrap();
        assert_eq!(s["months"].as_array().unwrap().len(), 1);
        assert_eq!(s["months"][0]["month"], "2026-07");
        assert_eq!(s["variableRecords"].as_array().unwrap().len(), 1);
        assert_eq!(s["variableRecords"][0]["id"], "new");
    }

    #[test]
    fn invalid_restore_preserves_data() {
        let conn_box = &mut mem();
        upsert_month(conn_box, &json!({"month":"2026-01","x":1})).unwrap();

        // 잘못된 항목이 섞인 복원 → 거부되고 기존 데이터 보존
        let bad_months = vec![json!({"month":"bad"})];
        assert!(restore_all(conn_box, &bad_months, &[]).is_err());

        let s = state_json(conn_box).unwrap();
        assert_eq!(s["months"].as_array().unwrap().len(), 1);
        assert_eq!(s["months"][0]["month"], "2026-01"); // 그대로 남음
    }
}
