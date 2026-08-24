import { Icon } from "../icons";
import { Dots, useSnap, useToast } from "../ui";
import {
  SUPPORT_MEASURES, VITRINA_FOOTER, VITRINA_HEADER, fmtSupportAmount, supportAvailableTotal,
  supportMeasuresCount, type SupportMeasure, type SupportStatus,
} from "../data/support-measures";

/* «Персональная витрина "Вам доступно до X ₽"» (п.7). Мобильная раскладка:
   карточки мер — горизонтальная карусель со свайпом (следующая подглядывает),
   под ней точки-индикатор. Все кнопки — нерабочие заглушки, контурные. */

const STATUS_META: Record<SupportStatus, { label: string; fg: string; soft: string }> = {
  approved: { label: "Предварительно одобрено", fg: "var(--color-ok)", soft: "var(--color-ok-soft)" },
  needs_info: { label: "Нужно уточнить", fg: "var(--color-warn)", soft: "var(--color-warn-soft)" },
  locked: { label: "Станет доступно", fg: "var(--color-sub)", soft: "var(--color-paper)" },
};

function MeasureCard({ m, onAction }: { m: SupportMeasure; onAction: (label: string) => void }) {
  const meta = STATUS_META[m.status];
  const amountLine = `до ${fmtSupportAmount(m.amount)}${m.deadline ? ` · ${m.deadline}` : ""}`;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line/80 bg-card p-3.5 shadow-card">
      <div className="flex-1">
        <span
          className="inline-block rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide"
          style={{ background: meta.soft, color: meta.fg }}
        >
          {meta.label}
        </span>
        <p className="mt-2 text-[14px] font-extrabold leading-snug tracking-tight">{m.title}</p>
        <p className="mt-1 text-[12px] font-semibold text-sub">{amountLine}</p>
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-bold">
          <span className="shrink-0" style={{ color: meta.fg }}>
            <Icon name={m.conditionIcon} className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
          <span className="text-ink2">{m.conditionText}</span>
        </p>
      </div>
      <button
        onClick={() => onAction(m.action)}
        className="press mt-3 w-full rounded-full border border-line py-2.5 text-[12.5px] font-extrabold text-ink2"
      >
        {m.action}
      </button>
    </div>
  );
}

export default function SupportVitrina() {
  const toast = useToast();
  const stub = (label: string) => toast(`${label} — раздел в разработке`, "spark");
  const { ref, index, onScroll, goTo, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } =
    useSnap(SUPPORT_MEASURES.length);

  const total = fmtSupportAmount(supportAvailableTotal());
  const count = supportMeasuresCount();

  return (
    <section>
      {/* 1. Шапка витрины — светлая подложка, отличная от фона страницы */}
      <div className="rounded-2xl bg-paper p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-sub">{VITRINA_HEADER.eyebrow}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-display text-[26px] font-semibold leading-none tracking-tight">до {total}</span>
          <span className="text-[12px] font-semibold text-sub">по {count} мерам</span>
        </p>
        <p className="mt-2 text-[11.5px] font-semibold text-sub">{VITRINA_HEADER.profile}</p>
      </div>

      {/* 2. Карусель карточек мер */}
      <div
        ref={ref}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        data-hscroll
        className="no-scrollbar mt-3 flex cursor-grab snap-x snap-mandatory items-stretch overflow-x-auto active:cursor-grabbing"
      >
        {SUPPORT_MEASURES.map((m) => (
          <div key={m.id} className="w-[calc(100%-40px)] shrink-0 snap-start pr-3">
            <MeasureCard m={m} onAction={stub} />
          </div>
        ))}
      </div>
      <Dots count={SUPPORT_MEASURES.length} active={index} onPick={goTo} />

      {/* 3. Подвал витрины — ссылка, под ней серая строка */}
      <div className="mt-2">
        <button onClick={() => stub(VITRINA_FOOTER.allLink)} className="press text-[12.5px] font-bold text-accent">
          {VITRINA_FOOTER.allLink} ({count})
        </button>
        <p className="mt-1 text-[11px] font-medium text-faint">{VITRINA_FOOTER.note}</p>
      </div>
    </section>
  );
}
