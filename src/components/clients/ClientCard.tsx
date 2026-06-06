import { useAppData } from '../../context/AppDataContext';
import { itemRevenue } from '../../lib/calc';
import { newId } from '../../lib/id';
import { formatKRW, formatNumber } from '../../lib/format/number';
import type { Client, Item } from '../../types/domain';
import { NumberInput } from '../common/NumberInput';

interface Props {
  client: Client;
}

/** 거래처 카드: 품목 단가·누계 EA 입력. 지침 2.6 */
export function ClientCard({ client }: Props) {
  const { updateMonthData } = useAppData();

  const patchClient = (patch: Partial<Client>) =>
    updateMonthData((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => (c.id === client.id ? { ...c, ...patch } : c)),
    }));

  const patchItem = (itemId: string, patch: Partial<Item>) =>
    patchClient({
      items: client.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    });

  const addItem = () =>
    patchClient({
      items: [...client.items, { id: newId(), name: '', unitPrice: 0, cumulativeEa: 0 }],
    });

  const removeItem = (itemId: string) =>
    patchClient({ items: client.items.filter((it) => it.id !== itemId) });

  const removeClient = () =>
    updateMonthData((prev) => ({
      ...prev,
      clients: prev.clients.filter((c) => c.id !== client.id),
    }));

  const clientRevenue = client.items.reduce((s, it) => s + itemRevenue(it), 0);
  const clientEa = client.items.reduce((s, it) => s + it.cumulativeEa, 0);

  return (
    <div className="client-card">
      <div className="row between wrap client-head">
        <input
          type="text"
          className="text-input client-name"
          value={client.name}
          placeholder="거래처명"
          onChange={(e) => patchClient({ name: e.target.value })}
        />
        <div className="row gap">
          <span className="chip">매출 {formatKRW(clientRevenue)} 원</span>
          <span className="chip">EA {formatNumber(clientEa)}</span>
          <button type="button" className="ghost no-print" onClick={removeClient}>
            거래처 삭제
          </button>
        </div>
      </div>

      <table className="grid narrow">
        <thead>
          <tr>
            <th>품목</th>
            <th>EA당 단가(공급가)</th>
            <th>당월 누계 EA</th>
            <th>품목 매출</th>
            <th className="no-print"></th>
          </tr>
        </thead>
        <tbody>
          {client.items.map((it) => (
            <tr key={it.id}>
              <td>
                <input
                  type="text"
                  className="text-input"
                  value={it.name}
                  placeholder="예: 소구경"
                  onChange={(e) => patchItem(it.id, { name: e.target.value })}
                />
              </td>
              <td>
                <NumberInput
                  value={it.unitPrice}
                  suffix="원"
                  onChange={(v) => patchItem(it.id, { unitPrice: v })}
                />
              </td>
              <td>
                <NumberInput
                  value={it.cumulativeEa}
                  suffix="EA"
                  onChange={(v) => patchItem(it.id, { cumulativeEa: v })}
                />
              </td>
              <td>{formatKRW(itemRevenue(it))} 원</td>
              <td className="no-print">
                <button type="button" className="ghost" onClick={() => removeItem(it.id)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="no-print small-btn" onClick={addItem}>
        + 품목 추가
      </button>
    </div>
  );
}
