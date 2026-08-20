import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { useEscapeKey, useShellPortal, useToast } from "./ui";
import { BANKS, loadConnectedBankIds, MONTHS, WEEKDAYS, type DayEvent } from "./data";

const fmtRub = (v: number) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v)} ₽`;

/* ---------- Экран платежа: открывается по тапу на событие «Оплата» в
   календаре. Государственные платежи (налоги, взносы) доступны всегда,
   коммерческие — только при подключённой интеграции с 1С (см. фильтрацию
   в CalendarStrip: без интеграции такие события вообще не попадают сюда). */
export default function PaymentScreen({
  open, event, date, onClose, onOpenProfile,
}: {
  open: boolean;
  event: DayEvent | null;
  date: Date | null;
  onClose: () => void;
  onOpenProfile: () => void;
}) {
  const container = useShellPortal();
  const toast = useToast();
  useEscapeKey(open, onClose);

  const accounts = useMemo(() => {
    const connected = loadConnectedBankIds();
    return BANKS.filter((b) => connected.includes(b.id)).flatMap((b) => b.accounts.map((a) => ({ ...a, bank: b })));
  }, [open]);

  const [accountId, setAccountId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const payTimer = useRef(0);

  useEffect(() => {
    if (open) {
      setAccountId(accounts[0]?.id ?? null);
      setPaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => window.clearTimeout(payTimer.current), []);

  if (!open || !event || !date || !event.payment) return null;
  const pay = event.payment;

  const submit = () => {
    if (!accountId || paying) return;
    setPaying(true);
    payTimer.current = window.setTimeout(() => {
      toast(`Платёж отправлен: ${fmtRub(pay.amount)}`, "check");
      onClose();
    }, 1200);
  };

  return createPortal(
    <div className="animate-slide-left absolute inset-0 z-[77] flex flex-col bg-paper">
      <div className="flex items-center gap-2.5 border-b border-line/70 bg-card px-4 py-3">
        <button onClick={onClose} className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-ink2" aria-label="Назад">
          <Icon name="chevron-left" className="h-4.5 w-4.5" strokeWidth={2.2} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[16px] font-semibold tracking-tight">Оплата</h1>
          <p className="text-[11px] font-semibold text-sub">
            {WEEKDAYS[date.getDay()]}, {date.getDate()} {MONTHS[date.getMonth()]}
          </p>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {paying ? (
          <div className="animate-fade-up mt-10 flex flex-col items-center text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-accent-soft text-accent-deep">
              <Icon name="refresh" className="h-9 w-9 animate-spin" strokeWidth={2} />
            </span>
            <p className="font-display mt-5 text-[15px] font-semibold tracking-tight">Отправляем платёж</p>
            <p className="mt-1.5 text-[12.5px] font-semibold text-sub">{fmtRub(pay.amount)} · {pay.recipient}</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-ink-solid p-4 text-white shadow-float">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-white/55">
                {pay.type === "commercial" ? "Коммерческий платёж" : "Государственный платёж"}
              </p>
              <p className="mt-1 text-[28px] font-extrabold leading-none tracking-tight tabular-nums">{fmtRub(pay.amount)}</p>
              <p className="mt-2 text-[13px] font-semibold text-white/75">{pay.recipient}</p>
            </div>

            <div className="mt-3 space-y-2">
              <InfoRow label="Назначение" value={pay.purpose} />
              <InfoRow label="Срок оплаты" value={`${event.time} · ${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`} />
              {pay.inn && <InfoRow label="ИНН получателя" value={pay.inn} />}
              {pay.account && <InfoRow label="Счёт получателя" value={pay.account} />}
            </div>

            {pay.type === "commercial" ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-ok-soft px-3 py-2.5 text-[11.5px] font-bold leading-snug text-ok">
                <Icon name="link" className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                Синхронизировано с 1С:Предприятие — сумма и реквизиты подтянуты автоматически.
              </p>
            ) : (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-[11.5px] font-bold leading-snug text-accent-deep">
                <Icon name="shield" className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                Реквизиты сверены напрямую с ФНС — интеграция с учётной системой не требуется.
              </p>
            )}

            <p className="mt-4 text-[11px] font-extrabold uppercase tracking-wide text-faint">Счёт списания</p>
            {accounts.length === 0 ? (
              <button
                onClick={onOpenProfile}
                className="press mt-2 w-full rounded-2xl border-2 border-dashed border-line bg-card/60 p-3.5 text-left transition-all hover:border-accent/60 hover:bg-accent-soft/40"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-paper text-ink2">
                    <Icon name="building" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1 text-[12.5px] font-bold text-sub">
                    Нет подключённых банков — подключите счёт, чтобы оплатить
                  </span>
                  <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-faint" strokeWidth={2.2} />
                </div>
              </button>
            ) : (
              <div className="mt-2 space-y-2">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAccountId(a.id)}
                    className={`press flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-all ${
                      accountId === a.id ? "border-accent shadow-card" : "border-line/80"
                    }`}
                  >
                    <span
                      className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[12px] font-semibold"
                      style={{ background: a.bank.logoBg, color: a.bank.logoFg }}
                    >
                      {a.bank.logo}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-extrabold">{a.bank.name} · {a.name}</span>
                      <span className="block text-[11px] font-semibold text-faint">{a.mask} · {fmtRub(a.balance)}</span>
                    </span>
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                        accountId === a.id ? "border-accent bg-accent" : "border-line"
                      }`}
                    >
                      {accountId === a.id && <Icon name="check" className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {!paying && accounts.length > 0 && (
        <div className="border-t border-line/70 bg-card p-4">
          <button
            onClick={submit}
            disabled={!accountId}
            className="press w-full rounded-full bg-accent py-3 text-[13px] font-extrabold text-white disabled:opacity-50"
          >
            Оплатить {fmtRub(pay.amount)}
          </button>
        </div>
      )}
    </div>,
    container,
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-card px-3 py-2.5 shadow-card">
      <span className="shrink-0 text-[11px] font-bold text-faint">{label}</span>
      <span className="min-w-0 text-right text-[12.5px] font-extrabold text-ink2">{value}</span>
    </div>
  );
}
