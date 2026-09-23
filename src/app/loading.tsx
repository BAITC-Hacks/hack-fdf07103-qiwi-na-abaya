export default function Loading() {
  return (
    <div role="status" aria-label="Загрузка страницы">
      <span className="sr-only">Загружаем данные…</span>
      <div className="skeleton mb-3 h-8 w-52" />
      <div className="skeleton mb-8 h-4 w-64 max-w-full" />
      <div className="skeleton mb-6 h-44" />
      <div className="mb-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-32" />
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton h-60" />
        ))}
      </div>
    </div>
  );
}
