import { z } from "zod";
export const proposalSchema = z.strictObject({
  taskId: z.string().trim().min(1).max(100),
  solutionIdea: z
    .string()
    .trim()
    .min(10, "Опишите идею: минимум 10 символов.")
    .max(4000, "Идея должна быть короче 4000 символов."),
  plan: z
    .string()
    .trim()
    .min(10, "Добавьте план: минимум 10 символов.")
    .max(6000, "План должен быть короче 6000 символов."),
  estimatedTime: z
    .string()
    .trim()
    .min(1, "Укажите срок.")
    .max(120, "Срок должен быть короче 120 символов."),
  prototypeUrl: z
    .string()
    .trim()
    .max(1000, "Ссылка должна быть короче 1000 символов.")
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return (
          ["http:", "https:"].includes(url.protocol) &&
          !url.username &&
          !url.password
        );
      } catch {
        return false;
      }
    }, "Укажите ссылку http:// или https:// без пароля, либо оставьте поле пустым."),
});
export type ProposalResult = { ok: boolean; message: string };

export type ProposalInput = z.infer<typeof proposalSchema>;
