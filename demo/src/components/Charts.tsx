import { BarChart3, CalendarDays, ChartNoAxesCombined } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { money, number, shortDate } from '../format';
import type { Analytics } from '../types';

export function Charts({
  analytics,
  currency,
}: {
  analytics?: Analytics;
  currency?: string | null;
}) {
  const points =
    analytics?.revenue_over_time.map((point) => ({
      ...point,
      exactRevenue: point.revenue,
      revenue: Number(point.revenue),
    })) ?? [];
  const products = analytics?.top_products ?? [];
  const maxUnits = Math.max(...products.map((product) => product.quantity), 1);
  return (
    <div className="charts-grid">
      <section className="card revenue-card">
        <div className="card-heading">
          <div>
            <h2>Revenue over time</h2>
            <p>Daily sales from validated order lines{currency ? ` · ${currency}` : ''}</p>
          </div>
          <span className="chart-period">
            <CalendarDays size={14} />
            {points.length
              ? `${shortDate(points[0].date)} – ${shortDate(points[points.length - 1].date)}`
              : 'No data yet'}
          </span>
        </div>
        {points.length ? (
          <>
            <div
              className="chart-container"
              role="img"
              aria-label={`Revenue over ${points.length} sales days. Total ${money(analytics!.revenue, currency)}.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={points}
                  margin={{ top: 14, right: 18, bottom: 0, left: 0 }}
                  accessibilityLayer
                >
                  <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e8eceb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#77827f' }}
                    minTickGap={35}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#77827f' }}
                    width={76}
                    tickFormatter={(value) =>
                      Intl.NumberFormat('en', { notation: 'compact' }).format(value as number) +
                      (currency ? ` ${currency}` : '')
                    }
                  />
                  <Tooltip
                    formatter={(_value, _name, item) => [
                      money(item.payload.exactRevenue, currency),
                      'Revenue',
                    ]}
                    labelFormatter={(label) => shortDate(String(label))}
                    contentStyle={{
                      border: '1px solid #e2e8e5',
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: '0 4px 16px #1232220a',
                    }}
                  />
                  <Line
                    dataKey="revenue"
                    type="linear"
                    stroke="#218575"
                    strokeWidth={2.5}
                    dot={points.length === 1 ? { r: 4 } : false}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <details className="chart-data">
              <summary>View daily revenue table</summary>
              <div
                className="table-scroll"
                role="region"
                aria-label="Daily revenue table"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Revenue {currency}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point) => (
                      <tr key={point.date}>
                        <td>{point.date}</td>
                        <td>{money(point.exactRevenue, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <div className="chart-empty">
            <div className="empty-chart-lines" />
            <span className="empty-icon">
              <ChartNoAxesCombined size={23} />
            </span>
            <h3>A clearer view of your sales</h3>
            <p>Import a spreadsheet to see your revenue over time.</p>
          </div>
        )}
      </section>
      <section className="card products-card">
        <div className="card-heading">
          <div>
            <h2>Best-selling products</h2>
            <p>Top 5 products by units sold</p>
          </div>
          <BarChart3 size={19} className="muted" />
        </div>
        {products.length ? (
          <ol className="products-list">
            {products.map((product, index) => (
              <li key={product.product}>
                <span className="product-rank">{String(index + 1).padStart(2, '0')}</span>
                <div className="product-stat">
                  <div>
                    <strong title={product.product}>{product.product}</strong>
                    <span>{number(product.quantity)} units</span>
                  </div>
                  <div className="product-track">
                    <div style={{ width: `${(product.quantity / maxUnits) * 100}%` }} />
                  </div>
                  <small>{money(product.revenue, currency)} revenue</small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="chart-empty product-empty">
            <span className="empty-icon">
              <BarChart3 size={23} />
            </span>
            <h3>Meet your best sellers</h3>
            <p>
              Your top products will appear here
              <br />
              once you import your first file.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
