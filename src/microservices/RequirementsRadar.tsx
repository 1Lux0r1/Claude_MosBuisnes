import { useState } from "react";
import { Icon } from "../icons";
import { useToast } from "../ui";
import {
  REQUIREMENTS, REQUIREMENTS_HEADER, RISK_CARD, SELF_CHECK, requirementCounts,
  type Requirement,
} from "../data/requirements";

/* «Радар обязательных требований» (п.6). Мобильная раскладка: бейджи и кнопки
   не помещаются справа от карточки — бейдж уходит в верхнюю строку, кнопка
   на всю ширину внизу. Все кнопки — нерабочие заглушки. */

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

export default function RequirementsRadar() {
  const toast = useToast();
  const stub = (label: string) => toast(`${label} — раздел в разработке`, "shield");
  const [okOpen, setOkOpen] = useState(false);

  const c = requirementCounts();
  const violations = REQUIREMENTS.filter((r) => r.status === "violation");
  const noData = REQUIREMENTS.filter((r) => r.status === "no_data");
  const okItems = REQUIREMENTS.filter((r) => r.status === "ok");
  const pct = (n: number) => `${(n / c.total) * 100}%`;

  return (
    <section className="space-y-3">
      {/* 1. Шапка раздела */}
      <div>
        <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight">
          <Icon name="shield" className="h-4 w-4 text-accent" strokeWidth={2.1} />
          {REQUIREMENTS_HEADER.title}
        </h2>
        <p className="mt-1 text-[11.5px] font-semibold text-sub">{REQUIREMENTS_HEADER.profile}</p>
        <p className="mt-0.5 text-[10.5px] font-medium text-faint">{REQUIREMENTS_HEADER.updated}</p>
      </div>

      {/* 2. Карточка-сводка */}
      <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-card">
        <p className="font-display text-[17px] font-semibold tracking-tight">К вам применимо {c.total} требований</p>
        <p className="mt-1 text-[11.5px] font-semibold text-sub">
          Соблюдается {c.ok} · не соблюдается {c.violation} · нет данных {c.no_data}
        </p>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-paper">
          {c.ok > 0 && <span style={{ width: pct(c.ok), background: "var(--color-ok)" }} />}
          {c.violation > 0 && <span style={{ width: pct(c.violation), background: "var(--color-danger)" }} />}
          {c.no_data > 0 && <span style={{ width: pct(c.no_data), background: "var(--color-warn)" }} />}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
          <LegendDot color="var(--color-ok)" label={`Соблюдается ${c.ok}`} />
          <LegendDot color="var(--color-danger)" label={`Не соблюдается ${c.violation}`} />
          <LegendDot color="var(--color-warn)" label={`Нет данных ${c.no_data}`} />
        </div>
      </div>

      {/* 3. Карточка риска */}
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

      {/* 4. Не соблюдается — на светло-розовой подложке */}
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

      {/* 5. Нет данных */}
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

      {/* 6. Соблюдается — аккордеон, по умолчанию закрыт */}
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

      {/* 7. Блок самообследования — синяя подложка */}
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
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sub">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
