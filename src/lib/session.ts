import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

export async function getSession() {
  const jar = await cookies();
  const role = jar.get("qadam-role")?.value === "team" ? "team" : "business";
  const [business, teams] = await Promise.all([
    db.business.findFirst({ orderBy: { createdAt: "asc" } }),
    db.team.findMany({ orderBy: { name: "asc" } }),
  ]);
  const team =
    teams.find((item) => item.id === jar.get("qadam-team")?.value) ?? teams[0];
  return { role, business, team, teams };
}
export async function requireRole(role: "business" | "team") {
  const session = await getSession();
  if (session.role !== role)
    redirect(session.role === "team" ? "/catalog" : "/business");
  return session;
}
