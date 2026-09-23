import Link from "next/link";
import { Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { recommendTasks } from "@/lib/recommendations";
import { PageHeading, TaskCard, EmptyState } from "@/components/ui";
export default async function Recommendations() {
  const { team } = await requireRole("team");
  const tasks = await db.task.findMany({
    where: { status: "PUBLISHED" },
    include: {
      business: { select: { name: true } },
      _count: { select: { proposals: true } },
    },
  });
  const results = recommendTasks(team ?? { interests: [], skills: [], technologies: [] }, tasks);
  return (
    <>
      <PageHeading
        eyebrow={team?.name ?? "Ваша команда"}
        title="Рекомендации для команды"
        action={<Link href="/tasks" className="btn btn-secondary">Общий каталог</Link>}
        description="Подборка по навыкам, технологиям и интересам команды. Решение, за что браться, принимаете вы."
      />
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
        <Sparkles size={21} className="shrink-0 text-violet-600" />
        <p className="text-xs leading-relaxed text-violet-800">
          Совпадение с командой — соответствие вашему профилю. Готовность задачи — полнота бизнес-брифа: это отдельный рейтинг.
          Все опубликованные задачи доступны, даже при совпадении 0%. Выбор команды остаётся за бизнесом.
          <Link href="/team/profile" className="ml-1 font-semibold underline">Обновить профиль</Link>
        </p>
      </div>
      <details className="panel mb-6 p-4 text-xs leading-relaxed text-slate-600">
        <summary className="cursor-pointer font-semibold">Как рассчитывается совпадение</summary>
        <p className="mt-3">До 60 баллов — доля требуемых навыков, которые есть у команды; 30 — хотя бы один интерес в отрасли, названии, контексте или потребности; 10 — хотя бы один навык или технология команды в названии, контексте или потребности. Неуказанные данные дают 0. Учитываем регистр, пробелы и небольшой словарь эквивалентов, например «Data Analysis» и «Анализ данных». Это ориентир, а не вероятность успеха.</p>
      </details>
      <p className="mb-4 text-xs text-slate-500">Задач: {results.length} · По убыванию совпадения с командой</p>
      {results.length ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {results.map(({ task, ...match }) => (
            <TaskCard key={task.id} task={task} match={match} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Опубликованных задач пока нет"
          description="Когда бизнес опубликует задачи, здесь появится подборка по вашему профилю."
          href="/tasks"
          action="Открыть каталог"
        />
      )}
    </>
  );
}
