import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./Header";
import BottomNav from "./BottomNav";
import AIAssistant from "./AIAssistant";
import CalendarStrip from "./CalendarStrip";
import { CurrencyCarousel, NewsCarousel } from "./Carousels";
import {
  HomePromos, InterestingBlock, MAX_QUICK_ACTIONS, MIN_QUICK_ACTIONS, PartnersBlock, QUICK_ACTIONS_KEY,
  QuickActions, QuickActionsPicker, ServiceSections, loadEnabledQuickActionIds,
} from "./HomeBlocks";
import { EventsScreen, OfflineError, ServiceFilter, ServicesScreen } from "./screens";
import ProfileService from "./microservices/ProfileService";
import SettingsService from "./microservices/SettingsService";
import { HomeSkeleton, Reveal, Sheet, ToastProvider, useToast } from "./ui";
import { toggleFavorite, useFavorites } from "./data/favorites";
import { Icon } from "./icons";
import {
  NEWS, NEWS_SECTION_META, NEWS_SORT_OPTIONS, PARTNER_PAGES, QUICK_ACTIONS, SERVICE_CATALOG, SERVICE_SECTIONS, sortNews,
  type NewsItem, type NewsSection, type NewsSort, type Partner, type QuickAction, type SearchHit, type ServiceSection,
} from "./data";

type SheetState =
  | { kind: "action"; data: QuickAction }
  | { kind: "partner"; data: Partner }
  | { kind: "news"; data: NewsItem }
  | { kind: "newslist" }
  | null;

export default function App() {
  const [tab, setTab] = useState(0);
  const [dir, setDir] = useState<"left" | "right">("left");
  const [booting, setBooting] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [offline, setOffline] = useState(false);
  const [servicesCategory, setServicesCategory] = useState("Все");
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [profileRead, setProfileRead] = useState(false);
  const touchX = useRef<number | null>(null);
  const touchY = useRef<number | null>(null);
  const skipSwipe = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => setBooting(false), 1300);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (tab === 3) setProfileRead(true);
  }, [tab]);

  /* Циклические свайпы между вкладками */
  const go = (next: number, d: "left" | "right") => {
    setDir(d);
    setTab(((next % 4) + 4) % 4);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("input, textarea")) {
      skipSwipe.current = true;
      return;
    }
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
    /* не переключаем вкладку, если свайп начался внутри горизонтальной карусели */
    skipSwipe.current = !!t.closest?.("[data-hscroll]");
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null || touchY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    const dy = e.changedTouches[0].clientY - touchY.current;
    touchX.current = touchY.current = null;
    if (!skipSwipe.current && Math.abs(dx) > 75 && Math.abs(dy) < 48) {
      go(dx < 0 ? tab + 1 : tab - 1, dx < 0 ? "left" : "right");
    }
  };

  /* Стрелки клавиатуры — листание вкладок на десктопе */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (aiOpen || sheet) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") go(tab + 1, "left");
      if (e.key === "ArrowLeft") go(tab - 1, "right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, aiOpen, sheet]);

  function handleHit(hit: SearchHit) {
    const id = hit.id.split("-").slice(1).join("-");
    if (hit.group === "Действия") {
      const a = QUICK_ACTIONS.find((x) => x.id === id);
      if (a) setSheet({ kind: "action", data: a });
    } else if (hit.group === "Услуги") {
      const s = SERVICE_SECTIONS.find((x) => x.id === id);
      if (s) {
        setServicesCategory(s.category);
        go(1, "left");
      }
    } else if (hit.group === "Каталог услуг") {
      const s = SERVICE_CATALOG.find((x) => x.id === id);
      if (s) {
        setServicesCategory(s.category);
        go(1, "left");
      }
    } else if (hit.group === "Партнёры") {
      const p = PARTNER_PAGES.flatMap((pg) => pg.items).find((x) => x.id === id);
      if (p?.servicesCategory) {
        setServicesCategory(p.servicesCategory);
        go(1, "left");
      } else if (p) {
        setSheet({ kind: "partner", data: p });
      }
    } else {
      const n = NEWS.find((x) => x.id === id);
      if (n) setSheet({ kind: "news", data: n });
    }
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#e9ebf3]"
      style={{
        backgroundImage:
          "radial-gradient(560px 420px at 8% -4%, rgba(10,107,255,0.14), transparent 60%), radial-gradient(520px 420px at 102% 104%, rgba(225,29,58,0.10), transparent 60%), radial-gradient(#d4d8e6 1px, transparent 1px)",
        backgroundSize: "auto, auto, 22px 22px",
      }}
    >
      <div
        id="app-shell"
        className="relative mx-auto flex h-full w-full max-w-[400px] flex-col overflow-hidden bg-card text-ink shadow-[0_0_90px_-24px_rgba(14,18,32,0.35)] md:my-5 md:h-[calc(100%-40px)] md:max-w-[392px] md:rounded-[46px] md:border-[9px] md:border-ink-solid"
      >
        <ToastProvider>
          <Shell
            tab={tab}
            dir={dir}
            booting={booting}
            offline={offline}
            setOffline={setOffline}
            query={query}
            setQuery={setQuery}
            aiOpen={aiOpen}
            setAiOpen={setAiOpen}
            sheet={sheet}
            setSheet={setSheet}
            servicesCategory={servicesCategory}
            setServicesCategory={setServicesCategory}
            registered={registered}
            setRegistered={setRegistered}
            profileRead={profileRead}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onBack={() => go(0, "right")}
            onGoTab={(t) => go(t, t >= tab ? "left" : "right")}
            onRetry={() => {
              setBooting(true);
              window.setTimeout(() => setBooting(false), 1000);
            }}
            onHit={handleHit}
          />
        </ToastProvider>
      </div>
    </div>
  );
}

function Shell(props: {
  tab: number;
  dir: "left" | "right";
  booting: boolean;
  offline: boolean;
  setOffline: (v: boolean) => void;
  query: string;
  setQuery: (q: string) => void;
  aiOpen: boolean;
  setAiOpen: (v: boolean) => void;
  sheet: SheetState;
  setSheet: (s: SheetState) => void;
  servicesCategory: string;
  setServicesCategory: (c: string) => void;
  registered: Set<string>;
  setRegistered: (s: Set<string>) => void;
  profileRead: boolean;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onBack: () => void;
  onGoTab: (t: number) => void;
  onRetry: () => void;
  onHit: (h: SearchHit) => void;
}) {
  const {
    tab, dir, booting, offline, setOffline, query, setQuery, aiOpen, setAiOpen, sheet, setSheet,
    servicesCategory, setServicesCategory, registered, setRegistered, profileRead,
    onTouchStart, onTouchEnd, onBack, onGoTab, onRetry, onHit,
  } = props;

  const toast = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickActionIds, setQuickActionIds] = useState<string[]>(loadEnabledQuickActionIds);
  const [quickActionsPickerOpen, setQuickActionsPickerOpen] = useState(false);
  const [profileOpenTo, setProfileOpenTo] = useState<string | null>(null);
  const [autoApply, setAutoApply] = useState<{ id: string; values: Record<string, string> } | null>(null);
  const eventsBadge = useMemo(() => Math.max(0, 3 - registered.size), [registered]);

  const handleLogout = () => {
    setSettingsOpen(false);
    toast("Вы вышли из аккаунта (демо)", "logout");
    onGoTab(0);
  };

  /* Тизер витрины с Главной: открыть Личный кабинет сразу на странице витрины.
     setAiOpen(false) — на случай, если вызвано из чата ИИ-агента (кросс-продажа
     по отчёту/мерам поддержки): иначе оверлей чата остаётся поверх личного
     кабинета, и переход выглядит так, будто ничего не произошло. Для обычных
     вызовов (с Главной, из «Событий») aiOpen и так уже false — безвредно. */
  const openVitrina = () => {
    setAiOpen(false);
    setProfileOpenTo("vitrina");
    onGoTab(3);
  };

  /* Переходы из чата ИИ-агента: заявления и Радар требований — те же экраны
     личного кабинета, что и обычная навигация, просто открытые не с корня. */
  const openApplications = () => {
    setAiOpen(false);
    setProfileOpenTo("apps");
    onGoTab(3);
  };
  const openRequirements = () => {
    setAiOpen(false);
    setProfileOpenTo("requirements");
    onGoTab(3);
  };

  /* Оформление услуги из диалога с ИИ-агентом: ассистент собирает поля в чате,
     а открывает и отправляет заявку каталог («Услуги») — та же форма ApplyForm,
     что и при обычном оформлении, только уже заполненная. Пользователь видит
     и может поправить данные перед отправкой, а не отправляет вслепую из чата. */
  const openServiceApply = (id: string, values: Record<string, string>) => {
    setAutoApply({ id, values });
    setAiOpen(false);
    onGoTab(1);
  };

  const toggleQuickAction = (id: string) => {
    const isOn = quickActionIds.includes(id);
    if (isOn && quickActionIds.length <= MIN_QUICK_ACTIONS) {
      toast(`Минимум ${MIN_QUICK_ACTIONS} действия на панели`, "alert");
      return;
    }
    if (!isOn && quickActionIds.length >= MAX_QUICK_ACTIONS) {
      toast(`Максимум ${MAX_QUICK_ACTIONS} действий на панели`, "alert");
      return;
    }
    const next = isOn ? quickActionIds.filter((x) => x !== id) : [...quickActionIds, id];
    setQuickActionIds(next);
    localStorage.setItem(QUICK_ACTIONS_KEY, JSON.stringify(next));
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <Header
        tab={tab}
        onBack={onBack}
        onOpenProfile={() => onGoTab(3)}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={handleLogout}
        query={query}
        setQuery={setQuery}
        onHit={onHit}
        offline={offline}
      />

      <main
        key={`${tab}-${booting}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={`no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain ${dir === "left" ? "animate-slide-left" : "animate-slide-right"}`}
      >
        {booting ? (
          <HomeSkeleton />
        ) : (
          <>
            {tab === 0 &&
              (offline ? (
                <OfflineError onRetry={onRetry} />
              ) : (
                <HomeScreen
                  onQuickAction={(a) => setSheet({ kind: "action", data: a })}
                  quickActionIds={quickActionIds}
                  onOpenQuickActionsPicker={() => setQuickActionsPickerOpen(true)}
                  onSection={(s) => {
                    setServicesCategory(s.category);
                    onGoTab(1);
                  }}
                  onPartner={(p) => {
                    if (p.servicesCategory) {
                      setServicesCategory(p.servicesCategory);
                      onGoTab(1);
                    } else {
                      setSheet({ kind: "partner", data: p });
                    }
                  }}
                  onAllServices={() => {
                    setServicesCategory("Все");
                    onGoTab(1);
                  }}
                  onNews={(n) => setSheet({ kind: "news", data: n })}
                  onAllNews={() => setSheet({ kind: "newslist" })}
                  onOpenIntegrations={() => onGoTab(3)}
                  onOpenVitrina={openVitrina}
                />
              ))}
            {tab === 1 && (
              <ServicesScreen
                category={servicesCategory}
                onCategory={setServicesCategory}
                autoApply={autoApply}
                onAutoApplyConsumed={() => setAutoApply(null)}
              />
            )}
            {tab === 2 && (
              <EventsScreen
                registered={registered}
                onRegister={(id) => {
                  const next = new Set(registered);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  setRegistered(next);
                }}
                onOpenVitrina={openVitrina}
                onOpenIntegrations={() => onGoTab(3)}
              />
            )}
            {tab === 3 && (
              <ProfileService openTo={profileOpenTo} onOpened={() => setProfileOpenTo(null)} />
            )}
          </>
        )}
      </main>

      <BottomNav
        tab={tab}
        onTab={onGoTab}
        onAI={() => setAiOpen(true)}
        eventsBadge={eventsBadge}
        profileBadge={profileRead ? 0 : 1}
      />

      <AIAssistant
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onOpenIntegrations={() => { setAiOpen(false); onGoTab(3); }}
        onOpenApplications={openApplications}
        onOpenRequirements={openRequirements}
        onOpenVitrina={openVitrina}
        onOpenServiceApply={openServiceApply}
      />
      <SettingsService open={settingsOpen} onClose={() => setSettingsOpen(false)} offline={offline} onOffline={setOffline} />
      <QuickActionsPicker
        open={quickActionsPickerOpen}
        onClose={() => setQuickActionsPickerOpen(false)}
        enabled={quickActionIds}
        onToggle={toggleQuickAction}
      />
      <ActionSheetView sheet={sheet} onClose={() => setSheet(null)} onNavigate={setSheet} />
    </div>
  );
}

/* ---------- Главный экран ---------- */
function HomeScreen({
  onQuickAction, quickActionIds, onOpenQuickActionsPicker, onSection, onPartner, onAllServices, onNews, onAllNews, onOpenIntegrations, onOpenVitrina,
}: {
  onQuickAction: (a: QuickAction) => void;
  quickActionIds: string[];
  onOpenQuickActionsPicker: () => void;
  onSection: (s: ServiceSection) => void;
  onPartner: (p: Partner) => void;
  onAllServices: () => void;
  onNews: (n: NewsItem) => void;
  onAllNews: () => void;
  onOpenIntegrations: () => void;
  onOpenVitrina: () => void;
}) {
  return (
    <div className="space-y-7 pt-4 pb-8">
      <HomePromos onOpenVitrina={onOpenVitrina} />
      <CalendarStrip onOpenIntegrations={onOpenIntegrations} />
      <QuickActions onPick={onQuickAction} enabled={quickActionIds} onOpenPicker={onOpenQuickActionsPicker} />
      <ServiceSections onPick={onSection} />
      <PartnersBlock onPick={onPartner} onAllServices={onAllServices} />
      <InterestingBlock />
      <CurrencyCarousel />
      <NewsCarousel onRead={onNews} onAllNews={onAllNews} />
      <Reveal>
        <p className="px-4 text-center text-[10.5px] font-bold text-faint">
          МосБизнес · Москва, 2026
        </p>
      </Reveal>
    </div>
  );
}

/* Склонение «новость» по числу — 1 новость, 2 новости, 5 новостей */
function pluralNews(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "новость";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "новости";
  return "новостей";
}

/* ---------- Шторки действий/партнёров/новостей ---------- */
function ActionSheetView({
  sheet, onClose, onNavigate,
}: {
  sheet: SheetState;
  onClose: () => void;
  onNavigate: (s: SheetState) => void;
}) {
  const toast = useToast();
  const [newsFilter, setNewsFilter] = useState<NewsSection | "all">("all");
  const [newsSort, setNewsSort] = useState<NewsSort>("new");
  const [sortOpen, setSortOpen] = useState(false);
  const [favView, setFavView] = useState(false);
  const favs = useFavorites();
  const sortRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sortOpen) return;
    const onDown = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [sortOpen]);

  if (!sheet) return null;

  if (sheet.kind === "newslist") {
    const base = newsFilter === "all" ? NEWS : NEWS.filter((n) => n.section === newsFilter);
    const filtered = sortNews(favView ? base.filter((n) => favs.has(n.id)) : base, newsSort);
    const sortLabel = NEWS_SORT_OPTIONS.find((o) => o.value === newsSort)?.label.toLowerCase() ?? "";

    return (
      <div className="animate-fade-in absolute inset-0 z-[62] flex flex-col bg-paper">
        {/* relative z-20 поднимает слой шапки (у неё backdrop-blur создаёт свой
            контекст наложения) над прокручиваемой областью с карточками, иначе
            выпадающий список сортировки, выходящий из шапки вниз, перекрывается
            карточками (они идут в DOM позже при том же z-auto). */}
        <div className="relative z-20 border-b border-line/70 bg-card/90 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={onClose} className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-ink2" aria-label="Назад">
              <Icon name="chevron-left" className="h-5 w-5" strokeWidth={2.1} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[15px] font-semibold tracking-tight">Все новости</p>
              <p className="text-[11px] font-semibold text-sub">{filtered.length} {pluralNews(filtered.length)} · {sortLabel}</p>
            </div>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
            <button
              onClick={() => setNewsFilter("all")}
              className={`press shrink-0 rounded-full px-3 py-1.5 text-[12px] font-extrabold transition-colors ${
                newsFilter === "all" ? "bg-ink text-on-ink" : "bg-paper text-sub"
              }`}
            >
              Все
            </button>
            {(Object.keys(NEWS_SECTION_META) as NewsSection[]).map((s) => (
              <button
                key={s}
                onClick={() => setNewsFilter(s)}
                className={`press inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-extrabold transition-colors ${
                  newsFilter === s ? "bg-ink text-on-ink" : "bg-paper text-sub"
                }`}
              >
                <Icon name={NEWS_SECTION_META[s].icon} className="h-3.5 w-3.5" strokeWidth={2.2} />
                {NEWS_SECTION_META[s].label}
              </button>
            ))}
          </div>
          <div ref={sortRef} className="flex items-center gap-1.5 px-4 pb-3">
            <div className="flex h-9 shrink-0 items-center rounded-full bg-card p-0.5 shadow-card">
              {([
                { v: false, label: "Все" },
                { v: true, label: "Избранное" },
              ] as const).map((o) => (
                <button
                  key={o.label}
                  onClick={() => setFavView(o.v)}
                  className={`press h-full rounded-full px-3 text-[11px] font-extrabold transition-colors ${
                    favView === o.v ? "bg-ink text-on-ink" : "text-sub"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <ServiceFilter
              name="Сортировка"
              value={newsSort}
              allValue="new"
              showReset={false}
              options={NEWS_SORT_OPTIONS}
              open={sortOpen}
              onToggle={() => setSortOpen((v) => !v)}
              onSelect={(v) => {
                setNewsSort(v as NewsSort);
                setSortOpen(false);
              }}
            />
          </div>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {filtered.length === 0 ? (
            favView ? (
              favs.size === 0 ? (
                <div className="mt-10 flex flex-col items-center px-8 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-3xl bg-card text-faint shadow-card">
                    <Icon name="star" className="h-7 w-7" strokeWidth={1.7} />
                  </span>
                  <p className="mt-3 text-[14px] font-extrabold">В избранном пока пусто</p>
                  <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-sub">
                    Добавляйте новости в избранное через меню карточки (три точки) → «В избранное» или кнопкой «В избранное» на экране новости.
                  </p>
                </div>
              ) : (
                <p className="mt-10 text-center text-[12.5px] font-semibold text-sub">В этом направлении нет избранных новостей</p>
              )
            ) : (
              <p className="mt-10 text-center text-[12.5px] font-semibold text-sub">В этом направлении пока нет новостей</p>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onNavigate({ kind: "news", data: n })}
                  className="press group relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl p-3 text-left shadow-card transition-shadow hover:shadow-float"
                  style={{ background: `linear-gradient(135deg, ${n.artFrom}, ${n.artTo})` }}
                >
                  <Icon
                    name={n.artIcon}
                    className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 text-white opacity-[0.2] transition-transform duration-300 group-hover:scale-110"
                    strokeWidth={1.3}
                  />
                  <span className="relative flex items-start justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[9px] font-extrabold text-ink-solid backdrop-blur-sm">
                      <Icon name={NEWS_SECTION_META[n.section].icon} className="h-2.5 w-2.5" strokeWidth={2.4} />
                      {NEWS_SECTION_META[n.section].label}
                    </span>
                    {n.important && (
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-danger" title="Важная новость">
                        <Icon name="excl" className="h-3 w-3" strokeWidth={2.8} />
                      </span>
                    )}
                  </span>
                  <span className="relative">
                    <span className="block line-clamp-3 text-[12px] font-extrabold leading-snug tracking-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
                      {n.title}
                    </span>
                    <span className="mt-1 block text-[9.5px] font-bold text-white/80">{n.date}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (sheet.kind === "news") {
    const n = sheet.data;
    return (
      <Sheet open onClose={onClose} title="Новость">
        <div
          className="relative -mx-5 mb-3.5 flex h-24 items-end overflow-hidden px-5 pb-3"
          style={{ background: `linear-gradient(135deg, ${n.artFrom}, ${n.artTo})` }}
        >
          <Icon
            name={n.artIcon}
            className="pointer-events-none absolute -bottom-5 -right-5 h-28 w-28 text-white opacity-[0.2]"
            strokeWidth={1.3}
          />
          <span
            className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold backdrop-blur-sm ${
              n.important ? "bg-white text-danger" : "bg-white/90 text-ink-solid"
            }`}
          >
            {n.important && <Icon name="excl" className="h-3 w-3" strokeWidth={2.4} />}
            {NEWS_SECTION_META[n.section].label}
          </span>
        </div>
        <h4 className="text-[16px] font-extrabold leading-snug tracking-tight">{n.title}</h4>
        <p className="mt-1 text-[11px] font-bold text-faint">{n.date} · Центр предпринимательства Москвы</p>
        <p className="mt-3 text-[13.5px] font-medium leading-relaxed text-ink2">{n.text}</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              const added = toggleFavorite(n.id);
              toast(added ? "Добавлено в избранное" : "Убрано из избранного", "star");
            }}
            className={`press inline-flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-extrabold transition-colors ${
              favs.has(n.id) ? "bg-accent text-white" : "bg-ink text-on-ink"
            }`}
          >
            <Icon name="star" className={`h-3.5 w-3.5 ${favs.has(n.id) ? "fill-current" : ""}`} strokeWidth={2.2} />
            {favs.has(n.id) ? "В избранном" : "В избранное"}
          </button>
          <button onClick={onClose} className="press flex-1 rounded-full bg-paper py-2.5 text-[12.5px] font-extrabold text-ink2">
            Закрыть
          </button>
        </div>
      </Sheet>
    );
  }

  if (sheet.kind === "partner") {
    const p = sheet.data;
    return (
      <Sheet open onClose={onClose} title="Предложение партнёра">
        <div
          className="relative -mx-5 mb-3.5 flex h-28 items-end overflow-hidden px-5 pb-3"
          style={{ background: `linear-gradient(135deg, ${p.artFrom}, ${p.artTo})` }}
        >
          <Icon
            name={p.artIcon}
            className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 text-white opacity-[0.18]"
            strokeWidth={1.3}
          />
          <div className="relative flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/92 text-[13px] font-extrabold backdrop-blur-sm" style={{ color: p.logoFg }}>
              {p.logo}
            </span>
            <div>
              <p className="text-[16px] font-extrabold tracking-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">{p.name}</p>
              {p.city && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-[3px] text-[8.5px] font-extrabold uppercase tracking-wide text-white backdrop-blur-sm">
                  <Icon name="star" className="h-2.5 w-2.5 fill-[#ffc531] text-[#ffc531]" strokeWidth={1} />
                  Партнёр Москвы
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-[13px] font-medium leading-relaxed text-sub">{p.desc}</p>

        <div className="mt-3 rounded-2xl bg-ok-soft p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ok">
            <Icon name="trend-up" className="h-3.5 w-3.5" strokeWidth={2.4} />
            Выгода
          </p>
          <p className="mt-1 text-[14px] font-extrabold leading-snug text-ok">{p.benefit}</p>
        </div>

        <div className="mt-2.5 rounded-2xl bg-accent-soft p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-accent-deep">
            <Icon name="spark" className="h-3.5 w-3.5" strokeWidth={2.4} />
            Почему только здесь
          </p>
          <p className="mt-1 text-[12.5px] font-semibold leading-snug text-ink2">{p.unique}</p>
        </div>

        <ul className="mt-3 space-y-2">
          {p.details.map((d, i) => (
            <li key={i} className="flex items-start gap-2.5 rounded-xl bg-paper px-3 py-2.5">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ok text-white">
                <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              <span className="text-[12.5px] font-bold leading-snug">{d}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              toast(`Заявка на подключение отправлена: ${p.name}`, "check");
              onClose();
            }}
            className="press flex-1 rounded-full bg-paper py-3 text-[13px] font-extrabold text-ink2"
          >
            Подключить услугу
          </button>
          <button
            onClick={() => window.open(p.url, "_blank", "noopener,noreferrer")}
            className="press inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent py-3 text-[13px] font-extrabold text-white"
          >
            Перейти
            <Icon name="arrow-right" className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
        </div>
      </Sheet>
    );
  }

  /* quick action */
  const a = sheet.data;
  return (
    <Sheet open onClose={onClose} title={a.title}>
      <p className="text-[12.5px] font-semibold text-sub">{a.desc}. Шаги сценария:</p>
      <ol className="mt-3 space-y-2.5">
        {a.steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl bg-paper px-3 py-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card text-[12px] font-extrabold text-accent-deep shadow-card">
              {i + 1}
            </span>
            <span className="text-[13px] font-bold">{s}</span>
          </li>
        ))}
      </ol>
      {a.badge && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-[12px] font-extrabold text-danger">
          <Icon name="excl" className="h-4 w-4" strokeWidth={2.4} />
          Требуют внимания: {a.badge}
        </p>
      )}
      <button
        onClick={() => {
          toast(`Заявка «${a.title}» создана`, "check");
          onClose();
        }}
        className="press mt-4 w-full rounded-full bg-accent py-3 text-[13px] font-extrabold text-white"
      >
        Начать оформление
      </button>
    </Sheet>
  );
}
