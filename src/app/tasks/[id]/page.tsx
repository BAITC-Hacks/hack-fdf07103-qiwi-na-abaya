import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, FileText, MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { tags, statusLabels, dateLabel } from "@/lib/presentation";
import { calculateReadiness } from "@/lib/scoring";
import { Modal } from "@/components/interactive";
import { ProposalForm } from "@/components/proposal-form";
import { ProposalList } from "@/components/proposal-list";
import { catalogDate } from "@/lib/catalog";
import { CategoryProgress, ReadinessBadge, ScoreBar } from "@/components/ui";
export default async function TaskDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, task] = await Promise.all([
    getSession(),
    db.task.findUnique({
      where: { id },
      include: { business: true, _count: { select: { proposals: true } } },
    }),
  ]);
  if (
    !task ||
    (task.status === "DRAFT" &&
      (session.role !== "business" || session.business?.id !== task.businessId))
  )
    notFound();
  const { breakdown } = calculateReadiness(task);
  const isOwner = session.role === "business" && session.business?.id === task.businessId;
  const proposals = isOwner ? await db.proposal.findMany({
    where: { taskId: task.id },
    include: { team: true, task: { include: { business: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  }) : [];
  const existingProposal =
    session.role === "team" && session.team
      ? await db.proposal.findUnique({
          where: {
            taskId_teamId: { taskId: task.id, teamId: session.team.id },
          },
          select: { id: true },
        })
      : null;
  const fields = [
    ["Контекст", task.context],
    ["Потребность / проблема", task.need],
    ["Пользователи", task.users],
    ["Данные и материалы", task.dataMaterials],
    ["Ожидаемый результат", task.expectedResult],
    ["Критерии успеха", task.successCriteria],
    ["Ограничения", task.constraints],
    ["Контакты и взаимодействие", task.businessContact],
  ];
  return (
    <>
      <Link
        className="mb-6 mr-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-500"
        href={task.status === "DRAFT" ? "/business/tasks" : "/tasks"}
      >
        <ArrowLeft size={14} />
        Назад к задачам
      </Link>
      {task.status === "DRAFT" && session.role === "business" && (
        <div className="mb-6">
          <Link
            className="btn btn-primary"
            href={`/business/tasks/new?task=${task.id}`}
          >
            Продолжить в конструкторе
          </Link>
        </div>
      )}
      {isOwner && <Link className="btn btn-primary mb-5" href={`/business/tasks/${task.id}/edit`}>Редактировать задачу</Link>}
      <div className="mb-7">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="tag">{task.industry || "Отрасль не указана"}</span>
          <ReadinessBadge score={task.score} />
          <span className="text-xs text-slate-400">
            {statusLabels[task.status]}
          </span>
        </div>
        <h1 className="break-words max-w-3xl text-2xl font-bold leading-tight sm:text-3xl">
          {task.title}
        </h1>
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Building2 size={15} />
          {task.business.name}
          <span aria-hidden="true">·</span>
          <time dateTime={catalogDate(task).toISOString()}>
            {dateLabel(catalogDate(task))}
          </time>
        </p>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <div className="space-y-5">
          <section className="panel p-6">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <FileText size={17} className="text-violet-500" />
              Исходная идея
            </h2>
            <p className="muted whitespace-pre-wrap break-words">
              {task.rawDescription || "Пока не добавлена."}
            </p>
          </section>
          <section className="panel divide-y divide-slate-100 px-6">
            {fields.map(([label, value]) => (
              <div key={label} className="py-5">
                <h2 className="mb-2 text-sm font-bold">{label}</h2>
                <p
                  className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${value ? "text-slate-600" : "italic text-slate-400"}`}
                >
                  {value || "Пока не указано"}
                </p>
              </div>
            ))}
          </section>
          {
            <section className="panel p-6">
              <h2 className="mb-4 text-sm font-bold">Навыки и технологии</h2>
              {!tags(task.skills).length && (
                <p className="muted text-sm">
                  Навыки пока не указаны. Предложите подход, исходя из задачи.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {tags(task.skills).map((skill) => (
                  <span key={skill} className="tag">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          }
        </div>
        <aside className="order-first min-w-0 space-y-5 xl:order-last xl:sticky xl:top-24">
          <section className="panel readiness-panel p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Готовность задачи</h2><ReadinessBadge score={task.score} /></div>
            <ScoreBar score={task.score} prominent />
            <div className="mt-6 space-y-4">
              {breakdown.map((item) => (
                <div key={item.label}>
                  <CategoryProgress label={item.label} score={item.points} max={item.max} />
                  {item.missingFields.length > 0 && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {item.missing.join(". ")}. {item.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
          <section className="panel p-5">
            <div className="flex items-center gap-2 text-sm font-bold">
              <MessageSquare size={17} className="text-violet-500" />
              Предложений: {task._count.proposals}
            </div>
            <p className="muted mt-3 text-xs">
              {task.status === "DRAFT"
                ? "Черновик доступен только бизнесу и ещё не опубликован."
                : "Рейтинг не ограничивает возможность предложить решение. Выбор команды остаётся за бизнесом."}
            </p>
            {session.role === "team" &&
              (task.status === "PUBLISHED" || existingProposal) &&
              session.team && (
                <div className="mt-5">
                  {existingProposal ? (
                    <>
                      <p className="mb-3 text-xs font-semibold text-emerald-700">
                        Ваша команда уже отправила отклик
                      </p>
                      <Link
                        className="btn btn-secondary w-full"
                        href="/team/proposals"
                      >
                        Посмотреть мой отклик
                      </Link>
                    </>
                  ) : (
                    <Modal
                      title="Предложить решение"
                      trigger="Предложить решение"
                    >
                      <ProposalForm
                        taskId={task.id}
                        teamName={session.team.name}
                      />
                    </Modal>
                  )}
                </div>
              )}
            {isOwner && (
              <Link
                className="btn btn-secondary mt-4 w-full"
                href="#proposals"
              >
                Посмотреть предложения
              </Link>
            )}
          </section>
        </aside>
      </div>
      {isOwner && <section id="proposals" className="mt-8 scroll-mt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold">Предложения команд</h2><p className="muted mt-2 text-sm">Вы выбираете команды вручную. Можно принять несколько предложений.</p></div>
          <Link href="/business/proposals" className="btn btn-secondary">Все предложения бизнеса</Link>
        </div>
        <ProposalList proposals={proposals} business returnToTask />
      </section>}
    </>
  );
}
