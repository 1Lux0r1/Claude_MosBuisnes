import { useMemo, useState } from "react";
import { Icon } from "./icons";
import { ChartOverlay, useToast } from "./ui";
import {
  addDays, dayKey, eventsForDate, eventsForMonth, loadConnectedIntegrationIds, MONTHS, MONTHS_NOM,
  sameDay, sortByTime, startOfToday, WEEKDAYS, type CustomEvent, type DayEvent, type EventKind,
} from "./data";
import { holidayFor, type HolidayInfo } from "./data/holidays";
import PaymentScreen from "./PaymentScreen";

const fmtRub = (v: number) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v)} ₽`;

/* Цвет числа даты по производственному календарю: праздник — красный,
   перенос — чёрный (ink), иначе — переданный fallback (цвет события / обычный). */
const holidayNumberColor = (hol: HolidayInfo | null, fallback: string) =>
  hol?.type === "holiday" ? "var(--color-danger)" : hol?.type === "transferred" ? "var(--color-ink)" : fallback;

/* Заметка о том, что коммерческие платежи партнёров идут через 1С и без
   интеграции не показываются — с кнопкой перехода к подключению. */
function IntegrationNote({ onConnect }: { onConnect: () => void }) {
  return (
    <button
      onClick={onConnect}
      className="press mt-2.5 flex w-full items-center gap-2 rounded-xl bg-accent-soft/60 px-3 py-2 text-left transition-colors hover:bg-accent-soft"
    >
      <Icon name="link" className="h-3.5 w-3.5 shrink-0 text-accent-deep" strokeWidth={2.2} />
      <span className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-accent-deep">
        Коммерческие платежи партнёров подключаются через 1С и без интеграции не показываются в календаре.
      </span>
      <span className="shrink-0 text-[11px] font-extrabold text-accent-deep underline underline-offset-2">Подключить</span>
    </button>
  );
}

const KIND_META: Record<EventKind, { label: string; bg: string; fg: string; dot: string }> = {
  critical: { label: "Важно", bg: "#fdeceb", fg: "#f5333f", dot: "#f5333f" },
  deadline: { label: "Оплата", bg: "#fff3d4", fg: "#b97a00", dot: "#f2a900" },
  info: { label: "Встреча", bg: "#e6efff", fg: "#0a6bff", dot: "#0a6bff" },
};

function priority(evs: DayEvent[]): EventKind | null {
  if (evs.some((e) => e.kind === "critical")) return "critical";
  if (evs.some((e) => e.kind === "deadline")) return "deadline";
  if (evs.length) return "info";
  return null;
}

const CUSTOM_KEY = "cevba-custom-events";
function loadCustom(): Record<string, CustomEvent[]> {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "{}");
  } catch {
    return {};
  }
}

type EventFormValue = { title: string; time: string; kind: EventKind };

/* Форма добавления события — используется и в мини-ленте, и в полном календаре */
function EventForm({
  form, onChange, error, onCancel, onSubmit,
}: {
  form: EventFormValue;
  onChange: (f: EventFormValue) => void;
  error: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="animate-fade-up mt-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-3">
      <p className="text-[12px] font-extrabold text-accent-deep">Новое событие</p>
      <input
        autoFocus
        value={form.title}
        onChange={(e) => onChange({ ...form, title: e.target.value })}
        placeholder="Например: встреча с инвестором"
        className={`mt-2 h-10 w-full rounded-xl border bg-card px-3 text-[13px] font-semibold outline-none transition-colors placeholder:font-medium placeholder:text-faint ${
          error ? "border-danger ring-2 ring-danger/20" : "border-line focus:border-accent"
        }`}
      />
      {error && <p className="mt-1 text-[11px] font-bold text-danger">Введите название события</p>}
      <label className="mt-2.5 flex h-10 w-full items-center gap-2 rounded-xl border border-line bg-card px-3">
        <Icon name="clock" className="h-4 w-4 shrink-0 text-sub" strokeWidth={2} />
        <input
          type="time"
          value={form.time}
          onChange={(e) => onChange({ ...form, time: e.target.value })}
          className="w-full bg-transparent text-[13px] font-bold outline-none"
        />
      </label>
      <div className="mt-2 flex gap-1.5">
        {(Object.keys(KIND_META) as EventKind[]).map((k) => (
          <button
            key={k}
            onClick={() => onChange({ ...form, kind: k })}
            className="press flex-1 rounded-full px-2.5 py-1.5 text-[10.5px] font-extrabold transition-all"
            style={
              form.kind === k
                ? { background: KIND_META[k].dot, color: "#fff" }
                : { background: KIND_META[k].bg, color: KIND_META[k].fg }
            }
          >
            {KIND_META[k].label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="press rounded-full bg-card px-4 py-2 text-[12px] font-extrabold text-sub">
          Отмена
        </button>
        <button onClick={onSubmit} className="press inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[12px] font-extrabold text-white">
          <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
          Добавить
        </button>
      </div>
    </div>
  );
}

export default function CalendarStrip({ onOpenIntegrations }: { onOpenIntegrations: () => void }) {
  const today = useMemo(startOfToday, []);
  const days = useMemo(() => Array.from({ length: 9 }, (_, i) => addDays(today, i - 2)), [today]);
  const connected1C = useMemo(() => loadConnectedIntegrationIds().includes("1c"), []);

  /* По умолчанию события скрыты: карточка открывается только по тапу на дату */
  const [selected, setSelected] = useState<Date | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const [custom, setCustom] = useState<Record<string, CustomEvent[]>>(loadCustom);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<EventFormValue>({ title: "", time: "12:00", kind: "info" });
  const [formError, setFormError] = useState(false);
  const [payment, setPayment] = useState<{ event: DayEvent; date: Date } | null>(null);
  const toast = useToast();

  /* Коммерческие платежи партнёров интегрируются через 1С — без активной
     интеграции скрываем их и из ленты, и из месячного календаря. */
  const visibleBase = (evs: DayEvent[]) => (connected1C ? evs : evs.filter((e) => e.payment?.type !== "commercial"));

  const mergedFor = (d: Date): (DayEvent | CustomEvent)[] =>
    sortByTime([...visibleBase(eventsForDate(d)), ...(custom[dayKey(d)] ?? [])]);

  const persist = (next: Record<string, CustomEvent[]>) => {
    setCustom(next);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  };

  const toggleDay = (d: Date) => {
    if (selected && sameDay(d, selected)) {
      setSelected(null);
      setAdding(false);
    } else {
      setSelected(d);
      setAdding(false);
    }
  };

  const events = selected ? mergedFor(selected) : [];
  const selMeta = selected ? KIND_META[priority(events) ?? "info"] : null;
  const selHoliday = selected ? holidayFor(dayKey(selected)) : null;
  const dayTitle = selected
    ? sameDay(selected, today)
      ? "Сегодня"
      : `${WEEKDAYS[selected.getDay()]}, ${selected.getDate()} ${MONTHS[selected.getMonth()]}`
    : "";

  const addEvent = (key: string, ev: CustomEvent) => {
    persist({ ...custom, [key]: sortByTime([...(custom[key] ?? []), ev]) });
    toast("Событие добавлено в календарь", "check");
  };

  const removeEvent = (key: string, id: string) => {
    const next = { ...custom, [key]: (custom[key] ?? []).filter((e) => e.id !== id) };
    if (!next[key].length) delete next[key];
    persist(next);
    toast("Событие удалено", "close");
  };

  const submitEvent = () => {
    if (!selected) return;
    if (!form.title.trim()) {
      setFormError(true);
      return;
    }
    const ev: CustomEvent = {
      id: `${Date.now()}`, custom: true,
      time: form.time, title: form.title.trim(), kind: form.kind,
    };
    addEvent(dayKey(selected), ev);
    setForm({ title: "", time: "12:00", kind: "info" });
    setFormError(false);
    setAdding(false);
  };

  const deleteEvent = (id: string) => {
    if (!selected) return;
    removeEvent(dayKey(selected), id);
  };

  return (
    <section className="px-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[15px] font-semibold tracking-tight">Календарь</h2>
        <button
          onClick={() => setMonthOpen(true)}
          className="press inline-flex items-center gap-1.5 rounded-full py-1.5 pr-1 text-[12.5px] font-bold text-accent"
        >
          Открыть календарь
          <Icon name="chevron-right" className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
      </div>

      {!connected1C && <IntegrationNote onConnect={onOpenIntegrations} />}

      {/* Линия дат: 9 ячеек (2 до сегодня + сегодня + 6 после) */}
      <div data-hscroll className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => {
          const evs = mergedFor(d);
          const kind = priority(evs);
          const meta = kind ? KIND_META[kind] : null;
          const hol = holidayFor(dayKey(d));
          const active = !!selected && sameDay(d, selected);
          const todayCell = sameDay(d, today);
          return (
            <button
              key={dayKey(d)}
              onClick={() => toggleDay(d)}
              className="press relative flex w-[62px] shrink-0 flex-col items-center rounded-2xl border py-2.5 transition-all duration-300"
              style={{
                background: active && meta ? meta.bg : meta ? `${meta.bg}aa` : "var(--color-card)",
                borderColor: todayCell
                  ? "var(--color-ink)"
                  : hol
                    ? "var(--color-danger)"
                    : active ? (meta ? meta.dot : "#0a6bff") : "var(--color-line)",
                borderWidth: todayCell ? 2.5 : hol || active ? 2 : 1,
                boxShadow: active ? "0 8px 18px -10px rgba(14,18,32,0.35)" : undefined,
              }}
              aria-label={`${d.getDate()} ${MONTHS[d.getMonth()]}${hol ? ` — ${hol.name}` : ""}`}
            >
              <span
                className="font-display text-[16px] font-semibold leading-none"
                style={{ color: holidayNumberColor(hol, meta?.fg ?? "var(--color-ink)") }}
              >
                {d.getDate()}
              </span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-sub">
                {WEEKDAYS[d.getDay()]}
              </span>
              <span className="text-[9.5px] font-medium text-faint">{MONTHS[d.getMonth()].slice(0, 3)}</span>
              {evs.length > 0 && (
                <span className="mt-1 flex gap-0.5">
                  {[...new Set(evs.map((e) => e.kind))].map((k) => (
                    <span key={k} className="h-1 w-1 rounded-full" style={{ background: KIND_META[k].dot }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Карточка дня: скрыта, пока дата не выбрана тапом */}
      <div
        className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          selected ? "mt-2.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          {selected && (
            <div key={dayKey(selected)} className="animate-fade-in rounded-2xl border border-line/80 bg-card p-3.5 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <p className="flex min-w-0 items-center text-[13px] font-extrabold">
                  <span className="truncate">{dayTitle}</span>
                  <span
                    className="ml-2 shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold"
                    style={selMeta ? { background: selMeta.bg, color: selMeta.fg } : { background: "#f4f5f9", color: "#79818f" }}
                  >
                    {events.length ? `${events.length} соб.` : "пусто"}
                  </span>
                </p>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => toast("Напоминание добавлено в календарь", "bell")}
                    className="press inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1.5 text-[11px] font-bold text-ink2"
                  >
                    <Icon name="bell" className="h-3.5 w-3.5" strokeWidth={2} />
                    Напомнить
                  </button>
                  <button
                    onClick={() => toggleDay(selected)}
                    className="press grid h-7 w-7 place-items-center rounded-full bg-paper text-sub"
                    aria-label="Свернуть"
                  >
                    <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                </div>
              </div>

              {selHoliday && (
                <p
                  className="mt-2.5 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-extrabold"
                  style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)" }}
                >
                  <Icon name="star" className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
                  {selHoliday.type === "transferred" ? `Выходной · ${selHoliday.name}` : selHoliday.name}
                </p>
              )}

              {events.length === 0 && !adding ? (
                <p className="mt-2.5 rounded-xl bg-paper px-3 py-3 text-[12.5px] font-medium leading-relaxed text-sub">
                  На эту дату событий нет — день свободен для задач.
                </p>
              ) : (
                events.length > 0 && (
                  <ul className="mt-2.5 space-y-2">
                    {events.map((e, i) => {
                      const m = KIND_META[e.kind];
                      const pay = e.payment;
                      const Row = pay ? "button" : "div";
                      return (
                        <li key={i}>
                          <Row
                            {...(pay ? { onClick: () => setPayment({ event: e, date: selected! }) } : {})}
                            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left ${pay ? "press transition-colors hover:brightness-95" : ""}`}
                            style={{ background: m.bg }}
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/85" style={{ color: m.fg }}>
                              <Icon
                                name={pay ? "coins" : e.kind === "info" ? "calendar" : e.kind === "deadline" ? "clock" : "alert"}
                                className="h-4 w-4"
                                strokeWidth={2}
                              />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-bold leading-tight text-ink-solid">{e.title}</span>
                              <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-ink-solid/55">
                                <span style={{ color: m.fg }}>{e.time}</span>
                                {pay ? <span className="truncate">· {fmtRub(pay.amount)}</span> : e.place && <span className="truncate">· {e.place}</span>}
                              </span>
                            </span>
                            {"custom" in e && !pay && (
                              <button
                                onClick={() => deleteEvent(e.id)}
                                className="press grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/85 text-ink2-solid"
                                aria-label="Удалить событие"
                              >
                                <Icon name="close" className="h-3 w-3" strokeWidth={2.4} />
                              </button>
                            )}
                            {pay ? (
                              <span className="shrink-0" style={{ color: m.fg }}>
                                <Icon name="chevron-right" className="h-4 w-4" strokeWidth={2.2} />
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-white/85 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide" style={{ color: m.fg }}>
                                {m.label}
                              </span>
                            )}
                          </Row>
                        </li>
                      );
                    })}
                  </ul>
                )
              )}

              {/* Добавить событие */}
              {adding ? (
                <EventForm
                  form={form}
                  onChange={(f) => {
                    setForm(f);
                    if (formError && f.title.trim()) setFormError(false);
                  }}
                  error={formError}
                  onCancel={() => {
                    setAdding(false);
                    setFormError(false);
                    setForm({ title: "", time: "12:00", kind: "info" });
                  }}
                  onSubmit={submitEvent}
                />
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="press mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-paper/60 py-2.5 text-[12px] font-extrabold text-accent transition-colors hover:border-accent/50 hover:bg-accent-soft/40"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Добавить событие
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <MonthSheet
        open={monthOpen}
        onClose={() => setMonthOpen(false)}
        custom={custom}
        onAddEvent={addEvent}
        onDeleteEvent={removeEvent}
        connected1C={connected1C}
        onOpenIntegrations={onOpenIntegrations}
        onOpenPayment={(date, event) => setPayment({ date, event })}
      />

      <PaymentScreen
        open={!!payment}
        event={payment?.event ?? null}
        date={payment?.date ?? null}
        onClose={() => setPayment(null)}
        onOpenProfile={onOpenIntegrations}
      />
    </section>
  );
}

/* ---------- Полный месяц ---------- */
function MonthSheet({
  open, onClose, custom, onAddEvent, onDeleteEvent, connected1C, onOpenIntegrations, onOpenPayment,
}: {
  open: boolean;
  onClose: () => void;
  custom: Record<string, CustomEvent[]>;
  onAddEvent: (key: string, ev: CustomEvent) => void;
  onDeleteEvent: (key: string, id: string) => void;
  connected1C: boolean;
  onOpenIntegrations: () => void;
  onOpenPayment: (date: Date, event: DayEvent) => void;
}) {
  const today = useMemo(startOfToday, []);
  const [view, setView] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }));
  const [sel, setSel] = useState<Date | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<EventFormValue>({ title: "", time: "12:00", kind: "info" });
  const [formError, setFormError] = useState(false);

  const selectDay = (d: Date) => {
    setSel(d);
    setAdding(false);
    setFormError(false);
  };

  const submitEvent = () => {
    if (!sel) return;
    if (!form.title.trim()) {
      setFormError(true);
      return;
    }
    onAddEvent(dayKey(sel), { id: `${Date.now()}`, custom: true, time: form.time, title: form.title.trim(), kind: form.kind });
    setForm({ title: "", time: "12:00", kind: "info" });
    setFormError(false);
    setAdding(false);
  };

  const monthEvents = useMemo(() => {
    const base = eventsForMonth(view.y, view.m);
    const merged = new Map<string, (DayEvent | CustomEvent)[]>();
    base.forEach((evs, key) => {
      const visible = connected1C ? evs : evs.filter((e) => e.payment?.type !== "commercial");
      if (visible.length) merged.set(key, visible);
    });
    Object.entries(custom).forEach(([key, evs]) => {
      merged.set(key, sortByTime([...(merged.get(key) ?? []), ...evs]));
    });
    return merged;
  }, [view, custom, connected1C]);

  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const daysIn = new Date(view.y, view.m + 1, 0).getDate();

  const nav = (dir: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + dir, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
    setSel(null);
  };

  return (
    <ChartOverlay open={open} onClose={onClose} title={`${MONTHS_NOM[view.m]} ${view.y}`}>
      <div className="flex items-center justify-between">
        <button onClick={() => nav(-1)} className="press grid h-9 w-9 place-items-center rounded-full bg-paper text-ink2" aria-label="Предыдущий месяц">
          <Icon name="chevron-left" className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </button>
        <p className="text-[12px] font-bold text-sub">
          Легенда: <span className="text-danger">●</span> {KIND_META.critical.label.toLowerCase()}{" "}
          <span className="ml-1.5 text-[#f2a900]">●</span> {KIND_META.deadline.label.toLowerCase()}{" "}
          <span className="ml-1.5 text-accent">●</span> {KIND_META.info.label.toLowerCase()}
        </p>
        <button onClick={() => nav(1)} className="press grid h-9 w-9 place-items-center rounded-full bg-paper text-ink2" aria-label="Следующий месяц">
          <Icon name="chevron-right" className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </button>
      </div>

      {!connected1C && <IntegrationNote onConnect={onOpenIntegrations} />}

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
          <span key={d} className="pb-1 text-[10.5px] font-bold uppercase text-faint">{d}</span>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: daysIn }).map((_, i) => {
          const d = new Date(view.y, view.m, i + 1);
          const evs = monthEvents.get(dayKey(d)) ?? [];
          const kind = priority(evs);
          const meta = kind ? KIND_META[kind] : null;
          const hol = holidayFor(dayKey(d));
          const isSel = !!sel && sameDay(d, sel);
          const isToday = sameDay(d, today);
          const borderCls = isSel ? "" : isToday ? "border-2 border-ink" : hol ? "border-2" : "";
          const cellStyle: React.CSSProperties = {};
          if (!isSel && meta) cellStyle.background = meta.bg;
          if (!isSel) {
            const c = holidayNumberColor(hol, meta?.fg ?? "");
            if (c) cellStyle.color = c;
          }
          if (!isSel && !isToday && hol) cellStyle.borderColor = "var(--color-danger)";
          return (
            <button
              key={i}
              onClick={() => selectDay(d)}
              className={`press relative mx-auto grid h-10 w-10 place-items-center rounded-xl text-[13px] font-bold transition-colors ${
                isSel ? "bg-accent text-white" : meta ? "" : "text-ink2 hover:bg-paper"
              } ${borderCls}`}
              style={Object.keys(cellStyle).length ? cellStyle : undefined}
            >
              {i + 1}
              {evs.length > 0 && !isSel && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full" style={{ background: meta?.dot }} />
              )}
            </button>
          );
        })}
      </div>

      {sel && (
        <div key={dayKey(sel)} className="animate-fade-up mt-4 border-t border-line pt-4">
          <p className="text-[13px] font-extrabold">
            {WEEKDAYS[sel.getDay()]}, {sel.getDate()} {MONTHS[sel.getMonth()]}
          </p>
          {(() => {
            const selHol = holidayFor(dayKey(sel));
            return selHol ? (
              <p
                className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-extrabold"
                style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)" }}
              >
                <Icon name="star" className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
                {selHol.type === "transferred" ? `Выходной · ${selHol.name}` : selHol.name}
              </p>
            ) : null;
          })()}
          {(monthEvents.get(dayKey(sel)) ?? []).length === 0 ? (
            <p className="mt-2 rounded-xl bg-paper px-3 py-3 text-[12.5px] font-medium text-sub">Событий нет — день свободен для задач.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {(monthEvents.get(dayKey(sel)) ?? []).map((e, i) => {
                const m = KIND_META[e.kind];
                const pay = e.payment;
                const Row = pay ? "button" : "div";
                return (
                  <li key={i}>
                    <Row
                      {...(pay ? { onClick: () => onOpenPayment(sel, e) } : {})}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left ${pay ? "press transition-colors hover:brightness-95" : ""}`}
                      style={{ background: m.bg }}
                    >
                      <span className="text-[11.5px] font-extrabold" style={{ color: m.fg }}>{e.time}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink-solid">
                        {e.title}
                        {pay && <span className="ml-1.5 font-semibold text-ink-solid/55">· {fmtRub(pay.amount)}</span>}
                      </span>
                      {"custom" in e && !pay && (
                        <>
                          <span className="shrink-0 text-[9.5px] font-extrabold uppercase tracking-wide text-ink-solid/55">личное</span>
                          <button
                            onClick={() => onDeleteEvent(dayKey(sel), e.id)}
                            className="press grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/85 text-ink2-solid"
                            aria-label="Удалить событие"
                          >
                            <Icon name="close" className="h-3 w-3" strokeWidth={2.4} />
                          </button>
                        </>
                      )}
                      {pay ? (
                        <span className="shrink-0" style={{ color: m.fg }}>
                          <Icon name="chevron-right" className="h-4 w-4" strokeWidth={2.2} />
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold uppercase" style={{ color: m.fg }}>{m.label}</span>
                      )}
                    </Row>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Добавить событие — доступно и если на дату уже есть события */}
          {adding ? (
            <EventForm
              form={form}
              onChange={(f) => {
                setForm(f);
                if (formError && f.title.trim()) setFormError(false);
              }}
              error={formError}
              onCancel={() => {
                setAdding(false);
                setFormError(false);
                setForm({ title: "", time: "12:00", kind: "info" });
              }}
              onSubmit={submitEvent}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="press mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-paper/60 py-2.5 text-[12px] font-extrabold text-accent transition-colors hover:border-accent/50 hover:bg-accent-soft/40"
            >
              <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.4} />
              Добавить событие
            </button>
          )}
        </div>
      )}
    </ChartOverlay>
  );
}
