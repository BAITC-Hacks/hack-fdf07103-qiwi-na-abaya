import { ArrowDown, ArrowUpRight, BriefcaseBusiness, CircleCheck, FilePenLine, Layers3, MessageSquare, Sparkles, Users } from "lucide-react";
import { db } from "@/lib/db";
import Link from "next/link";
import { readinessLabels } from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  const [business, tasks, teams, proposalCount, draftCount] = await Promise.all([
    db.business.findFirst({ orderBy: { createdAt: "asc" } }),
    db.task.findMany({ where: { status: "PUBLISHED" }, orderBy: { score: "desc" }, include: { _count: { select: { proposals: true } } } }),
    db.team.findMany({ orderBy: { name: "asc" } }),
    db.proposal.count(),
    db.task.count({ where: { status: "DRAFT" } }),
  ]);
  const stats = [
    { label: "Открытых задач", value: tasks.length, icon: BriefcaseBusiness },
    { label: "Студенческих команд", value: teams.length, icon: Users },
    { label: "Предложений", value: proposalCount, icon: MessageSquare },
    { label: "Черновиков", value: draftCount, icon: FilePenLine },
  ];
  return (
    <div className="mx-auto max-w-7xl px-5 pb-12 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-5 border-b border-slate-200 py-6">
        <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><span className="rounded-xl bg-violet-600 p-2 text-white"><Layers3 size={23} /></span> qadam<span className="text-violet-600">.</span></Link>
        <nav aria-label="Основная навигация" className="flex gap-6 text-sm font-semibold text-slate-600"><a href="#tasks" className="hover:text-violet-700">Задачи</a><a href="#teams" className="hover:text-violet-700">Команды</a></nav>
        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500">Qiwi na abaya / MVP</div>
      </header>
      <main>
        <section className="relative my-8 overflow-hidden rounded-3xl bg-[#191c35] px-7 py-10 text-white sm:px-12 sm:py-14">
          <div aria-hidden className="absolute -right-24 -top-32 size-96 rounded-full border-[55px] border-violet-400/10" />
          <div className="relative max-w-2xl">
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300"><Sparkles size={16} /> Маленький шаг. Реальный результат.</p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Бизнес-задачи.<br /><span className="text-violet-300">Студенческие решения.</span></h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300">Помогаем бизнесу сформулировать задачу, а командам — найти проект, который имеет значение.</p>
            <a href="#tasks" className="mt-8 inline-flex items-center gap-3 rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold transition hover:bg-violet-400">Посмотреть задачи <ArrowDown size={17} /></a>
          </div>
        </section>
        <section aria-label="Статистика платформы" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-3xl font-bold tracking-tight">{value}</span><Icon className="text-violet-500" size={21} /></div><p className="mt-2 text-sm text-slate-500">{label}</p></div>)}
        </section>
        <section id="tasks" className="scroll-mt-6 pt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-600">От идеи к действию</p><h2 className="text-2xl font-bold tracking-tight">Задачи бизнеса</h2></div><p className="text-sm text-slate-500">{business?.name ?? "Демонстрационная площадка"} · демоданные</p></div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => <article key={task.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-500">{task.industry}</span><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{readinessLabels[task.readinessLevel]}</span></div>
              <h3 className="text-lg font-bold leading-snug">{task.title}</h3><p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">{task.need}</p>
              <div className="my-5 flex flex-wrap gap-2">{(Array.isArray(task.skills) ? task.skills : []).filter((skill): skill is string => typeof skill === "string").map((skill) => <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{skill}</span>)}</div>
              <div className="border-t border-slate-100 pt-4"><div className="mb-2 flex justify-between text-xs"><span className="text-slate-500">Готовность задачи</span><strong className="text-violet-700">{task.score} / 100</strong></div><div role="meter" aria-label="Рейтинг готовности" aria-valuemin={0} aria-valuemax={100} aria-valuenow={task.score} className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${task.score}%` }} /></div><p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><MessageSquare size={14} /> Предложений: {task._count.proposals}</p></div>
            </article>)}
          </div>
          {tasks.length === 0 && <p className="rounded-2xl bg-white p-6 text-slate-500">Опубликованных задач пока нет.</p>}
          <p className="mt-5 flex items-start gap-2 text-sm text-slate-500"><CircleCheck size={17} className="mt-0.5 shrink-0 text-violet-500" /> Рейтинг показывает заполненность карточки. Задачи с низким рейтингом также видны командам.</p>
        </section>
        <section id="teams" className="scroll-mt-6 pt-12"><h2 className="mb-6 text-2xl font-bold tracking-tight">Команды, готовые решать</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{teams.map((team) => <article key={team.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-bold">{team.name}</h3><Users size={18} className="text-violet-500" /></div><p className="mt-3 text-sm leading-relaxed text-slate-500">{team.description}</p></article>)}</div></section>
      </main>
      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500"><span>Qadam · Qiwi na abaya · 2026</span><span className="flex items-center gap-1">Демонстрационные профили и задачи <ArrowUpRight size={14} /></span></footer>
    </div>
  );
}
