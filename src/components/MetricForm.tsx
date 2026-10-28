import { useState } from "react";
import { today, validateMetric } from "../model";
import type {
  Metric,
  MetricColor,
  MetricFields,
  MetricDirection,
  RecordingMode,
  GoalPeriodType,
} from "../types";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

interface Props {
  metric?: Metric;
  onClose: () => void;
  onSave: (fields: MetricFields & { color: MetricColor }) => void;
  onDelete: (metric: Metric) => void;
}

export function MetricForm({ metric, onClose, onSave, onDelete }: Props) {
  const [deleteError, setDeleteError] = useState("");
  const [direction, setDirection] = useState<MetricDirection>(
    metric?.direction ?? "increase",
  );
  const [periodType, setPeriodType] = useState<GoalPeriodType>(
    metric?.periodType ?? "all",
  );
  const [periodMonth, setPeriodMonth] = useState(
    metric?.periodStart?.slice(0, 7) ?? today().slice(0, 7),
  );
  const [customStart, setCustomStart] = useState(
    metric?.periodStart ?? today(),
  );
  const [customEnd, setCustomEnd] = useState(metric?.periodEnd ?? today());
  return (
    <Modal
      onClose={onClose}
      onSubmit={(data) => {
        const fields = {
          name: String(data.get("name") ?? "").trim(),
          target: Number(data.get("target")),
          unit: String(data.get("unit") ?? "").trim(),
          direction,
          ...(direction === "decrease"
            ? { baseline: Number(data.get("baseline")) }
            : {}),
        };
        const color = Number(data.get("color"));
        const recordingMode = (
          direction === "decrease"
            ? "cumulative"
            : String(data.get("recordingMode"))
        ) as RecordingMode;
        const [periodYear, selectedMonth] = periodMonth.split("-").map(Number);
        const periodStart =
          periodType === "quarterly"
            ? `${periodYear}-${String(Math.floor((selectedMonth - 1) / 3) * 3 + 1).padStart(2, "0")}-01`
            : `${periodMonth}-01`;
        const periodFields =
          periodType === "all"
            ? { periodType }
            : periodType === "custom"
              ? { periodType, periodStart: customStart, periodEnd: customEnd }
              : { periodType, periodStart };
        validateMetric({ ...fields, recordingMode, ...periodFields });
        if (color !== 0 && color !== 1 && color !== 2 && color !== 3)
          throw new Error("テーマカラーを選択してください。");
        if (recordingMode !== "cumulative" && recordingMode !== "increment")
          throw new Error("記録方式を選択してください。");
        onSave({ ...fields, color, recordingMode, ...periodFields });
      }}
    >
      <span className="eyebrow">YOUR NEXT CHALLENGE</span>
      <h2 id="modal-title">{metric ? "目標を編集" : "新しい目標をつくろう"}</h2>
      <p className="modal-description">
        あなたが一歩ずつ、変えていきたい数字は？
      </p>
      <label>
        目標の名前
        <input
          name="name"
          maxLength={40}
          required
          placeholder="例：本を読む"
          defaultValue={metric?.name ?? ""}
        />
      </label>
      <div className="form-grid">
        <label>
          目標値
          <input
            name="target"
            type="number"
            min="0.000001"
            max="1000000000000"
            step="any"
            required
            placeholder="500"
            defaultValue={metric?.target ?? ""}
          />
        </label>
        <label>
          単位
          <input
            name="unit"
            maxLength={10}
            placeholder="ページ、円、回…"
            defaultValue={metric?.unit ?? ""}
          />
        </label>
      </div>
      <fieldset className="recording-mode">
        <legend>目標期間</legend>
        {metric && metric.entries.length > 0 ? (
          <>
            <input type="hidden" name="periodType" value={periodType} />
            <p className="locked-mode">
              <strong>
                {periodType === "monthly"
                  ? "月次"
                  : periodType === "quarterly"
                    ? "四半期"
                    : periodType === "custom"
                      ? "任意期間"
                      : "期間なし"}
              </strong>
              <span>
                記録済みの日付を守るため、実績がある目標の期間は変更できません。
              </span>
            </p>
          </>
        ) : (
          <div className="period-options">
            {(
              [
                ["all", "期間なし"],
                ["monthly", "月次"],
                ["quarterly", "四半期"],
                ["custom", "任意"],
              ] as const
            ).map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="periodType"
                  value={value}
                  checked={periodType === value}
                  onChange={() => setPeriodType(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      {(periodType === "monthly" || periodType === "quarterly") && (
        <label className="baseline-field">
          対象月
          <input
            type="month"
            value={periodMonth}
            disabled={Boolean(metric?.entries.length)}
            onChange={(event) => setPeriodMonth(event.target.value)}
            required
          />
          <small>
            {periodType === "monthly"
              ? "選んだ月の1日から末日までを集計します。"
              : "選んだ月を含む四半期の初日から末日までを集計します。"}
          </small>
        </label>
      )}
      {periodType === "custom" && (
        <div className="form-grid period-dates">
          <label>
            開始日
            <input
              type="date"
              value={customStart}
              disabled={Boolean(metric?.entries.length)}
              onChange={(event) => setCustomStart(event.target.value)}
              required
            />
          </label>
          <label>
            終了日
            <input
              type="date"
              value={customEnd}
              disabled={Boolean(metric?.entries.length)}
              onChange={(event) => setCustomEnd(event.target.value)}
              required
            />
          </label>
        </div>
      )}
      <fieldset className="recording-mode">
        <legend>目標の方向</legend>
        {metric && metric.entries.length > 0 ? (
          <p className="locked-mode">
            <strong>
              {direction === "decrease" ? "数値を減らす" : "数値を増やす"}
            </strong>
            <span>
              記録済みの達成率を守るため、実績がある目標の方向は変更できません。
            </span>
          </p>
        ) : (
          <div className="recording-mode-options">
            <label>
              <input
                type="radio"
                name="direction"
                value="increase"
                checked={direction === "increase"}
                onChange={() => setDirection("increase")}
              />
              <span>
                <strong>数値を増やす</strong>
                <small>売上、読書、運動など</small>
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="direction"
                value="decrease"
                checked={direction === "decrease"}
                onChange={() => setDirection("decrease")}
              />
              <span>
                <strong>数値を減らす</strong>
                <small>体重、コスト、時間など</small>
              </span>
            </label>
          </div>
        )}
      </fieldset>
      {direction === "decrease" && (
        <label className="baseline-field">
          開始値
          <input
            name="baseline"
            type="number"
            min="0.000001"
            max="1000000000000"
            step="any"
            required
            placeholder="例：80"
            defaultValue={metric?.baseline ?? ""}
          />
          <small>
            現在地として使う値です。目標値より大きい値を入力してください。
          </small>
        </label>
      )}
      <fieldset>
        <legend>テーマカラー</legend>
        <div className="color-options">
          {["グリーン", "オレンジ", "パープル", "ブルー"].map(
            (label, index) => (
              <label key={label} className={`color-option color-${index}`}>
                <input
                  type="radio"
                  name="color"
                  value={index}
                  defaultChecked={(metric?.color ?? 0) === index}
                />
                <span>{label}</span>
              </label>
            ),
          )}
        </div>
      </fieldset>
      <fieldset className="recording-mode">
        <legend>記録方式</legend>
        {direction === "decrease" ? (
          <>
            <input type="hidden" name="recordingMode" value="cumulative" />
            <p className="locked-mode">
              <strong>累計値・現在値</strong>
              <span>減らす目標では、その時点の現在値を記録します。</span>
            </p>
          </>
        ) : metric && metric.entries.length > 0 ? (
          <>
            <input
              type="hidden"
              name="recordingMode"
              value={metric.recordingMode ?? "cumulative"}
            />
            <p className="locked-mode">
              <strong>
                {metric.recordingMode === "increment"
                  ? "日ごとの増分"
                  : "累計値・現在値"}
              </strong>
              <span>
                記録済みの数値の意味を守るため、実績がある目標の記録方式は変更できません。
              </span>
            </p>
          </>
        ) : (
          <div className="recording-mode-options">
            <label>
              <input
                type="radio"
                name="recordingMode"
                value="cumulative"
                defaultChecked={
                  (metric?.recordingMode ?? "cumulative") === "cumulative"
                }
              />
              <span>
                <strong>累計値・現在値</strong>
                <small>その時点の合計や値を入力</small>
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="recordingMode"
                value="increment"
                defaultChecked={metric?.recordingMode === "increment"}
              />
              <span>
                <strong>日ごとの増分</strong>
                <small>その日の実績を入力し自動集計</small>
              </span>
            </label>
          </div>
        )}
      </fieldset>
      <p className="form-hint">
        目標・記録は手動で管理し、期間ごとの自動リセットはありません。
      </p>
      <div className="modal-actions">
        {metric && (
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (
                !confirm(
                  `「${metric.name}」とすべての記録を削除しますか？この操作は取り消せません。`,
                )
              )
                return;
              try {
                onDelete(metric);
              } catch (error) {
                setDeleteError(
                  error instanceof Error
                    ? error.message
                    : "保存できませんでした。",
                );
              }
            }}
          >
            目標を削除
          </button>
        )}
        <button type="submit" className="primary">
          {metric ? "変更を保存" : "目標を追加"} <Icon name="arrow" />
        </button>
      </div>
      {deleteError && (
        <p className="form-error" role="alert">
          {deleteError}
        </p>
      )}
    </Modal>
  );
}
