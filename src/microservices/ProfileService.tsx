import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, MobiusIcon, type IconName } from "../icons";
import { Reveal, Toggle, useToast } from "../ui";
import { RequirementsDetail, RequirementsSummary } from "./RequirementsRadar";
import SupportVitrina from "./SupportVitrina";
import {
  BANKS, BANKS_STORAGE_KEY, INTEGRATIONS_STORAGE_KEY, loadApplications,
  type Application, type AppStatus, type BankAccount, type BankInfo,
} from "../data";

/* ============================================================
   Микросервис «Личный кабинет» · v2.1
   Автономный модуль: финансы (мультибанковские счета),
   заявления, интеграции с учётными системами, сотрудники.
   Состояние — в localStorage, навигация — внутренняя.
   Банки (BANKS) — общие с обменом валют в Carousels.tsx,
   заданы в data.ts.
   ============================================================ */

/* ---------- Заявления ---------- */
const STATUS_META: Record<AppStatus, { label: string; bg: string; fg: string; icon: IconName }> = {
  review: { label: "На проверке", bg: "#fff3d4", fg: "#b97a00", icon: "clock" },
  docs: { label: "Нужен документ", bg: "#fdeceb", fg: "#f5333f", icon: "alert" },
  approved: { label: "Одобрено", bg: "#e3f6ec", fg: "#148a4c", icon: "check" },
  rejected: { label: "Отклонено", bg: "#eceef4", fg: "#79818f", icon: "close" },
  draft: { label: "Черновик", bg: "#eceef4", fg: "#2a3040", icon: "doc" },
};

const isActiveStatus = (s: AppStatus) => s === "review" || s === "docs" || s === "draft";

/* ---------- Интеграции учётных систем ---------- */
interface IntegrationSystem { id: string; name: string; desc: string; logo: string; logoBg: string; logoFg: string; modules: string[] }

const SYSTEMS: IntegrationSystem[] = [
  {
    id: "1c", name: "1С:Предприятие", desc: "Проводки, отчётность и кадры — без ручного ввода",
    logo: "1С", logoBg: "#ffe81a", logoFg: "#241f21", modules: ["Проводки", "Отчётность", "Зарплата"],
  },
  {
    id: "bitrix", name: "Битрикс24", desc: "CRM и сделки синхронизированы с заявлениями",
    logo: "Б24", logoBg: "#d3f2fd", logoFg: "#0b6aa8", modules: ["CRM", "Задачи", "Сделки"],
  },
  {
    id: "moysklad", name: "МойСклад", desc: "Остатки и обороты для аналитики МосБизнес",
    logo: "МС", logoBg: "#e3f6ec", logoFg: "#0f7a3d", modules: ["Склад", "Закупки", "Обороты"],
  },
];

/* ---------- Сотрудники и роли ---------- */
type RoleKey = "owner" | "admin" | "manager" | "viewer";
const ROLE_META: Record<RoleKey, { label: string; bg: string; fg: string }> = {
  owner: { label: "Владелец", bg: "#0e1220", fg: "#ffffff" },
  admin: { label: "Администратор", bg: "#e6efff", fg: "#0a6bff" },
  manager: { label: "Менеджер", bg: "#e3f6ec", fg: "#148a4c" },
  viewer: { label: "Наблюдатель", bg: "#eceef4", fg: "#79818f" },
};

interface Permission { key: string; label: string; desc: string; icon: IconName }
const PERMISSIONS: Permission[] = [
  { key: "applications", label: "Подача заявлений", desc: "Создание и подписание заявок", icon: "doc" },
  { key: "finance", label: "Банковские счета", desc: "Просмотр остатков и выписок", icon: "coins" },
  { key: "reports", label: "Отчёты и аналитика", desc: "Формы МСП, витрины данных", icon: "chart" },
  { key: "team", label: "Управление командой", desc: "Приглашение и права сотрудников", icon: "users" },
];

interface Employee { id: string; name: string; position: string; email: string; role: RoleKey; perms: string[] }

const INITIAL_EMPLOYEES: Employee[] = [
  { id: "e1", name: "Анна Петрова", position: "Генеральный директор", email: "a.petrova@vektor.ru", role: "owner", perms: PERMISSIONS.map((p) => p.key) },
  { id: "e2", name: "Дмитрий Соколов", position: "Финансовый директор", email: "d.sokolov@vektor.ru", role: "admin", perms: ["applications", "finance", "reports"] },
  { id: "e3", name: "Мария Ветрова", position: "Бухгалтер", email: "m.vetrova@vektor.ru", role: "manager", perms: ["applications", "reports"] },
  { id: "e4", name: "Игорь Ланской", position: "Юрист", email: "i.lanskoy@vektor.ru", role: "viewer", perms: ["reports"] },
];

const AVATAR_COLORS = ["#0a6bff", "#148a4c", "#b97a00", "#e11d3a", "#0e8a8a"];

/* ---------- Хранилище ---------- */
const LS_EMPLOYEES = "cevba-employees-v1";

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/* ---------- Утилиты ---------- */
function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

const fmtMoney = (v: number) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v)} ₽`;
const fmtDate = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const initials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const agoLabel = (ts: number) => {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  return `${h} ч назад`;
};

type View =
  | { t: "root" }
  | { t: "bankAdd" }
  | { t: "apps" }
  | { t: "requirements" }
  | { t: "emp"; id: string };

export default function ProfileService({
  scrollTo, onScrolled,
}: {
  /** Если "vitrina" — при открытии проскроллить к персональной витрине (п.8 → п.7) */
  scrollTo?: string | null;
  onScrolled?: () => void;
} = {}) {
  const toast = useToast();
  const [view, setView] = useState<View>({ t: "root" });

  /* Скролл к витрине по тапу на тизер с Главной. Ждём кадр после монтирования
     (таб пересоздаётся при переключении), затем прокручиваем секцию в вид. */
  useEffect(() => {
    if (scrollTo !== "vitrina") return;
    const raf = window.requestAnimationFrame(() => {
      document.getElementById("vitrina-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      onScrolled?.();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [scrollTo, onScrolled]);

  /* --- Финансы: несколько банков одновременно --- */
  const [bankIds, setBankIds] = useState<string[]>(() => loadJSON<string[]>(BANKS_STORAGE_KEY, []));
  const [connecting, setConnecting] = useState<string | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const connectTimer = useRef(0);
  const refreshTimer = useRef(0);

  const connectedBanks = useMemo(() => BANKS.filter((b) => bankIds.includes(b.id)), [bankIds]);

  useEffect(() => {
    setBalances((prev) => {
      const next = { ...prev };
      connectedBanks.forEach((b) => b.accounts.forEach((a) => { if (!(a.id in next)) next[a.id] = a.balance; }));
      return next;
    });
  }, [connectedBanks]);

  useEffect(() => () => {
    window.clearTimeout(connectTimer.current);
    window.clearTimeout(refreshTimer.current);
  }, []);

  const balanceOf = (a: BankAccount) => balances[a.id] ?? a.balance;
  const total = connectedBanks.reduce((s, b) => s + b.accounts.reduce((x, a) => x + balanceOf(a), 0), 0);
  const shown = useCountUp(total);
  const accountsCount = connectedBanks.reduce((s, b) => s + b.accounts.length, 0);

  const persistBanks = (ids: string[]) => {
    setBankIds(ids);
    localStorage.setItem(BANKS_STORAGE_KEY, JSON.stringify(ids));
  };

  const connectBank = (b: BankInfo) => {
    if (bankIds.includes(b.id)) return;
    setConnecting(b.name);
    connectTimer.current = window.setTimeout(() => {
      persistBanks([...bankIds, b.id]);
      setConnecting(null);
      setView({ t: "root" });
      toast(`Банк подключён: ${b.name}`, "check");
    }, 1400);
  };

  const disconnectBank = (b: BankInfo) => {
    persistBanks(bankIds.filter((id) => id !== b.id));
    toast(`Банк отключён: ${b.name}`, "close");
  };

  const refreshBalances = () => {
    if (!connectedBanks.length || refreshing) return;
    setRefreshing(true);
    refreshTimer.current = window.setTimeout(() => {
      const next: Record<string, number> = {};
      connectedBanks.forEach((b) =>
        b.accounts.forEach((a) => {
          const base = balanceOf(a);
          next[a.id] = Math.max(0, Math.round(base * (1 + (Math.random() - 0.45) * 0.012)));
        }),
      );
      setBalances((prev) => ({ ...prev, ...next }));
      setRefreshing(false);
      toast("Остатки по счетам обновлены", "refresh");
    }, 900);
  };

  /* --- Интеграции --- */
  const [connectedSys, setConnectedSys] = useState<string[]>(() => loadJSON<{ ids: string[] }>(INTEGRATIONS_STORAGE_KEY, { ids: [] }).ids);
  const [lastSync, setLastSync] = useState<Record<string, number>>({});
  const [syncing, setSyncing] = useState<string | null>(null);
  const syncTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(syncTimer.current), []);

  const persistSystems = (ids: string[]) => {
    setConnectedSys(ids);
    localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify({ ids }));
  };

  const connectSystem = (s: IntegrationSystem) => {
    if (syncing) return;
    setSyncing(s.id);
    syncTimer.current = window.setTimeout(() => {
      persistSystems([...connectedSys, s.id]);
      setLastSync((p) => ({ ...p, [s.id]: Date.now() }));
      setSyncing(null);
      toast(`${s.name}: интеграция включена`, "link");
    }, 1300);
  };

  const disconnectSystem = (s: IntegrationSystem) => {
    persistSystems(connectedSys.filter((id) => id !== s.id));
    toast(`${s.name}: интеграция отключена`, "close");
  };

  const resyncSystem = (s: IntegrationSystem) => {
    if (syncing) return;
    setSyncing(s.id);
    syncTimer.current = window.setTimeout(() => {
      setLastSync((p) => ({ ...p, [s.id]: Date.now() }));
      setSyncing(null);
      toast(`${s.name}: данные обновлены`, "refresh");
    }, 900);
  };

  /* --- Заявления: пишутся и здесь, и с экрана «Услуги» (ServicesScreen) ---
     общий localStorage, поэтому оформленная заявка сразу видна как активная. */
  const [applications] = useState<Application[]>(loadApplications);
  const activeCount = applications.filter((a) => isActiveStatus(a.status)).length;
  const doneCount = applications.length - activeCount;

  /* --- Сотрудники --- */
  const [employees, setEmployees] = useState<Employee[]>(() => loadJSON(LS_EMPLOYEES, INITIAL_EMPLOYEES));
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", role: "manager" as RoleKey });
  const [inviteErr, setInviteErr] = useState<{ name?: string; email?: string }>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const persistEmployees = (next: Employee[]) => {
    setEmployees(next);
    localStorage.setItem(LS_EMPLOYEES, JSON.stringify(next));
  };

  const submitInvite = () => {
    const errs: { name?: string; email?: string } = {};
    if (invite.name.trim().length < 2) errs.name = "Укажите имя и фамилию";
    if (!/^\S+@\S+\.\S+$/.test(invite.email.trim())) errs.email = "Некорректный e-mail";
    setInviteErr(errs);
    if (Object.keys(errs).length) return;
    const defaults: Record<RoleKey, string[]> = {
      owner: PERMISSIONS.map((p) => p.key),
      admin: ["applications", "finance", "reports"],
      manager: ["applications", "reports"],
      viewer: ["reports"],
    };
    const emp: Employee = {
      id: `e${Date.now()}`,
      name: invite.name.trim(),
      position: ROLE_META[invite.role].label,
      email: invite.email.trim(),
      role: invite.role,
      perms: defaults[invite.role],
    };
    persistEmployees([...employees, emp]);
    setInvite({ name: "", email: "", role: "manager" });
    setInviteOpen(false);
    toast(`Приглашение отправлено: ${emp.name}`, "mail");
  };

  const togglePerm = (empId: string, key: string, on: boolean) => {
    persistEmployees(
      employees.map((e) =>
        e.id === empId ? { ...e, perms: on ? [...e.perms, key] : e.perms.filter((p) => p !== key) } : e,
      ),
    );
    const label = PERMISSIONS.find((p) => p.key === key)?.label ?? key;
    toast(`${label}: ${on ? "доступ открыт" : "доступ закрыт"}`, "shield");
  };

  const removeEmployee = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    persistEmployees(employees.filter((e) => e.id !== id));
    setView({ t: "root" });
    setConfirmDelete(false);
    if (emp) toast(`Сотрудник удалён: ${emp.name}`, "close");
  };

  /* ================= ЭКРАН: выбор банка ================= */
  if (view.t === "bankAdd") {
    return (
      <SubView title={connectedBanks.length ? "Добавить банк" : "Подключение банка"} onBack={() => (connecting ? null : setView({ t: "root" }))}>
        {connecting ? (
          <div className="animate-fade-up mt-8 flex flex-col items-center px-6 text-center">
            <span className="relative grid h-20 w-20 place-items-center rounded-full bg-danger-soft text-[#e11d3a]">
              <MobiusIcon className="h-11 w-11" strokeWidth={1.7} />
              <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#e11d3a]/40" />
            </span>
            <p className="font-display mt-5 text-[15px] font-semibold tracking-tight">Соединяемся с банком</p>
            <p className="mt-1.5 text-[12.5px] font-semibold text-sub">
              Защищённый обмен токенами с «{connecting}». Обычно это занимает несколько секунд.
            </p>
            <div className="mt-5 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-[#e11d3a]" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 text-[12.5px] font-semibold text-sub">
              Можно подключить несколько банков — все счета появятся на одном экране. Доступ только на чтение, через защищённый API.
            </p>
            <div className="mt-4 space-y-2.5">
              {BANKS.map((b, i) => {
                const isOn = bankIds.includes(b.id);
                return (
                  <Reveal key={b.id} delay={i * 50}>
                    <button
                      onClick={() => connectBank(b)}
                      disabled={isOn}
                      className={`press group flex w-full items-center gap-3.5 rounded-2xl border bg-card p-3.5 text-left shadow-card transition-all ${
                        isOn ? "border-ok/30 opacity-75" : "border-line/80 hover:border-accent/40 hover:shadow-float"
                      }`}
                    >
                      <span className="font-display grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[15px] font-semibold" style={{ background: b.logoBg, color: b.logoFg }}>
                        {b.logo}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-extrabold tracking-tight">{b.name}</span>
                        <span className="mt-0.5 block text-[11.5px] font-semibold text-sub">{b.accounts.length} счёта · Open API</span>
                      </span>
                      {isOn ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-[10.5px] font-extrabold text-ok">
                          <Icon name="check" className="h-3 w-3" strokeWidth={2.6} />
                          Подключено
                        </span>
                      ) : (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-sub transition-all group-hover:bg-accent group-hover:text-white">
                          <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
                        </span>
                      )}
                    </button>
                  </Reveal>
                );
              })}
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[10.5px] font-bold text-faint">
              <Icon name="shield" className="h-3.5 w-3.5" strokeWidth={2.2} />
              Данные передаются в зашифрованном виде
            </p>
          </>
        )}
      </SubView>
    );
  }

  /* ================= ЭКРАН: заявления ================= */
  if (view.t === "apps") {
    return <ApplicationsView applications={applications} onBack={() => setView({ t: "root" })} />;
  }

  /* ================= ЭКРАН: обязательные требования ================= */
  if (view.t === "requirements") {
    return (
      <SubView title="Обязательные требования" onBack={() => setView({ t: "root" })}>
        <RequirementsDetail />
      </SubView>
    );
  }

  /* ================= ЭКРАН: права сотрудника ================= */
  if (view.t === "emp") {
    const emp = employees.find((e) => e.id === view.id);
    if (!emp) return null;
    const isOwner = emp.role === "owner";
    const color = AVATAR_COLORS[employees.indexOf(emp) % AVATAR_COLORS.length];
    return (
      <SubView title="Права доступа" onBack={() => { setView({ t: "root" }); setConfirmDelete(false); }}>
        <Reveal>
          <div className="flex items-center gap-3.5 rounded-2xl border border-line/80 bg-card p-4 shadow-card">
            <span className="font-display grid h-13 w-13 shrink-0 place-items-center rounded-2xl p-3 text-[15px] font-semibold text-white" style={{ background: color }}>
              {initials(emp.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-extrabold tracking-tight">{emp.name}</p>
              <p className="truncate text-[11.5px] font-semibold text-sub">{emp.position} · {emp.email}</p>
              <span className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide" style={{ background: ROLE_META[emp.role].bg, color: ROLE_META[emp.role].fg }}>
                {ROLE_META[emp.role].label}
              </span>
            </div>
          </div>
        </Reveal>

        {isOwner ? (
          <Reveal delay={60}>
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-paper px-3.5 py-3 text-[12px] font-bold text-sub">
              <Icon name="shield" className="h-4 w-4 shrink-0 text-ink2" strokeWidth={2.1} />
              Владелец организации имеет полный доступ ко всем разделам.
            </p>
          </Reveal>
        ) : (
          <div className="mt-3 space-y-2.5">
            {PERMISSIONS.map((p, i) => {
              const on = emp.perms.includes(p.key);
              return (
                <Reveal key={p.key} delay={60 + i * 55}>
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-line/80 bg-card p-3.5 shadow-card">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${on ? "bg-accent-soft text-accent-deep" : "bg-paper text-faint"}`}>
                        <Icon name={p.icon} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-extrabold tracking-tight">{p.label}</p>
                        <p className="truncate text-[11px] font-semibold text-sub">{p.desc}</p>
                      </div>
                    </div>
                    <Toggle checked={on} onChange={(v) => togglePerm(emp.id, p.key, v)} />
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}

        {!isOwner && (
          <Reveal delay={300}>
            <button
              onClick={() => (confirmDelete ? removeEmployee(emp.id) : setConfirmDelete(true))}
              className={`press mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-[12.5px] font-extrabold transition-all duration-300 ${
                confirmDelete
                  ? "border-danger bg-danger text-white"
                  : "border-line/80 bg-card text-danger shadow-card hover:bg-danger-soft"
              }`}
            >
              <Icon name="close" className="h-4 w-4" strokeWidth={2.2} />
              {confirmDelete ? "Подтвердить удаление" : "Удалить сотрудника"}
            </button>
            {confirmDelete && (
              <button onClick={() => setConfirmDelete(false)} className="press mt-2 w-full rounded-2xl bg-paper py-2.5 text-[12px] font-extrabold text-sub">
                Отмена
              </button>
            )}
          </Reveal>
        )}
      </SubView>
    );
  }

  /* ================= КОРНЕВОЙ ЭКРАН ================= */
  return (
    <div className="space-y-4 px-4 pt-4 pb-8">
      {/* Организация */}
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl bg-ink-solid p-4 text-white shadow-float">
          <span
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(320px 180px at 90% -20%, rgba(10,107,255,0.5), transparent 65%)" }}
          />
          <MobiusIcon className="pointer-events-none absolute -right-4 -bottom-5 h-28 w-28 rotate-12 text-white opacity-[0.08]" strokeWidth={1.4} />
          <div className="relative flex items-center gap-3.5">
            <span className="font-display grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-[16px] font-semibold ring-1 ring-white/15">
              АП
            </span>
            <div className="min-w-0">
              <p className="font-display text-[16px] font-semibold tracking-tight">Анна Петрова</p>
              <p className="text-[11.5px] font-semibold text-white/60">Генеральный директор · ООО «Вектор Групп»</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-white/85 ring-1 ring-white/10">
                  <Icon name="shield" className="h-3 w-3" strokeWidth={2.2} />
                  Резидент МосБизнес
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-white/85 ring-1 ring-white/10">
                  ИНН 7712345678
                </span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Финансы: несколько банков и счетов на одном экране */}
      <Reveal delay={60}>
        <section>
          <div className="flex items-center justify-between">
            <SectionTitle icon="coins" title="Финансы организации" />
            {connectedBanks.length > 0 && (
              <span className="rounded-full bg-paper px-2 py-1 text-[10.5px] font-extrabold text-sub">
                {connectedBanks.length} банк{connectedBanks.length > 1 ? (connectedBanks.length < 5 ? "а" : "ов") : ""} · {accountsCount} сч.
              </span>
            )}
          </div>

          {connectedBanks.length === 0 ? (
            <button
              onClick={() => setView({ t: "bankAdd" })}
              className="press group mt-2.5 w-full rounded-2xl border-2 border-dashed border-line bg-card/60 p-4 text-left transition-all hover:border-accent/60 hover:bg-accent-soft/40"
            >
              <div className="flex items-center gap-3.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper text-ink2 transition-colors group-hover:bg-accent group-hover:text-white">
                  <Icon name="building" className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-extrabold tracking-tight">Подключите банк</span>
                  <span className="mt-0.5 block text-[11.5px] font-semibold leading-snug text-sub">
                    Общая сумма на счетах организации появится здесь автоматически
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-[11px] font-extrabold text-white">
                  Выбрать
                </span>
              </div>
            </button>
          ) : (
            <div className="mt-2.5 overflow-hidden rounded-2xl border border-line/80 bg-card shadow-card">
              {/* Итог по всем счетам */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-faint">
                      На {accountsCount} счетах в {connectedBanks.length} банк{connectedBanks.length > 1 ? (connectedBanks.length < 5 ? "ах" : "ах") : "е"}
                    </p>
                    <p className="mt-1 flex items-center gap-2.5 text-[26px] font-extrabold leading-none tracking-tight">
                      {hideBalance ? "•••• ••• ₽" : fmtMoney(Math.round(shown))}
                      <button
                        onClick={() => setHideBalance((v) => !v)}
                        className="press grid h-8 w-8 place-items-center rounded-full bg-paper text-sub"
                        aria-label={hideBalance ? "Показать баланс" : "Скрыть баланс"}
                      >
                        <Icon name={hideBalance ? "eye-off" : "eye"} className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </p>
                  </div>
                  <button
                    onClick={refreshBalances}
                    className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-deep"
                    aria-label="Обновить остатки"
                  >
                    <Icon name="refresh" className={`h-4.5 w-4.5 ${refreshing ? "animate-spin" : ""}`} strokeWidth={2.1} />
                  </button>
                </div>
              </div>

              {/* Счета каждого подключённого банка */}
              {connectedBanks.map((b) => {
                const sub = b.accounts.reduce((s, a) => s + balanceOf(a), 0);
                return (
                  <div key={b.id} className="border-t border-line/70">
                    <div className="flex items-center gap-2.5 bg-paper/60 px-4 py-2.5">
                      <span className="font-display grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[12px] font-semibold" style={{ background: b.logoBg, color: b.logoFg }}>
                        {b.logo}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-extrabold">{b.name}</p>
                        <p className="flex items-center gap-1 text-[10px] font-bold text-ok">
                          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                          Синхронизирован
                        </p>
                      </div>
                      <p className={`shrink-0 text-[12px] font-extrabold tabular-nums ${refreshing ? "text-faint" : ""}`}>
                        {hideBalance ? "•••• ••" : fmtMoney(sub)}
                      </p>
                      <button
                        onClick={() => disconnectBank(b)}
                        className="press grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                        aria-label={`Отключить ${b.name}`}
                      >
                        <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </button>
                    </div>
                    {b.accounts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 border-t border-line/60 px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-extrabold">{a.name}</p>
                          <p className="text-[10.5px] font-bold text-faint">{a.mask}</p>
                        </div>
                        <p className={`shrink-0 text-[13px] font-extrabold tabular-nums ${refreshing ? "text-faint" : ""}`}>
                          {hideBalance ? "•••• ••" : fmtMoney(balanceOf(a))}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })}

              <button
                onClick={() => setView({ t: "bankAdd" })}
                className="press flex w-full items-center justify-center gap-1.5 border-t border-line/70 py-2.5 text-[11.5px] font-extrabold text-accent transition-colors hover:bg-accent-soft/50"
              >
                <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.4} />
                Добавить ещё банк
              </button>
            </div>
          )}
        </section>
      </Reveal>

      {/* Заявления */}
      <Reveal delay={120}>
        <section>
          <SectionTitle icon="doc" title="Заявления" />
          <button
            onClick={() => setView({ t: "apps" })}
            className="press group mt-2.5 w-full rounded-2xl border border-line/80 bg-card p-4 text-left shadow-card transition-all hover:border-accent/40 hover:shadow-float"
          >
            <div className="flex items-center gap-4">
              <div>
                <p className="font-display text-[30px] font-semibold leading-none tracking-tight text-accent-deep">{applications.length}</p>
                <p className="mt-1 text-[10.5px] font-extrabold uppercase tracking-wide text-faint">подано</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex h-2 overflow-hidden rounded-full bg-paper">
                  {doneCount > 0 && <span style={{ width: `${(doneCount / applications.length) * 100}%`, background: "var(--color-accent)" }} />}
                  {activeCount > 0 && <span style={{ width: `${(activeCount / applications.length) * 100}%`, background: "var(--color-sub)" }} />}
                </div>
                <p className="mt-1.5 flex items-center gap-3 text-[11px] font-bold text-sub">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-accent)" }} />
                    {doneCount} выполнено
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-sub)" }} />
                    {activeCount} в работе
                  </span>
                </p>
              </div>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-sub transition-all group-hover:bg-accent group-hover:text-white">
                <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2.1} />
              </span>
            </div>
          </button>
        </section>
      </Reveal>

      {/* Обязательные требования (п.6, п.4): компактная сводка → отдельная страница */}
      <Reveal delay={150}>
        <RequirementsSummary onOpen={() => setView({ t: "requirements" })} />
      </Reveal>

      {/* Персональная витрина «Вам доступно» (п.7) — сразу после Радара */}
      <Reveal delay={165}>
        <SupportVitrina />
      </Reveal>

      {/* Интеграции учётных систем */}
      <Reveal delay={180}>
        <section>
          <div className="flex items-center justify-between">
            <SectionTitle icon="link" title="Интеграции" />
            <span className="rounded-full bg-paper px-2 py-1 text-[10.5px] font-extrabold text-sub">
              {connectedSys.length} из {SYSTEMS.length}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] font-semibold text-sub">Подключите свои учётные системы — данные подтянутся автоматически.</p>

          <div className="mt-2.5 space-y-2.5">
            {SYSTEMS.map((s, i) => {
              const isOn = connectedSys.includes(s.id);
              const isBusy = syncing === s.id;
              return (
                <Reveal key={s.id} delay={i * 60}>
                  <div
                    className={`rounded-2xl border bg-card p-3.5 shadow-card transition-all duration-300 ${
                      isOn ? "border-ok/30" : "border-line/80 hover:border-accent/40 hover:shadow-float"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-display grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[13px] font-semibold" style={{ background: s.logoBg, color: s.logoFg }}>
                        {s.logo}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-extrabold tracking-tight">{s.name}</p>
                        <p className="truncate text-[11px] font-semibold text-sub">{s.desc}</p>
                      </div>
                      {isOn ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok-soft px-2 py-1 text-[9.5px] font-extrabold uppercase tracking-wide text-ok">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
                          Активна
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-paper px-2 py-1 text-[9.5px] font-extrabold uppercase tracking-wide text-faint">
                          Не подключена
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {s.modules.map((m) => (
                        <span key={m} className="rounded-md bg-paper px-2 py-1 text-[10px] font-extrabold text-ink2">
                          {m}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/60 pt-2.5">
                      {isOn ? (
                        <>
                          <span className="text-[10.5px] font-bold text-sub">
                            {isBusy ? "Синхронизация…" : `Обновлено ${agoLabel(lastSync[s.id] ?? Date.now())}`}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => resyncSystem(s)}
                              disabled={!!syncing}
                              className="press grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent-deep disabled:opacity-50"
                              aria-label="Обновить данные"
                            >
                              <Icon name="refresh" className={`h-3.5 w-3.5 ${isBusy ? "animate-spin" : ""}`} strokeWidth={2.2} />
                            </button>
                            <button
                              onClick={() => disconnectSystem(s)}
                              className="press rounded-full bg-paper px-3 py-1.5 text-[11px] font-extrabold text-sub transition-colors hover:bg-danger-soft hover:text-danger"
                            >
                              Отключить
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-[10.5px] font-bold text-faint">Подключение по API за 1 минуту</span>
                          <button
                            onClick={() => connectSystem(s)}
                            disabled={!!syncing}
                            className="press inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[11.5px] font-extrabold text-white transition-opacity disabled:opacity-50"
                          >
                            {isBusy ? (
                              <>
                                <Icon name="refresh" className="h-3.5 w-3.5 animate-spin" strokeWidth={2.2} />
                                Соединение…
                              </>
                            ) : (
                              <>
                                <Icon name="link" className="h-3.5 w-3.5" strokeWidth={2.2} />
                                Подключить
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      </Reveal>

      {/* Сотрудники */}
      <Reveal delay={240}>
        <section>
          <div className="flex items-center justify-between">
            <SectionTitle icon="users" title="Сотрудники" />
            <span className="rounded-full bg-paper px-2 py-1 text-[10.5px] font-extrabold text-sub">{employees.length}</span>
          </div>

          <div className="mt-2.5 space-y-2">
            {employees.map((e, i) => (
              <button
                key={e.id}
                onClick={() => { setView({ t: "emp", id: e.id }); setConfirmDelete(false); }}
                className="press group flex w-full items-center gap-3 rounded-2xl border border-line/80 bg-card p-3 text-left shadow-card transition-all hover:border-accent/40 hover:shadow-float"
              >
                <span className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[12px] font-semibold text-white" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                  {initials(e.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-extrabold tracking-tight">{e.name}</span>
                  <span className="block truncate text-[10.5px] font-semibold text-sub">{e.position} · {e.perms.length} из {PERMISSIONS.length} прав</span>
                </span>
                <span className="shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide" style={{ background: ROLE_META[e.role].bg, color: ROLE_META[e.role].fg }}>
                  {ROLE_META[e.role].label}
                </span>
                <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
              </button>
            ))}
          </div>

          {inviteOpen ? (
            <div className="animate-fade-up mt-2.5 rounded-2xl border border-accent/30 bg-accent-soft/40 p-3.5">
              <p className="text-[12px] font-extrabold text-accent-deep">Приглашение сотрудника</p>
              <input
                value={invite.name}
                onChange={(ev) => { setInvite({ ...invite, name: ev.target.value }); if (inviteErr.name) setInviteErr({ ...inviteErr, name: undefined }); }}
                placeholder="Имя и фамилия"
                className={`mt-2 h-10 w-full rounded-xl border bg-card px-3 text-[13px] font-semibold outline-none placeholder:font-medium placeholder:text-faint ${inviteErr.name ? "border-danger ring-2 ring-danger/20" : "border-line focus:border-accent"}`}
              />
              {inviteErr.name && <p className="mt-1 text-[11px] font-bold text-danger">{inviteErr.name}</p>}
              <input
                value={invite.email}
                onChange={(ev) => { setInvite({ ...invite, email: ev.target.value }); if (inviteErr.email) setInviteErr({ ...inviteErr, email: undefined }); }}
                placeholder="E-mail"
                inputMode="email"
                className={`mt-2 h-10 w-full rounded-xl border bg-card px-3 text-[13px] font-semibold outline-none placeholder:font-medium placeholder:text-faint ${inviteErr.email ? "border-danger ring-2 ring-danger/20" : "border-line focus:border-accent"}`}
              />
              {inviteErr.email && <p className="mt-1 text-[11px] font-bold text-danger">{inviteErr.email}</p>}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {(["admin", "manager", "viewer"] as RoleKey[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setInvite({ ...invite, role: r })}
                    className="press rounded-full px-3 py-1.5 text-[11px] font-extrabold transition-all"
                    style={invite.role === r ? { background: ROLE_META[r].fg === "#ffffff" ? "#0e1220" : ROLE_META[r].fg, color: "#fff" } : { background: "#fff", color: "#79818f" }}
                  >
                    {ROLE_META[r].label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => { setInviteOpen(false); setInviteErr({}); }} className="press rounded-full bg-card px-4 py-2 text-[12px] font-extrabold text-sub">
                  Отмена
                </button>
                <button onClick={submitInvite} className="press inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[12px] font-extrabold text-white">
                  <Icon name="mail" className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Пригласить
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setInviteOpen(true)}
              className="press mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line bg-card/60 py-2.5 text-[12px] font-extrabold text-accent transition-colors hover:border-accent/50 hover:bg-accent-soft/40"
            >
              <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.4} />
              Пригласить сотрудника
            </button>
          )}
        </section>
      </Reveal>

      <p className="pt-1 text-center text-[10px] font-bold text-faint">Микросервис «Личный кабинет» · v2.1</p>
    </div>
  );
}

/* ---------- Вспомогательные компоненты ---------- */
function SectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight">
      <Icon name={icon} className="h-4 w-4 text-accent" strokeWidth={2.1} />
      {title}
    </h2>
  );
}

function SubView({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="animate-slide-left px-4 pt-4 pb-8">
      <div className="flex items-center gap-2.5">
        <button onClick={onBack} className="press grid h-9 w-9 place-items-center rounded-full bg-paper text-ink2" aria-label="Назад">
          <Icon name="chevron-left" className="h-4.5 w-4.5" strokeWidth={2.2} />
        </button>
        <h1 className="font-display text-[17px] font-semibold tracking-tight">{title}</h1>
      </div>
      {children}
    </div>
  );
}

/* ---------- Заявления: расширенный список — хотбар только с 2 статусами:
   Выполнено (синий) и В работе (серый), без деления на 5 статусов STATUS_META ---------- */
const APP_BUCKET_META = {
  active: { label: "В работе", fg: "var(--color-sub)" },
  done: { label: "Выполнено", fg: "var(--color-accent)" },
} as const;

function ApplicationsView({ applications, onBack }: { applications: Application[]; onBack: () => void }) {
  const [filter, setFilter] = useState<"active" | "done">("active");
  const list = applications.filter((a) => (filter === "active" ? isActiveStatus(a.status) : !isActiveStatus(a.status)));
  const activeCount = applications.filter((a) => isActiveStatus(a.status)).length;
  const doneCount = applications.length - activeCount;

  return (
    <SubView title="Заявления организации" onBack={onBack}>
      <p className="mt-1 flex items-center gap-3 text-[12.5px] font-semibold text-sub">
        <span>Всего {applications.length}</span>
        {(["done", "active"] as const).map((id) => (
          <span key={id} className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: APP_BUCKET_META[id].fg }} />
            {id === "done" ? doneCount : activeCount} {APP_BUCKET_META[id].label.toLowerCase()}
          </span>
        ))}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {(["active", "done"] as const).map((id) => {
          const n = id === "active" ? activeCount : doneCount;
          const m = APP_BUCKET_META[id];
          const isSel = filter === id;
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className="press flex items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-extrabold shadow-card transition-all duration-300"
              style={isSel ? { background: m.fg, color: "#fff" } : { background: "var(--color-paper)", color: m.fg }}
            >
              {m.label}
              <span
                className="rounded-full px-1.5 py-px text-[10px]"
                style={{ background: isSel ? "rgba(255,255,255,0.25)" : "var(--color-card)" }}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3.5 space-y-2.5">
        {list.map((a, i) => {
          const m = STATUS_META[a.status];
          const isActive = isActiveStatus(a.status);
          return (
            <Reveal key={a.id} delay={i * 50}>
              <div className="rounded-2xl border border-line/80 bg-card p-3.5 shadow-card">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: m.bg, color: m.fg }}>
                    <Icon name={m.icon} className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-extrabold leading-tight tracking-tight">{a.title}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-sub">{a.service} · подано {fmtDate(a.submittedAt)}</p>
                  </div>
                  <span className="shrink-0 rounded-full px-2 py-1 text-[9.5px] font-extrabold uppercase tracking-wide" style={{ background: m.bg, color: m.fg }}>
                    {m.label}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between rounded-xl bg-paper px-3 py-2">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-faint">Срок</span>
                  <DeadlineChip deadlineAt={a.deadlineAt} active={isActive} />
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </SubView>
  );
}

function DeadlineChip({ deadlineAt, active }: { deadlineAt: number; active: boolean }) {
  if (!active) {
    return <span className="text-[11.5px] font-extrabold text-sub">Завершено {fmtDate(deadlineAt)}</span>;
  }
  const off = Math.ceil((deadlineAt - Date.now()) / 86_400_000);
  if (off < 0) return <span className="text-[11.5px] font-extrabold text-danger">Просрочено на {Math.abs(off)} дн.</span>;
  if (off === 0) return <span className="text-[11.5px] font-extrabold text-danger">Истекает сегодня</span>;
  if (off <= 2) return <span className="text-[11.5px] font-extrabold text-danger">Остался {off} дн. · до {fmtDate(deadlineAt)}</span>;
  if (off <= 7) return <span className="text-[11.5px] font-extrabold text-warn">Осталось {off} дн. · до {fmtDate(deadlineAt)}</span>;
  return <span className="text-[11.5px] font-extrabold text-accent-deep">Осталось {off} дн. · до {fmtDate(deadlineAt)}</span>;
}
