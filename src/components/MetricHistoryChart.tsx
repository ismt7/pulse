import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "../format";
import { latest } from "../model";
import type { Metric } from "../types";

export function MetricHistoryChart({ metric }: { metric: Metric }) {
  const data = [...metric.entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ ...entry, total: latest(metric, entry.date) }));
  return (
    <div
      className="trend-chart"
      role="img"
      aria-label={`${metric.name}の全${data.length}件の記録日の累計実績グラフ`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart
          data={data}
          margin={{ top: 12, right: 15, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            stroke="#e9ede8"
            strokeDasharray="4 5"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => String(date).replaceAll("-", "/")}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis
            tickFormatter={format}
            tick={{ fontSize: 10 }}
            width={65}
            axisLine={false}
            tickLine={false}
            domain={
              metric.direction === "decrease" ? ["auto", "auto"] : [0, "auto"]
            }
          />
          <Tooltip
            labelFormatter={(date) => String(date).replaceAll("-", "/")}
            formatter={(value) => [
              `${format(Number(value))} ${metric.unit}`,
              "累計実績",
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Line
            dataKey="total"
            type="linear"
            stroke="#387960"
            strokeWidth={2}
            dot={data.length <= 30 ? { r: 3 } : false}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
