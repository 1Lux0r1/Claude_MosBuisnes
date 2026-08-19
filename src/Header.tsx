import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";
import { SEARCH_INDEX, type SearchHit } from "./data";

const GROUP_ICON: Record<string, string> = { Действия: "spark", Услуги: "clipboard", "Партнёры": "star", Новости: "news" };

function StatusBar({ offline }: { offline: boolean }) {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
  );
  useEffect(() => {
    const t = window.setInterval(
      () => setTime(new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })),
      20_000,
    );
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="flex items-center justify-between px-6 pt-3.5 pb-1 text-[13px] font-extrabold tracking-tight">
      <span>{time}</span>
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 18 12" className="h-3 w-[18px] fill-current" aria-hidden="true">
          <rect x="0" y="7" width="3" height="5" rx="1" />
          <rect x="5" y="4.5" width="3" height="7.5" rx="1" />
          <rect x="10" y="2" width="3" height="10" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" opacity="0.35" />
        </svg>
        {offline ? (
          <Icon name="wifi-off" className="h-3.5 w-3.5 text-danger" strokeWidth={2.2} />
        ) : (
          <svg viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-3 w-4" aria-hidden="true">
            <path d="M1.5 4.2a10.2 10.2 0 0 1 13 0M3.9 6.8a6.6 6.6 0 0 1 8.2 0M6.3 9.2a3 3 0 0 1 3.4 0" />
            <circle cx="8" cy="11" r="0.95" fill="currentColor" stroke="none" />
          </svg>
        )}
        <svg viewBox="0 0 27 12" className="h-3 w-[26px]" aria-hidden="true">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="16" height="8" rx="1.6" fill="currentColor" />
          <rect x="23.5" y="4" width="2.5" height="4" rx="1.2" fill="currentColor" opacity="0.4" />
        </svg>
      </span>
    </div>
  );
}

export default function Header({
  tab, onBack, onOpenProfile, onOpenSettings, onLogout, query, setQuery, onHit, offline,
}: {
  tab: number;
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  query: string;
  setQuery: (q: string) => void;
  onHit: (h: SearchHit) => void;
  offline: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const blurTimer = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => window.clearTimeout(blurTimer.current), []);

  /* Закрытие меню профиля по клику вне его */
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  /* При смене вкладки меню закрывается — иконка сама по себе никуда не ведёт */
  useEffect(() => setMenuOpen(false), [tab]);

  const hits = query.trim()
    ? SEARCH_INDEX.filter((h) => (h.title + " " + (h.sub ?? "")).toLowerCase().includes(query.trim().toLowerCase())).slice(0, 7)
    : [];
  const showOverlay = focused && (hits.length > 0 || query.trim().length > 0);

  const pick = (h: SearchHit) => {
    window.clearTimeout(blurTimer.current);
    onHit(h);
    setQuery("");
    setFocused(false);
    inputRef.current?.blur();
  };

  const menuItems: { label: string; icon: IconName; danger?: boolean; action: () => void }[] = [
    { label: "Профиль", icon: "user", action: onOpenProfile },
    { label: "Настройки", icon: "settings", action: onOpenSettings },
    { label: "Выйти", icon: "logout", danger: true, action: onLogout },
  ];

  return (
    <header className="relative z-40 border-b border-line/70 bg-card/90 backdrop-blur-md">
      <StatusBar offline={offline} />
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-1">
        {tab > 0 ? (
          <button
            onClick={onBack}
            className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-ink2"
            aria-label="Назад"
          >
            <Icon name="chevron-left" className="h-5 w-5" strokeWidth={2.1} />
          </button>
        ) : (
          <span className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-solid text-[13px] font-extrabold text-white">
            МБ
          </span>
        )}

        <div className="relative h-10 min-w-0 flex-1">
          <div className="flex h-full items-center gap-2 rounded-full bg-paper px-3.5 ring-accent/30 transition-shadow focus-within:ring-2">
            <Icon name="search" className="h-4 w-4 shrink-0 text-faint" strokeWidth={2.1} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                blurTimer.current = window.setTimeout(() => setFocused(false), 160);
              }}
              placeholder="Поиск по услугам, сервисам..."
              className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] font-semibold outline-none placeholder:font-medium placeholder:text-faint"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="press grid h-5 w-5 shrink-0 place-items-center rounded-full bg-line text-sub"
                aria-label="Очистить"
              >
                <Icon name="close" className="h-3 w-3" strokeWidth={2.4} />
              </button>
            )}
          </div>
        </div>

        {/* Аватар: только открывает выпадающее меню, никуда не переводит */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setMenuOpen((v) => !v);
            }}
            className={`press relative grid h-10 w-10 place-items-center rounded-full text-[13px] font-extrabold transition-all duration-300 ${
              menuOpen ? "bg-accent text-white ring-2 ring-accent/30" : "bg-accent-soft text-accent-deep"
            }`}
            aria-label="Меню профиля"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            АП
            <span className={`absolute right-0 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-danger transition-opacity duration-300 ${menuOpen ? "opacity-0" : "opacity-100"}`} />
          </button>

          {menuOpen && (
            <div
              className="animate-pop absolute right-0 top-[46px] z-50 w-48 origin-top-right overflow-hidden rounded-2xl border border-line/80 bg-card/95 shadow-float backdrop-blur-md"
              role="menu"
            >
              <div className="border-b border-line/60 px-4 py-2.5">
                <p className="text-[12.5px] font-extrabold tracking-tight">Анна Петрова</p>
                <p className="text-[10.5px] font-semibold text-sub">ООО «Вектор Групп»</p>
              </div>
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    item.action();
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    item.danger ? "text-danger hover:bg-danger-soft/60" : "text-ink2 hover:bg-paper"
                  }`}
                >
                  <Icon name={item.icon} className="h-[18px] w-[18px]" strokeWidth={2} />
                  <span className="text-[13px] font-bold">{item.label}</span>
                  {item.label === "Профиль" && tab === 3 && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showOverlay && (
        <div className="animate-fade-in absolute inset-x-3 top-full z-40 overflow-hidden rounded-2xl border border-line/80 bg-card shadow-float">
          {hits.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-[13px] font-extrabold">Ничего не нашлось</p>
              <p className="mt-1 text-[12px] font-medium text-sub">Попробуйте: «субсидия», «справка», «аренда»</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {["субсидия", "справка", "аренда", "патент"].map((s) => (
                  <button key={s} onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery(s)} className="press rounded-full bg-paper px-3 py-1.5 text-[12px] font-bold text-accent-deep">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul>
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(h)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-paper text-sub">
                      <Icon name={GROUP_ICON[h.group] as never} className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-extrabold">{h.title}</span>
                      {h.sub && <span className="block truncate text-[11px] font-semibold text-sub">{h.sub}</span>}
                    </span>
                    <span className="shrink-0 rounded-md bg-paper px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-faint">
                      {h.group}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </header>
  );
}
