import { useMemo, useState } from "react";
import { Icon, type IconName } from "./icons";
import { Dots, Reveal, Sheet, useSnap, useToast } from "./ui";
import {
  DEFAULT_QUICK_ACTION_IDS, PARTNER_PAGES, QUICK_ACTIONS, SERVICE_SECTIONS,
  type Partner, type QuickAction, type ServiceSection,
} from "./data";
import { LIQUIDITY_CARD, PERSONAL_OFFERS, TAX_FORECAST_CARD } from "./data/interesting";
import { fmtSupportAmount, supportAvailableTotal, supportMeasuresCount } from "./data/support-measures";

const PARTNER_PAGE_SIZE = 4;
const PARTNER_CARD_H = 172;
const PARTNER_GAP = 10;
/* Заголовок страницы («ГОРОДСКИЕ ПЛОЩАДКИ» и т.п.) — строка + отступ mb-2,
   тоже часть высоты страницы, иначе контейнер получается на ~25px ниже
   реального содержимого и внутри появляется вертикальный скролл. */
const PARTNER_LABEL_H = 25;

/* Высота страницы карусели партнёров по числу карточек (1 или 2 ряда
   в сетке 2×N) — используется, чтобы контейнер карусели подстраивался
   под текущую видимую страницу, а не растягивался по самой высокой. */
function partnerPageHeight(count: number): number {
  const rows = Math.ceil(count / 2);
  return PARTNER_LABEL_H + rows * PARTNER_CARD_H + (rows - 1) * PARTNER_GAP;
}

/* Дробим каждую тематическую группу партнёров на страницы максимум по 4
   карточки (сетка 2×2): иначе более длинные группы становятся выше
   остальных, а flex-контейнер карусели растягивает по высоте все
   страницы вровень с самой длинной — короткие страницы получают
   пустое пространство снизу. */
function chunkPartnerPages(pages: typeof PARTNER_PAGES): { key: string; label: string; items: Partner[] }[] {
  const out: { key: string; label: string; items: Partner[] }[] = [];
  for (const page of pages) {
    for (let i = 0; i < page.items.length; i += PARTNER_PAGE_SIZE) {
      const chunk = page.items.slice(i, i + PARTNER_PAGE_SIZE);
      out.push({ key: `${page.label}-${i}`, label: page.label, items: chunk });
    }
  }
  return out;
}

/* Название раздела «Предложения партнёров» (п.3 ТЗ). Название предварительное —
   меняется здесь, в одном месте. */
export const POSSIBILITIES_SECTION_TITLE = "Возможности";

export const QUICK_ACTIONS_KEY = "mb-quick-actions";
export const MIN_QUICK_ACTIONS = 3;
export const MAX_QUICK_ACTIONS = 6;

export function loadEnabledQuickActionIds(): string[] {
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
export function QuickActions({
  onPick, enabled, onOpenPicker,
}: {
  onPick: (a: QuickAction) => void;
  enabled: string[];
  onOpenPicker: () => void;
}) {
  const visible = QUICK_ACTIONS.filter((a) => enabled.includes(a.id));
  const rows = chunkIntoRows(visible);

  return (
    <Reveal>
      <section className="px-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[15px] font-semibold tracking-tight">Быстрые действия</h2>
          <button
            onClick={onOpenPicker}
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
                    className="press relative flex h-full w-full flex-col items-start rounded-2xl border border-line/80 bg-card p-3 text-left shadow-card transition-shadow hover:shadow-float"
                  >
                    {a.badge && (
                      <span className="absolute -right-1.5 -top-1.5 grid h-[19px] min-w-[19px] place-items-center rounded-full border-2 border-card bg-danger px-1 text-[10px] font-extrabold leading-none text-white">
                        {a.badge}
                      </span>
                    )}
                    <span className="grid h-9 w-9 place-items-center rounded-xl text-ink2-solid" style={{ background: a.tint }}>
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
    </Reveal>
  );
}

/* ---------- Шторка выбора действий для панели (рендерится на уровне Shell,
   а не внутри прокручиваемого <main> — иначе overflow-y-auto у <main> обрежет
   абсолютно спозиционированную шторку до крошечного видимого фрагмента) ---------- */
export function QuickActionsPicker({
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
                isOn ? "border-accent bg-accent-soft" : "border-line/80 bg-card"
              } ${locked && !isOn ? "opacity-40" : ""}`}
            >
              {isOn && (
                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-white">
                  <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
              <span className="grid h-9 w-9 place-items-center rounded-xl text-ink2-solid" style={{ background: a.tint }}>
                <Icon name={a.icon as IconName} className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[11px] font-bold leading-tight">{a.title}</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={onClose}
        className="press mt-4 w-full rounded-full bg-ink py-3 text-[13px] font-extrabold text-on-ink"
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
                className="press group flex w-full items-center gap-3.5 rounded-2xl border border-line/80 bg-card p-3.5 text-left shadow-card transition-all hover:border-accent/40 hover:shadow-float"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-ink2-solid transition-transform duration-300 group-hover:scale-105" style={{ background: s.tint }}>
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
  const pages = useMemo(() => chunkPartnerPages(PARTNER_PAGES), []);
  const { ref, index, onScroll, goTo, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } = useSnap(pages.length);

  return (
    <Reveal>
      <section>
        <div className="flex items-center justify-between px-4">
          <h2 className="font-display text-[15px] font-semibold tracking-tight">{POSSIBILITIES_SECTION_TITLE}</h2>
          <button onClick={onAllServices} className="press shrink-0 text-[12.5px] font-bold text-accent">
            Все услуги для бизнеса
          </button>
        </div>

        <div
          ref={ref}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          data-hscroll
          className="no-scrollbar mt-3 flex cursor-grab snap-x snap-mandatory items-start overflow-x-auto transition-[height] duration-300 ease-out active:cursor-grabbing"
          style={{ height: partnerPageHeight(pages[index]?.items.length ?? PARTNER_PAGE_SIZE) }}
        >
          {pages.map((page) => (
            <div key={page.key} className="w-full shrink-0 snap-center px-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-faint">{page.label}</p>
              <div className="grid grid-cols-2 gap-2.5">
                {page.items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onPick(p)}
                    className="press group relative flex h-[172px] flex-col justify-between overflow-hidden rounded-2xl p-3 text-left ring-1 ring-inset ring-white/10 shadow-card transition-shadow hover:shadow-float"
                    style={{ background: `linear-gradient(135deg, ${p.artFrom}, ${p.artTo})` }}
                  >
                    {/* тематическая «обложка» вместо фото — крупная иконка водяным знаком поверх градиента */}
                    <Icon
                      name={p.artIcon}
                      className="pointer-events-none absolute -bottom-5 -right-5 h-28 w-28 text-white opacity-[0.18] transition-transform duration-300 group-hover:scale-110"
                      strokeWidth={1.3}
                    />
                    <span
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }}
                    />

                    <span className="relative flex w-full items-start justify-between">
                      <span
                        className="grid h-9 w-9 place-items-center rounded-xl bg-white/92 text-[10.5px] font-extrabold tracking-tight backdrop-blur-sm"
                        style={{ color: p.logoFg }}
                      >
                        {p.logo}
                      </span>
                      {p.city && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-[3px] text-[8.5px] font-extrabold uppercase tracking-wide text-white backdrop-blur-sm">
                          <Icon name="star" className="h-2.5 w-2.5 fill-[#ffc531] text-[#ffc531]" strokeWidth={1} />
                          Москвы
                        </span>
                      )}
                    </span>

                    <span className="relative">
                      <span className="block line-clamp-1 text-[13px] font-extrabold tracking-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
                        {p.name}
                      </span>
                      <span className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-lg bg-white/92 px-2 py-1 text-[10px] font-extrabold text-ink-solid backdrop-blur-sm">
                        <Icon name="spark" className="h-3 w-3 shrink-0 text-accent" strokeWidth={2.2} />
                        <span className="truncate">{p.badge}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Dots count={pages.length} active={index} onPick={goTo} />
      </section>
    </Reveal>
  );
}

/* ---------- Возможно интересно (п.4) ---------- */
/* Плитки блока — единый вид (иконка своего цвета, заголовок, кнопка). Собраны
   из карточек данных interesting.ts: прогнозная модель, персональные
   предложения, управление ликвидностью. */
type InterestingTile = { key: string; icon: IconName; tint: string; label: string; title: string; action: string };

const INTERESTING_TILES: InterestingTile[] = [
  { key: "forecast", icon: TAX_FORECAST_CARD.icon, tint: TAX_FORECAST_CARD.tint, label: TAX_FORECAST_CARD.short, title: TAX_FORECAST_CARD.title, action: TAX_FORECAST_CARD.action },
  ...PERSONAL_OFFERS.map((o) => ({ key: o.id, icon: o.icon, tint: o.tint, label: o.short, title: o.title, action: o.action })),
  { key: "liquidity", icon: LIQUIDITY_CARD.icon, tint: LIQUIDITY_CARD.tint, label: LIQUIDITY_CARD.short, title: LIQUIDITY_CARD.title, action: LIQUIDITY_CARD.action },
];

const INTERESTING_TILE_LIMIT = 3;

export function InterestingBlock() {
  const toast = useToast();
  const stub = (label: string) => toast(`${label} — раздел в разработке`, "spark");
  const visible = INTERESTING_TILES.slice(0, INTERESTING_TILE_LIMIT);
  const hasMore = INTERESTING_TILES.length > INTERESTING_TILE_LIMIT;

  return (
    <Reveal>
      <section className="px-4">
        <h2 className="font-display text-[15px] font-semibold tracking-tight">Возможно интересно</h2>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {visible.map((t) => (
            <div key={t.key} className="flex aspect-square flex-col rounded-2xl border border-line/80 bg-card p-2.5 shadow-card">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink2-solid" style={{ background: t.tint }}>
                <Icon name={t.icon} className="h-[18px] w-[18px]" />
              </span>
              <span className="mt-2 line-clamp-2 flex-1 text-[11.5px] font-extrabold leading-tight tracking-tight">{t.label}</span>
              <button
                onClick={() => stub(t.title)}
                className="press mt-1 w-full rounded-full bg-accent-soft py-1.5 text-[9.5px] font-extrabold text-accent-deep"
              >
                {t.action}
              </button>
            </div>
          ))}
        </div>
        {hasMore && (
          <button onClick={() => stub("Все предложения")} className="press mt-2 text-[12px] font-bold text-accent">
            Показать все
          </button>
        )}
      </section>
    </Reveal>
  );
}

/* ---------- Плашки над календарём ---------- */
const PROMO_VITRINA_KEY = "mb-promo-vitrina-dismissed";
const PROMO_MCHD_KEY = "mb-promo-mchd-dismissed";

const isPromoDismissed = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

/* Тизер витрины сверху, «Истекает срок действия МЧД» под ним. Каждая
   закрывается своим крестиком, состояние сохраняется в localStorage — после
   закрытия плашка не показывается при перезагрузке. */
export function HomePromos({ onOpenVitrina }: { onOpenVitrina: () => void }) {
  const toast = useToast();
  const [showVitrina, setShowVitrina] = useState(() => !isPromoDismissed(PROMO_VITRINA_KEY));
  const [showMchd, setShowMchd] = useState(() => !isPromoDismissed(PROMO_MCHD_KEY));

  const dismiss = (key: string, set: (v: boolean) => void) => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* приватный режим — просто скрываем на текущую сессию */
    }
    set(false);
  };

  if (!showVitrina && !showMchd) return null;

  const total = fmtSupportAmount(supportAvailableTotal());
  const count = supportMeasuresCount();

  return (
    <Reveal>
      <div className="space-y-2.5 px-4">
        {/* п.8 — тизер персональной витрины */}
        {showVitrina && (
          <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-accent-soft/60 p-3.5">
            <button
              aria-label="Скрыть"
              onClick={() => dismiss(PROMO_VITRINA_KEY, setShowVitrina)}
              className="press absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-card/70 text-sub"
            >
              <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
            <button onClick={onOpenVitrina} className="press flex w-full items-center gap-3 pr-6 text-left">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-accent-deep shadow-card">
                <Icon name="coins" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-extrabold tracking-tight text-accent-deep">Вам доступно до {total}</span>
                <span className="block text-[11.5px] font-semibold text-sub">по {count} мерам поддержки</span>
              </span>
              <Icon name="arrow-right" className="h-4 w-4 shrink-0 text-accent-deep" strokeWidth={2.2} />
            </button>
          </div>
        )}

        {/* Истекает срок действия МЧД */}
        {showMchd && (
          <div className="relative overflow-hidden rounded-2xl border border-line/80 bg-card p-3.5 shadow-card">
            <button
              aria-label="Скрыть"
              onClick={() => dismiss(PROMO_MCHD_KEY, setShowMchd)}
              className="press absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-paper text-sub"
            >
              <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
            <button
              onClick={() => toast("Электронная доверенность — раздел в разработке", "shield")}
              className="press flex w-full items-center gap-3 pr-6 text-left"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warn-soft text-warn">
                <Icon name="clock" className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-extrabold tracking-tight">Истекает срок действия МЧД</span>
                <span className="block line-clamp-1 text-[11.5px] font-semibold text-sub">Получить электронную доверенность</span>
              </span>
              <Icon name="arrow-right" className="h-4 w-4 shrink-0 text-sub" strokeWidth={2.2} />
            </button>
          </div>
        )}
      </div>
    </Reveal>
  );
}
