"use client";
import { AlertCircle, RefreshCw } from "lucide-react";
export default function TasksError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="empty-state">
      <span className="icon-tile">
        <AlertCircle size={25} />
      </span>
      <h1 className="mt-4 text-xl font-bold">Не удалось загрузить задачи</h1>
      <p className="muted mx-auto mt-3 max-w-md">
        Связь с каталогом прервалась. Попробуйте ещё раз — сохранённые задачи и
        отклики останутся на месте.
      </p>
      <button onClick={reset} className="btn btn-primary mt-5">
        <RefreshCw size={16} />
        Повторить загрузку
      </button>
    </div>
  );
}
