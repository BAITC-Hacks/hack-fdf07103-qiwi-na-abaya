import Link from "next/link";
import { ArrowUpRight, Inbox, MessageSquare, Building2 } from "lucide-react";
import type { Task } from "@prisma/client";
import { getReadinessLevel, readinessLabels } from "@/lib/scoring";
import { catalogDate } from "@/lib/catalog";
import { dateLabel, statusLabels, tags } from "@/lib/presentation";
import type { TaskMatch } from "@/lib/recommendations";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted mt-2 max-w-2xl">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function ReadinessBadge({ score }: { score: number }) {
  const level = getReadinessLevel(score);
  return (
    <span className={`badge level-${level.toLowerCase()}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {readinessLabels[level]}
    </span>
  );
}
export function ScoreBar({
  score,
  label = "Готовность задачи",
}: {
  score: number;
  label?: string;
}) {
  return (
    <div className={`score level-${getReadinessLevel(score).toLowerCase()}`}>
      <div className="mb-2 flex justify-between gap-3 text-xs">
        <span className="text-slate-500">{label}</span>
        <strong>
          {score}
          <span className="font-normal text-slate-400"> / 100</span>
        </strong>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="h-1.5 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-current transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty-state">
      <span className="icon-tile">
        <Inbox size={25} />
      </span>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="muted mx-auto mt-2 max-w-sm text-sm">{description}</p>
      {href && (
        <Link className="btn btn-primary mt-5" href={href}>
          {action}
        </Link>
      )}
    </div>
  );
}
export function TaskCard({
  task,
  match,
  editable = false,
}: {
  task: Task & { business: { name: string }; _count: { proposals: number } };
  match?: TaskMatch;
  editable?: boolean;
}) {
  return (
    <article className="task-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow !mb-0 !tracking-normal">
          {task.industry || "Отрасль не указана"}
        </span>
        <ReadinessBadge score={task.score} />
      </div>
      <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Building2 size={14} className="shrink-0" />
        <span className="break-words">{task.business.name}</span>
      </p>
      <h2 className="break-words text-lg font-bold leading-snug">
        <Link className="hover:text-violet-700" href={`/tasks/${task.id}`}>
          {task.title || "Без названия"}
        </Link>
      </h2>
      <p className="muted mt-3 line-clamp-3 flex-1 text-sm">
        {task.need || task.rawDescription || "Описание ещё не заполнено."}
      </p>
      {match && (
        <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-4">
          <div className="flex items-center justify-between gap-3 text-violet-800"><span className="text-xs font-semibold">Совпадение с командой</span><strong className="text-xl">{match.matchScore}%</strong></div>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-violet-700">{match.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
        </div>
      )}
      {match && <p className="mt-4 text-xs font-semibold text-slate-500">Необходимые навыки</p>}
      <div className="my-5 flex flex-wrap gap-2">
        {tags(task.skills).map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
        {match && !tags(task.skills).length && <span className="text-xs text-slate-400">Пока не указаны</span>}
      </div>
      <ScoreBar score={task.score} />
      {editable && <Link className="btn btn-secondary mt-4" href={`/business/tasks/${task.id}/edit`}>Редактировать задачу</Link>}
      {task.status === "DRAFT" && (
        <Link
          className="btn btn-secondary mt-4"
          href={`/business/tasks/new?task=${task.id}`}
        >
          Продолжить в конструкторе
        </Link>
      )}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <MessageSquare size={14} />
          Предложений: {task._count.proposals}
        </span>
        <Link
          aria-label={`Открыть задачу: ${task.title}`}
          href={`/tasks/${task.id}`}
          className="font-semibold text-violet-700"
        >
          {match ? "Посмотреть задачу" : "Подробнее"} <ArrowUpRight className="inline" size={14} />
        </Link>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        {statusLabels[task.status]} ·{" "}
        <time dateTime={catalogDate(task).toISOString()}>
          {dateLabel(catalogDate(task))}
        </time>
      </p>
    </article>
  );
}
