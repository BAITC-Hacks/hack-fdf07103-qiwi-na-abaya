import Link from "next/link";
import { ProposalProgress } from "./proposal-progress";
import { Clock3, ExternalLink, MessageSquare } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { proposalLabels, dateLabel, tags } from "@/lib/presentation";
import { ProposalDecisionControls } from "./proposal-decision";
import { EmptyState } from "./ui";
import { Modal } from "./interactive";
type Proposal = Prisma.ProposalGetPayload<{
  include: {
    task: { include: { business: { select: { name: true } } } };
    team: true;
  };
}>;
export function ProposalList({
  proposals,
  business = false,
  returnToTask = false,
}: {
  proposals: Proposal[];
  business?: boolean;
  returnToTask?: boolean;
}) {
  if (!proposals.length)
    return (
      <EmptyState
        title={
          business ? "Первые идеи ещё впереди" : "Начните с интересной задачи"
        }
        description={
          business
            ? "После публикации команды смогут предложить свои подходы. Здесь появятся их идеи и планы."
            : "Ваши предложения и их статусы будут собраны здесь."
        }
        href={business ? "/business/tasks" : "/tasks"}
        action={business ? "Открыть мои задачи" : "Посмотреть каталог"}
      />
    );
  return (
    <div className="space-y-4">
      {proposals.map((proposal) => (
        <article className="panel p-5 sm:p-6" key={proposal.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <span className="avatar !rounded-xl">
                <MessageSquare size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="break-words font-bold">
                  {business ? proposal.team.name : proposal.task.title}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {business ? proposal.task.title : proposal.task.business.name}{" "}
                  ·{" "}
                  <time dateTime={proposal.createdAt.toISOString()}>
                    {dateLabel(proposal.createdAt)}
                  </time>
                </p>
              </div>
            </div>
            <span
              className={`badge ${proposal.status === "ACCEPTED" ? "level-ready" : proposal.status === "REJECTED" ? "bg-rose-50 text-rose-700" : "level-workable"}`}
            >
              {proposalLabels[proposal.status]} · {proposal.status}
            </span>
          </div>
          <p className="muted my-4 max-w-3xl break-words whitespace-pre-wrap text-sm">
            {proposal.solutionIdea}
          </p>
          {business && (
            <div className="mb-5 space-y-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="eyebrow">Навыки и технологии</p><div className="mt-2 flex flex-wrap gap-2">{[...new Set([...tags(proposal.team.skills), ...tags(proposal.team.technologies)])].map((skill) => <span className="tag" key={skill}>{skill}</span>)}{!tags(proposal.team.skills).length && !tags(proposal.team.technologies).length && <span className="muted">Пока не указаны</span>}</div></div>
                <div><p className="eyebrow">Интересы</p><p className="muted mt-2 break-words">{tags(proposal.team.interests).join(" · ") || "Пока не указаны"}</p></div>
              </div>
              <div><p className="eyebrow">План работы</p><p className="muted mt-2 whitespace-pre-wrap break-words">{proposal.plan}</p></div>
              {/^https?:\/\//i.test(proposal.prototypeUrl) ? <a className="inline-flex items-center gap-2 font-semibold text-violet-700" href={proposal.prototypeUrl} target="_blank" rel="noopener noreferrer">Открыть прототип <ExternalLink size={14} /></a> : <p className="text-xs text-slate-400">Прототип пока не приложен</p>}
              {["PUBLISHED", "IN_PROGRESS"].includes(proposal.task.status) && <ProposalDecisionControls proposalId={proposal.id} status={proposal.status} teamName={proposal.team.name} taskTitle={proposal.task.title} returnToTask={returnToTask} />}
            </div>
          )}
          {proposal.status === "ACCEPTED" && ["IN_PROGRESS", "COMPLETED"].includes(proposal.task.status) && <ProposalProgress business={business} completed={proposal.task.status === "COMPLETED"} proposal={{ id: proposal.id, progressPercent: proposal.progressPercent, progressComment: proposal.progressComment, submittedAt: proposal.submittedAt?.toISOString() ?? null, confirmedByBusiness: proposal.confirmedByBusiness, confirmedPercent: proposal.confirmedPercent, awardedPoints: proposal.awardedPoints, progressRevision: proposal.progressRevision }} />}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <Clock3 size={14} />
              {proposal.estimatedTime}
            </span>
            <div className="flex flex-wrap gap-2">
              <Link
                className="btn btn-secondary"
                href={`/tasks/${proposal.taskId}`}
              >
                К задаче
              </Link>
              <Modal
                title={`Предложение · ${proposal.team.name}`}
                trigger="Посмотреть предложение"
              >
                <div className="space-y-5">
                  <div>
                    <p className="eyebrow">Идея решения</p>
                    <p className="muted whitespace-pre-wrap break-words text-sm">
                      {proposal.solutionIdea}
                    </p>
                  </div>
                  <div>
                    <p className="eyebrow">План работы</p>
                    <p className="muted whitespace-pre-wrap break-words text-sm">
                      {proposal.plan}
                    </p>
                  </div>
                  <div>
                    <p className="eyebrow">Срок</p>
                    <p>{proposal.estimatedTime}</p>
                  </div>
                  {/^https?:\/\//i.test(proposal.prototypeUrl) && (
                    <a
                      className="btn btn-secondary"
                      href={proposal.prototypeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Открыть прототип <ExternalLink size={14} />
                    </a>
                  )}
                  {proposal.prototypeUrl.startsWith("https://example.com/") && (
                    <p className="text-xs text-slate-400">
                      Ссылка из демонстрационных данных; реального прототипа по
                      ней нет.
                    </p>
                  )}
                  <p className="rounded-xl bg-violet-50 p-4 text-xs leading-relaxed text-violet-700">
                    Решение о сотрудничестве принимает бизнес. Команда не
                    назначается автоматически.
                  </p>
                </div>
              </Modal>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
