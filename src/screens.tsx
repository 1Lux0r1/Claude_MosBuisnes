import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";
import { EmptyState, ErrorState, Reveal, Sheet, useToast } from "./ui";
import {
  SERVICE_AUDIENCES, SERVICE_CATALOG, addDays, eventsForDate, loadApplications, loadConnectedIntegrationIds,
  saveApplications, sectionTitleForCategory, startOfToday, type Application, type DayEvent, type EventKind,
  type ServiceAudience,
} from "./data";
import { fmtSupportAmount, supportAvailableTotal, supportMeasuresCount } from "./data/support-measures";

type ServiceItem = (typeof SERVICE_CATALOG)[number];

/* Поля формы заявки — свои под каждую категорию каталога */
type FieldDef = { key: string; label: string; type: "text" | "number"; placeholder: string };

const CATEGORY_FIELDS: Record<string, FieldDef[]> = {
  "Разрешения": [
    { key: "address", label: "Адрес объекта", type: "text", placeholder: "Например: ул. Тверская, 12" },
    { key: "purpose", label: "Вид деятельности / назначение", type: "text", placeholder: "Например: розничная торговля" },
  ],
  "Поддержка": [
    { key: "inn", label: "ИНН организации", type: "text", placeholder: "10 или 12 цифр" },
    { key: "amount", label: "Запрашиваемая сумма, ₽", type: "number", placeholder: "Например: 500000" },
    { key: "purpose", label: "Цель использования средств", type: "text", placeholder: "Например: закупка оборудования" },
  ],
  "Недвижимость": [
    { key: "area", label: "Желаемая площадь, м²", type: "number", placeholder: "Например: 80" },
    { key: "district", label: "Район / адрес", type: "text", placeholder: "Например: ЮВАО" },
  ],
  "Отчеты": [
    { key: "period", label: "Период отчёта", type: "text", placeholder: "Например: 3 квартал 2026" },
    { key: "email", label: "Email для отправки", type: "text", placeholder: "you@company.ru" },
  ],
  "Логистика": [
    { key: "from", label: "Адрес отправления", type: "text", placeholder: "Откуда забрать груз" },
    { key: "to", label: "Адрес назначения", type: "text", placeholder: "Куда доставить" },
    { key: "weight", label: "Вес/объём груза", type: "text", placeholder: "Например: 120 кг" },
  ],
  "Коммерческие сервисы": [
    { key: "company", label: "Название организации", type: "text", placeholder: "Например: ООО «Ромашка»" },
    { key: "task", label: "Что нужно сделать", type: "text", placeholder: "Кратко опишите задачу" },
    { key: "contact", label: "Контакт для связи", type: "text", placeholder: "Телефон или email" },
  ],
};

/* Демо-данные организации из 1С:Предприятие — те же, что показаны в
   карточке организации личного кабинета (Анна Петрова, ООО «Вектор Групп») */
const ONE_C_FILL: Record<string, string> = {
  inn: "7712345678",
  amount: "500000",
  purpose: "Закупка оборудования для производства",
  period: "3 квартал 2026",
  email: "a.petrova@vektor.ru",
};

/** Срок рассмотрения заявки в мс по строке term каталога («15 дней», «5-14
 *  дней», «2-4 часа» и т.п.) — берёт максимальное число, единица по наличию
 *  «час»/«дн»; для нераспознанных форматов («торги», «по расписанию») —
 *  дефолт 14 дней. */
function parseDeadlineMs(term: string): number {
  const hourMatch = term.match(/(\d+)\D+час/);
  if (hourMatch) return Number(hourMatch[1]) * 3_600_000;
  const nums = [...term.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (term.includes("дн") && nums.length) return Math.max(...nums) * 86_400_000;
  return 14 * 86_400_000;
}

/* ---------- Форма заявки на услугу — поля зависят от категории ---------- */
function ApplyForm({
  service, onClose, onSubmit, connected1C,
}: {
  service: ServiceItem | null;
  onClose: () => void;
  onSubmit: () => void;
  connected1C: boolean;
}) {
  const fields = service ? (CATEGORY_FIELDS[service.category] ?? []) : [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    setValues({});
    setErrors(new Set());
  }, [service?.id]);

  if (!service) return null;

  const fillFrom1C = () => {
    const next = { ...values };
    fields.forEach((f) => {
      if (ONE_C_FILL[f.key]) next[f.key] = ONE_C_FILL[f.key];
    });
    setValues(next);
    setErrors(new Set());
  };

  const submit = () => {
    const missing = fields.filter((f) => !values[f.key]?.trim());
    if (missing.length) {
      setErrors(new Set(missing.map((f) => f.key)));
      return;
    }
    onSubmit();
  };

  return (
    <Sheet open onClose={onClose} title={`Заявка: ${service.title}`}>
      <p className="text-[12.5px] font-semibold text-sub">{service.desc} · срок {service.term}</p>

      {service.oneC && connected1C && (
        <button
          onClick={fillFrom1C}
          className="press mt-3 inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1.5 text-[11.5px] font-extrabold text-ok"
        >
          <Icon name="link" className="h-3.5 w-3.5" strokeWidth={2.2} />
          Заполнить данные из 1С
        </button>
      )}

      <div className="mt-3 space-y-2.5">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-[11px] font-bold text-faint">{f.label}</label>
            <input
              value={values[f.key] ?? ""}
              onChange={(e) => {
                setValues({ ...values, [f.key]: e.target.value });
                if (errors.has(f.key)) {
                  const next = new Set(errors);
                  next.delete(f.key);
                  setErrors(next);
                }
              }}
              type={f.type}
              placeholder={f.placeholder}
              className={`h-10 w-full rounded-xl border bg-card px-3 text-[13px] font-semibold outline-none transition-colors placeholder:font-medium placeholder:text-faint ${
                errors.has(f.key) ? "border-danger ring-2 ring-danger/20" : "border-line focus:border-accent"
              }`}
            />
          </div>
        ))}
      </div>
      {errors.size > 0 && <p className="mt-1.5 text-[11px] font-bold text-danger">Заполните все поля формы</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="press rounded-full bg-paper px-4 py-2 text-[12px] font-extrabold text-sub">
          Отмена
        </button>
        <button onClick={submit} className="press inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[12px] font-extrabold text-white">
          <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
          Отправить заявку
        </button>
      </div>
    </Sheet>
  );
}

/* ---------- Фильтр-дропдаун (свёрнут в одну строку из трёх) ---------- */
function ServiceFilter({
  name, options, value, allValue, open, onToggle, onSelect,
}: {
  name: string;
  options: { label: string; value: string }[];
  value: string;
  allValue: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (v: string) => void;
}) {
  const active = value !== allValue;
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative min-w-0 flex-1">
      <button
        onClick={onToggle}
        className={`press flex h-9 w-full items-center justify-between gap-0.5 rounded-full px-2 text-[10.5px] font-extrabold transition-colors ${
          active ? "bg-ink text-on-ink" : "bg-card text-sub shadow-card"
        }`}
      >
        <span className="truncate">{active && current ? current.label : name}</span>
        <Icon
          name="chevron-right"
          className={`h-3 w-3 shrink-0 transition-transform ${open ? "-rotate-90" : "rotate-90"}`}
          strokeWidth={2.4}
        />
      </button>
      {open && (
        <div className="animate-pop absolute left-0 top-full z-30 mt-1.5 max-h-64 w-max min-w-[150px] max-w-[220px] overflow-y-auto rounded-2xl border border-line/80 bg-card p-1 shadow-float">
          {[{ label: "Все", value: allValue }, ...options].map((o) => (
            <button
              key={o.value}
              onClick={() => onSelect(o.value)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[12.5px] font-bold ${
                value === o.value ? "bg-paper text-ink" : "text-sub"
              }`}
            >
              <span className="truncate">{o.label}</span>
              {value === o.value && <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={3} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Услуги: каталог ---------- */
export function ServicesScreen({
  category, onCategory,
}: {
  category: string;
  onCategory: (c: string) => void;
}) {
  const toast = useToast();
  const [applying, setApplying] = useState<ServiceItem | null>(null);
  const connected1C = useMemo(() => loadConnectedIntegrationIds().includes("1c"), []);

  /* Три фильтра, работают пересечением, каждый сбрасывается отдельно. «Направление»
     использует общий с навигацией параметр category (значение «Все» — без фильтра). */
  const [typeFilter, setTypeFilter] = useState("all"); // all | city | commercial
  const [audFilter, setAudFilter] = useState("all"); // all | ServiceAudience
  const [openFilter, setOpenFilter] = useState<null | "type" | "dir" | "aud">(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openFilter) return;
    const onDown = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setOpenFilter(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openFilter]);

  const directions = [...new Set(SERVICE_CATALOG.map((s) => s.category))];
  const list = SERVICE_CATALOG.filter(
    (s) =>
      (typeFilter === "all" || s.serviceType === typeFilter) &&
      (category === "Все" || s.category === category) &&
      (audFilter === "all" || s.audience.includes(audFilter as ServiceAudience)),
  );

  const submitApplication = () => {
    if (!applying) return;
    const instant = applying.term === "мгновенно";
    const now = Date.now();
    const app: Application = {
      id: `app-${now}-${Math.random().toString(36).slice(2, 7)}`,
      title: applying.title,
      service: sectionTitleForCategory(applying.category),
      submittedAt: now,
      deadlineAt: instant ? now : now + parseDeadlineMs(applying.term),
      status: instant ? "approved" : "review",
    };
    saveApplications([app, ...loadApplications()]);
    toast(instant ? `Готово: «${applying.title}»` : `Заявка отправлена: «${applying.title}»`, "check");
    setApplying(null);
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <Reveal>
        <h1 className="font-display text-[18px] font-semibold tracking-tight">Услуги</h1>
        <p className="mt-0.5 text-[12.5px] font-semibold text-sub">Каталог сервисов экосистемы</p>
      </Reveal>

      <div ref={filtersRef} className="mt-3.5 flex gap-1.5">
        <ServiceFilter
          name="Тип"
          value={typeFilter}
          allValue="all"
          options={[
            { label: "Городские", value: "city" },
            { label: "Коммерческие", value: "commercial" },
          ]}
          open={openFilter === "type"}
          onToggle={() => setOpenFilter((c) => (c === "type" ? null : "type"))}
          onSelect={(v) => {
            setTypeFilter(v);
            setOpenFilter(null);
          }}
        />
        <ServiceFilter
          name="Направление"
          value={category}
          allValue="Все"
          options={directions.map((d) => ({ label: d, value: d }))}
          open={openFilter === "dir"}
          onToggle={() => setOpenFilter((c) => (c === "dir" ? null : "dir"))}
          onSelect={(v) => {
            onCategory(v);
            setOpenFilter(null);
          }}
        />
        <ServiceFilter
          name="Кому"
          value={audFilter}
          allValue="all"
          options={SERVICE_AUDIENCES.map((a) => ({ label: a, value: a }))}
          open={openFilter === "aud"}
          onToggle={() => setOpenFilter((c) => (c === "aud" ? null : "aud"))}
          onSelect={(v) => {
            setAudFilter(v);
            setOpenFilter(null);
          }}
        />
      </div>

      {list.length === 0 && (
        <div className="mt-4 rounded-2xl border border-line/80 bg-card shadow-card">
          <EmptyState title="Ничего не найдено" hint="Смягчите фильтры или сбросьте один из них — выберите «Все»." />
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        {list.map((s, i) => (
          <Reveal key={s.id} delay={i * 50}>
            <div className="group rounded-2xl border border-line/80 bg-card p-3.5 shadow-card transition-all hover:border-accent/40 hover:shadow-float">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper text-ink2">
                  <Icon name={s.icon as IconName} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-extrabold tracking-tight">{s.title}</p>
                  <p className="mt-0.5 truncate text-[11.5px] font-medium text-sub">{s.desc}</p>
                </div>
                <span className="shrink-0 rounded-full bg-paper px-2 py-1 text-[10px] font-extrabold text-sub">{s.term}</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-faint">{s.category}</span>
                <button
                  onClick={() => setApplying(s)}
                  className="press rounded-full bg-accent-soft px-3.5 py-1.5 text-[11.5px] font-extrabold text-accent-deep transition-colors hover:bg-accent hover:text-white"
                >
                  Оформить
                </button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <ApplyForm service={applying} onClose={() => setApplying(null)} onSubmit={submitApplication} connected1C={connected1C} />
    </div>
  );
}

/* ---------- События: ближайшие 7 дней ---------- */
const KIND_DOT: Record<EventKind, string> = { critical: "#f5333f", deadline: "#f2a900", info: "#0a6bff" };

/* Уведомления из двух верхних плашек Главной — попадают в раздел «Уведомления»
   (и в «Все»), со стрелками перехода в те же места, куда ведут плашки. */
type Notification = { id: string; icon: IconName; bg: string; fg: string; title: string; sub: string; onClick: () => void };

export function EventsScreen({
  registered, onRegister, onOpenVitrina,
}: {
  registered: Set<string>;
  onRegister: (id: string) => void;
  onOpenVitrina: () => void;
}) {
  const toast = useToast();
  const [filter, setFilter] = useState<EventKind | "all">("all");

  const items = useMemo(() => {
    const acc: { id: string; day: string; date: Date; ev: DayEvent }[] = [];
    const today = startOfToday();
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, i);
      eventsForDate(d).forEach((ev, j) =>
        acc.push({
          id: `${i}-${j}`,
          day: i === 0 ? "Сегодня" : i === 1 ? "Завтра" : `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`,
          date: d,
          ev,
        }),
      );
    }
    return acc;
  }, []);

  const notifications: Notification[] = [
    {
      id: "notif-vitrina", icon: "coins", bg: "var(--color-accent-soft)", fg: "var(--color-accent-deep)",
      title: `Вам доступно до ${fmtSupportAmount(supportAvailableTotal())}`,
      sub: `по ${supportMeasuresCount()} мерам поддержки`,
      onClick: onOpenVitrina,
    },
    {
      id: "notif-mchd", icon: "clock", bg: "var(--color-warn-soft)", fg: "var(--color-warn)",
      title: "Истекает срок действия МЧД", sub: "Получить электронную доверенность",
      onClick: () => toast("Электронная доверенность — раздел в разработке", "shield"),
    },
  ];
  /* «Уведомления» (kind deadline) показывают только две плашки, видны в нём и в «Все» */
  const showNotifications = filter === "all" || filter === "deadline";

  /* «Сроки» вбирают и critical, и deadline-события — deadline перенесены сюда
     из «Уведомлений». Сами «Уведомления» событий больше не содержат. */
  const list =
    filter === "all"
      ? items
      : filter === "critical"
        ? items.filter((x) => x.ev.kind === "critical" || x.ev.kind === "deadline")
        : filter === "deadline"
          ? []
          : items.filter((x) => x.ev.kind === filter);
  const isEmpty = list.length === 0 && !showNotifications;

  return (
    <div className="px-4 pt-4 pb-8">
      <Reveal>
        <h1 className="font-display text-[18px] font-semibold tracking-tight">События</h1>
        <p className="mt-0.5 text-[12.5px] font-semibold text-sub">Уведомления и мероприятия на неделю</p>
      </Reveal>

      <div className="mt-3.5 flex gap-1.5">
        {(
          [
            { id: "all", label: "Все" },
            { id: "critical", label: "Сроки" },
            { id: "deadline", label: "Уведомления" },
            { id: "info", label: "Мероприятия" },
          ] as { id: EventKind | "all"; label: string }[]
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`press rounded-full px-3 py-2 text-[11.5px] font-extrabold transition-all duration-300 ${
              filter === f.id ? "bg-ink text-on-ink" : "bg-card text-sub shadow-card"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isEmpty ? (
        <div className="mt-4 rounded-2xl border border-line/80 bg-card shadow-card">
          <EmptyState title="Событий с таким типом нет" hint="Выберите другой фильтр или посмотрите все события недели." />
          <div className="flex justify-center pb-4">
            <button onClick={() => setFilter("all")} className="press rounded-full bg-accent px-5 py-2 text-[12px] font-extrabold text-white">
              Показать все
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {showNotifications &&
            notifications.map((n) => (
              <Reveal key={n.id}>
                <button
                  onClick={n.onClick}
                  className="press flex w-full items-center gap-3 rounded-2xl border border-line/80 bg-card p-3.5 text-left shadow-card transition-all hover:shadow-float"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: n.bg, color: n.fg }}>
                    <Icon name={n.icon} className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-extrabold leading-tight tracking-tight">{n.title}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-sub">{n.sub}</p>
                  </div>
                  <Icon name="arrow-right" className="h-4 w-4 shrink-0 text-sub" strokeWidth={2.2} />
                </button>
              </Reveal>
            ))}
          {list.map((x, i) => {
            const done = registered.has(x.id);
            return (
              <Reveal key={x.id} delay={i * 45}>
                <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-card p-3.5 shadow-card transition-all hover:shadow-float">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: `${KIND_DOT[x.ev.kind]}1a` }}>
                    <Icon
                      name={x.ev.kind === "info" ? "calendar" : x.ev.kind === "deadline" ? "clock" : "alert"}
                      className="h-[18px] w-[18px]"
                      strokeWidth={2}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-extrabold leading-tight tracking-tight">{x.ev.title}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-sub">
                      <span style={{ color: KIND_DOT[x.ev.kind] }}>{x.ev.time}</span> · {x.day}
                      {x.ev.place && <span> · {x.ev.place}</span>}
                    </p>
                  </div>
                  {x.ev.kind === "info" && (
                    <button
                      onClick={() => {
                        onRegister(x.id);
                        toast(done ? "Запись отменена" : `Вы записаны: «${x.ev.title}»`, done ? "close" : "check");
                      }}
                      className={`press shrink-0 rounded-full px-3 py-2 text-[11px] font-extrabold transition-colors duration-300 ${
                        done ? "bg-ok-soft text-ok" : "bg-ink text-on-ink hover:bg-accent hover:text-white"
                      }`}
                    >
                      {done ? "Вы записаны" : "Записаться"}
                    </button>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Ошибка сети (внутри ToastProvider) ---------- */
export function OfflineError({ onRetry }: { onRetry: () => void }) {
  const toast = useToast();
  return (
    <ErrorState
      onRetry={() => {
        toast("Нет соединения. Выключите офлайн-режим в кабинете", "wifi-off");
        onRetry();
      }}
    />
  );
}
