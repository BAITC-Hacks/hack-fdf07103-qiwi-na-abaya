import { z } from "zod";

export const proposalDecisionSchema = z.object({
  proposalId: z.string().min(1).max(200),
  status: z.enum(["ACCEPTED", "REJECTED"]),
  expectedStatus: z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
  confirmed: z.literal(true),
});
export type ProposalDecision = z.infer<typeof proposalDecisionSchema>;
export class ProposalDecisionError extends Error {}
