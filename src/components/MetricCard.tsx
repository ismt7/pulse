import { days, latest, periodLabel, periodStatus, progress } from "../model";
import { format } from "../format";
import type { Metric } from "../types";
import { Icon, metricIcons } from "./Icon";

interface Props {
  metric: Metric;
  onEdit: (metric: Metric) => void;
  onRecord: (metric: Metric) => void;
  onDetails: (metric: Metric) => void;
}

export function MetricCard({ metric, onEdit, onRecord, onDetails }: Props) {
  const percent = Math.round(progress(metric));
  const complete = progress(metric) >= 100;
  const status = periodStatus(metric);
  const points = days(7)
    .map((date, i) => `${i * 20},${34 - progress(metric, date) * 0.3}`)
    .join(" ");
  return (
    <article className={`metric-card color-${metric.color}`}>
      <div className="card-top">
        <span className="metric-icon">
          <Icon name={metricIcons[metric.color]} />
        </span>
        <span className={`badge ${complete ? "complete" : ""}`}>
          {complete ? (
            <>
              <Icon name="check" /> 目標達成
            </>
          ) : status === "future" ? (
            "開始前"
          ) : status === "ended" ? (
            "期間終了"
          ) : (
            "進行中"
          )}
        </span>
        <button
          className="icon-button edit"
          onClick={() => onEdit(metric)}
          aria-label={`${metric.name}を編集`}
        >
          <Icon name="edit" />
        </button>
      </div>
      <h3>{metric.name}</h3>
      <span className="mode-label">
        {metric.direction === "decrease"
          ? "数値を減らす"
          : metric.recordingMode === "increment"
            ? "日ごとの増分"
            : "累計値・現在値"}
      </span>
      {metric.periodType !== "all" && (
        <span className="period-label">{periodLabel(metric)}</span>
      )}
      <div className="metric-value">
        {format(latest(metric))}
        <span>{metric.unit}</span>
      </div>
      <div className="target">
        {metric.direction === "decrease" && (
          <>開始 {format(metric.baseline ?? 0)} → </>
        )}
        目標 {format(metric.target)} {metric.unit}
        <svg className="sparkline" viewBox="0 0 120 36" aria-hidden="true">
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="progress-meta">
        <span>達成率</span>
        <strong>{percent}%</strong>
      </div>
      <div
        className="progress-bar"
        role="progressbar"
        aria-label={`${metric.name}の達成率`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <i style={{ width: `${percent}%` }} />
      </div>
      <button
        className="record-button"
        disabled={status === "future"}
        onClick={() => onRecord(metric)}
      >
        <Icon name="plus" />{" "}
        {status === "future" ? "期間開始後に記録" : "実績を記録"}
      </button>
      <button
        className="details-button"
        onClick={() => onDetails(metric)}
        aria-label={`${metric.name}の詳細を見る`}
      >
        履歴と詳細を見る <Icon name="arrow" />
      </button>
    </article>
  );
}
