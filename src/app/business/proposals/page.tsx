import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { PageHeading } from "@/components/ui";
import { ProposalList } from "@/components/proposal-list";
export default async function Proposals() {
  const { business } = await requireRole("business");
  const proposals = business
    ? await db.proposal.findMany({
        where: { task: { businessId: business.id } },
        include: { task: true, team: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  return (
    <>
      <PageHeading
        eyebrow="Новые взгляды на ваши задачи"
        title="Предложения команд"
        description="Изучите идеи, планы и сроки. Выбор команды всегда остаётся за вами."
      />
      <div className="mb-6 flex flex-wrap gap-3">
        {(["PENDING", "ACCEPTED", "REJECTED"] as const).map((status, i) => (
          <span
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"
            key={status}
          >
            {["На рассмотрении", "Принято", "Отклонено"][i]}{" "}
            <strong className="ml-3 text-slate-800">
              {proposals.filter((p) => p.status === status).length}
            </strong>
          </span>
        ))}
      </div>
      <ProposalList proposals={proposals} business />
    </>
  );
}
