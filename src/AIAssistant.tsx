import { useEffect, useRef, useState } from "react";
import { Icon, MobiusIcon, type IconName } from "./icons";
import { AI_CHIPS, aiReply, loadConnectedIntegrationIds, pluralRu, SERVICE_CATALOG, upcomingDeadlines } from "./data";
import { generateReportAnalysis, generateReportComparison, REPORT_META, type ReportKind, type ReportResult } from "./data/reports";
import { requirementsReply, supportMeasuresReply } from "./data/ai-insights";
import { CATEGORY_FIELDS, ONE_C_FILL, type FieldDef, type ServiceItem } from "./screens";
import { useDragScroll, useToast } from "./ui";

interface Msg { role: "ai" | "user"; text: string }

/* Услуги, которые можно оформить прямо в чате — по одной на каждую категорию
   формы заявки (CATEGORY_FIELDS), чтобы демо показывало разные наборы полей. */
const CHAT_APPLY_IDS = ["s1", "s3", "s5", "s7", "s9", "c1"];
const CHAT_APPLY_SERVICES = CHAT_APPLY_IDS.map((id) => SERVICE_CATALOG.find((s) => s.id === id)).filter(
  (s): s is ServiceItem => Boolean(s),
);

/* Проактивное приветствие — не статичный текст, а реальные ближайшие сроки
   из календаря (см. upcomingDeadlines в data.ts), как и было задумано: если
   расписание изменится, изменится и то, что говорит ассистент. */
function buildGreeting(): Msg {
  const deadlines = upcomingDeadlines(5, 3);
  if (deadlines.length === 0) {
    return { role: "ai", text: "Здравствуйте, Анна! Я ИИ-агент экосистемы МосБизнес. Срочных задач на ближайшие дни не вижу. Чем помочь?" };
  }
  const list = deadlines.map((d) => `${d.whenLabel}: ${d.title}`).join("; ");
  const word = pluralRu(deadlines.length, "задача", "задачи", "задач");
  return {
    role: "ai",
    text: `Здравствуйте, Анна! Я ИИ-агент экосистемы МосБизнес. Вижу ${deadlines.length} ${word} на ближайшие дни — ${list}. Чем помочь?`,
  };
}

/* Загрузка отчётности и оформление заявки — пошаговые мастера, управляют
   тем, какой ряд кнопок показан вместо обычных чипов-подсказок. */
type FlowStep = "idle" | "pick-report" | "pick-source" | "pick-service" | "apply-source" | "collect-field" | "confirm-apply";

/** Заявка, которую собирает ассистент в диалоге: сервис, поля его формы и уже
 *  собранные значения. Отправка происходит не здесь, а в каталоге «Услуги» —
 *  тот же ApplyForm, что и при обычном оформлении, только уже заполненный. */
interface ApplyFlowState {
  service: ServiceItem;
  fields: FieldDef[];
  index: number;
  values: Record<string, string>;
}

/** Подсказка «показать в другом разделе» после ответа, завязанного на реальные
 *  данные — Радар требований или меры поддержки/кросс-продажа по отчёту. */
type FollowUp = "vitrina" | "requirements" | null;

/* Отдельный экран диалога с ассистентом (открывается кнопкой над меню) */
export default function AIAssistant({
  open, onClose, onOpenIntegrations, onOpenApplications, onOpenRequirements, onOpenVitrina, onOpenServiceApply,
}: {
  open: boolean;
  onClose: () => void;
  onOpenIntegrations: () => void;
  onOpenApplications: () => void;
  onOpenRequirements: () => void;
  onOpenVitrina: () => void;
  onOpenServiceApply: (serviceId: string, values: Record<string, string>) => void;
}) {
  const toast = useToast();
  const [messages, setMessages] = useState<Msg[]>(() => [buildGreeting()]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>("idle");
  const [pendingReport, setPendingReport] = useState<ReportKind | null>(null);
  const [applyFlow, setApplyFlow] = useState<ApplyFlowState | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp>(null);
  const [listening, setListening] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
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
  useEffect(() => () => recognitionRef.current?.stop(), []);

  if (!open) return null;

  /* Читаем при каждом обращении, а не мемоизируем: этот компонент не
     размонтируется при переключении вкладок, в отличие от экранов, где
     подключение 1С проверяется так же — иначе состояние протухнет. */
  const connected1C = () => loadConnectedIntegrationIds().includes("1c");

  const smartReply = (raw: string): string => {
    const t = raw.toLowerCase();
    if (t.includes("требован") || t.includes("наруш") || t.includes("радар")) {
      setFollowUp("requirements");
      return requirementsReply();
    }
    if (t.includes("субсид") || t.includes("грант") || t.includes("поддерж")) {
      setFollowUp("vitrina");
      return supportMeasuresReply();
    }
    return aiReply(raw);
  };

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);

    if (flowStep === "collect-field" && applyFlow) {
      const values = { ...applyFlow.values, [applyFlow.fields[applyFlow.index].key]: text };
      askField(applyFlow.fields, applyFlow.index + 1, values);
      return;
    }

    setTyping(true);
    timerRef.current = window.setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: smartReply(text) }]);
      setTyping(false);
    }, 1100);
  };

  /* ---------- Отчётность ---------- */
  const startReportFlow = () => {
    setFollowUp(null);
    setMessages((m) => [...m, { role: "ai", text: "Какую отчётность разберём?" }]);
    setFlowStep("pick-report");
  };

  const pickReport = (kind: ReportKind) => {
    setMessages((m) => [
      ...m,
      { role: "user", text: REPORT_META[kind].title },
      { role: "ai", text: "Как загрузим отчёт — файлом, напрямую из 1С или сравним с прошлым периодом?" },
    ]);
    setPendingReport(kind);
    setFlowStep("pick-source");
  };

  const finishReport = (result: ReportResult) => {
    setFlowStep("idle");
    setPendingReport(null);
    setTyping(true);
    timerRef.current = window.setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: result.text }]);
      setTyping(false);
      if (result.crossSell) {
        setFollowUp("vitrina");
        window.setTimeout(() => {
          setMessages((m) => [...m, { role: "ai", text: result.crossSell!.blurb }]);
        }, 700);
      }
    }, 1600);
  };

  const runAnalysis = (report: ReportKind, sourceText: string) => {
    setMessages((m) => [...m, { role: "user", text: sourceText }]);
    finishReport(generateReportAnalysis(report));
  };

  const runComparison = (report: ReportKind) => {
    setMessages((m) => [...m, { role: "user", text: "Сравнить с прошлым периодом" }]);
    finishReport(generateReportComparison(report));
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

  /* ---------- Оформление заявки через диалог ---------- */
  const startApplyFlow = () => {
    setFollowUp(null);
    setMessages((m) => [...m, { role: "ai", text: "Какую услугу оформляем? Вот несколько популярных — весь каталог доступен во вкладке «Услуги»." }]);
    setFlowStep("pick-service");
  };

  /** Задаёт вопрос по следующему незаполненному полю (пропуская уже
   *  подставленные из 1С) или, если полей больше нет, показывает сводку. */
  const askField = (fields: FieldDef[], fromIndex: number, values: Record<string, string>) => {
    let i = fromIndex;
    while (i < fields.length && values[fields[i].key]) i++;
    if (i >= fields.length) {
      finishApplyCollection(fields, values);
      return;
    }
    setApplyFlow((af) => (af ? { ...af, index: i, values } : af));
    setFlowStep("collect-field");
    setMessages((m) => [...m, { role: "ai", text: `${fields[i].label} — ${fields[i].placeholder}` }]);
  };

  const finishApplyCollection = (fields: FieldDef[], values: Record<string, string>) => {
    setApplyFlow((af) => (af ? { ...af, index: fields.length, values } : af));
    const summary = fields.map((f) => `${f.label}: ${values[f.key]}`).join("\n");
    setMessages((m) => [...m, { role: "ai", text: `Проверьте данные перед отправкой:\n\n${summary}` }]);
    setFlowStep("confirm-apply");
  };

  const pickService = (service: ServiceItem) => {
    const fields = CATEGORY_FIELDS[service.category] ?? [];
    setMessages((m) => [...m, { role: "user", text: service.title }]);
    if (fields.length === 0) {
      setMessages((m) => [...m, { role: "ai", text: "Для этой услуги достаточно нажать «Оформить» в каталоге — дополнительных полей нет." }]);
      setFlowStep("idle");
      return;
    }
    setApplyFlow({ service, fields, index: 0, values: {} });
    if (connected1C() && fields.some((f) => ONE_C_FILL[f.key])) {
      setFlowStep("apply-source");
      setMessages((m) => [...m, { role: "ai", text: "Заполнить данные из 1С или ответить на пару вопросов вручную?" }]);
    } else {
      askField(fields, 0, {});
    }
  };

  const applyFillFrom1C = () => {
    if (!applyFlow) return;
    setMessages((m) => [...m, { role: "user", text: "Заполнить из 1С" }]);
    const values = { ...applyFlow.values };
    applyFlow.fields.forEach((f) => { if (ONE_C_FILL[f.key]) values[f.key] = ONE_C_FILL[f.key]; });
    askField(applyFlow.fields, 0, values);
  };

  const applyManual = () => {
    if (!applyFlow) return;
    setMessages((m) => [...m, { role: "user", text: "Заполнить вручную" }]);
    askField(applyFlow.fields, 0, applyFlow.values);
  };

  const openApplyForm = () => {
    if (!applyFlow) return;
    setMessages((m) => [...m, { role: "user", text: "Открыть заявку" }]);
    onOpenServiceApply(applyFlow.service.id, applyFlow.values);
    setApplyFlow(null);
    setFlowStep("idle");
  };

  const cancelFlow = () => {
    setFlowStep("idle");
    setPendingReport(null);
    setApplyFlow(null);
  };

  /* ---------- Голосовой ввод (Web Speech API) ---------- */
  const SpeechCtor = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
    .SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    if (!SpeechCtor) return;
    const rec = new SpeechCtor();
    rec.lang = "ru-RU";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    rec.onerror = () => {
      toast("Не удалось распознать голос", "alert");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const followUpChip = followUp === "vitrina"
    ? { label: "Показать в личном кабинете", icon: "coins" as IconName, onClick: onOpenVitrina }
    : followUp === "requirements"
      ? { label: "Открыть Радар требований", icon: "shield" as IconName, onClick: onOpenRequirements }
      : null;

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

      {/* Чипы-подсказки — заменяются на шаги мастеров загрузки отчётности и оформления услуги */}
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
            {followUpChip && (
              <button
                onClick={() => { setFollowUp(null); followUpChip.onClick(); }}
                className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ok/30 bg-ok-soft px-3.5 py-2 text-[12px] font-bold text-ok shadow-card"
              >
                <Icon name={followUpChip.icon} className="h-3.5 w-3.5" strokeWidth={2.2} />
                {followUpChip.label}
              </button>
            )}
            <button
              onClick={startReportFlow}
              className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-2 text-[12px] font-bold text-accent-deep shadow-card"
            >
              <Icon name="doc" className="h-3.5 w-3.5" strokeWidth={2.2} />
              Загрузить отчётность
            </button>
            <button
              onClick={startApplyFlow}
              className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-2 text-[12px] font-bold text-accent-deep shadow-card"
            >
              <Icon name="clipboard" className="h-3.5 w-3.5" strokeWidth={2.2} />
              Оформить услугу
            </button>
            <button
              onClick={onOpenApplications}
              className="press shrink-0 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-accent-deep shadow-card"
            >
              Мои заявления
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
            <button
              onClick={() => pendingReport && runComparison(pendingReport)}
              className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-accent-deep shadow-card"
            >
              <Icon name="trend-up" className="h-3.5 w-3.5" strokeWidth={2.2} />
              Сравнить с прошлым периодом
            </button>
            <button onClick={cancelFlow} className="press shrink-0 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-sub shadow-card">
              Отмена
            </button>
          </>
        )}
        {flowStep === "pick-service" && (
          <>
            {CHAT_APPLY_SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => pickService(s)}
                className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-accent-deep shadow-card"
              >
                <Icon name={s.icon as IconName} className="h-3.5 w-3.5" strokeWidth={2.2} />
                {s.title}
              </button>
            ))}
            <button onClick={cancelFlow} className="press shrink-0 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-sub shadow-card">
              Отмена
            </button>
          </>
        )}
        {flowStep === "apply-source" && (
          <>
            <button
              onClick={applyFillFrom1C}
              className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-accent-deep shadow-card"
            >
              <Icon name="link" className="h-3.5 w-3.5" strokeWidth={2.2} />
              Заполнить из 1С
            </button>
            <button
              onClick={applyManual}
              className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-accent-deep shadow-card"
            >
              <Icon name="doc" className="h-3.5 w-3.5" strokeWidth={2.2} />
              Заполнить вручную
            </button>
            <button onClick={cancelFlow} className="press shrink-0 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-sub shadow-card">
              Отмена
            </button>
          </>
        )}
        {flowStep === "collect-field" && (
          <button onClick={cancelFlow} className="press shrink-0 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-bold text-sub shadow-card">
            Отмена
          </button>
        )}
        {flowStep === "confirm-apply" && (
          <>
            <button
              onClick={openApplyForm}
              className="press inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-[12px] font-bold text-white shadow-card"
            >
              <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
              Открыть заявку и отправить
            </button>
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
            placeholder={listening ? "Слушаю…" : "Спросите про услуги, субсидии, сроки…"}
            className="h-full w-full bg-transparent text-[13.5px] font-medium outline-none placeholder:text-faint"
          />
        </div>
        {SpeechCtor && (
          <button
            onClick={toggleListening}
            aria-label={listening ? "Остановить голосовой ввод" : "Голосовой ввод"}
            className={`press grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors ${
              listening ? "bg-danger text-white" : "bg-paper text-ink2"
            }`}
          >
            <Icon name="mic" className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        )}
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

/* Минимальный интерфейс Web Speech API — типов нет в стандартной lib.dom,
   а поддержка есть только в части браузеров (Chromium), поэтому конструктор
   ищем через runtime-проверку и типизируем только то, что реально используем. */
interface SpeechRecognitionResultLike { transcript: string }
interface SpeechRecognitionEventLike { results: { [i: number]: { [j: number]: SpeechRecognitionResultLike } } }
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
