import { useEffect, useRef, useState } from "react";
import { readDashboardFile } from "../import";
import type { DashboardState } from "../types";
import { Modal } from "./Modal";

interface Props {
  current: DashboardState;
  onClose: () => void;
  onRestore: (state: DashboardState) => void;
}

export function ImportForm({ current, onClose, onRestore }: Props) {
  const [preview, setPreview] = useState<DashboardState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );

  async function selectFile(file?: File) {
    const id = ++request.current;
    setPreview(null);
    setConfirmed(false);
    setError("");
    setBusy(Boolean(file));
    if (!file) return;
    try {
      const data = await readDashboardFile(file);
      if (id === request.current) setPreview(data);
    } catch (error) {
      if (id === request.current)
        setError(
          error instanceof Error
            ? error.message
            : "ファイルを読み込めませんでした。",
        );
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      onSubmit={() => {
        if (!preview || busy || !confirmed) return;
        onRestore(preview);
      }}
    >
      <span className="eyebrow">WELCOME BACK, YOUR PROGRESS.</span>
      <h2 id="modal-title">バックアップから復元</h2>
      <p className="modal-description">
        Pulse から書き出した JSON
        を選択してください。内容を確認するまで、現在のデータは変わりません。
      </p>
      <label>
        バックアップファイル（JSON・10 MBまで）
        <input
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            void selectFile(event.target.files?.[0]);
          }}
        />
      </label>
      {busy && <p role="status">ファイルを確認しています…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <section
          className="import-preview"
          aria-label="復元内容のプレビュー"
          aria-live="polite"
        >
          <h3>読み込む内容</h3>
          <p>
            目標 <strong>{preview.metrics.length}個</strong> · 記録{" "}
            <strong>
              {preview.metrics.reduce(
                (total, metric) => total + metric.entries.length,
                0,
              )}
              件
            </strong>
          </p>
          <p>
            {preview.demo
              ? "サンプルデータのバックアップ"
              : "自分の目標のバックアップ"}
          </p>
          <ul>
            {preview.metrics.slice(0, 5).map((metric) => (
              <li key={metric.id}>{metric.name}</li>
            ))}
          </ul>
          {preview.metrics.length > 5 && (
            <p>ほか {preview.metrics.length - 5}個の目標</p>
          )}
        </section>
      )}
      <p className="form-hint">
        現在の目標 {current.metrics.length}個・記録{" "}
        {current.metrics.reduce(
          (total, metric) => total + metric.entries.length,
          0,
        )}
        件をすべて置き換えます。取り消しはできません。必要なデータは先に書き出してください。
      </p>
      <label className="import-confirm">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={!preview || busy}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        現在のデータを置き換えることを確認しました
      </label>
      <div className="modal-actions">
        <button
          type="button"
          className="record-button import-cancel"
          onClick={onClose}
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="primary"
          disabled={!preview || busy || !confirmed}
        >
          この内容で復元
        </button>
      </div>
    </Modal>
  );
}
