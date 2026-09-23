"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
const text = (data: FormData, key: string, max: number) =>
  String(data.get(key) ?? "")
    .trim()
    .slice(0, max);
export async function switchRole(data: FormData) {
  const role = data.get("role");
  if (role !== "team" && role !== "business") return;
  (await cookies()).set("qadam-role", role, cookieOptions);
  redirect(
    role === "team" ? "/catalog?notice=team" : "/business?notice=business",
  );
}
export async function switchTeam(data: FormData) {
  await requireRole("team");
  const team = await db.team.findUnique({
    where: { id: text(data, "teamId", 100) },
  });
  if (!team) redirect("/team/profile?notice=invalid");
  (await cookies()).set("qadam-team", team.id, cookieOptions);
  redirect(`/team/profile?notice=switched&event=${Date.now()}`);
}
export async function saveProfile(data: FormData) {
  const { team } = await requireRole("team");
  if (!team) redirect("/team/profile?notice=invalid");
  const name = text(data, "name", 100);
  const description = text(data, "description", 2000);
  if (!name || !description) redirect("/team/profile?notice=invalid");
  const list = (key: string) =>
    [
      ...new Set(
        text(data, key, 1000)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ].slice(0, 20);
  await db.team.update({
    where: { id: team.id },
    data: {
      name,
      description,
      skills: list("skills"),
      technologies: list("technologies"),
      interests: list("interests"),
    },
  });
  revalidatePath("/", "layout");
  redirect(`/team/profile?notice=saved&event=${Date.now()}`);
}
