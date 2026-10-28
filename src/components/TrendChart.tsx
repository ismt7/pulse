import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { average, days } from "../model";
import { chartTheme } from "../theme";
import type { ChartRange, Metric } from "../types";

export function TrendChart({
  metrics,
  range,
}: {
  metrics: Metric[];
  range: ChartRange;
}) {
  const data = days(range).map((date) => ({
    date,
    value: average(metrics, date),
  }));
  return (
    <div
      className="trend-chart"
      role="img"
      aria-label={`直近${range}日間の平均達成率。今日 ${average(metrics)}パーセント`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 8, left: -15, bottom: 0 }}
        >
          <defs>
            <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor={chartTheme.primaryArea} stopOpacity={0.23} />
              <stop offset="1" stopColor={chartTheme.primaryArea} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={chartTheme.grid}
            strokeDasharray="4 5"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(date) =>
              `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`
            }
            tick={{ fill: chartTheme.axis, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fill: chartTheme.axis, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, "平均達成率"]}
            labelFormatter={(date) => String(date).replaceAll("-", "/")}
            contentStyle={{
              border: `1px solid ${chartTheme.border}`,
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            type="linear"
            dataKey="value"
            stroke={chartTheme.primary}
            strokeWidth={3}
            fill="url(#trend-area)"
            dot={
              range === 7
                ? { r: 3, fill: chartTheme.primary, stroke: chartTheme.surface, strokeWidth: 2 }
                : false
            }
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
