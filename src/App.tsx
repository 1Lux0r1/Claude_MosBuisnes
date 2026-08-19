import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./Header";
import BottomNav from "./BottomNav";
import AIAssistant from "./AIAssistant";
import CalendarStrip from "./CalendarStrip";
import { CurrencyCarousel, NewsCarousel } from "./Carousels";
import { PartnersBlock, QuickActions, ServiceSections } from "./HomeBlocks";
import { EventsScreen, OfflineError, ProfileScreen, ServicesScreen } from "./screens";
import { HomeSkeleton, Reveal, Sheet, ToastProvider, useToast } from "./ui";
import { Icon } from "./icons";
import {
  NEWS, PARTNER_PAGES, QUICK_ACTIONS, SERVICE_SECTIONS,
  type NewsItem, type Partner, type QuickAction, type SearchHit, type ServiceSection,
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
  const [notif, setNotif] = useState(true);
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
    } else if (hit.group === "Партнёры") {
      const p = PARTNER_PAGES.flatMap((pg) => pg.items).find((x) => x.id === id);
      if (p) setSheet({ kind: "partner", data: p });
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
      <div className="mx-auto flex h-full w-full max-w-[400px] flex-col bg-white shadow-[0_0_90px_-24px_rgba(14,18,32,0.35)] md:my-5 md:h-[calc(100%-40px)] md:max-w-[392px] md:rounded-[46px] md:border-[9px] md:border-ink">
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
            notif={notif}
            setNotif={setNotif}
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
  notif: boolean;
  setNotif: (v: boolean) => void;
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
    servicesCategory, setServicesCategory, registered, setRegistered, notif, setNotif, profileRead,
    onTouchStart, onTouchEnd, onBack, onGoTab, onRetry, onHit,
  } = props;

  const eventsBadge = useMemo(() => Math.max(0, 3 - registered.size), [registered]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <Header
        tab={tab}
        onBack={onBack}
        onProfile={() => onGoTab(3)}
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
                  onSection={(s) => {
                    setServicesCategory(s.category);
                    onGoTab(1);
                  }}
                  onPartner={(p) => setSheet({ kind: "partner", data: p })}
                  onAllServices={() => {
                    setServicesCategory("Все");
                    onGoTab(1);
                  }}
                  onNews={(n) => setSheet({ kind: "news", data: n })}
                  onAllNews={() => setSheet({ kind: "newslist" })}
                />
              ))}
            {tab === 1 && <ServicesScreen category={servicesCategory} onCategory={setServicesCategory} />}
            {tab === 2 && (
              <EventsScreen
                registered={registered}
                onRegister={(id) => {
                  const next = new Set(registered);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  setRegistered(next);
                }}
              />
            )}
            {tab === 3 && <ProfileScreen offline={offline} onOffline={setOffline} notif={notif} onNotif={setNotif} />}
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

      <AIAssistant open={aiOpen} onClose={() => setAiOpen(false)} />
      <ActionSheetView sheet={sheet} onClose={() => setSheet(null)} onNavigate={setSheet} />
    </div>
  );
}

/* ---------- Главный экран ---------- */
function HomeScreen({
  onQuickAction, onSection, onPartner, onAllServices, onNews, onAllNews,
}: {
  onQuickAction: (a: QuickAction) => void;
  onSection: (s: ServiceSection) => void;
  onPartner: (p: Partner) => void;
  onAllServices: () => void;
  onNews: (n: NewsItem) => void;
  onAllNews: () => void;
}) {
  return (
    <div className="space-y-7 pt-4 pb-8">
      <CalendarStrip />
      <QuickActions onPick={onQuickAction} />
      <ServiceSections onPick={onSection} />
      <PartnersBlock onPick={onPartner} onAllServices={onAllServices} />
      <CurrencyCarousel />
      <NewsCarousel onRead={onNews} onAllNews={onAllNews} />
      <Reveal>
        <p className="px-4 text-center text-[10.5px] font-bold text-faint">
          Центр поддержки бизнеса · Москва, 2026
        </p>
      </Reveal>
    </div>
  );
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

  if (!sheet) return null;

  if (sheet.kind === "newslist") {
    return (
      <Sheet open onClose={onClose} title="Все новости">
        <p className="text-[12px] font-semibold text-sub">Лента ЦЭВБ · обновлено сегодня</p>
        <div className="mt-3 space-y-2">
          {NEWS.map((n) => (
            <button
              key={n.id}
              onClick={() => onNavigate({ kind: "news", data: n })}
              className="press flex w-full items-start gap-3 rounded-2xl border border-line/70 bg-white p-3 text-left"
            >
              <span
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                  n.important ? "bg-danger text-white" : "bg-accent-soft text-accent"
                }`}
              >
                <Icon name={n.important ? "excl" : "news"} className="h-3.5 w-3.5" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold leading-snug tracking-tight">{n.title}</span>
                <span className="mt-0.5 block text-[11px] font-bold text-faint">{n.date}</span>
              </span>
              <Icon name="chevron-right" className="mt-1 h-4 w-4 shrink-0 text-faint" strokeWidth={2.2} />
            </button>
          ))}
        </div>
      </Sheet>
    );
  }

  if (sheet.kind === "news") {
    const n = sheet.data;
    return (
      <Sheet open onClose={onClose} title="Новость">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${
            n.important ? "bg-danger-soft text-danger" : "bg-paper text-sub"
          }`}
        >
          {n.important && <Icon name="excl" className="h-3 w-3" strokeWidth={2.4} />}
          {n.category === "mandatory" ? "Обязательная" : n.category === "personal" ? "Персональная" : "Образовательная"}
        </span>
        <h4 className="mt-2.5 text-[16px] font-extrabold leading-snug tracking-tight">{n.title}</h4>
        <p className="mt-1 text-[11px] font-bold text-faint">{n.date} · Центр предпринимательства Москвы</p>
        <p className="mt-3 text-[13.5px] font-medium leading-relaxed text-ink2">{n.text}</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              toast("Новость сохранена в закладки", "star");
              onClose();
            }}
            className="press flex-1 rounded-full bg-ink py-2.5 text-[12.5px] font-extrabold text-white"
          >
            В закладки
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
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl text-[13px] font-extrabold" style={{ background: p.logoBg, color: p.logoFg }}>
            {p.logo}
          </span>
          <div>
            <p className="text-[15px] font-extrabold tracking-tight">{p.name}</p>
            {p.city && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-[3px] text-[8.5px] font-extrabold uppercase tracking-wide text-white">
                <Icon name="star" className="h-2.5 w-2.5 fill-[#ffc531] text-[#ffc531]" strokeWidth={1} />
                Партнёр Москвы
              </span>
            )}
          </div>
        </div>
        <p className="mt-3 text-[13px] font-medium leading-relaxed text-sub">{p.desc}</p>
        <div className="mt-3 rounded-2xl bg-ok-soft p-3.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-ok">Специальное условие</p>
          <p className="mt-0.5 text-[15px] font-extrabold text-ok">{p.offer}</p>
        </div>
        <button
          onClick={() => {
            toast(`Заявка на подключение отправлена: ${p.name}`, "check");
            onClose();
          }}
          className="press mt-4 w-full rounded-full bg-accent py-3 text-[13px] font-extrabold text-white"
        >
          Подключить услугу
        </button>
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
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[12px] font-extrabold text-accent-deep shadow-card">
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
