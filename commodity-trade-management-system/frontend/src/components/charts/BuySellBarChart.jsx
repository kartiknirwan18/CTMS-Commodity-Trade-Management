import React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import EmptyState from '../EmptyState'
import { formatCurrency, formatInteger } from '../../utils/format'

const BUY_COLOR = '#15803d'
const SELL_COLOR = '#b91c1c'

/**
 * Grouped Buy vs Sell bar chart.
 *
 * data: [{ label, buyCount, sellCount, buyValue, sellValue }]
 * metric: 'count' | 'value'
 */
export function BuySellBarChart({ data = [], metric = 'count', height = 280 }) {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No trade activity yet"
        message="Buy vs Sell comparison appears once trades have been recorded."
      />
    )
  }

  const buyKey = metric === 'value' ? 'buyValue' : 'buyCount'
  const sellKey = metric === 'value' ? 'sellValue' : 'sellCount'
  const formatter = metric === 'value' ? formatCurrency : formatInteger

  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={metric === 'value' ? 78 : 44}
            tickFormatter={(value) =>
              metric === 'value'
                ? `$${Number(value).toLocaleString('en-US', { notation: 'compact' })}`
                : Number(value).toLocaleString('en-US')
            }
          />
          <Tooltip
            formatter={(value, name) => [formatter(value), name]}
            contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey={buyKey}
            name="Buy"
            fill={BUY_COLOR}
            radius={[3, 3, 0, 0]}
            maxBarSize={34}
          />
          <Bar
            dataKey={sellKey}
            name="Sell"
            fill={SELL_COLOR}
            radius={[3, 3, 0, 0]}
            maxBarSize={34}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default BuySellBarChart
