import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
export const metadata: Metadata = {
  title: "Qadam · задачи с реальным смыслом",
  description: "Платформа бизнес-задач и студенческих решений.",
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  const pendingCount = session.business
    ? await db.proposal.count({
        where: { task: { businessId: session.business.id }, status: "PENDING" },
      })
    : 0;
  const name =
    (session.role === "business"
      ? session.business?.name
      : session.team?.name) ?? "Демопрофиль";
  return (
    <html lang="ru">
      <body>
        <AppShell
          role={session.role}
          name={name}
          contactName={
            session.role === "business"
              ? (session.business?.contactName ?? name)
              : name
          }
          pendingCount={pendingCount}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
