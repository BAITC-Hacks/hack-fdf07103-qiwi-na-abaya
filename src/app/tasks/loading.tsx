export default function CatalogLoading() {
  return (
    <div role="status" aria-label="Загрузка задач">
      <span className="sr-only">Загружаем задачи…</span>
      <div className="skeleton mb-3 h-9 w-80 max-w-full" />
      <div className="skeleton mb-7 h-4 w-96 max-w-full" />
      <div className="skeleton mb-7 h-36" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="panel space-y-5 p-6">
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-7 w-4/5" />
            <div className="skeleton h-20" />
            <div className="skeleton h-20" />
            <div className="skeleton h-5 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
