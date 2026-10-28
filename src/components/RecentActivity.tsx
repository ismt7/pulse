import { today } from "../model";
import { format } from "../format";
import type { Metric } from "../types";
import { Icon, metricIcons } from "./Icon";

export function RecentActivity({ metrics }: { metrics: Metric[] }) {
  const history = metrics
    .flatMap((metric) => metric.entries.map((entry) => ({ ...entry, metric })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  return (
    <section className="activity panel">
      <div className="section-header">
        <h2>最近の記録</h2>
        <span className="muted">最近入力した実績</span>
      </div>
      {history.length ? (
        history.map((entry, i) => (
          <div
            className="activity-row"
            key={`${entry.metric.id}-${entry.date}-${i}`}
          >
            <span className={`activity-icon color-${entry.metric.color}`}>
              <Icon name={metricIcons[entry.metric.color]} />
            </span>
            <strong>{entry.metric.name}</strong>
            <span>
              {entry.metric.recordingMode === "increment" ? "+" : ""}
              {format(entry.value)} <small>{entry.metric.unit}</small>
            </span>
            <time dateTime={entry.date}>
              {entry.date === today()
                ? "今日"
                : entry.date.replaceAll("-", "/")}
            </time>
          </div>
        ))
      ) : (
        <p className="activity-empty">最初の記録を楽しみにしています。</p>
      )}
    </section>
  );
}
