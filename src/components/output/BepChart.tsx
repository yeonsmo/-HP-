import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BepChartPoint } from '../../types/calc';
import { formatKRW, formatNumber } from '../../lib/format/number';

interface Props {
  title: string;
  data: BepChartPoint[];
  price: number;
  bepEa: number;
  actualEa: number;
  valid: boolean;
  invalidReason?: string;
}

/**
 * BEP 그래프: 매출선과 총비용선의 교차로 BEP 를 표시.
 * 인쇄 안정성을 위해 고정 높이 컨테이너를 사용한다.
 */
export function BepChart({ title, data, price, bepEa, actualEa, valid, invalidReason }: Props) {
  return (
    <div className="chart-block">
      <h4 className="chart-title">{title}</h4>
      {!valid ? (
        <div className="chart-invalid">{invalidReason ?? '손익분기 도달 불가 (공헌이익 ≤ 0)'}</div>
      ) : (
        <div className="chart-area">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 10, right: 20, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ea" />
              <XAxis
                dataKey="ea"
                type="number"
                tickFormatter={(v) => formatNumber(Math.round(v))}
                domain={[0, 'dataMax']}
                label={{ value: 'EA(물량)', position: 'insideBottom', offset: -12 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickFormatter={(v) => formatNumber(Math.round(v / 1000)) + 'k'}
                tick={{ fontSize: 11 }}
                width={56}
              />
              <Tooltip
                formatter={(v: number, name) => [`${formatKRW(v)} 원`, name]}
                labelFormatter={(v) => `EA ${formatNumber(Math.round(Number(v)))}`}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="매출"
                stroke="#1f6feb"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="totalCost"
                name="총비용"
                stroke="#e3552f"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
              {bepEa > 0 && (
                <ReferenceDot
                  x={bepEa}
                  y={price * bepEa}
                  r={5}
                  fill="#16a34a"
                  stroke="#fff"
                  label={{ value: 'BEP', position: 'top', fontSize: 11, fill: '#16a34a' }}
                />
              )}
              {actualEa > 0 && (
                <ReferenceLine
                  x={actualEa}
                  stroke="#7c3aed"
                  strokeDasharray="4 4"
                  label={{ value: '현재실적', position: 'top', fontSize: 11, fill: '#7c3aed' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
