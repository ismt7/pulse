import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Icon } from "./Icon";

interface Props {
  children: ReactNode;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  className?: string;
}

export function Modal({ children, onClose, onSubmit, className }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      onSubmit(new FormData(event.currentTarget));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "保存できませんでした。",
      );
    }
  }

  return (
    <dialog
      ref={ref}
      className={className}
      id="modal"
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <form onSubmit={submit}>
        <button
          type="button"
          className="modal-close icon-button"
          aria-label="閉じる"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        {children}
        <p className="form-error" role="alert">
          {error}
        </p>
      </form>
    </dialog>
  );
}
