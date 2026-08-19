import { Icon } from "./icons";
import { Dots, Reveal, useSnap } from "./ui";
import { CURRENCIES, NEWS, type NewsItem } from "./data";

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

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${26 - ((v - min) / (max - min || 1)) * 22 - 2}`).join(" ");
  return (
    <svg viewBox="0 0 100 28" className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={up ? "#148a4c" : "#f5333f"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- Курс валют ---------- */
export function CurrencyCarousel() {
  const { ref, index, onScroll, goTo } = useSnap(CURRENCIES.length);
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
              <div className="rounded-2xl border border-line/80 bg-white p-4 shadow-card">
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
                  <Sparkline data={c.spark} up={c.up} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Dots count={CURRENCIES.length} active={index} onPick={goTo} />
      </section>
    </Reveal>
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
                className={`flex h-full flex-col rounded-2xl border bg-white p-4 shadow-card transition-shadow hover:shadow-float ${
                  n.important ? "border-danger/35" : "border-line/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2 py-1 text-[10px] font-extrabold text-sub">
                    <Icon name={NEWS_ICON[n.category] as never} className="h-3 w-3" strokeWidth={2.2} />
                    {NEWS_LABEL[n.category]}
                  </span>
                  {n.important && (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-danger text-white" title="Важная новость">
                      <Icon name="excl" className="h-3.5 w-3.5" strokeWidth={2.6} />
                    </span>
                  )}
                </div>
                <h3 className="mt-2.5 line-clamp-2 text-[14px] font-extrabold leading-snug tracking-tight">{n.title}</h3>
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
              </article>
            </div>
          ))}
        </div>
        <Dots count={NEWS.length} active={index} onPick={goTo} />
      </section>
    </Reveal>
  );
}
