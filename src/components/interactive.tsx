"use client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, X, AlertCircle } from "lucide-react";

export function SubmitButton({
  children,
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} type="submit">
      {pending && <Loader2 size={16} className="animate-spin" />}
      {pending ? "Сохраняем…" : children}
    </button>
  );
}
export function Modal({
  title,
  trigger,
  children,
}: {
  title: string;
  trigger: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        className="btn btn-secondary"
        onClick={() => ref.current?.showModal()}
      >
        {trigger}
      </button>
      <dialog
        ref={ref}
        className="modal"
        aria-label={title}
        onClick={(event) => {
          if (event.target === event.currentTarget) ref.current?.close();
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            className="icon-button"
            aria-label="Закрыть диалог"
            onClick={() => ref.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </dialog>
    </>
  );
}
const notices: Record<string, string> = {
  proposal_accepted: "Предложение принято. Задача в работе; остальные предложения не изменены.",
  proposal_rejected: "Предложение отклонено. Остальные предложения не изменены.",
  proposal_sent:
    "Предложение отправлено. Решение о сотрудничестве принимает бизнес.",
  team: "Вы в пространстве команды",
  business: "Вы в пространстве бизнеса",
  created: "Черновик сохранён. Он виден только бизнесу.",
  published: "Задача опубликована и теперь видна в каталоге.",
  saved: "Профиль команды сохранён",
  switched: "Демонстрационная команда изменена",
  invalid: "Проверьте обязательные поля и повторите попытку",
};
export function Toast() {
  const search = useSearchParams();
  const notice = search.get("notice") ?? "";
  const noticeKey = search.toString();
  const [dismissed, setDismissed] = useState("");
  useEffect(() => {
    if (!notices[notice]) return;
    const timer = setTimeout(() => setDismissed(noticeKey), 5500);
    return () => clearTimeout(timer);
  }, [notice, noticeKey]);
  if (!notices[notice] || dismissed === noticeKey) return null;
  return (
    <div role="status" className="toast">
      {notice === "invalid" ? (
        <AlertCircle size={20} className="shrink-0 text-amber-600" />
      ) : (
        <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
      )}
      <span>{notices[notice]}</span>
      <button
        aria-label="Закрыть уведомление"
        className="icon-button"
        onClick={() => setDismissed(noticeKey)}
      >
        <X size={16} />
      </button>
    </div>
  );
}
