import { useEffect, useState, type CSSProperties } from "react";

export interface Notification {
  id: number;
  message: string;
  error: boolean;
}

export function Toast({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [notification.id, onDismiss]);
  return (
    <div className={`toast ${notification.error ? "error" : ""}`} role="status">
      {notification.message}
    </div>
  );
}

export function Confetti({ onDone }: { onDone: () => void }) {
  const [pieces] = useState(() =>
    Array.from(
      { length: 40 },
      (_, i) =>
        ({
          "--x": `${Math.random() * 100}vw`,
          "--delay": `${Math.random() * 0.5}s`,
          "--rotate": `${Math.random() * 360}deg`,
          background: ["#4e8c70", "#e8ac78", "#a095c4", "#eed57e"][i % 4],
        }) as CSSProperties,
    ),
  );
  useEffect(() => {
    const timer = window.setTimeout(onDone, 3500);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return null;
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((style, i) => (
        <i key={i} style={style} />
      ))}
    </div>
  );
}
