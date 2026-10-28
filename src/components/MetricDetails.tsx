import { lazy, Suspense, useState } from "react";
import { latest, periodLabel, periodStatus, progress, record } from "../model";
import { format } from "../format";
import type { Metric } from "../types";
import { Modal } from "./Modal";
import { Icon } from "./Icon";

const HistoryChart = lazy(() =>
  import("./MetricHistoryChart").then((module) => ({
    default: module.MetricHistoryChart,
  })),
);
const PAGE_SIZE = 10;
interface Props {
  metric: Metric;
  onClose: () => void;
  onRecord: () => void;
  onUpdate: (updated: Metric, message: string) => void;
  onDuplicate: (metric: Metric) => void;
}

export function MetricDetails({
  metric,
  onClose,
  onRecord,
  onUpdate,
  onDuplicate,
}: Props) {
  const incremental = metric.recordingMode === "increment";
  const statusForPeriod = periodStatus(metric);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [actionError, setActionError] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const entries = [...metric.entries].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const lastPage = Math.max(0, Math.ceil(entries.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = entries.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  function remove(date: string) {
    if (!confirm(`${date} の記録を削除しますか？この操作は取り消せません。`))
      return;
    setActionError("");
    try {
      onUpdate(
        {
          ...metric,
          entries: metric.entries.filter((entry) => entry.date !== date),
        },
        "記録を削除しました。",
      );
      if (editingDate === date) setEditingDate(null);
      setStatus("記録を削除しました。");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "保存できませんでした。",
      );
    }
  }

  return (
    <Modal
      className="metric-details"
      onClose={onClose}
      onSubmit={() => {
        if (!editingDate) return;
        onUpdate(record(metric, editingDate, value), "記録を更新しました。");
        setStatus("記録を更新しました。");
        setEditingDate(null);
      }}
    >
      <span className="eyebrow">YOUR PROGRESS, ONE STEP AT A TIME.</span>
      <h2 id="modal-title">{metric.name}</h2>
      <p className="modal-description">
        実績の履歴と、これまでの積み重ね。
        <span className="mode-label">
          {metric.direction === "decrease"
            ? "数値を減らす"
            : incremental
              ? "日ごとの増分"
              : "累計値・現在値"}
        </span>
      </p>
      {metric.periodType !== "all" && (
        <p className="period-detail">対象期間: {periodLabel(metric)}</p>
      )}
      <div className="detail-summary">
        <div>
          <small>現在の累計実績</small>
          <strong>
            {format(latest(metric))} <small>{metric.unit}</small>
          </strong>
        </div>
        <div>
          <small>目標</small>
          <strong>
            {format(metric.target)} <small>{metric.unit}</small>
          </strong>
        </div>
        <div>
          <small>達成率</small>
          <strong>{Math.round(progress(metric))}%</strong>
        </div>
      </div>
      {metric.direction === "decrease" && (
        <p className="form-hint">
          開始値 {format(metric.baseline ?? 0)} {metric.unit}
          から、目標値までの減少量を達成率として計算します。
        </p>
      )}
      {entries.length ? (
        <>
          <h3 className="detail-section-title">実績の推移</h3>
          <Suspense
            fallback={<div className="chart-empty">グラフを読み込み中…</div>}
          >
            <HistoryChart metric={metric} />
          </Suspense>
          <p className="form-hint">
            グラフは記録日の累計値を表示します。記録間の日数にかかわらず、各記録を等間隔に並べています。
          </p>
        </>
      ) : (
        <p className="chart-empty">
          まだ記録がありません。最初の一歩を残しましょう。
        </p>
      )}
      <div className="section-header">
        <h3 className="detail-section-title">
          すべての記録 <span>（{entries.length}件）</span>
        </h3>
        <button
          type="button"
          className="primary"
          disabled={statusForPeriod === "future"}
          onClick={onRecord}
        >
          <Icon name="plus" />{" "}
          {statusForPeriod === "future" ? "期間開始後に記録" : "実績を記録"}
        </button>
      </div>
      <button
        type="button"
        className="details-button duplicate-button"
        onClick={() => onDuplicate(metric)}
      >
        {metric.periodType && metric.periodType !== "all"
          ? "次の期間へ複製"
          : "この目標を複製"}{" "}
        <Icon name="arrow" />
      </button>
      {!!entries.length && (
        <div className="history-table-wrap">
          <table className="history-table">
            <caption className="sr-only">
              {metric.name}の累計実績。新しい日付順。
            </caption>
            <thead>
              <tr>
                <th scope="col">記録日</th>
                <th scope="col">{incremental ? "その日の実績" : "累計実績"}</th>
                {incremental && <th scope="col">累計</th>}
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry) => (
                <tr key={entry.date}>
                  <td>
                    <time dateTime={entry.date}>
                      {entry.date.replaceAll("-", "/")}
                    </time>
                  </td>
                  <td>
                    {format(entry.value)} {metric.unit}
                  </td>
                  {incremental && (
                    <td>
                      {format(latest(metric, entry.date))} {metric.unit}
                    </td>
                  )}
                  <td>
                    <div className="history-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDate(entry.date);
                          setValue(String(entry.value));
                          setActionError("");
                        }}
                        aria-label={`${entry.date}の記録を修正`}
                      >
                        修正
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => remove(entry.date)}
                        aria-label={`${entry.date}の記録を削除`}
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lastPage > 0 && (
        <nav className="history-pagination" aria-label="記録のページ切り替え">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            前へ
          </button>
          <span>
            {currentPage + 1} / {lastPage + 1}ページ
          </span>
          <button
            type="button"
            disabled={currentPage === lastPage}
            onClick={() => setPage(currentPage + 1)}
          >
            次へ
          </button>
        </nav>
      )}
      {editingDate && (
        <section className="history-editor" aria-label="記録の修正">
          <h3>{editingDate.replaceAll("-", "/")} の記録を修正</h3>
          <label>
            修正後の{incremental ? "その日の実績" : "累計実績"}（
            {metric.unit || "数値"}）
            <input
              type="number"
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              min="0"
              max="1000000000000"
              step="any"
              required
            />
          </label>
          <p className="form-hint">
            {incremental
              ? "変更した日の増分を含めて、現在とそれ以降の累計を自動で再計算します。"
              : "最新の日付の記録が現在の実績です。古い記録の変更は、その後の累計値には加算されません。"}
          </p>
          <div className="modal-actions">
            <button
              type="button"
              className="record-button import-cancel"
              onClick={() => setEditingDate(null)}
            >
              修正をキャンセル
            </button>
            <button type="submit" className="primary">
              修正を保存
            </button>
          </div>
        </section>
      )}
      {status && <p role="status">{status}</p>}
      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}
    </Modal>
  );
}
