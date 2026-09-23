"use client";
import { AlertCircle } from "lucide-react";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="empty-state">
      <AlertCircle className="mx-auto text-amber-600" size={32} />
      <h1 className="mt-4 text-xl font-bold">Не удалось загрузить данные</h1>
      <p className="muted mt-3">
        Попробуйте ещё раз. Сохранённые задачи останутся на месте.
      </p>
      <button onClick={reset} className="btn btn-primary mt-5">
        Повторить
      </button>
    </div>
  );
}
