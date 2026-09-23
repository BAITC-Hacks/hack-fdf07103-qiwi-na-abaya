import { CalendarDays, Layers3, Pencil, Users } from "lucide-react";
import { requireRole } from "@/lib/session";
import { tags, dateLabel } from "@/lib/presentation";
import { db } from "@/lib/db";
import { PageHeading, EmptyState } from "@/components/ui";
import { Modal, SubmitButton } from "@/components/interactive";
import { saveProfile, switchTeam } from "@/app/actions";
export default async function TeamProfile() {
  const { team, teams } = await requireRole("team");
  if (!team)
    return (
      <EmptyState
        title="Команда пока не создана"
        description="Добавьте демонстрационные команды, чтобы начать."
      />
    );
  const [total, accepted, points] = await Promise.all([
    db.proposal.count({ where: { teamId: team.id } }),
    db.proposal.count({ where: { teamId: team.id, status: "ACCEPTED" } }),
    db.proposal.aggregate({ where: { teamId: team.id }, _sum: { awardedPoints: true } }),
  ]);
  const editForm = (
    <form action={saveProfile} className="space-y-4">
      <label className="field">
        Название команды *
        <input
          className="input"
          name="name"
          defaultValue={team.name}
          required
          maxLength={100}
        />
      </label>
      <label className="field">
        О команде *
        <textarea
          className="input min-h-28"
          name="description"
          defaultValue={team.description}
          required
          maxLength={2000}
        />
      </label>
      {(["skills", "technologies", "interests"] as const).map((key, i) => (
        <label className="field" key={key}>
          {["Навыки", "Технологии", "Интересы"][i]} · через запятую
          <input
            className="input"
            name={key}
            defaultValue={tags(team[key]).join(", ")}
            maxLength={1000}
          />
        </label>
      ))}
      <SubmitButton>Сохранить профиль</SubmitButton>
    </form>
  );
  return (
    <>
      <PageHeading
        eyebrow="Покажите, что вы умеете"
        title="Профиль команды"
        description="Навыки и интересы помогают находить подходящие задачи."
        action={
          <Modal title="Редактировать профиль" trigger="Редактировать профиль">
            {editForm}
          </Modal>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div className="panel overflow-hidden">
          <div className="relative h-32 overflow-hidden bg-[#29243f]">
            <div
              aria-hidden
              className="absolute -right-5 -top-12 size-64 rounded-full border-[35px] border-violet-300/10"
            />
            <Layers3
              size={60}
              className="absolute right-12 top-10 text-violet-300/30"
            />
          </div>
          <div className="px-6 pb-7">
            <span className="relative -mt-9 grid size-20 place-items-center rounded-2xl border-4 border-white bg-violet-100 text-violet-600">
              <Users size={32} />
            </span>
            <h2 className="mt-4 text-2xl font-bold">{team.name}</h2>
            <p className="muted mt-3 whitespace-pre-wrap">{team.description}</p>
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <CalendarDays size={14} />
              На платформе с {dateLabel(team.createdAt)}
            </p>
            <div className="mt-7 space-y-6 border-t border-slate-100 pt-6">
              {(["skills", "technologies", "interests"] as const).map(
                (key, i) => (
                  <section key={key}>
                    <h3 className="mb-3 text-xs font-bold">
                      {["Навыки", "Технологии", "Интересы"][i]}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {tags(team[key]).length ? (
                        tags(team[key]).map((tag) => (
                          <span
                            className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700"
                            key={tag}
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">
                          Пока не указаны
                        </span>
                      )}
                    </div>
                  </section>
                ),
              )}
            </div>
          </div>
        </div>
        <aside className="space-y-5">
          <div className="panel p-5">
            <h2 className="mb-5 text-sm font-bold">Ваша активность</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong className="text-3xl">{total}</strong>
                <p className="mt-2 text-xs text-slate-500">Откликов</p>
              </div>
              <div>
                <strong className="text-3xl text-emerald-600">
                  {accepted}
                </strong>
                <p className="mt-2 text-xs text-slate-500">Принято</p>
              </div>
            </div>
          </div>
          <div className="panel p-5"><h2 className="text-sm font-bold">Баллы команды</h2><p className="my-3 text-3xl font-bold text-violet-700">{points._sum.awardedPoints ?? 0}</p><p className="text-xs leading-relaxed text-slate-500">За прогресс, вручную подтверждённый бизнесом. До 100 баллов за отклик, без повторного начисления. Рейтинг готовности бизнес-задач — отдельная основная механика.</p></div>
          <form action={switchTeam} className="panel space-y-4 p-5">
            <p className="flex items-center gap-2 text-xs font-bold">
              <Pencil size={14} />
              Демонстрационный профиль
            </p>
            <label className="field">
              Активная команда
              <select className="input" name="teamId" defaultValue={team.id}>
                {teams.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton className="btn btn-secondary w-full">
              Выбрать команду
            </SubmitButton>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Переключение позволяет посмотреть MVP от лица разных команд.
            </p>
          </form>
        </aside>
      </div>
    </>
  );
}
