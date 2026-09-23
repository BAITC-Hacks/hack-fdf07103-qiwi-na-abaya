"use client";
import { useActionState, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { submitProposal } from "@/app/tasks/actions";
export function ProposalForm({
  taskId,
  teamName,
}: {
  taskId: string;
  teamName: string;
}) {
  const [result, action, pending] = useActionState(submitProposal, {
    ok: false,
    message: "",
  });
  const [fields, setFields] = useState({
    solutionIdea: "",
    plan: "",
    estimatedTime: "",
    prototypeUrl: "",
  });
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="taskId" value={taskId} />
      <p className="muted text-sm">
        От команды <strong className="text-slate-700">{teamName}</strong>.
        Назначение исполнителя остаётся за бизнесом.
      </p>
      <fieldset disabled={pending} className="space-y-4">
        <label className="field">
          Идея решения
          <textarea
            required
            minLength={10}
            maxLength={4000}
            name="solutionIdea"
            className="input min-h-28"
            value={fields.solutionIdea}
            onChange={(e) =>
              setFields({ ...fields, solutionIdea: e.target.value })
            }
            placeholder="Как вы предлагаете решить задачу?"
          />
        </label>
        <label className="field">
          План работы
          <textarea
            required
            minLength={10}
            maxLength={6000}
            name="plan"
            className="input min-h-28"
            value={fields.plan}
            onChange={(e) => setFields({ ...fields, plan: e.target.value })}
            placeholder="Опишите основные этапы и проверку результата"
          />
        </label>
        <label className="field">
          Предполагаемый срок
          <input
            required
            maxLength={120}
            name="estimatedTime"
            className="input"
            value={fields.estimatedTime}
            onChange={(e) =>
              setFields({ ...fields, estimatedTime: e.target.value })
            }
            placeholder="Например: 2 недели"
          />
        </label>
        <label className="field">
          Ссылка на прототип (необязательно)
          <input
            type="url"
            maxLength={1000}
            name="prototypeUrl"
            className="input"
            value={fields.prototypeUrl}
            onChange={(e) =>
              setFields({ ...fields, prototypeUrl: e.target.value })
            }
            placeholder="https://"
          />
        </label>
      </fieldset>
      {result.message && (
        <p
          role="alert"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
        >
          {result.message}
        </p>
      )}
      <button disabled={pending} className="btn btn-primary w-full">
        {pending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Send size={16} />
        )}{" "}
        {pending ? "Отправляем предложение…" : "Отправить предложение"}
      </button>
    </form>
  );
}
