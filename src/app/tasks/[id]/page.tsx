import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, FileText, MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { tags, statusLabels } from "@/lib/presentation";
import { calculateReadiness } from "@/lib/scoring";
import { ReadinessBadge, ScoreBar } from "@/components/ui";
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
        className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-500"
        href={session.role === "business" ? "/business/tasks" : "/catalog"}
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
      <div className="mb-7">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="tag">{task.industry || "Отрасль не указана"}</span>
          <ReadinessBadge score={task.score} />
          <span className="text-xs text-slate-400">
            {statusLabels[task.status]}
          </span>
        </div>
        <h1 className="max-w-3xl text-2xl font-bold leading-tight sm:text-3xl">
          {task.title}
        </h1>
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Building2 size={15} />
          {task.business.name}
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
          {tags(task.skills).length > 0 && (
            <section className="panel p-6">
              <h2 className="mb-4 text-sm font-bold">Навыки и технологии</h2>
              <div className="flex flex-wrap gap-2">
                {tags(task.skills).map((skill) => (
                  <span key={skill} className="tag">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="space-y-5">
          <section className="panel p-6">
            <h2 className="mb-5 font-bold">Готовность к старту</h2>
            <ScoreBar score={task.score} />
            <div className="mt-6 space-y-4">
              {breakdown.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-slate-500">{item.label}</span>
                    <strong
                      className={
                        item.points === item.max
                          ? "text-emerald-600"
                          : "text-slate-400"
                      }
                    >
                      {item.points}/{item.max}
                    </strong>
                  </div>
                  {item.missingFields.length > 0 && (
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                      {item.hint}
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
            {session.role === "business" && (
              <Link
                className="btn btn-secondary mt-4 w-full"
                href="/business/proposals"
              >
                Посмотреть предложения
              </Link>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
