import { redirect } from "next/navigation";
import type { SearchParams } from "@/components/task-list";
// Keep previously shared catalog URLs and their filters working.
export default async function LegacyCatalog({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value))
      for (const item of value) query.append(key, item);
  }
  redirect(`/tasks${query.size ? `?${query.toString()}` : ""}`);
}
