import { useState } from "react";
import { Icon, type IconName } from "./icons";
import { Dots, Reveal, Sheet, useSnap, useToast } from "./ui";
import {
  DEFAULT_QUICK_ACTION_IDS, PARTNER_PAGES, QUICK_ACTIONS, SERVICE_SECTIONS,
  type Partner, type QuickAction, type ServiceSection,
} from "./data";

const QUICK_ACTIONS_KEY = "mb-quick-actions";
const MIN_QUICK_ACTIONS = 3;
const MAX_QUICK_ACTIONS = 6;

function loadEnabledIds(): string[] {
  try {
    const raw = localStorage.getItem(QUICK_ACTIONS_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(ids) && ids.every((x) => typeof x === "string")) return ids;
  } catch {
    /* игнорируем повреждённые данные — вернём набор по умолчанию */
  }
  return DEFAULT_QUICK_ACTION_IDS;
}

/* Делим плитки на строки без «хвоста»: при 4–5 действиях последняя строка
   не должна оставлять пустые ячейки, при 3 — плитки не растягиваются на два ряда. */
function chunkIntoRows<T>(items: T[]): T[][] {
  if (items.length <= 3) return items.length ? [items] : [];
  const firstRow = Math.ceil(items.length / 2);
  return [items.slice(0, firstRow), items.slice(firstRow)];
}

/* ---------- Быстрые действия: настраиваемая панель ---------- */
export function QuickActions({ onPick }: { onPick: (a: QuickAction) => void }) {
  const toast = useToast();
  const [enabled, setEnabled] = useState<string[]>(loadEnabledIds);
  const [pickerOpen, setPickerOpen] = useState(false);

  const persist = (ids: string[]) => {
    setEnabled(ids);
    localStorage.setItem(QUICK_ACTIONS_KEY, JSON.stringify(ids));
  };

  const toggle = (id: string) => {
    if (enabled.includes(id)) {
      if (enabled.length <= MIN_QUICK_ACTIONS) {
        toast(`Минимум ${MIN_QUICK_ACTIONS} действия на панели`, "alert");
        return;
      }
      persist(enabled.filter((x) => x !== id));
    } else {
      if (enabled.length >= MAX_QUICK_ACTIONS) {
        toast(`Максимум ${MAX_QUICK_ACTIONS} действий на панели`, "alert");
        return;
      }
      persist([...enabled, id]);
    }
  };

  const visible = QUICK_ACTIONS.filter((a) => enabled.includes(a.id));
  const rows = chunkIntoRows(visible);

  return (
    <Reveal>
      <section className="px-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[15px] font-semibold tracking-tight">Быстрые действия</h2>
          <button
            onClick={() => setPickerOpen(true)}
            className="press inline-flex items-center gap-1.5 rounded-full py-1.5 pr-1 text-[12.5px] font-bold text-accent"
          >
            Настроить
            <Icon name="settings" className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>
        <div className="mt-3 space-y-2.5">
          {rows.map((row, ri) => (
            <div key={ri} className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
              {row.map((a, i) => (
                <Reveal key={a.id} delay={(ri * 3 + i) * 45}>
                  <button
                    onClick={() => onPick(a)}
                    className="press relative flex h-full w-full flex-col items-start rounded-2xl border border-line/80 bg-white p-3 text-left shadow-card transition-shadow hover:shadow-float"
                  >
                    {a.badge && (
                      <span className="absolute -right-1.5 -top-1.5 grid h-[19px] min-w-[19px] place-items-center rounded-full border-2 border-white bg-danger px-1 text-[10px] font-extrabold leading-none text-white">
                        {a.badge}
                      </span>
                    )}
                    <span className="grid h-9 w-9 place-items-center rounded-xl text-ink2" style={{ background: a.tint }}>
                      <Icon name={a.icon as IconName} className="h-[19px] w-[19px]" />
                    </span>
                    <span className="mt-2 text-[12px] font-extrabold leading-[1.2] tracking-tight">{a.title}</span>
                    <span className="mt-0.5 line-clamp-1 text-[10.5px] font-medium leading-snug text-sub">{a.desc}</span>
                  </button>
                </Reveal>
              ))}
            </div>
          ))}
        </div>
      </section>

      <QuickActionsPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        enabled={enabled}
        onToggle={toggle}
      />
    </Reveal>
  );
}

/* ---------- Шторка выбора действий для панели ---------- */
function QuickActionsPicker({
  open, onClose, enabled, onToggle,
}: {
  open: boolean;
  onClose: () => void;
  enabled: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Быстрые действия">
      <p className="text-[12.5px] font-semibold text-sub">
        Выбрано {enabled.length} из {MAX_QUICK_ACTIONS} · минимум {MIN_QUICK_ACTIONS}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {QUICK_ACTIONS.map((a) => {
          const isOn = enabled.includes(a.id);
          const locked = (isOn && enabled.length <= MIN_QUICK_ACTIONS) || (!isOn && enabled.length >= MAX_QUICK_ACTIONS);
          return (
            <button
              key={a.id}
              onClick={() => onToggle(a.id)}
              className={`press relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all duration-200 ${
                isOn ? "border-accent bg-accent-soft" : "border-line/80 bg-white"
              } ${locked && !isOn ? "opacity-40" : ""}`}
            >
              {isOn && (
                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-white">
                  <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
              <span className="grid h-9 w-9 place-items-center rounded-xl text-ink2" style={{ background: a.tint }}>
                <Icon name={a.icon as IconName} className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[11px] font-bold leading-tight">{a.title}</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={onClose}
        className="press mt-4 w-full rounded-full bg-ink py-3 text-[13px] font-extrabold text-white"
      >
        Готово
      </button>
    </Sheet>
  );
}

/* ---------- Услуги и меры поддержки ---------- */
export function ServiceSections({ onPick }: { onPick: (s: ServiceSection) => void }) {
  return (
    <Reveal>
      <section className="px-4">
        <h2 className="font-display text-[15px] font-semibold leading-snug tracking-tight">
          Услуги и меры<br />поддержки для бизнеса
        </h2>
        <div className="mt-3 space-y-2.5">
          {SERVICE_SECTIONS.map((s, i) => (
            <Reveal key={s.id} delay={i * 60}>
              <button
                onClick={() => onPick(s)}
                className="press group flex w-full items-center gap-3.5 rounded-2xl border border-line/80 bg-white p-3.5 text-left shadow-card transition-all hover:border-accent/40 hover:shadow-float"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-ink2 transition-transform duration-300 group-hover:scale-105" style={{ background: s.tint }}>
                  <Icon name={s.icon as IconName} className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-extrabold tracking-tight">{s.title}</span>
                  <span className="mt-0.5 block truncate text-[12px] font-medium text-sub">{s.desc}</span>
                </span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-sub transition-all duration-300 group-hover:bg-accent group-hover:text-white">
                  <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2.1} />
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

/* ---------- Предложения партнёров ---------- */
export function PartnersBlock({
  onPick, onAllServices,
}: {
  onPick: (p: Partner) => void;
  onAllServices: () => void;
}) {
  const { ref, index, onScroll, goTo } = useSnap(PARTNER_PAGES.length);

  return (
    <Reveal>
      <section>
        <div className="flex items-center justify-between px-4">
          <h2 className="font-display text-[15px] font-semibold tracking-tight">Предложения партнёров</h2>
          <button onClick={onAllServices} className="press shrink-0 text-[12.5px] font-bold text-accent">
            Все услуги для бизнеса
          </button>
        </div>

        <div ref={ref} onScroll={onScroll} data-hscroll className="no-scrollbar mt-3 flex snap-x snap-mandatory overflow-x-auto">
          {PARTNER_PAGES.map((page) => (
            <div key={page.label} className="w-full shrink-0 snap-center px-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-faint">{page.label}</p>
              <div className="grid grid-cols-2 gap-2.5">
                {page.items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onPick(p)}
                    className="press flex flex-col items-start rounded-2xl border border-line/80 bg-white p-3 text-left shadow-card transition-shadow hover:shadow-float"
                  >
                    <span className="flex w-full items-center justify-between">
                      <span
                        className="grid h-9 w-9 place-items-center rounded-xl text-[10.5px] font-extrabold tracking-tight"
                        style={{ background: p.logoBg, color: p.logoFg }}
                      >
                        {p.logo}
                      </span>
                      {p.city && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-[3px] text-[8.5px] font-extrabold uppercase tracking-wide text-white">
                          <Icon name="star" className="h-2.5 w-2.5 fill-[#ffc531] text-[#ffc531]" strokeWidth={1} />
                          Партнёр Москвы
                        </span>
                      )}
                    </span>
                    <span className="mt-2.5 line-clamp-1 text-[12.5px] font-extrabold tracking-tight">{p.name}</span>
                    <span className="mt-0.5 line-clamp-2 min-h-[28px] text-[11px] font-medium leading-snug text-sub">{p.desc}</span>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-lg bg-ok-soft px-2 py-1 text-[10.5px] font-extrabold text-ok">
                      <Icon name="spark" className="h-3 w-3" strokeWidth={2.2} />
                      {p.offer}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Dots count={PARTNER_PAGES.length} active={index} onPick={goTo} />
      </section>
    </Reveal>
  );
}
