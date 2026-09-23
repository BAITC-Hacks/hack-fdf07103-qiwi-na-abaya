import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
export default async function Home() {
  const { role } = await getSession();
  redirect(role === "team" ? "/catalog" : "/business");
}
