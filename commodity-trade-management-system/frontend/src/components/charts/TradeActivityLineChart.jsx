import React from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import EmptyState from '../EmptyState'
import { formatCurrency, formatInteger } from '../../utils/format'

const VALUE_COLOR = '#2563eb'
const COUNT_COLOR = '#b45309'

/**
 * Trade activity over time.
 *
 * data: [{ period, label, tradeCount, buyValue, sellValue, totalValue }]
 * metric: 'value' | 'count'
 */
export function TradeActivityLineChart({ data = [], metric = 'value', height = 280 }) {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No activity in this period"
        message="Trade activity appears once trades exist in the selected time window."
      />
    )
  }

  const isValue = metric === 'value'
  const dataKey = isValue ? 'totalValue' : 'tradeCount'
  const formatter = isValue ? formatCurrency : formatInteger

  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={isValue ? 78 : 40}
            tickFormatter={(value) =>
              isValue
                ? `$${Number(value).toLocaleString('en-US', { notation: 'compact' })}`
                : Number(value).toLocaleString('en-US')
            }
          />
          <Tooltip
            formatter={(value) => [formatter(value), isValue ? 'Total value' : 'Trades']}
            contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey={dataKey}
            name={isValue ? 'Total value' : 'Trade count'}
            stroke={isValue ? VALUE_COLOR : COUNT_COLOR}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TradeActivityLineChart
