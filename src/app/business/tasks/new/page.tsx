import { ArrowLeft, FilePenLine, Lightbulb, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { createDraft } from "@/app/actions";
import { PageHeading } from "@/components/ui";
import { SubmitButton } from "@/components/interactive";
export default async function NewTask() {
  await requireRole("business");
  return (
    <>
      <PageHeading
        eyebrow="Каждая идея заслуживает первого шага"
        title="Начните с вашей задачи"
        description="Не нужен идеальный бриф. Расскажите, что сейчас не работает и что хотелось бы изменить."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <form action={createDraft} className="panel space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <span className="icon-tile">
              <FilePenLine size={20} />
            </span>
            <div>
              <h2 className="font-bold">Новый черновик</h2>
              <p className="muted mt-1 text-xs">
                Сохраните исходную идею, чтобы вернуться к ней позже.
              </p>
            </div>
          </div>
          <label className="field">
            Название задачи *
            <input
              name="title"
              className="input"
              required
              maxLength={150}
              placeholder="Например, сократить очередь в часы пик"
            />
          </label>
          <label className="field">
            Отрасль
            <input
              name="industry"
              className="input"
              maxLength={100}
              placeholder="Например, ритейл"
            />
          </label>
          <label className="field">
            Что хотите решить? *
            <textarea
              name="rawDescription"
              className="input min-h-52 resize-y"
              required
              maxLength={8000}
              placeholder="Опишите ситуацию своими словами: что происходит, кому это мешает и какого результата вы ждёте."
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <Link href="/business/tasks" className="btn btn-secondary">
              <ArrowLeft size={14} />К задачам
            </Link>
            <SubmitButton>Сохранить черновик</SubmitButton>
          </div>
        </form>
        <aside className="space-y-5">
          <div className="panel p-6">
            <Lightbulb className="text-amber-500" size={24} />
            <h2 className="mt-4 font-bold">Что стоит упомянуть</h2>
            <ul className="muted mt-4 space-y-3 text-sm">
              <li>Что происходит сейчас?</li>
              <li>Кто сталкивается с проблемой?</li>
              <li>Какие данные уже есть?</li>
              <li>Как выглядит хороший результат?</li>
            </ul>
          </div>
          <div className="flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
            <ShieldCheck size={22} className="shrink-0 text-emerald-600" />
            <p className="text-xs leading-relaxed text-emerald-800">
              Черновик виден только бизнесу. Публикация требует отдельного
              ручного подтверждения.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
