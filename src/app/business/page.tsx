import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  MessageSquare,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { dateLabel, statusLabels } from "@/lib/presentation";
import { getReadinessLevel, readinessLabels } from "@/lib/scoring";
import {
  EmptyState,
  PageHeading,
  ReadinessBadge,
  ScoreBar,
} from "@/components/ui";

export default async function BusinessDashboard() {
  const { business } = await requireRole("business");
  if (!business)
    return (
      <EmptyState
        title="Бизнес-профиль пока не создан"
        description="Добавьте демонстрационные данные, чтобы начать работу."
      />
    );
  const [tasks, proposals] = await Promise.all([
    db.task.findMany({
      where: { businessId: business.id },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      include: { _count: { select: { proposals: true } } },
    }),
    db.proposal.findMany({
      where: { task: { businessId: business.id } },
      include: { team: true, task: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const published = tasks.filter((task) => task.status === "PUBLISHED").length;
  const average = tasks.length
    ? Math.round(
        tasks.reduce((sum, task) => sum + task.score, 0) / tasks.length,
      )
    : 0;
  const drafts = tasks.filter((task) => task.status === "DRAFT").length;
  const pending = proposals.filter((item) => item.status === "PENDING").length;
  const stats = [
    {
      label: "Всего задач",
      value: tasks.length,
      hint: `${drafts} в черновиках`,
      icon: BriefcaseBusiness,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "Опубликовано",
      value: published,
      hint: "Доступны командам",
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Средняя готовность",
      value: average,
      hint: "Из 100 возможных баллов",
      icon: Target,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Предложений",
      value: proposals.length,
      hint: `${pending} на рассмотрении`,
      icon: MessageSquare,
      color: "text-sky-600 bg-sky-50",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow={business.name}
        title="Ваши идеи. Новые возможности."
        description="Всё, что нужно для следующего шага — в одном пространстве."
        action={
          <Link href="/business/tasks/new" className="btn btn-primary">
            <Plus size={16} />
            Создать задачу
          </Link>
        }
      />
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-[#25223f] p-6 text-white sm:p-8">
        <div
          aria-hidden
          className="absolute -right-10 -top-32 size-96 rounded-full border-[50px] border-white/[.035]"
        />
        <div className="relative flex items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-medium text-violet-200">
              <Sparkles size={12} />
              От идеи до первого решения
            </span>
            <h2 className="text-2xl font-bold leading-tight sm:text-[28px]">
              Большие решения начинаются
              <br className="hidden sm:block" /> с понятной задачи.
            </h2>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-slate-300">
              Добавьте контекст, материалы и критерии успеха. Чем яснее задача,
              тем проще команде предложить полезное решение.
            </p>
            <Link
              href="/business/tasks"
              className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-violet-200"
            >
              Улучшить мои задачи <ArrowRight size={14} />
            </Link>
          </div>
          <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-white/[.06] p-5 text-center md:block">
            <div
              className="mx-auto grid size-24 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#b6a1ff ${average}%, #49445f 0)`,
              }}
            >
              <div className="grid size-20 place-content-center rounded-full bg-[#353049]">
                <strong className="text-3xl">
                  {average}
                  <span className="text-sm text-violet-300">%</span>
                </strong>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-violet-200">
              Средняя готовность задач
            </p>
          </div>
        </div>
      </section>
      <section
        className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-4"
        aria-label="Статистика бизнеса"
      >
        {stats.map(({ label, value, hint, icon: Icon, color }) => (
          <article className="stat-card" key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">{label}</p>
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-lg ${color}`}
              >
                <Icon size={16} />
              </span>
            </div>
            <strong className="mt-3 block text-[32px] leading-none tracking-tight">
              {value}
            </strong>
            <p className="mt-3 text-[10px] text-slate-400">{hint}</p>
          </article>
        ))}
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
        <section className="panel min-w-0">
          <div className="panel-heading">
            <h2>
              Последние задачи{" "}
              <span className="ml-2 text-xs font-normal text-slate-400">
                {tasks.length}
              </span>
            </h2>
            <Link
              href="/business/tasks"
              className="flex items-center gap-1 text-xs font-semibold text-violet-600"
            >
              Все задачи <ArrowUpRight size={14} />
            </Link>
          </div>
          {tasks.length ? (
            <div className="divide-y divide-slate-100">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center gap-4 px-5 py-4"
                >
                  <span className="icon-tile !size-9">
                    <FileText size={17} />
                  </span>
                  <div className="min-w-0 flex-1 basis-40">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="line-clamp-2 text-xs font-bold hover:text-violet-600"
                    >
                      {task.title}
                    </Link>
                    <p className="mt-1.5 text-[10px] text-slate-400">
                      {statusLabels[task.status]} · {dateLabel(task.updatedAt)}
                    </p>
                  </div>
                  <div className="w-24">
                    <ReadinessBadge score={task.score} />
                    <p className="mt-1.5 text-[10px] text-slate-400">
                      {task.score} / 100 баллов
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Начнём с первой задачи"
              description="Опишите проблему, которую хочется решить."
              href="/business/tasks/new"
              action="Создать задачу"
            />
          )}
        </section>
        <div className="space-y-6">
          <section className="panel p-5">
            <div className="mb-5 flex items-center gap-2">
              <span className="icon-tile !size-8">
                <Target size={16} />
              </span>
              <h2 className="text-sm font-bold">Карта готовности</h2>
            </div>
            <div className="space-y-4">
              {(["DRAFT", "WORKABLE", "READY", "PRIORITY"] as const).map(
                (level, index) => {
                  const count = tasks.filter(
                    (task) => getReadinessLevel(task.score) === level,
                  ).length;
                  return (
                    <div key={level}>
                      <div className="mb-2 flex justify-between text-xs">
                        <span className="text-slate-500">
                          {readinessLabels[level]}{" "}
                          <span className="ml-1 text-[10px] text-slate-400">
                            {["0–39", "40–69", "70–89", "90–100"][index]}
                          </span>
                        </span>
                        <strong>{count}</strong>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${["bg-slate-400", "bg-amber-400", "bg-emerald-400", "bg-violet-500"][index]}`}
                          style={{
                            width: `${tasks.length ? (count / tasks.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
            <p className="mt-5 text-[10px] leading-relaxed text-slate-400">
              Любая опубликованная задача видна командам независимо от рейтинга.
            </p>
          </section>
          <section className="panel p-5">
            <p className="eyebrow">Следующий шаг</p>
            <h2 className="text-sm font-bold">
              {pending
                ? "Команды уже делятся идеями"
                : "Дайте идее больше контекста"}
            </h2>
            <p className="muted mt-2 text-xs">
              {pending
                ? `У вас ${pending} предложений на рассмотрении. Познакомьтесь с подходами команд.`
                : "Заполненная карточка помогает командам точнее понять потребность бизнеса."}
            </p>
            <Link
              href={pending ? "/business/proposals" : "/business/tasks"}
              className="btn btn-secondary mt-4 w-full"
            >
              {pending ? "Посмотреть предложения" : "Открыть задачи"}
              <ArrowRight size={14} />
            </Link>
          </section>
        </div>
      </div>
      {tasks.some((task) => task.status === "PUBLISHED") && (
        <section className="mt-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Готовы к сотрудничеству</h2>
            <Link href="/tasks" className="text-xs text-violet-600">
              В каталог →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {tasks
              .filter((task) => task.status === "PUBLISHED")
              .sort((a, b) => b.score - a.score)
              .slice(0, 2)
              .map((task) => (
                <Link
                  href={`/tasks/${task.id}`}
                  key={task.id}
                  className="panel p-5 hover:border-violet-200"
                >
                  <p className="eyebrow">{task.industry}</p>
                  <h3 className="mb-5 font-bold">{task.title}</h3>
                  <ScoreBar score={task.score} />
                </Link>
              ))}
          </div>
        </section>
      )}
    </>
  );
}
