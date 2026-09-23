/** Deterministic relevance, independent of task readiness and proposal decisions. */
export type MatchingProfile = { interests: unknown; skills: unknown; technologies: unknown };
export type MatchingTask = { industry: string; skills: unknown; title: string; context: string; need: string };
export type TaskMatch = { matchScore: number; matchedSkills: string[]; reasons: string[] };

const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase("ru").replaceAll("ё", "е").trim().replace(/\s+/g, " ");
// Explicit equivalents only; no inferred skills or generated facts.
const equivalents = [
  ["анализ данных", "data analysis"],
  ["аналитика", "analytics"],
  ["ритейл", "retail"],
  ["образование", "education"],
  ["javascript", "js"],
  ["typescript", "ts"],
  ["node.js", "nodejs"],
  ["next.js", "nextjs"],
];
const canonical = (value: string) => equivalents.find(group => group.includes(normalize(value)))?.[0] ?? normalize(value);
function entries(value: unknown): string[] {
  const unique = new Map<string, string>();
  if (Array.isArray(value)) for (const item of value) {
    if (typeof item === "string" && item.trim() && !unique.has(canonical(item))) unique.set(canonical(item), item.trim());
  }
  return [...unique.values()];
}
function mentions(text: string, value: string): boolean {
  const variants = equivalents.find(group => group.includes(canonical(value))) ?? [normalize(value)];
  return variants.some(variant => {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Preserve punctuation in technologies; Java != JavaScript, SQL != NoSQL, C != C++.
    return new RegExp(`(?<![\\p{L}\\p{N}_+#.-])${escaped}(?![\\p{L}\\p{N}_+#-]|\\.[\\p{L}\\p{N}])`, "u").test(normalize(text));
  });
}
export function matchTask(profile: MatchingProfile, task: MatchingTask): TaskMatch {
  const abilities = entries([...entries(profile.skills), ...entries(profile.technologies)]);
  const abilityKeys = new Set(abilities.map(canonical));
  const requirements = entries(task.skills);
  const matchedSkills = requirements.filter(skill => abilityKeys.has(canonical(skill)));
  const textFields = [task.title, task.context, task.need];
  const interests = entries(profile.interests).filter(interest => [task.industry, ...textFields].some(text => mentions(text, interest)));
  const textSkills = abilities.filter(skill => textFields.some(text => mentions(text, skill)));
  const matchScore = Math.round((requirements.length ? 60 * matchedSkills.length / requirements.length : 0) + (interests.length ? 30 : 0) + (textSkills.length ? 10 : 0));
  const reasons: string[] = [];
  if (matchedSkills.length) reasons.push(`Совпадают требуемые навыки и технологии: ${matchedSkills.join(", ")}`);
  if (interests.length) reasons.push(`Ваши интересы встречаются в отрасли или описании: ${interests.join(", ")}`);
  if (textSkills.length) reasons.push(`В описании упомянуты ваши навыки и технологии: ${textSkills.join(", ")}`);
  if (!reasons.length) reasons.push("Совпадений с профилем пока нет. Вы всё равно можете изучить задачу и предложить решение.");
  return { matchScore, matchedSkills, reasons };
}
export function recommendTasks<T extends MatchingTask & { id: string }>(profile: MatchingProfile, tasks: T[]) {
  return tasks.map(task => ({ task, ...matchTask(profile, task) }))
    .sort((a, b) => b.matchScore - a.matchScore || a.task.id.localeCompare(b.task.id));
}
