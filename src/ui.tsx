import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

/* ---------- Тосты (z-80 — выше шторок) ---------- */
type ToastFn = (text: string, icon?: string) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);

interface ToastItem { id: number; text: string; icon?: string }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback<ToastFn>((text, icon) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-2), { id, text, icon }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none absolute inset-x-0 bottom-28 z-[80] flex flex-col items-center gap-2 px-6">
        {toasts.map((t) => (
          <div key={t.id} className="animate-toast-in flex items-center gap-2.5 rounded-full bg-ink-solid px-4 py-2.5 shadow-float">
            {t.icon && (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white/15 text-white">
                <Icon name={t.icon as never} className="h-3 w-3" strokeWidth={2.4} />
              </span>
            )}
            <p className="text-[12.5px] font-bold text-white">{t.text}</p>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* Портал в #app-shell: если overlay вызвать из компонента, лежащего внутри
   прокручиваемого <main> (overflow-y-auto), браузер обрежет абсолютно
   спозиционированный оверлей до видимого фрагмента main — портал выносит
   его DOM-узел на уровень Shell, где absolute inset-0 работает как задумано,
   независимо от места вызова. Используется и Sheet, и ChartOverlay. */
function useShellPortal() {
  const [container] = useState(() => {
    const el = document.createElement("div");
    el.className = "contents";
    return el;
  });

  useEffect(() => {
    const root = document.getElementById("app-shell");
    root?.appendChild(container);
    return () => {
      root?.removeChild(container);
    };
  }, [container]);

  return container;
}

function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onEscape();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onEscape]);
}

/* ---------- Нижняя шторка ---------- */
export function Sheet({
  open, onClose, title, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const container = useShellPortal();
  useEscapeKey(open, onClose);

  if (!open) return null;
  return createPortal(
    <div className="absolute inset-0 z-[70]">
      <button aria-label="Закрыть" className="animate-fade-in absolute inset-0 h-full w-full bg-ink-solid/45" onClick={onClose} />
      <div className="animate-sheet-up absolute inset-x-0 bottom-0 max-h-[86%] overflow-hidden rounded-t-[26px] bg-card shadow-float">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <h3 className="font-display text-[15px] font-semibold tracking-tight">{title}</h3>
          <button onClick={onClose} className="press grid h-8 w-8 place-items-center rounded-full bg-paper text-sub" aria-label="Закрыть">
            <Icon name="close" className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
        <div className="no-scrollbar max-h-[68vh] overflow-y-auto px-5 pb-8">{children}</div>
      </div>
    </div>,
    container,
  );
}

/* ---------- Центрированный оверлей во весь экран (для увеличенного графика):
   в отличие от Sheet не прижат к низу — сверху и снизу остаётся видимый,
   притемнённый (не полностью чёрный) фон. ---------- */
export function ChartOverlay({
  open, onClose, title, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const container = useShellPortal();
  useEscapeKey(open, onClose);

  if (!open) return null;
  return createPortal(
    <div className="absolute inset-0 z-[75]">
      <button aria-label="Закрыть" className="animate-fade-in absolute inset-0 h-full w-full bg-ink-solid/40" onClick={onClose} />
      <div className="animate-pop absolute inset-x-3 top-16 bottom-16 flex flex-col overflow-hidden rounded-3xl bg-card shadow-float">
        <div className="flex shrink-0 items-center justify-between border-b border-line/70 px-4 py-3">
          <h3 className="font-display text-[14.5px] font-semibold tracking-tight">{title}</h3>
          <button onClick={onClose} className="press grid h-8 w-8 place-items-center rounded-full bg-paper text-sub" aria-label="Закрыть">
            <Icon name="close" className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">{children}</div>
      </div>
    </div>,
    container,
  );
}

/* ---------- Появление при скролле ---------- */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------- Точки-индикаторы каруселей ---------- */
export function Dots({ count, active, onPick }: { count: number; active: number; onPick?: (i: number) => void }) {
  return (
    <div className="mt-2.5 flex items-center justify-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onPick?.(i)}
          aria-label={`Слайд ${i + 1}`}
          className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-5 bg-accent" : "w-1.5 bg-line"}`}
        />
      ))}
    </div>
  );
}

/* ---------- Тумблер ---------- */
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-300 ${checked ? "bg-accent" : "bg-line"}`}
    >
      <span
        className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-card transition-all duration-300 ${checked ? "left-[23px]" : "left-[3px]"}`}
      />
    </button>
  );
}

/* ---------- Снап-карусель с индикатором ---------- */
export function useSnap(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const [index, setIndex] = useState(0);

  useEffect(() => () => window.cancelAnimationFrame(raf.current), []);

  const onScroll = () => {
    window.cancelAnimationFrame(raf.current);
    raf.current = window.requestAnimationFrame(() => {
      const el = ref.current;
      if (!el || el.scrollWidth === 0) return;
      const i = Math.round((el.scrollLeft / el.scrollWidth) * count);
      setIndex(Math.max(0, Math.min(count - 1, i)));
    });
  };

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: (el.scrollWidth / count) * i, behavior: "smooth" });
  };

  return { ref, index, onScroll, goTo };
}

/* ---------- Скелетоны загрузки ---------- */
export function HomeSkeleton() {
  return (
    <div className="space-y-7 pt-4 pb-8" aria-busy="true" aria-label="Загрузка">
      <div className="px-4">
        <div className="skeleton h-4 w-28 rounded-md" />
        <div className="mt-3 flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-[74px] w-[62px] shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="px-4">
        <div className="skeleton h-4 w-40 rounded-md" />
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-[98px] rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="px-4">
        <div className="skeleton h-4 w-52 rounded-md" />
        <div className="mt-3 space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[76px] rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="px-4">
        <div className="skeleton h-4 w-44 rounded-md" />
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[140px] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Ошибка сети ---------- */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-8 pt-16 text-center">
      <span className="animate-pop grid h-16 w-16 place-items-center rounded-3xl bg-danger-soft text-danger">
        <Icon name="wifi-off" className="h-8 w-8" strokeWidth={1.8} />
      </span>
      <h3 className="mt-4 text-[17px] font-extrabold tracking-tight">Нет соединения</h3>
      <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-sub">
        Не удалось загрузить данные экосистемы. Проверьте сеть и попробуйте ещё раз.
      </p>
      <button
        onClick={onRetry}
        className="press mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-[13px] font-extrabold text-white"
      >
        <Icon name="refresh" className="h-4 w-4" strokeWidth={2.2} />
        Обновить
      </button>
    </div>
  );
}

/* ---------- Пустое состояние ---------- */
export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-3xl bg-paper text-faint">
        <Icon name="search" className="h-7 w-7" strokeWidth={1.7} />
      </span>
      <p className="mt-3 text-[14px] font-extrabold">{title}</p>
      <p className="mt-1 text-[12.5px] font-medium text-sub">{hint}</p>
    </div>
  );
}
