"use client";
import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { calculateReadiness } from "@/lib/scoring";
import type { TaskCardInput } from "@/lib/task-assistant";
import { ReadinessBadge, ScoreBar } from "./ui";
export function PublishTaskDialog({ card, disabled = false, onConfirm }: { card: TaskCardInput; disabled?: boolean; onConfirm: () => Promise<boolean> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const rating = calculateReadiness(card);
  const weak = rating.categories.filter(category => category.missing.length);
  return <>
    <button type="button" className="btn btn-primary" disabled={disabled || pending} onClick={() => { setError(""); dialog.current?.showModal(); }}>Опубликовать задачу</button>
    <dialog ref={dialog} className="modal" aria-label="Опубликовать задачу?" onCancel={event => { if (pending) event.preventDefault(); }}>
      <div className="p-6">
        <h2 className="text-xl font-bold">Опубликовать задачу?</h2>
        <p className="muted mt-3 text-sm">После публикации она станет доступна всем студенческим командам в каталоге.</p>
        <p className="mt-4 break-words font-semibold">{card.title || "Название не указано"}</p>
        <div className="my-4"><ReadinessBadge score={rating.total} /><div className="mt-3"><ScoreBar score={rating.total} label="Итоговый рейтинг" /></div></div>
        {rating.total < 40 && <p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Задача пока требует уточнений, но вы всё равно можете её опубликовать.</p>}
        {weak.length ? <><h3 className="text-sm font-bold">Что ещё можно дополнить</h3><ul className="my-3 space-y-2 text-xs leading-relaxed text-slate-600">{weak.map(category => <li key={category.key}><strong>{category.label} · {category.score}/{category.maxScore}</strong><p>{category.missing.join(". ")}</p></li>)}</ul></> : <p className="text-sm text-emerald-700">Все разделы рейтинга заполнены.</p>}
        <p className="mt-4 text-xs text-slate-500">Проверьте сведения и контакты. Подтверждение сохранит текущие поля и опубликует карточку.</p>
        {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => dialog.current?.close()}>Отмена</button>
          <button type="button" className="btn btn-primary" disabled={pending} onClick={async () => {
            setPending(true); setError("");
            try { if (await onConfirm()) dialog.current?.close(); else setError("Публикация не выполнена. Закройте диалог и проверьте сообщение в форме."); }
            catch { setError("Не удалось опубликовать задачу. Попробуйте ещё раз."); }
            finally { setPending(false); }
          }}>{pending && <Loader2 size={16} className="animate-spin" />}{pending ? "Публикуем…" : "Подтвердить публикацию"}</button>
        </div>
      </div>
    </dialog>
  </>;
}
