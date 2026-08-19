/* ============================================================
   Генератор исторических котировок для увеличенного графика валют.
   Реальных исторических рядов в оффлайн-демо нет, поэтому строим
   детерминированное псевдослучайное блуждание с 1 января 1999 года
   до сегодняшнего дня, откалиброванное так, чтобы последняя точка
   совпадала с текущим отображаемым курсом. Результат кэшируется в
   памяти по коду валюты — генерируется один раз при первом открытии
   графика, а не на каждый рендер.
   ============================================================ */

export interface OhlcPoint { t: number; o: number; h: number; l: number; c: number }

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const HISTORY_START = new Date(1999, 0, 1).getTime();

const APPROX_1999_RATE: Record<string, number> = { USD: 24, EUR: 26, CNY: 3.5 };

const dailyCache = new Map<string, OhlcPoint[]>();
const intradayCache = new Map<string, OhlcPoint[]>();

function toOhlc(rand: () => number, closes: number[], startAt: number, stepMs: number): OhlcPoint[] {
  return closes.map((c, i) => {
    const open = i === 0 ? c : closes[i - 1];
    const wick = Math.abs(c - open) * (0.3 + rand() * 0.9) + c * 0.0015;
    const high = Math.max(open, c) + wick * rand();
    const low = Math.max(0.01, Math.min(open, c) - wick * rand());
    return { t: startAt + i * stepMs, o: open, h: high, l: low, c };
  });
}

/** Дневной ряд котировок с 1999 года по сегодня, последняя точка = текущий курс. */
export function getFxHistory(code: string, endValue: number): OhlcPoint[] {
  const cached = dailyCache.get(code);
  if (cached) return cached;

  const rand = seededRandom(hashCode(code) || 1);
  const days = Math.round((Date.now() - HISTORY_START) / DAY_MS);
  const closes: number[] = [];
  let value = APPROX_1999_RATE[code] ?? endValue * 0.3;

  for (let i = 0; i <= days; i++) {
    const remaining = days - i + 1;
    // Полная сходимость к текущему курсу к последней точке (drift растёт по
    // мере приближения к сегодня), шум последних ~2 месяцев глушится, чтобы
    // график подходил к текущей цене плавно, а не «обрывом» в конце.
    const drift = (endValue - value) / remaining;
    const shockScale = Math.min(1, remaining / 60);
    const shock = (rand() - 0.5) * 2 * 0.006 * value * shockScale;
    value = Math.max(0.01, value + drift + shock);
    closes.push(value);
  }
  closes[closes.length - 1] = endValue;

  const points = toOhlc(rand, closes, HISTORY_START, DAY_MS);
  dailyCache.set(code, points);
  return points;
}

/** Синтетический внутридневной ряд (получасовые точки) для таймфрейма «1 день». */
export function getFxIntraday(code: string, endValue: number): OhlcPoint[] {
  const cached = intradayCache.get(code);
  if (cached) return cached;

  const rand = seededRandom((hashCode(code) || 1) ^ 0x1d42);
  const bars = 48;
  const stepMs = DAY_MS / bars;
  const startAt = Date.now() - DAY_MS;
  const closes: number[] = [];
  let value = endValue * (1 + (rand() - 0.5) * 0.012);

  for (let i = 0; i <= bars; i++) {
    value += (rand() - 0.5) * 2 * 0.0015 * value;
    closes.push(value);
  }
  closes[closes.length - 1] = endValue;

  const points = toOhlc(rand, closes, startAt, stepMs);
  intradayCache.set(code, points);
  return points;
}

export type TimeframeId = "1d" | "1w" | "1m" | "3m" | "1y" | "5y" | "all";

export const TIMEFRAMES: { id: TimeframeId; label: string }[] = [
  { id: "1d", label: "Д" },
  { id: "1w", label: "Н" },
  { id: "1m", label: "М" },
  { id: "3m", label: "3М" },
  { id: "1y", label: "Г" },
  { id: "5y", label: "5Л" },
  { id: "all", label: "Все" },
];

const TF_DAYS: Record<Exclude<TimeframeId, "1d">, number | null> = {
  "1w": 7, "1m": 30, "3m": 90, "1y": 365, "5y": 365 * 5, all: null,
};

/** Точки для выбранного таймфрейма, ресемплированные до разумного числа баров. */
export function getFxSeries(code: string, endValue: number, tf: TimeframeId, targetBars = 70): OhlcPoint[] {
  if (tf === "1d") return getFxIntraday(code, endValue);

  const history = getFxHistory(code, endValue);
  const days = TF_DAYS[tf];
  const sliced = days == null ? history : (() => {
    const cutoff = Date.now() - days * DAY_MS;
    const idx = history.findIndex((p) => p.t >= cutoff);
    return idx === -1 ? history.slice(-2) : history.slice(idx);
  })();

  if (sliced.length <= targetBars) return sliced;
  const bucket = Math.ceil(sliced.length / targetBars);
  const out: OhlcPoint[] = [];
  for (let i = 0; i < sliced.length; i += bucket) {
    const chunk = sliced.slice(i, i + bucket);
    out.push({
      t: chunk[chunk.length - 1].t,
      o: chunk[0].o,
      c: chunk[chunk.length - 1].c,
      h: Math.max(...chunk.map((p) => p.h)),
      l: Math.min(...chunk.map((p) => p.l)),
    });
  }
  return out;
}

export function fmtFxPrice(v: number): string {
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtFxDate(t: number, tf: TimeframeId, full = false): string {
  const d = new Date(t);
  if (tf === "1d") {
    return full
      ? d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) + ", " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  if (tf === "1w" || tf === "1m") {
    return d.toLocaleDateString("ru-RU", full ? { day: "numeric", month: "long", year: "numeric" } : { day: "2-digit", month: "2-digit" });
  }
  if (tf === "3m" || tf === "1y") {
    return d.toLocaleDateString("ru-RU", full ? { day: "numeric", month: "long", year: "numeric" } : { day: "2-digit", month: "short" });
  }
  return d.toLocaleDateString("ru-RU", full ? { day: "numeric", month: "long", year: "numeric" } : { month: "short", year: "numeric" });
}
