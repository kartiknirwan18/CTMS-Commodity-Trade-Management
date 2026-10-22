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

const BUY_COLOR = '#2563eb'
const SELL_COLOR = '#0e7490'

/**
 * Trade volume grouped by commodity.
 *
 * data: [{ commodityName, unitOfMeasurement, buyQuantity, sellQuantity, totalQuantity, totalValue }]
 */
export function VolumeByCommodityChart({ data = [], height = 300 }) {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No volume to display"
        message="Volume by commodity appears once trades exist for at least one commodity."
      />
    )
  }

  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            tickFormatter={(value) =>
              Number(value).toLocaleString('en-US', { notation: 'compact' })
            }
          />
          <YAxis
            type="category"
            dataKey="commodityName"
            width={130}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value, name) => [formatInteger(value), name]}
            contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="buyQuantity" name="Buy quantity" stackId="v" fill={BUY_COLOR} maxBarSize={22} />
          <Bar
            dataKey="sellQuantity"
            name="Sell quantity"
            stackId="v"
            fill={SELL_COLOR}
            radius={[0, 3, 3, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Small side panel listing the exact commodity totals (mirrors the chart data).
 */
export function VolumeTotalsList({ data = [] }) {
  if (!data.length) return null
  return (
    <div className="section__body section__body--flush">
      <div className="table-wrap">
        <table className="data-table" style={{ minWidth: 380 }}>
          <thead>
            <tr>
              <th scope="col">Commodity</th>
              <th scope="col" className="num">
                Trades
              </th>
              <th scope="col" className="num">
                Volume
              </th>
              <th scope="col" className="num">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.commodityId}>
                <td>{row.commodityName}</td>
                <td className="num">{formatInteger(row.tradeCount)}</td>
                <td className="num">
                  {formatInteger(row.totalQuantity)}{' '}
                  <span className="text-subtle text-xs">{row.unitOfMeasurement}</span>
                </td>
                <td className="num">{formatCurrency(row.totalValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default VolumeByCommodityChart
