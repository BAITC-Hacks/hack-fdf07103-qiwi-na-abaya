"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { reviewProposal } from "@/app/business/proposals/actions";
import type { ProposalDecision } from "@/lib/proposal-decisions";

export function ProposalDecisionControls({ proposalId, status, teamName, taskTitle, returnToTask = false }: {
  proposalId: string;
  status: ProposalDecision["expectedStatus"];
  teamName: string;
  taskTitle: string;
  returnToTask?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [decision, setDecision] = useState<"ACCEPTED" | "REJECTED">("ACCEPTED");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function open(next: typeof decision) {
    setDecision(next);
    setError("");
    dialog.current?.showModal();
  }
  return <>
    <div className="flex flex-wrap gap-2">
      <button className="btn btn-primary" disabled={status === "ACCEPTED" || pending} onClick={() => open("ACCEPTED")}><Check size={16} />Принять</button>
      <button className="btn btn-secondary !text-rose-700" disabled={status === "REJECTED" || pending} onClick={() => open("REJECTED")}><X size={16} />Отклонить</button>
    </div>
    <dialog ref={dialog} className="modal" aria-label="Подтверждение решения" onCancel={(event) => { if (pending) event.preventDefault(); }}>
      <div className="p-6">
        <p className="eyebrow">Решение бизнеса</p>
        <h2 className="mt-2 text-xl font-bold">{decision === "ACCEPTED" ? "Принять предложение?" : "Отклонить предложение?"}</h2>
        <p className="mt-4 break-words font-semibold">{teamName}</p>
        <p className="muted mt-1 break-words text-sm">{taskTitle}</p>
        <p className="mt-5 rounded-xl bg-violet-50 p-4 text-sm leading-relaxed text-violet-800">
          {decision === "ACCEPTED" ? "Предложение будет принято, задача перейдёт в работу. Вы сможете принять предложения других команд отдельно." : "Предложение будет отклонено. Статус задачи и решения по другим командам останутся прежними."}
        </p>
        {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button className="btn btn-secondary" disabled={pending} onClick={() => dialog.current?.close()}>Отмена</button>
          <button className="btn btn-primary" disabled={pending} onClick={() => startTransition(async () => {
            try {
              const result = await reviewProposal({ proposalId, status: decision, expectedStatus: status, confirmed: true });
              if (result.message) setError(result.message);
              else {
                dialog.current?.close();
                router.push(returnToTask ? `/tasks/${result.taskId}?notice=${result.notice}#proposals` : `/business/proposals?notice=${result.notice}`);
              }
            } catch {
              setError("Связь прервалась. Обновите страницу, чтобы проверить статус решения.");
            }
          })}>{pending && <Loader2 size={16} className="animate-spin" />}{pending ? "Сохраняем…" : decision === "ACCEPTED" ? "Подтвердить принятие" : "Подтвердить отклонение"}</button>
        </div>
      </div>
    </dialog>
  </>;
}
