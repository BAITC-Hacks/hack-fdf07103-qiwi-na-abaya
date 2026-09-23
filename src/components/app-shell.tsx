"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, Suspense } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronRight,
  Compass,
  FolderOpen,
  Layers3,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Plus,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { switchRole } from "@/app/actions";
import { Toast } from "./interactive";

const businessLinks = [
  { href: "/business", label: "Обзор", icon: LayoutDashboard },
  { href: "/business/tasks/new", label: "Создать задачу", icon: Plus },
  { href: "/business/tasks", label: "Мои задачи", icon: FolderOpen },
  { href: "/business/proposals", label: "Предложения", icon: MessageSquare },
  { href: "/catalog", label: "Каталог", icon: Compass },
];
const teamLinks = [
  { href: "/catalog", label: "Каталог задач", icon: Compass },
  { href: "/team/recommendations", label: "Рекомендации", icon: Sparkles },
  { href: "/team/proposals", label: "Мои отклики", icon: MessageSquare },
  { href: "/team/profile", label: "Профиль команды", icon: Users },
];
export function AppShell({
  role,
  name,
  contactName,
  pendingCount,
  children,
}: {
  role: string;
  name: string;
  contactName: string;
  pendingCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const links = role === "business" ? businessLinks : teamLinks;
  const current =
    links.find((link) => pathname === link.href)?.label ?? "Карточка задачи";
  const navigation = (
    <>
      <Link
        className="brand"
        href={role === "business" ? "/business" : "/catalog"}
        onClick={() => drawer.current?.close()}
      >
        <span className="brand-icon">
          <Layers3 size={24} />
        </span>
        qadam<span className="text-violet-600">.</span>
      </Link>
      <p className="mb-3 mt-10 px-3 text-[10px] font-bold tracking-[.18em] text-slate-400">
        РАБОЧЕЕ ПРОСТРАНСТВО
      </p>
      <nav aria-label="Основная навигация" className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => drawer.current?.close()}
            className={`nav-link ${pathname === href ? "active" : ""}`}
            aria-current={pathname === href ? "page" : undefined}
          >
            <Icon size={19} />
            <span>{label}</span>
            {label === "Предложения" && pendingCount > 0 && (
              <span className="nav-counter">{pendingCount}</span>
            )}
          </Link>
        ))}
      </nav>
      <div className="sidebar-tip">
        <Sparkles size={20} className="text-violet-500" />
        <h3 className="mt-3 text-sm font-bold">Ясная задача — сильный старт</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Рейтинг помогает увидеть, чего не хватает для первого шага.
        </p>
        <Link
          onClick={() => drawer.current?.close()}
          href={
            role === "business" ? "/business/tasks" : "/team/recommendations"
          }
          className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-violet-700"
        >
          {role === "business" ? "К моим задачам" : "Подобрать задачу"}
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="mt-auto border-t border-slate-100 pt-5">
        <p className="text-xs font-semibold text-slate-500">Qiwi na abaya</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Hackathon edition · 2026
        </p>
      </div>
    </>
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <aside className="sidebar">{navigation}</aside>
      <dialog
        className="mobile-drawer"
        ref={drawer}
        aria-label="Навигация"
        onClick={(e) => {
          if (e.target === e.currentTarget) drawer.current?.close();
        }}
      >
        <button
          className="icon-button absolute right-3 top-3"
          aria-label="Закрыть меню"
          onClick={() => drawer.current?.close()}
        >
          <X size={20} />
        </button>
        <div className="flex h-full flex-col">{navigation}</div>
      </dialog>
      <div className="app-main">
        <header className="topbar">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="icon-button lg:!hidden"
              aria-label="Открыть меню"
              onClick={() => drawer.current?.showModal()}
            >
              <Menu size={22} />
            </button>
            <span className="hidden text-xs text-slate-400 sm:inline">
              {role === "business" ? "Бизнес" : "Команда"}
            </span>
            <ChevronRight
              size={13}
              className="hidden text-slate-300 sm:block"
            />
            <span className="truncate text-sm font-medium">{current}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <form
              action={switchRole}
              className="role-switch"
              aria-label="Выбор роли"
            >
              <button
                name="role"
                value="business"
                aria-pressed={role === "business"}
                className={role === "business" ? "selected" : ""}
              >
                <BriefcaseBusiness size={14} />
                <span>Бизнес</span>
              </button>
              <button
                name="role"
                value="team"
                aria-pressed={role === "team"}
                className={role === "team" ? "selected" : ""}
              >
                <Users size={14} />
                <span>Команда</span>
              </button>
            </form>
            <div className="hidden items-center gap-3 border-l border-slate-200 pl-5 xl:flex">
              <div className="text-right">
                <p className="max-w-40 truncate text-xs font-bold">{name}</p>
                <p className="text-[10px] text-slate-400">Демопрофиль</p>
              </div>
              <span className="avatar">
                <UserRound size={18} aria-label={contactName} />
              </span>
            </div>
          </div>
        </header>
        <main id="main" className="page-container">
          {children}
        </main>
        <footer className="app-footer">
          <span>Сделано для реальных задач.</span>
          <span>Qadam · пространство возможностей</span>
        </footer>
      </div>
      <Suspense>
        <Toast key={pathname} />
      </Suspense>
    </>
  );
}
