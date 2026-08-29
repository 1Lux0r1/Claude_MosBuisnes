import { useEffect, useRef, useState } from "react";
import { Icon, MobiusIcon } from "./icons";
import { AI_CHIPS, aiReply, loadConnectedIntegrationIds } from "./data";
import { generateReportAnalysis, REPORT_META, type ReportKind } from "./data/reports";
import { useDragScroll } from "./ui";

interface Msg { role: "ai" | "user"; text: string }

const GREETING: Msg = {
  role: "ai",
  text: "Здравствуйте, Анна! Я ИИ-агент экосистемы МосБизнес. Вижу 3 задачи на ближайшие дни: оплата патента, отчёт по субсидии и декларация НДС. Чем помочь?",
};

/* Загрузка и разбор отчётности — шаг мастера, управляет тем, какой ряд
   кнопок показан вместо обычных чипов-подсказок под лентой сообщений. */
type FlowStep = "idle" | "pick-report" | "pick-source";

/* Отдельный экран диалога с ассистентом (открывается кнопкой над меню) */
export default function AIAssistant({
  open, onClose, onOpenIntegrations,
}: {
  open: boolean;
  onClose: () => void;
  onOpenIntegrations: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>("idle");
  const [pendingReport, setPendingReport] = useState<ReportKind | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chipsScroll = useDragScroll<HTMLDivElement>();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing, open]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  if (!open) return null;

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setTyping(true);
    timerRef.current = window.setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: aiReply(text) }]);
      setTyping(false);
    }, 1100);
  };

  /* Читаем при каждом обращении, а не мемоизируем: этот компонент не
     размонтируется при переключении вкладок, в отличие от экранов, где
     подключение 1С проверяется так же — иначе состояние протухнет. */
  const connected1C = () => loadConnectedIntegrationIds().includes("1c");

  const startReportFlow = () => {
    setMessages((m) => [...m, { role: "ai", text: "Какую отчётность разберём?" }]);
    setFlowStep("pick-report");
  };

  const cancelFlow = () => {
    setFlowStep("idle");
    setPendingReport(null);
  };

  const pickReport = (kind: ReportKind) => {
    setMessages((m) => [
      ...m,
      { role: "user", text: REPORT_META[kind].title },
      { role: "ai", text: "Как загрузим отчёт — файлом или напрямую из 1С?" },
    ]);
    setPendingReport(kind);
    setFlowStep("pick-source");
  };

  const runAnalysis = (report: ReportKind, sourceText: string) => {
    setMessages((m) => [...m, { role: "user", text: sourceText }]);
    setFlowStep("idle");
    setPendingReport(null);
    setTyping(true);
    timerRef.current = window.setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: generateReportAnalysis(report) }]);
      setTyping(false);
    }, 1600);
  };

  const pickFile = () => fileInputRef.current?.click();

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingReport) return;
    runAnalysis(pendingReport, `Загрузил файл: «${file.name}»`);
  };

  const loadFromOneC = () => {
    if (!pendingReport) return;
    runAnalysis(pendingReport, "Подтягиваю отчёт из 1С:Предприятие…");
  };

  return (
    <div className="animate-fade-in absolute inset-0 z-[60] flex flex-col bg-paper">
      {/* Шапка экрана диалога */}
      <div className="border-b border-line/70 bg-card/90 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onClose}
            className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-ink2"
            aria-label="Назад"
          >
            <Icon name="chevron-left" className="h-5 w-5" strokeWidth={2.1} />
          </button>
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-danger-soft text-[#d91a38]">
            <MobiusIcon className="h-6 w-6" strokeWidth={2.1} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-[#22c55e]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[14.5px] font-semibold tracking-tight">ИИ-агент МосБизнес</p>
            <p className="text-[11px] font-semibold text-ok">онлайн · отвечает за секунды</p>
          </div>
          <span className="hidden rounded-full bg-paper px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-sub sm:block">
            Beta
          </span>
        </div>
      </div>

      {/* Лента сообщений */}
      <div ref={listRef} className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <p className="text-center text-[10.5px] font-bold text-faint">Сегодня</p>
        {messages.map((m, i) => (
          <div key={i} className={`animate-fade-up flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[82%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] font-medium leading-relaxed shadow-card ${
                m.role === "user" ? "rounded-br-md bg-accent text-white" : "rounded-bl-md bg-card text-ink2"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="animate-fade-up flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-card px-4 py-3 shadow-card">
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-faint" />
              ))}
            </div>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChosen} />

      {/* Чипы-подсказки — заменяются на шаги мастера загрузки отчётности */}
      <div
        ref={chipsScroll.ref}
        onPointerDown={chipsScroll.onPointerDown}
        onPointerMove={chipsScroll.onPointerMove}
        onPointerUp={chipsScroll.onPointerUp}
        onPointerCancel={chipsScroll.onPointerCancel}
        className="no-scrollbar flex cursor-grab gap-2 overflow-x-auto px-4 pb-2.5 active:cursor-grabbing"
      >
        {flowStep === "idle" && (
          <>
            <button
              onClick={startReportFlow}
              className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-2 text-[12px] font-bold text-accent-deep shadow-card"
            >
              <Icon name="doc" className="h-3.5 w-3.5" strokeWidth={2.2} />
              Загрузить отчётность
            </button>
            {AI_CHIPS.map((c) => (
              <button key={c} onClick={() => send(c)} className="press shrink-0 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-accent-deep shadow-card">
                {c}
              </button>
            ))}
          </>
        )}
        {flowStep === "pick-report" && (
          <>
            {(Object.keys(REPORT_META) as ReportKind[]).map((k) => (
              <button
                key={k}
                onClick={() => pickReport(k)}
                className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-accent-deep shadow-card"
              >
                <Icon name={REPORT_META[k].icon} className="h-3.5 w-3.5" strokeWidth={2.2} />
                {REPORT_META[k].title}
              </button>
            ))}
            <button onClick={cancelFlow} className="press shrink-0 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-sub shadow-card">
              Отмена
            </button>
          </>
        )}
        {flowStep === "pick-source" && (
          <>
            <button
              onClick={pickFile}
              className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-accent-deep shadow-card"
            >
              <Icon name="doc" className="h-3.5 w-3.5" strokeWidth={2.2} />
              Загрузить файл
            </button>
            {connected1C() ? (
              <button
                onClick={loadFromOneC}
                className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-accent-deep shadow-card"
              >
                <Icon name="link" className="h-3.5 w-3.5" strokeWidth={2.2} />
                Из 1С
              </button>
            ) : (
              <button
                onClick={() => {
                  cancelFlow();
                  onOpenIntegrations();
                }}
                className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 py-2 text-[12px] font-bold text-sub shadow-card"
              >
                <Icon name="link" className="h-3.5 w-3.5" strokeWidth={2.2} />
                Подключить 1С
              </button>
            )}
            <button onClick={cancelFlow} className="press shrink-0 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-sub shadow-card">
              Отмена
            </button>
          </>
        )}
      </div>

      {/* Поле ввода */}
      <div className="flex items-center gap-2 border-t border-line/80 bg-card px-3.5 py-3">
        <div className="flex h-10 min-w-0 flex-1 items-center rounded-full bg-paper px-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Спросите про услуги, субсидии, сроки…"
            className="h-full w-full bg-transparent text-[13.5px] font-medium outline-none placeholder:text-faint"
          />
        </div>
        <button
          onClick={() => send()}
          disabled={!input.trim() || typing}
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ff5c72] to-[#b01230] text-white shadow-card transition-opacity disabled:opacity-40"
          aria-label="Отправить"
        >
          <Icon name="send" className="h-[18px] w-[18px] -translate-x-px" strokeWidth={2} />
        </button>
      </div>
      <div className="flex justify-center bg-card pb-2">
        <span className="h-[4px] w-28 rounded-full bg-line" />
      </div>
    </div>
  );
}
