import { EmptyState } from "@/components/ui";
export default function TaskNotFound() {
  return (
    <EmptyState
      title="Задача не найдена"
      description="Возможно, она ещё не опубликована или ссылка устарела. Посмотрите другие проекты в каталоге."
      href="/tasks"
      action="Открыть каталог"
    />
  );
}
