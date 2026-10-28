import { useState } from "react";
import {
  entryValue,
  latest,
  periodBounds,
  periodLabel,
  record,
  today,
} from "../model";
import { format } from "../format";
import type { Metric } from "../types";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

interface Props {
  metric: Metric;
  onClose: () => void;
  onSave: (updated: Metric) => void;
}

export function RecordForm({ metric, onClose, onSave }: Props) {
  const bounds = periodBounds(metric);
  const maxDate = bounds.end && bounds.end < today() ? bounds.end : today();
  const defaultDate =
    bounds.start && maxDate < bounds.start ? bounds.start : maxDate;
  const [date, setDate] = useState(defaultDate);
  const incremental = metric.recordingMode === "increment";
  const initialValue = (date: string) =>
    incremental ? entryValue(metric, date) : latest(metric, date);
  const [value, setValue] = useState(String(initialValue(defaultDate)));

  return (
    <Modal
      onClose={onClose}
      onSubmit={() => onSave(record(metric, date, value))}
    >
      <span className="eyebrow">EVERY LITTLE STEP COUNTS</span>
      <h2 id="modal-title">実績を記録しよう</h2>
      <p className="modal-description">
        {metric.name} · 目標 {format(metric.target)} {metric.unit}
        {metric.periodType !== "all" && <> · {periodLabel(metric)}</>}
      </p>
      <label>
        記録する日付
        <input
          type="date"
          name="date"
          value={date}
          min={bounds.start}
          max={maxDate}
          required
          onChange={(event) => {
            setDate(event.target.value);
            setValue(String(initialValue(event.target.value)));
          }}
        />
      </label>
      <label>
        {incremental ? "その日の実績" : "その日までの累計実績"}（
        {metric.unit || "数値"}）
        <input
          type="number"
          name="value"
          value={value}
          min="0"
          max="1000000000000"
          step="any"
          required
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <p className="form-hint">
        {incremental
          ? "その日だけの増分を入力してください。同じ日の記録は上書きされ、全日の実績を自動で合計します。"
          : "追加分ではなく、累計を入力してください。同じ日の記録は上書きされます。最新の日付の記録が現在の実績になります。"}
      </p>
      <div className="modal-actions">
        <button type="submit" className="primary">
          <Icon name="check" /> 実績を保存
        </button>
      </div>
    </Modal>
  );
}
