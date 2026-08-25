import { Icon } from "../icons";
import { useToast } from "../ui";
import {
  VITRINA_FOOTER, VITRINA_HEADER, fmtSupportAmount, supportAvailableTotal, supportMeasuresCount,
  supportMeasuresPerStatus, type SupportMeasure, type SupportStatus,
} from "../data/support-measures";

/* «Персональная витрина "Вам доступно"» (п.7, доработка по п.5):
   - VitrinaSummary — компактная плашка-сводка на странице ЛК (сумма + число
     мер + переход);
   - VitrinaDetail — карусель карточек мер на отдельной странице.
   Все кнопки — нерабочие заглушки, контурные. */

const STATUS_META: Record<SupportStatus, { label: string; fg: string; soft: string }> = {
  approved: { label: "Предварительно одобрено", fg: "var(--color-ok)", soft: "var(--color-ok-soft)" },
  needs_info: { label: "Нужно уточнить", fg: "var(--color-warn)", soft: "var(--color-warn-soft)" },
  locked: { label: "Станет доступно", fg: "var(--color-sub)", soft: "var(--color-paper)" },
};

/* ---------- Компактная плашка-сводка (страница ЛК) ---------- */
export function VitrinaSummary({ onOpen }: { onOpen: () => void }) {
  const total = fmtSupportAmount(supportAvailableTotal());
  const count = supportMeasuresCount();

  return (
    <section>
      <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight">
        <Icon name="coins" className="h-4 w-4 text-accent" strokeWidth={2.1} />
        {VITRINA_HEADER.eyebrow}
      </h2>
      <button
        onClick={onOpen}
        className="press group mt-2.5 flex w-full items-center gap-3 rounded-2xl border border-line/80 bg-card p-3.5 text-left shadow-card transition-all hover:border-accent/40 hover:shadow-float"
      >
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-display text-[22px] font-semibold leading-none tracking-tight">до {total}</span>
            <span className="text-[12px] font-semibold text-sub">по {count} мерам</span>
          </p>
          <p className="mt-1.5 text-[11.5px] font-semibold text-sub">{VITRINA_HEADER.profile}</p>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-sub transition-all group-hover:bg-accent group-hover:text-white">
          <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2.1} />
        </span>
      </button>
    </section>
  );
}

/* ---------- Карточка меры (вертикальная, на всю ширину страницы) ---------- */
function MeasureCard({ m, onAction }: { m: SupportMeasure; onAction: (label: string) => void }) {
  const meta = STATUS_META[m.status];
  const amountLine = `до ${fmtSupportAmount(m.amount)}${m.deadline ? ` · ${m.deadline}` : ""}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line/80 bg-card p-4 shadow-card">
      {/* тонкий цветной акцент по левому краю — в цвет статуса */}
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: meta.fg }} />

      <span
        className="inline-block rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide"
        style={{ background: meta.soft, color: meta.fg }}
      >
        {meta.label}
      </span>
      <p className="mt-2.5 text-[16px] font-extrabold leading-snug tracking-tight">{m.title}</p>
      <p className="mt-1 text-[13px] font-semibold text-sub">{amountLine}</p>
      <p className="mt-3 flex items-center gap-2 text-[12.5px] font-bold">
        <span className="shrink-0" style={{ color: meta.fg }}>
          <Icon name={m.conditionIcon} className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <span className="text-ink2">{m.conditionText}</span>
      </p>
      <button
        onClick={() => onAction(m.action)}
        className="press mt-4 w-full rounded-full border border-line py-3 text-[13px] font-extrabold text-ink2"
      >
        {m.action}
      </button>
    </div>
  );
}

/* ---------- Карточки мер (отдельная страница) — вертикальный столбец ---------- */
export function VitrinaDetail() {
  const toast = useToast();
  const stub = (label: string) => toast(`${label} — раздел в разработке`, "spark");

  const total = fmtSupportAmount(supportAvailableTotal());
  const count = supportMeasuresCount();

  return (
    <div className="mt-3">
      {/* Шапка витрины — светлая подложка, отличная от фона страницы */}
      <div className="rounded-2xl bg-paper p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-sub">{VITRINA_HEADER.eyebrow}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-display text-[26px] font-semibold leading-none tracking-tight">до {total}</span>
          <span className="text-[12px] font-semibold text-sub">по {count} мерам</span>
        </p>
        <p className="mt-2 text-[11.5px] font-semibold text-sub">{VITRINA_HEADER.profile}</p>
      </div>

      {/* Карточки мер — по одной на статус, вертикально, каждая на всю ширину */}
      <div className="mt-3.5 space-y-3">
        {supportMeasuresPerStatus().map((m) => (
          <MeasureCard key={m.id} m={m} onAction={stub} />
        ))}
      </div>

      {/* Подбор по профилю (ссылку «Показать все» убрали — здесь показаны все меры) */}
      <p className="mt-3.5 text-[11px] font-medium text-faint">{VITRINA_FOOTER.note}</p>
    </div>
  );
}
