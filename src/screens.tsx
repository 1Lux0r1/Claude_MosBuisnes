import { useMemo, useState } from "react";
import { Icon, type IconName } from "./icons";
import { EmptyState, ErrorState, Reveal, useToast } from "./ui";
import {
  SERVICE_CATALOG, addDays, eventsForDate, startOfToday, type DayEvent, type EventKind,
} from "./data";

/* ---------- Услуги: каталог ---------- */
export function ServicesScreen({
  category, onCategory,
}: {
  category: string;
  onCategory: (c: string) => void;
}) {
  const toast = useToast();
  const onApply = (title: string) => toast(`Черновик заявки создан: «${title}»`, "doc");
  const cats = ["Все", ...new Set(SERVICE_CATALOG.map((s) => s.category))];
  const list = category === "Все" ? SERVICE_CATALOG : SERVICE_CATALOG.filter((s) => s.category === category);

  return (
    <div className="px-4 pt-4 pb-8">
      <Reveal>
        <h1 className="font-display text-[18px] font-semibold tracking-tight">Услуги</h1>
        <p className="mt-0.5 text-[12.5px] font-semibold text-sub">Каталог сервисов экосистемы</p>
      </Reveal>

      <div data-hscroll className="no-scrollbar -mx-4 mt-3.5 flex gap-1.5 overflow-x-auto px-4">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => onCategory(c)}
            className={`press shrink-0 rounded-full px-3.5 py-2 text-[12px] font-extrabold transition-all duration-300 ${
              category === c ? "bg-ink text-white" : "bg-white text-sub shadow-card"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {list.map((s, i) => (
          <Reveal key={s.id} delay={i * 50}>
            <div className="group rounded-2xl border border-line/80 bg-white p-3.5 shadow-card transition-all hover:border-accent/40 hover:shadow-float">
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
                  onClick={() => onApply(s.title)}
                  className="press rounded-full bg-accent-soft px-3.5 py-1.5 text-[11.5px] font-extrabold text-accent-deep transition-colors hover:bg-accent hover:text-white"
                >
                  Оформить
                </button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ---------- События: ближайшие 7 дней ---------- */
const KIND_DOT: Record<EventKind, string> = { critical: "#f5333f", deadline: "#f2a900", info: "#0a6bff" };

export function EventsScreen({
  registered, onRegister,
}: {
  registered: Set<string>;
  onRegister: (id: string) => void;
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

  const list = filter === "all" ? items : items.filter((x) => x.ev.kind === filter);

  return (
    <div className="px-4 pt-4 pb-8">
      <Reveal>
        <h1 className="font-display text-[18px] font-semibold tracking-tight">События</h1>
        <p className="mt-0.5 text-[12.5px] font-semibold text-sub">Дедлайны и мероприятия на неделю</p>
      </Reveal>

      <div className="mt-3.5 flex gap-1.5">
        {(
          [
            { id: "all", label: "Все" },
            { id: "critical", label: "Сроки" },
            { id: "deadline", label: "Дедлайны" },
            { id: "info", label: "Мероприятия" },
          ] as { id: EventKind | "all"; label: string }[]
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`press rounded-full px-3 py-2 text-[11.5px] font-extrabold transition-all duration-300 ${
              filter === f.id ? "bg-ink text-white" : "bg-white text-sub shadow-card"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-line/80 bg-white shadow-card">
          <EmptyState title="Событий с таким типом нет" hint="Выберите другой фильтр или посмотрите все события недели." />
          <div className="flex justify-center pb-4">
            <button onClick={() => setFilter("all")} className="press rounded-full bg-accent px-5 py-2 text-[12px] font-extrabold text-white">
              Показать все
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {list.map((x, i) => {
            const done = registered.has(x.id);
            return (
              <Reveal key={x.id} delay={i * 45}>
                <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-white p-3.5 shadow-card transition-all hover:shadow-float">
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
                  <button
                    onClick={() => {
                      onRegister(x.id);
                      toast(done ? "Запись отменена" : `Вы записаны: «${x.ev.title}»`, done ? "close" : "check");
                    }}
                    className={`press shrink-0 rounded-full px-3 py-2 text-[11px] font-extrabold transition-colors duration-300 ${
                      done ? "bg-ok-soft text-ok" : "bg-ink text-white hover:bg-accent"
                    }`}
                  >
                    {done ? "Вы записаны" : "Записаться"}
                  </button>
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
