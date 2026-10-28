import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { nextPeriod, progress, today } from "./model";
import type {
  ChartRange,
  GoalFilter,
  Metric,
  MetricColor,
  MetricFields,
  DashboardState,
} from "./types";
import { useDashboard } from "./hooks/useDashboard";
import { Confetti, Toast, type Notification } from "./components/Feedback";
import { Icon } from "./components/Icon";
import { MetricCard } from "./components/MetricCard";
import { MetricForm } from "./components/MetricForm";
import { Overview } from "./components/Overview";
import { RecentActivity } from "./components/RecentActivity";
import { RecordForm } from "./components/RecordForm";
import { Sidebar } from "./components/Sidebar";
import { ImportForm } from "./components/ImportForm";
import { MetricDetails } from "./components/MetricDetails";
import { dashboardCsv } from "./export";

const TrendChart = lazy(() =>
  import("./components/TrendChart").then((module) => ({
    default: module.TrendChart,
  })),
);

type Editor =
  | { kind: "metric"; metric?: Metric }
  | { kind: "record"; metric: Metric; returnToDetails?: boolean }
  | { kind: "details"; id: string }
  | { kind: "import" }
  | null;
const filters: [GoalFilter, string][] = [
  ["all", "すべて"],
  ["active", "進行中"],
  ["done", "達成済み"],
];

export function App() {
  const { state, storageError, save } = useDashboard();
  const [range, setRange] = useState<ChartRange>(7);
  const [filter, setFilter] = useState<GoalFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const [editor, setEditor] = useState<Editor>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [celebration, setCelebration] = useState(0);
  const sequence = useRef(0);
  const dismissToast = useCallback(() => setNotification(null), []);
  const dismissConfetti = useCallback(() => setCelebration(0), []);
  const closeEditor = () =>
    setEditor(
      editor?.kind === "record" && editor.returnToDetails
        ? { kind: "details", id: editor.metric.id }
        : null,
    );
  const add = () => setEditor({ kind: "metric" });
  const notify = (message: string, error = false) =>
    setNotification({ id: ++sequence.current, message, error });

  function saveMetric(fields: MetricFields & { color: MetricColor }) {
    const existing = editor?.kind === "metric" ? editor.metric : undefined;
    if (!existing && state.metrics.length >= 100)
      throw new Error("目標は100個まで追加できます。");
    const metric: Metric = {
      id: existing?.id ?? crypto.randomUUID(),
      entries: existing?.entries ?? [],
      ...fields,
    };
    save({
      ...state,
      metrics: existing
        ? state.metrics.map((item) => (item.id === existing.id ? metric : item))
        : [...state.metrics, metric],
    });
    setFilter("all");
    closeEditor();
    notify(
      existing ? "目標を更新しました。" : "新しいチャレンジがはじまります！",
    );
  }

  function deleteMetric(metric: Metric) {
    save({
      ...state,
      metrics: state.metrics.filter((item) => item.id !== metric.id),
    });
    closeEditor();
    notify("目標を削除しました。");
  }

  function saveRecord(updated: Metric) {
    const previous = state.metrics.find((metric) => metric.id === updated.id);
    const celebrate =
      previous !== undefined &&
      progress(previous) < 100 &&
      progress(updated) >= 100;
    save({
      ...state,
      metrics: state.metrics.map((metric) =>
        metric.id === updated.id ? updated : metric,
      ),
    });
    closeEditor();
    notify(
      celebrate
        ? "目標達成！積み重ねた一歩に、おめでとう！"
        : "記録しました。今日も一歩、前へ。",
    );
    if (celebrate) setCelebration(++sequence.current);
  }

  function freshStart() {
    if (!confirm("サンプルの目標と記録を削除し、自分の目標ではじめますか？"))
      return;
    try {
      save({ version: 1, demo: false, metrics: [] });
      setFilter("all");
      add();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "保存できませんでした。",
        true,
      );
    }
  }

  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pulse-${today()}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("データを書き出しました。");
  }

  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob([dashboardCsv(state)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pulse-${today()}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("CSVを書き出しました。");
  }

  function restoreData(restored: DashboardState) {
    save(restored);
    setFilter("all");
    setCelebration(0);
    closeEditor();
    notify("バックアップからデータを復元しました。");
  }

  function updateDetailedMetric(updated: Metric, message: string) {
    save({
      ...state,
      metrics: state.metrics.map((metric) =>
        metric.id === updated.id ? updated : metric,
      ),
    });
    notify(message);
  }

  function duplicateMetric(metric: Metric) {
    try {
      if (state.metrics.length >= 100)
        throw new Error("目標は100個まで追加できます。");
      const bounded = metric.periodType && metric.periodType !== "all";
      const copy: Metric = {
        ...metric,
        ...nextPeriod(metric),
        id: crypto.randomUUID(),
        name: bounded ? metric.name : `${metric.name}（コピー）`,
        entries: [],
      };
      save({ ...state, metrics: [...state.metrics, copy] });
      setFilter("all");
      closeEditor();
      notify(
        bounded ? "次の期間の目標を作成しました。" : "目標を複製しました。",
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "複製できませんでした。",
        true,
      );
    }
  }

  const detailedMetric =
    editor?.kind === "details"
      ? state.metrics.find((metric) => metric.id === editor.id)
      : undefined;

  const visible = state.metrics
    .filter(
      (metric) =>
        (filter === "all" ||
          (filter === "active"
            ? progress(metric) < 100
            : progress(metric) >= 100)) &&
        metric.name
          .toLocaleLowerCase("ja")
          .includes(query.trim().toLocaleLowerCase("ja")),
    )
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "ja");
      if (sort === "progress") return progress(b) - progress(a);
      if (sort === "recent")
        return (b.entries.at(-1)?.date ?? "").localeCompare(
          a.entries.at(-1)?.date ?? "",
        );
      return state.metrics.indexOf(a) - state.metrics.indexOf(b);
    });
  const recorded = state.metrics.filter((metric) =>
    metric.entries.some((entry) => entry.date === today()),
  ).length;

  return (
    <>
      <Sidebar onAdd={add} />
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            ワークスペース <span>/</span> <strong>ダッシュボード</strong>
          </div>
          <div className="local-status">
            <i /> このブラウザに保存
          </div>
        </header>
        <div className="content">
          <div className="heading">
            <div>
              <div className="eyebrow">MAKE PROGRESS, FEEL GOOD.</div>
              <h1>
                小さな前進を、<span>見えるかたちに。</span>
              </h1>
              <p>数字の先にある、あなたの成長を楽しもう。</p>
            </div>
            <button className="primary" onClick={add}>
              <Icon name="plus" /> 目標を追加
            </button>
          </div>
          {storageError && (
            <div className="warning" role="alert">
              保存データを読み込めませんでした。元のデータを上書きせず、サンプルを表示しています。ブラウザの保存設定を確認してください。
            </div>
          )}
          {state.demo && (
            <div className="demo-banner">
              <span>
                <b>まずは、触ってみよう。</b>{" "}
                現在はサンプルデータを表示しています。
              </span>
              <button onClick={freshStart}>
                自分の目標ではじめる <Icon name="arrow" />
              </button>
            </div>
          )}
          <Overview metrics={state.metrics} />
          <section className="goals-section">
            <div className="section-header">
              <h2>
                マイ目標 <span>{state.metrics.length}</span>
              </h2>
              <div className="filters" role="group" aria-label="目標の絞り込み">
                {filters.map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={filter === value}
                    className={filter === value ? "selected" : ""}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="goal-tools">
              <label className="search-field">
                <span className="sr-only">目標を検索</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="目標を検索"
                />
              </label>
              <label>
                <span className="sr-only">目標の並び順</span>
                <select
                  aria-label="目標の並び順"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="default">追加順</option>
                  <option value="name">名前順</option>
                  <option value="progress">達成率が高い順</option>
                  <option value="recent">最近記録した順</option>
                </select>
              </label>
            </div>
            <div className="metrics">
              {visible.map((metric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  onEdit={(metric) => setEditor({ kind: "metric", metric })}
                  onRecord={(metric) => setEditor({ kind: "record", metric })}
                  onDetails={(metric) =>
                    setEditor({ kind: "details", id: metric.id })
                  }
                />
              ))}
              {!visible.length && (
                <div className="empty">
                  <Icon name="leaf" />
                  <h3>
                    {state.metrics.length
                      ? "該当する目標はありません"
                      : "最初の一歩を、ここから。"}
                  </h3>
                  <p>
                    {state.metrics.length
                      ? "別のフィルターで目標を確認できます。"
                      : "読書、運動、売上。追いかけたい数字を追加しましょう。"}
                  </p>
                  {!state.metrics.length && (
                    <button className="primary" onClick={add}>
                      目標を追加
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
          <div className="lower-grid">
            <section className="panel trend-panel">
              <div className="section-header">
                <div>
                  <h2>成長のあしあと</h2>
                  <p>全目標の平均達成率の推移</p>
                </div>
                <select
                  aria-label="グラフの表示期間"
                  value={range}
                  onChange={(event) =>
                    setRange(event.target.value === "30" ? 30 : 7)
                  }
                >
                  <option value="7">過去7日間</option>
                  <option value="30">過去30日間</option>
                </select>
              </div>
              {state.metrics.length ? (
                <Suspense
                  fallback={
                    <div className="chart-empty">グラフを読み込み中…</div>
                  }
                >
                  <TrendChart metrics={state.metrics} range={range} />
                </Suspense>
              ) : (
                <div className="chart-empty">
                  目標を追加すると、ここに成長が見えてきます。
                </div>
              )}
              <div className="chart-caption">
                <i />
                平均達成率{" "}
                <span>記録のない日は、直前の実績を引き継ぎます。</span>
              </div>
            </section>
            <section className="encouragement">
              <span className="mini-label">TODAY’S LITTLE WIN</span>
              <div className="plant-art" aria-hidden="true">
                <span>✦</span>
                <Icon name="leaf" />
                <span>✧</span>
              </div>
              <h2>
                {recorded
                  ? "今日の一歩、記録できた。"
                  : "今日は、どんな一歩にする？"}
              </h2>
              <p>
                {recorded ? (
                  <>
                    {recorded}個の目標に、今日の実績があります。
                    <br />
                    積み重ねた時間は、きっと力になる。
                  </>
                ) : (
                  <>
                    ほんの少しの前進も、残しておこう。
                    <br />
                    小さな積み重ねが、未来を変える。
                  </>
                )}
              </p>
              <span className="gentle-tag">
                自分のペースが、いちばんのペース。
              </span>
            </section>
          </div>
          <RecentActivity metrics={state.metrics} />
          <footer>
            <span>
              <b>pulse.</b> 小さな前進が、楽しみになる。
            </span>
            <div className="data-actions">
              <button onClick={() => setEditor({ kind: "import" })}>
                データを読み込む
              </button>
              <button onClick={exportData}>
                <Icon name="download" /> データを書き出す
              </button>
              <button onClick={exportCsv}>
                <Icon name="download" /> CSVを書き出す
              </button>
            </div>
          </footer>
        </div>
      </main>
      {detailedMetric && (
        <MetricDetails
          metric={detailedMetric}
          onClose={closeEditor}
          onRecord={() =>
            setEditor({
              kind: "record",
              metric: detailedMetric,
              returnToDetails: true,
            })
          }
          onUpdate={updateDetailedMetric}
          onDuplicate={duplicateMetric}
        />
      )}
      {editor?.kind === "metric" && (
        <MetricForm
          key={editor.metric?.id ?? "new"}
          metric={editor.metric}
          onClose={closeEditor}
          onSave={saveMetric}
          onDelete={deleteMetric}
        />
      )}
      {editor?.kind === "record" && (
        <RecordForm
          key={editor.metric.id}
          metric={editor.metric}
          onClose={closeEditor}
          onSave={saveRecord}
        />
      )}
      {editor?.kind === "import" && (
        <ImportForm
          current={state}
          onClose={closeEditor}
          onRestore={restoreData}
        />
      )}
      {notification && (
        <Toast notification={notification} onDismiss={dismissToast} />
      )}
      {celebration > 0 && (
        <Confetti key={celebration} onDone={dismissConfetti} />
      )}
    </>
  );
}
