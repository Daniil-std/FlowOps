import { Banknote, Boxes, ReceiptText, ShoppingBag } from 'lucide-react';
import type { Analytics } from '../types';
import { money, number } from '../format';

export function Stats({
  analytics,
  currency,
}: {
  analytics?: Analytics;
  currency?: string | null;
}) {
  const cards = [
    {
      label: `Total revenue${analytics ? ` · ${currency ?? 'unspecified'}` : ''}`,
      value: analytics ? money(analytics.revenue) : '—',
      icon: Banknote,
      note: 'Quantity × unit price',
    },
    {
      label: 'Total orders',
      value: analytics ? number(analytics.orders) : '—',
      icon: ShoppingBag,
      note: 'Unique order IDs',
    },
    {
      label: `Average order value${analytics ? ` · ${currency ?? 'unspecified'}` : ''}`,
      value: analytics ? money(analytics.average_order_value) : '—',
      icon: ReceiptText,
      note: 'Revenue per unique order',
    },
    {
      label: 'Units sold',
      value: analytics ? number(analytics.units) : '—',
      icon: Boxes,
      note: 'Across all valid order lines',
    },
  ];
  return (
    <div className="stats-grid">
      {cards.map(({ label, value, icon: Icon, note }) => (
        <section className="card stat-card" key={label}>
          <div className="stat-label">
            <h2>{label}</h2>
            <Icon size={18} strokeWidth={1.6} />
          </div>
          <p className={`stat-value ${analytics ? '' : 'empty-value'}`}>{value}</p>
          <p className="stat-note">{analytics ? note : 'Waiting for your first import'}</p>
        </section>
      ))}
    </div>
  );
}
