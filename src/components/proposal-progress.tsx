"use client";
import { useRef, useState, useTransition } from "react";
import { changeProgress } from "@/app/team/proposals/progress-actions";
export function ProposalProgress({ proposal, business, completed }: { proposal: { id: string; progressPercent: number; progressComment: string; submittedAt: string | null; confirmedByBusiness: boolean; confirmedPercent: number; awardedPoints: number; progressRevision: number }; business: boolean; completed: boolean }) {
  const [percent, setPercent] = useState(String(proposal.progressPercent));
  const [comment, setComment] = useState(proposal.progressComment);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  function run(operation: "submit" | "confirm" | "complete") {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await changeProgress(operation, { proposalId: proposal.id, revision: proposal.progressRevision, progressPercent: Number(percent), progressComment: comment });
        setMessage(result.message); setError(!result.ok);
        if (result.ok) dialog.current?.close();
      } catch { setError(true); setMessage("Связь прервалась. Обновите страницу, чтобы проверить сохранение."); }
    });
  }
  return <section className="my-5 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Прогресс команды">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="text-sm font-bold">Прогресс команды</h3><span className="badge bg-white text-violet-700">{proposal.awardedPoints} баллов команды</span></div>
    <p className="mt-2 text-xs text-slate-500">Выполнение работы — отдельный показатель от готовности бизнес-задачи.</p>
    {proposal.submittedAt ? <>
      <p className="mt-4 text-sm"><strong>{proposal.progressPercent}%</strong> · {proposal.confirmedByBusiness ? "Подтверждено бизнесом" : "Ожидает подтверждения бизнеса"}</p>
      <div className="my-2 h-2 overflow-hidden rounded-full bg-slate-200" role="meter" aria-label="Отправленный прогресс команды" aria-valuemin={0} aria-valuemax={100} aria-valuenow={proposal.progressPercent}><div className={`h-full ${proposal.confirmedByBusiness ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${proposal.progressPercent}%` }} /></div>
      <p className="my-3 break-words whitespace-pre-wrap text-sm text-slate-700">{proposal.progressComment}</p>
      <p className="text-xs text-slate-500">Отправлено: <time dateTime={proposal.submittedAt}>{new Intl.DateTimeFormat("ru", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Almaty" }).format(new Date(proposal.submittedAt))}</time></p>
    </> : <p className="my-4 text-sm text-slate-500">Команда ещё не отправила результат.</p>}
    <p className="mt-3 text-xs text-slate-500">Последний подтверждённый прогресс: {proposal.confirmedPercent}%. Баллы равны максимальному подтверждённому проценту за этот отклик (до 100); повторная отправка не увеличивает награду.</p>
    {completed ? <p className="mt-4 font-semibold text-emerald-700">Задача завершена · COMPLETED</p> : business ? <div className="mt-4 flex flex-wrap gap-3">
      {proposal.submittedAt && !proposal.confirmedByBusiness && <button className="btn btn-primary" disabled={pending} onClick={() => run("confirm")}>{pending ? "Сохраняем…" : "Подтвердить прогресс"}</button>}
      {proposal.confirmedByBusiness && proposal.progressPercent === 100 && <button className="btn btn-primary" disabled={pending} onClick={() => dialog.current?.showModal()}>Завершить задачу</button>}
    </div> : <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); run("submit"); }}>
      <fieldset disabled={pending} className="space-y-3">
        <label className="field">Процент выполнения<input className="input" type="number" required min={0} max={100} step={1} value={percent} onChange={event => setPercent(event.target.value)} /></label>
        <label className="field">Комментарий / результат<textarea className="input min-h-24" required minLength={3} maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} /></label>
        <button className="btn btn-primary" type="submit">{pending ? "Отправляем…" : "Отправить прогресс"}</button>
      </fieldset>
      <p className="text-xs text-slate-500">Каждое новое обновление требует подтверждения бизнеса.</p>
    </form>}
    {message && <p role={error ? "alert" : "status"} className={`mt-3 text-sm ${error ? "text-rose-700" : "text-emerald-700"}`}>{message}</p>}
    <dialog ref={dialog} className="modal" aria-label="Завершить задачу?" onCancel={event => { if (pending) event.preventDefault(); }}><div className="p-6"><h3 className="text-xl font-bold">Завершить задачу?</h3><p className="my-4 text-sm text-slate-600">Вы подтвердили 100% выполнения этой команды. Задача будет завершена целиком, новые обновления всех выбранных команд станут недоступны. Их статусы и заработанные баллы сохранятся.</p><div className="flex flex-wrap gap-3"><button disabled={pending} className="btn btn-secondary" onClick={() => dialog.current?.close()}>Отмена</button><button disabled={pending} className="btn btn-primary" onClick={() => run("complete")}>{pending ? "Сохраняем…" : "Подтвердить завершение"}</button></div>{error && message && <p role="alert" className="mt-3 text-sm text-rose-700">{message}</p>}</div></dialog>
  </section>;
}
