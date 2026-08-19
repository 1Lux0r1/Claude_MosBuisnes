import { useState } from "react";
import { Icon } from "./icons";
import { ChartOverlay, Dots, Reveal, Sheet, useSnap, useToast } from "./ui";
import {
  BANKS, CURRENCIES, NEWS, loadConnectedBankIds,
  type BankInfo, type CurrencyItem, type NewsItem,
} from "./data";

const fmtFx = (v: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v);

/* Флаги — компактные inline-SVG */
function Flag({ code }: { code: string }) {
  if (code === "us")
    return (
      <svg viewBox="0 0 28 20" className="h-5 w-7 overflow-hidden rounded-[4px]" aria-hidden="true">
        <rect width="28" height="20" fill="#fff" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} y={i * 4.6} width="28" height="2.3" fill="#d02f44" />
        ))}
        <rect width="12" height="10.6" fill="#27438f" />
      </svg>
    );
  if (code === "eu")
    return (
      <svg viewBox="0 0 28 20" className="h-5 w-7 overflow-hidden rounded-[4px]" aria-hidden="true">
        <rect width="28" height="20" fill="#2b4ba5" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <circle key={i} cx={14 + 5.6 * Math.cos(a)} cy={10 + 5.6 * Math.sin(a)} r="1" fill="#f4c63f" />;
        })}
      </svg>
    );
  return (
    <svg viewBox="0 0 28 20" className="h-5 w-7 overflow-hidden rounded-[4px]" aria-hidden="true">
      <rect width="28" height="20" fill="#de2910" />
      <path d="m5.5 3.6 1.1 2.4 2.6.3-2 1.8.6 2.6-2.3-1.4-2.3 1.4.6-2.6-2-1.8 2.6-.3 1.1-2.4Z" fill="#ffde00" transform="scale(0.72) translate(1.5 1)" />
    </svg>
  );
}

/* Линия курса с заливкой и акцентом на последней точке — используется и в
   компактной карточке, и в увеличенном графике (big). */
function PriceChart({
  code, data, up, big = false,
}: {
  code: string;
  data: number[];
  up: boolean;
  big?: boolean;
}) {
  const w = 100;
  const h = big ? 60 : 28;
  const pad = big ? 4 : 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `M${pts[0][0]},${h} L${line.split(" ").join(" L")} L${pts[pts.length - 1][0]},${h} Z`;
  const [lastX, lastY] = pts[pts.length - 1];
  const color = up ? "#148a4c" : "#f5333f";
  const gradId = `pc-${code}-${big ? "big" : "sm"}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={big ? "h-full w-full" : "h-8 w-full"} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={big ? 0.3 : 0.18} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={big ? 2.2 : 2.1} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={big ? 2.4 : 1.8} fill={color} stroke="#ffffff" strokeWidth={big ? 1.3 : 0.9} />
    </svg>
  );
}

/* ---------- Курс валют ---------- */
export function CurrencyCarousel() {
  const { ref, index, onScroll, goTo } = useSnap(CURRENCIES.length);
  const [detail, setDetail] = useState<CurrencyItem | null>(null);
  const [connectedBankIds] = useState<string[]>(loadConnectedBankIds);

  return (
    <Reveal>
      <section>
        <div className="flex items-center justify-between px-4">
          <h2 className="font-display text-[15px] font-semibold tracking-tight">Курс валют</h2>
          <span className="text-[11px] font-bold text-faint">ЦБ РФ · сегодня</span>
        </div>
        <div ref={ref} onScroll={onScroll} data-hscroll className="no-scrollbar mt-3 flex snap-x snap-mandatory overflow-x-auto pl-4">
          {CURRENCIES.map((c) => (
            <div key={c.code} className="w-[calc(100%-32px)] shrink-0 snap-start">
              <button
                onClick={() => setDetail(c)}
                className="press w-full rounded-2xl border border-line/80 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-float"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <Flag code={c.flag} />
                    <span>
                      <span className="block text-[15px] font-extrabold tracking-tight">{c.code}</span>
                      <span className="block text-[10.5px] font-bold text-sub">{c.country}</span>
                    </span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold ${
                      c.up ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
                    }`}
                  >
                    <Icon name={c.up ? "trend-up" : "trend-down"} className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {c.chg}
                  </span>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <p className="text-[26px] font-extrabold leading-none tracking-tight">
                    {c.rate} <span className="text-[13px] font-bold text-sub">₽</span>
                  </p>
                  <p className={`text-[10.5px] font-bold ${c.up ? "text-ok" : "text-danger"}`}>{c.up ? "укрепление за день" : "ослабление за день"}</p>
                </div>
                <div className="mt-2">
                  <PriceChart code={c.code} data={c.spark} up={c.up} />
                </div>
              </button>
            </div>
          ))}
        </div>
        <Dots count={CURRENCIES.length} active={index} onPick={goTo} />
      </section>

      <CurrencyDetailSheet currency={detail} onClose={() => setDetail(null)} connectedBankIds={connectedBankIds} />
    </Reveal>
  );
}

/* ---------- Покупка/продажа: список предложений банков + график ---------- */
function CurrencyDetailSheet({
  currency, onClose, connectedBankIds,
}: {
  currency: CurrencyItem | null;
  onClose: () => void;
  connectedBankIds: string[];
}) {
  const toast = useToast();
  const [chartOpen, setChartOpen] = useState(false);

  if (!currency) return null;
  const c = currency;

  const trade = (bank: BankInfo, kind: "buy" | "sell", rate: number) => {
    toast(
      kind === "buy"
        ? `Заявка на покупку ${c.code} в «${bank.name}» по ${rate.toFixed(2)} ₽ отправлена`
        : `Заявка на продажу ${c.code} в «${bank.name}» по ${rate.toFixed(2)} ₽ отправлена`,
      "check",
    );
  };

  return (
    <>
      <Sheet open onClose={onClose} title={`Курс ${c.code}`}>
        <div className="flex items-center gap-2.5">
          <Flag code={c.flag} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold tracking-tight">{c.country}</p>
            <p className="text-[11px] font-bold text-faint">ЦБ РФ · сегодня</p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold ${
              c.up ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
            }`}
          >
            <Icon name={c.up ? "trend-up" : "trend-down"} className="h-3.5 w-3.5" strokeWidth={2.2} />
            {c.chg}
          </span>
        </div>

        <p className="mt-2.5 text-[30px] font-extrabold leading-none tracking-tight">
          {c.rate} <span className="text-[15px] font-bold text-sub">₽</span>
        </p>

        <button
          onClick={() => setChartOpen(true)}
          className="press mt-3 block w-full overflow-hidden rounded-2xl border border-line/80 bg-paper/60 p-3"
        >
          <div className="h-24 w-full">
            <PriceChart code={`${c.code}-detail`} data={c.spark} up={c.up} big />
          </div>
          <p className="mt-1.5 flex items-center justify-center gap-1 text-[10.5px] font-bold text-faint">
            <Icon name="eye" className="h-3 w-3" strokeWidth={2.2} />
            Нажмите, чтобы увеличить график
          </p>
        </button>

        <p className="mt-4 text-[11px] font-extrabold uppercase tracking-wide text-faint">Предложения банков</p>
        <div className="mt-2 space-y-2.5">
          {c.offers.map((o) => {
            const bank = BANKS.find((b) => b.id === o.bankId);
            if (!bank) return null;
            const connected = connectedBankIds.includes(bank.id);
            const holding = connected ? bank.fx?.find((f) => f.code === c.code)?.amount : undefined;
            return (
              <div key={bank.id} className="rounded-2xl border border-line/80 bg-white p-3.5 shadow-card">
                <div className="flex items-center gap-2.5">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[12px] font-extrabold"
                    style={{ background: bank.logoBg, color: bank.logoFg }}
                  >
                    {bank.logo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-extrabold">{bank.name}</p>
                    {holding != null ? (
                      <p className="text-[10.5px] font-bold text-ok">У вас: {fmtFx(holding)} {c.code}</p>
                    ) : connected ? (
                      <p className="text-[10.5px] font-semibold text-faint">На счетах {c.code} нет</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[9px] font-extrabold uppercase tracking-wide text-faint">Купить / Продать</p>
                    <p className="text-[13px] font-extrabold tabular-nums">
                      {o.sell.toFixed(2)} / {o.buy.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => trade(bank, "buy", o.sell)}
                    className="press flex-1 rounded-full bg-accent py-2 text-[12px] font-extrabold text-white"
                  >
                    Купить
                  </button>
                  <button
                    onClick={() => trade(bank, "sell", o.buy)}
                    className="press flex-1 rounded-full bg-ink py-2 text-[12px] font-extrabold text-white"
                  >
                    Продать
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Sheet>

      <ChartOverlay open={chartOpen} onClose={() => setChartOpen(false)} title={`${c.code} · ${c.country}`}>
        <div className="w-full py-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-[24px] font-extrabold leading-none tracking-tight">
              {c.rate} <span className="text-[13px] font-bold text-sub">₽</span>
            </p>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold ${
                c.up ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
              }`}
            >
              <Icon name={c.up ? "trend-up" : "trend-down"} className="h-3.5 w-3.5" strokeWidth={2.2} />
              {c.chg}
            </span>
          </div>
          <div className="mt-4 h-64 w-full">
            <PriceChart code={`${c.code}-big`} data={c.spark} up={c.up} big />
          </div>
        </div>
      </ChartOverlay>
    </>
  );
}

/* ---------- Новостная лента ---------- */
const NEWS_ICON: Record<NewsItem["category"], string> = { mandatory: "alert", personal: "user", edu: "cap" };
const NEWS_LABEL: Record<NewsItem["category"], string> = { mandatory: "Обязательно", personal: "Персонально", edu: "Обучение" };

export function NewsCarousel({
  onRead, onAllNews,
}: {
  onRead: (n: NewsItem) => void;
  onAllNews: () => void;
}) {
  const { ref, index, onScroll, goTo } = useSnap(NEWS.length);
  return (
    <Reveal>
      <section>
        <div className="flex items-center justify-between px-4">
          <h2 className="font-display text-[15px] font-semibold tracking-tight">Новости</h2>
          <button onClick={onAllNews} className="press text-[12.5px] font-bold text-accent">Все новости</button>
        </div>
        <div ref={ref} onScroll={onScroll} data-hscroll className="no-scrollbar mt-3 flex snap-x snap-mandatory overflow-x-auto pl-4">
          {NEWS.map((n) => (
            <div key={n.id} className="w-[272px] shrink-0 snap-start pr-3">
              <article
                className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-card transition-shadow hover:shadow-float ${
                  n.important ? "border-danger/35" : "border-line/80"
                }`}
              >
                <div
                  className="relative h-20 shrink-0 overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${n.artFrom}, ${n.artTo})` }}
                >
                  <Icon
                    name={n.artIcon}
                    className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 text-white opacity-[0.22]"
                    strokeWidth={1.4}
                  />
                  <div className="relative flex items-center justify-between p-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 text-[10px] font-extrabold text-ink backdrop-blur-sm">
                      <Icon name={NEWS_ICON[n.category] as never} className="h-3 w-3" strokeWidth={2.2} />
                      {NEWS_LABEL[n.category]}
                    </span>
                    {n.important && (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-danger" title="Важная новость">
                        <Icon name="excl" className="h-3.5 w-3.5" strokeWidth={2.6} />
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 text-[14px] font-extrabold leading-snug tracking-tight">{n.title}</h3>
                  <p className="mt-1.5 line-clamp-3 flex-1 text-[12px] font-medium leading-relaxed text-sub">{n.desc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-faint">{n.date}</span>
                    <button
                      onClick={() => onRead(n)}
                      className="press inline-flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1.5 text-[11.5px] font-extrabold text-accent-deep"
                    >
                      Читать
                      <Icon name="arrow-right" className="h-3 w-3" strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
        <Dots count={NEWS.length} active={index} onPick={goTo} />
      </section>
    </Reveal>
  );
}
