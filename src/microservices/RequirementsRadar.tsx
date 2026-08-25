import { useState } from "react";
import { Icon } from "../icons";
import { useToast } from "../ui";
import {
  REQUIREMENTS, REQUIREMENTS_HEADER, RISK_CARD, SELF_CHECK, requirementCounts,
  type Requirement,
} from "../data/requirements";

/* «Радар обязательных требований» (п.6, доработка по п.4):
   - RequirementsSummary — компактная плашка-сводка на странице ЛК (счётчики +
     полоса-индикатор + переход);
   - RequirementsDetail — полное содержимое на отдельной странице (риск, секции
     «Не соблюдается» / «Нет данных» / «Соблюдается», самообследование).
   Все кнопки — нерабочие заглушки. */

/* ---------- Компактная плашка-сводка (страница ЛК) ---------- */
export function RequirementsSummary({ onOpen }: { onOpen: () => void }) {
  const c = requirementCounts();
  const pct = (n: number) => `${(n / c.total) * 100}%`;

  return (
    <section>
      <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight">
        <Icon name="shield" className="h-4 w-4 text-accent" strokeWidth={2.1} />
        {REQUIREMENTS_HEADER.title}
      </h2>
      <button
        onClick={onOpen}
        className="press group mt-2.5 flex w-full items-center gap-3 rounded-2xl border border-line/80 bg-card p-3.5 text-left shadow-card transition-all hover:border-accent/40 hover:shadow-float"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-extrabold tracking-tight">К вам применимо {c.total} требований</p>
          <p className="mt-0.5 text-[11px] font-semibold text-sub">
            Соблюдается {c.ok} · не соблюдается {c.violation} · нет данных {c.no_data}
          </p>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-paper">
            {c.ok > 0 && <span style={{ width: pct(c.ok), background: "var(--color-ok)" }} />}
            {c.violation > 0 && <span style={{ width: pct(c.violation), background: "var(--color-danger)" }} />}
            {c.no_data > 0 && <span style={{ width: pct(c.no_data), background: "var(--color-warn)" }} />}
          </div>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-sub transition-all group-hover:bg-accent group-hover:text-white">
          <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2.1} />
        </span>
      </button>
    </section>
  );
}

/* ---------- Карточка требования (violation / no_data) ---------- */
function RequirementCard({ r, onAction }: { r: Requirement; onAction: (label: string) => void }) {
  const isViolation = r.status === "violation";
  const accent = isViolation ? "var(--color-danger)" : "var(--color-warn)";
  const soft = isViolation ? "var(--color-danger-soft)" : "var(--color-warn-soft)";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line/80 bg-card p-3.5 pl-4 shadow-card">
      {/* вертикальная цветная полоса по левому краю */}
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: accent }} />

      {/* верхняя строка: иконка-индикатор + бейдж (перенесён сюда с правого края) */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[15px] font-extrabold leading-none text-white"
          style={{ background: accent }}
          aria-hidden="true"
        >
          {isViolation ? "!" : "?"}
        </span>
        {r.badge && (
          <span
            className="rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide"
            style={{ background: soft, color: accent }}
          >
            {r.badge}
          </span>
        )}
      </div>

      <p className="mt-2 text-[13.5px] font-extrabold leading-snug tracking-tight">{r.title}</p>
      {r.source && <p className="mt-1 text-[11.5px] font-semibold text-sub">{r.source}</p>}
      {r.consequence && (
        <p className="mt-1 text-[11.5px] font-bold" style={{ color: "var(--color-danger)" }}>
          {r.consequence}
        </p>
      )}
      {r.chip && (
        <p className="mt-2 inline-block rounded-lg bg-paper px-2.5 py-1.5 text-[10.5px] font-bold text-sub">
          {r.chip}
        </p>
      )}
      {r.action && (
        <button
          onClick={() => onAction(r.action!)}
          className="press mt-3 w-full rounded-full py-2.5 text-[12.5px] font-extrabold"
          style={
            r.actionStyle === "outline"
              ? { border: `1.5px solid ${accent}`, color: accent, background: "transparent" }
              : { background: accent, color: "#fff" }
          }
        >
          {r.action}
        </button>
      )}
    </div>
  );
}

/* ---------- Полное содержимое (отдельная страница) ---------- */
export function RequirementsDetail() {
  const toast = useToast();
  const stub = (label: string) => toast(`${label} — раздел в разработке`, "shield");
  const [okOpen, setOkOpen] = useState(false);

  const c = requirementCounts();
  const violations = REQUIREMENTS.filter((r) => r.status === "violation");
  const noData = REQUIREMENTS.filter((r) => r.status === "no_data");
  const okItems = REQUIREMENTS.filter((r) => r.status === "ok");

  return (
    <div className="mt-3 space-y-3">
      {/* Профиль + когда обновлено */}
      <div>
        <p className="text-[11.5px] font-semibold text-sub">{REQUIREMENTS_HEADER.profile}</p>
        <p className="mt-0.5 text-[10.5px] font-medium text-faint">{REQUIREMENTS_HEADER.updated}</p>
      </div>

      {/* Карточка риска */}
      <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-card">
        <span
          className="inline-block rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide"
          style={{ background: "var(--color-warn-soft)", color: "var(--color-warn)" }}
        >
          {RISK_CARD.badge}
        </span>
        <p className="mt-2 text-[14px] font-extrabold leading-snug tracking-tight">{RISK_CARD.title}</p>
        <p className="mt-1 text-[12px] font-medium leading-relaxed text-sub">{RISK_CARD.text}</p>
      </div>

      {/* Не соблюдается — на светло-розовой подложке */}
      {violations.length > 0 && (
        <div className="rounded-2xl p-3" style={{ background: "var(--color-danger-soft)" }}>
          <h3 className="px-1 text-[12px] font-extrabold uppercase tracking-wide" style={{ color: "var(--color-danger)" }}>
            Не соблюдается
          </h3>
          <div className="mt-2 space-y-2.5">
            {violations.map((r) => (
              <RequirementCard key={r.id} r={r} onAction={stub} />
            ))}
          </div>
        </div>
      )}

      {/* Нет данных */}
      {noData.length > 0 && (
        <div>
          <h3 className="px-1 text-[12px] font-extrabold uppercase tracking-wide" style={{ color: "var(--color-warn)" }}>
            Нет данных
          </h3>
          <div className="mt-2 space-y-2.5">
            {noData.map((r) => (
              <RequirementCard key={r.id} r={r} onAction={stub} />
            ))}
          </div>
        </div>
      )}

      {/* Соблюдается — аккордеон, по умолчанию закрыт */}
      {okItems.length > 0 && (
        <div>
          <button
            onClick={() => setOkOpen((v) => !v)}
            className="press flex w-full items-center justify-between rounded-2xl border border-line/80 bg-card px-3.5 py-3 shadow-card"
          >
            <span className="flex items-center gap-2 text-[13px] font-extrabold tracking-tight">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-ok text-white">
                <Icon name="check" className="h-3 w-3" strokeWidth={3} />
              </span>
              Соблюдается — {c.ok} требований
            </span>
            <Icon
              name="chevron-right"
              className={`h-4 w-4 text-sub transition-transform duration-300 ${okOpen ? "rotate-90" : ""}`}
              strokeWidth={2.2}
            />
          </button>
          {okOpen && (
            <div className="animate-fade-up mt-2 space-y-1.5">
              {okItems.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 rounded-xl bg-paper px-3 py-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok text-white">
                    <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-[12.5px] font-bold">{r.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Блок самообследования — синяя подложка */}
      <div className="rounded-2xl p-4" style={{ background: "var(--color-accent-soft)" }}>
        <p className="text-[14px] font-extrabold tracking-tight text-accent-deep">{SELF_CHECK.title}</p>
        <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink2">{SELF_CHECK.text}</p>
        <button
          onClick={() => stub(SELF_CHECK.action)}
          className="press mt-3 w-full rounded-full bg-accent py-2.5 text-[12.5px] font-extrabold text-white"
        >
          {SELF_CHECK.action}
        </button>
      </div>
    </div>
  );
}
