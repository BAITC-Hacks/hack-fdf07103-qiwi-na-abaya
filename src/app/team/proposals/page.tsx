import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { PageHeading } from "@/components/ui";
import { ProposalList } from "@/components/proposal-list";
export default async function MyProposals() {
  const { team } = await requireRole("team");
  const proposals = team
    ? await db.proposal.findMany({
        where: { teamId: team.id },
        include: {
          task: { include: { business: { select: { name: true } } } },
          team: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];
  return (
    <>
      <PageHeading
        eyebrow={team?.name ?? "Пространство команды"}
        title="Мои отклики"
        description="Ваши идеи, планы и статус диалога с бизнесом."
      />
      <ProposalList proposals={proposals} />
    </>
  );
}
