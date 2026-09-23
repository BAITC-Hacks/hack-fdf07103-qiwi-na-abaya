import { Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { tags, matchReasons } from "@/lib/presentation";
import { PageHeading, TaskCard, EmptyState } from "@/components/ui";
export default async function Recommendations() {
  const { team } = await requireRole("team");
  const tasks = await db.task.findMany({
    where: { status: "PUBLISHED" },
    include: { _count: { select: { proposals: true } } },
  });
  const profile = team
    ? [
        ...tags(team.skills),
        ...tags(team.technologies),
        ...tags(team.interests),
      ]
    : [];
  const results = tasks
    .map((task) => ({
      task,
      reasons: matchReasons(tags(task.skills), task.industry, profile),
    }))
    .filter((item) => item.reasons.length)
    .sort(
      (a, b) =>
        b.reasons.length - a.reasons.length || b.task.score - a.task.score,
    );
  return (
    <>
      <PageHeading
        eyebrow={team?.name ?? "Ваша команда"}
        title="Задачи в вашем ритме"
        description="Подборка по навыкам, технологиям и интересам команды. Решение, за что браться, принимаете вы."
      />
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
        <Sparkles size={21} className="shrink-0 text-violet-600" />
        <p className="text-xs leading-relaxed text-violet-800">
          Показываем точные совпадения с профилем, без скрытого алгоритма
          назначения. Обновите навыки в профиле, чтобы изменить подборку.
        </p>
      </div>
      {results.length ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {results.map(({ task, reasons }) => (
            <TaskCard key={task.id} task={task} reason={reasons.join(", ")} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Давайте познакомимся с вашей командой"
          description="Добавьте навыки и интересы. Или посмотрите все доступные задачи в каталоге."
          href="/team/profile"
          action="Заполнить профиль"
        />
      )}
    </>
  );
}
