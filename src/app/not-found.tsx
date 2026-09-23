import { EmptyState } from "@/components/ui";
export default function NotFound() {
  return (
    <EmptyState
      title="Задача не найдена"
      description="Возможно, она ещё не опубликована или ссылка изменилась."
      href="/tasks"
      action="Открыть каталог"
    />
  );
}
