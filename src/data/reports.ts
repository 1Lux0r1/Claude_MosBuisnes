/* ---------------------------------------------------------------------------
   Анализ отчётности в чате ИИ-агента.

   Бэкенда и реального разбора файлов нет — пользователь выбирает тип отчёта
   и способ загрузки (файл / 1С / сравнение с прошлым периодом), а этот модуль
   генерирует правдоподобные случайные показатели и на их основе, по пороговым
   правилам, формирует текстовое заключение с рекомендациями. При каждой
   загрузке — новые цифры и, соответственно, новый разбор.

   Расчёт показателей (compute*) отделён от сборки текста (compose*), чтобы одни
   и те же цифры можно было и просто показать, и сравнить с «прошлым периодом».
--------------------------------------------------------------------------- */

import type { IconName } from "../icons";
import { SUPPORT_MEASURES, fmtSupportAmount } from "./support-measures";

export type ReportKind = "pnl" | "balance" | "cashflow";

export const REPORT_META: Record<ReportKind, { title: string; short: string; icon: IconName }> = {
  pnl: { title: "Отчёт о прибылях и убытках", short: "П и У", icon: "chart" },
  balance: { title: "Бухгалтерский баланс", short: "Баланс", icon: "scroll" },
  cashflow: { title: "Отчёт о движении денежных средств", short: "ДДС", icon: "coins" },
};

const CURRENT_PERIOD = "август 2026";
const PREVIOUS_PERIOD = "июль 2026";

const rnd = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
const fmt = (v: number) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v)} ₽`;
const pct = (v: number) => `${v.toFixed(1).replace(".", ",")} %`;
const signed = (v: number) => `${v >= 0 ? "+" : ""}${fmt(v)}`;
const deltaPct = (curr: number, prev: number) => (prev === 0 ? 0 : ((curr - prev) / Math.abs(prev)) * 100);
const deltaText = (curr: number, prev: number) => {
  const d = deltaPct(curr, prev);
  const arrow = d > 0.5 ? "выросла" : d < -0.5 ? "снизилась" : "почти не изменилась";
  return `${arrow} на ${pct(Math.abs(d))}`;
};

/* Мера поддержки, которую стоит предложить по итогам разбора — только когда
   в цифрах есть реальный повод (не показываем для здоровых показателей). */
export interface CrossSell { title: string; blurb: string }

function crossSell(measureId: string): CrossSell | undefined {
  const m = SUPPORT_MEASURES.find((x) => x.id === measureId);
  if (!m) return undefined;
  return {
    title: m.title,
    blurb: `Судя по цифрам, может подойти мера поддержки «${m.title}» — до ${fmtSupportAmount(m.amount)}, ${m.conditionText.toLowerCase()}. Показать в личном кабинете?`,
  };
}

/* ---------- Отчёт о прибылях и убытках ---------- */
interface PnLMetrics {
  revenue: number; cogs: number; cogsRatio: number; grossProfit: number;
  sga: number; sgaRatio: number; netProfit: number; netMargin: number;
}

function computePnL(): PnLMetrics {
  const revenue = rnd(2_000_000, 15_000_000);
  const cogsRatio = rnd(40, 75) / 100;
  const cogs = Math.round(revenue * cogsRatio);
  const grossProfit = revenue - cogs;
  const sgaRatio = rnd(10, 30) / 100;
  const sga = Math.round(revenue * sgaRatio);
  const operatingProfit = grossProfit - sga;
  const other = Math.round(revenue * (rnd(-3, 3) / 100));
  const pretax = operatingProfit + other;
  const tax = pretax > 0 ? Math.round(pretax * 0.2) : 0;
  const netProfit = pretax - tax;
  const netMargin = (netProfit / revenue) * 100;
  return { revenue, cogs, cogsRatio, grossProfit, sga, sgaRatio, netProfit, netMargin };
}

function pnlNotes(m: PnLMetrics): string[] {
  const notes: string[] = [];
  if (m.netProfit <= 0) {
    notes.push(
      "Период закрыт с убытком — расходы превысили выручку. Это самый тревожный сигнал в отчёте: без изменений компания будет проедать оборотные средства.",
    );
  } else if (m.netMargin < 5) {
    notes.push(
      `Чистая рентабельность всего ${pct(m.netMargin)} — прибыль есть, но запас прочности минимальный: любой рост издержек или скидка клиенту может увести период в минус.`,
    );
  } else if (m.netMargin < 15) {
    notes.push(`Чистая рентабельность ${pct(m.netMargin)} — в пределах нормы для МСП, но есть заметный резерв для роста маржинальности.`);
  } else if (m.netMargin < 25) {
    notes.push(`Чистая рентабельность ${pct(m.netMargin)} — хороший результат, выше среднего по малому бизнесу.`);
  } else {
    notes.push(`Чистая рентабельность ${pct(m.netMargin)} — очень сильный результат для сектора МСП.`);
  }
  if (m.cogsRatio > 0.65) {
    notes.push(`Себестоимость съедает ${pct(m.cogsRatio * 100)} выручки — доля высокая, стоит пересмотреть условия с поставщиками или ценообразование.`);
  }
  if (m.sgaRatio > 0.25) {
    notes.push(`Коммерческие и управленческие расходы — ${pct(m.sgaRatio * 100)} от выручки, это заметная нагрузка на прибыль.`);
  }
  return notes;
}

function pnlRecs(m: PnLMetrics): string[] {
  const recs: string[] = [];
  if (m.netProfit <= 0) recs.push("сократить постоянные расходы и пересмотреть цены в первую очередь по низкомаржинальным позициям");
  else if (m.netMargin < 5) recs.push("создать финансовую подушку и не наращивать расходы, пока рентабельность не выйдет за пределы 10%");
  if (m.cogsRatio > 0.65) recs.push("запросить у 2–3 ключевых поставщиков пересмотр условий или найти альтернативных");
  if (m.sgaRatio > 0.25) recs.push("проверить структуру управленческих расходов на предмет статей, без которых можно обойтись");
  if (recs.length === 0) recs.push("зафиксировать текущую модель как целевую и следить, чтобы себестоимость не росла быстрее выручки");
  return recs;
}

function pnlCrossSell(m: PnLMetrics): CrossSell | undefined {
  if (m.netProfit <= 0 || m.netMargin < 5) return crossSell("sm2");
  return undefined;
}

function composePnLText(m: PnLMetrics, period: string): string {
  return [
    `Разобрал отчёт о прибылях и убытках за ${period}.`,
    "",
    `Выручка: ${fmt(m.revenue)}`,
    `Себестоимость продаж: ${fmt(m.cogs)} (${pct(m.cogsRatio * 100)} от выручки)`,
    `Валовая прибыль: ${fmt(m.grossProfit)}`,
    `Коммерческие и управленческие расходы: ${fmt(m.sga)}`,
    `Чистая прибыль: ${fmt(m.netProfit)} · рентабельность ${pct(m.netMargin)}`,
    "",
    pnlNotes(m).join(" "),
    "",
    `Рекомендации: ${pnlRecs(m).join("; ")}.`,
  ].join("\n");
}

function composePnLComparison(curr: PnLMetrics, prev: PnLMetrics): string {
  return [
    `Сравнил ${CURRENT_PERIOD} с ${PREVIOUS_PERIOD}.`,
    "",
    `Выручка: ${fmt(curr.revenue)} (${deltaText(curr.revenue, prev.revenue)}, было ${fmt(prev.revenue)})`,
    `Чистая прибыль: ${fmt(curr.netProfit)} (${deltaText(curr.netProfit, prev.netProfit)}, было ${fmt(prev.netProfit)})`,
    `Рентабельность: ${pct(curr.netMargin)} против ${pct(prev.netMargin)} в прошлом периоде`,
    "",
    curr.netMargin > prev.netMargin
      ? "Рентабельность выросла — компания стала эффективнее конвертировать выручку в прибыль."
      : curr.netMargin < prev.netMargin
        ? "Рентабельность просела по сравнению с прошлым периодом — стоит разобраться, выросли издержки или упали цены."
        : "Рентабельность на том же уровне, что и в прошлом периоде.",
  ].join("\n");
}

/* ---------- Бухгалтерский баланс ---------- */
interface BalanceMetrics {
  nonCurrentAssets: number; inventory: number; receivables: number; cash: number;
  currentAssets: number; totalAssets: number; equity: number; equityRatio: number;
  ltLiabilities: number; stLiabilities: number; currentRatio: number;
}

function computeBalance(): BalanceMetrics {
  const nonCurrentAssets = rnd(1_000_000, 8_000_000);
  const inventory = rnd(500_000, 3_000_000);
  const receivables = rnd(500_000, 3_000_000);
  const cash = rnd(300_000, 2_000_000);
  const currentAssets = inventory + receivables + cash;
  const totalAssets = nonCurrentAssets + currentAssets;

  const equityRatio = rnd(25, 70) / 100;
  const equity = Math.round(totalAssets * equityRatio);
  const remaining = totalAssets - equity;
  const ltShare = rnd(20, 60) / 100;
  const ltLiabilities = Math.round(remaining * ltShare);
  const stLiabilities = remaining - ltLiabilities;
  const currentRatio = currentAssets / stLiabilities;

  return { nonCurrentAssets, inventory, receivables, cash, currentAssets, totalAssets, equity, equityRatio, ltLiabilities, stLiabilities, currentRatio };
}

function balanceNotes(m: BalanceMetrics): string[] {
  const notes: string[] = [];
  if (m.currentRatio < 1) {
    notes.push(
      `Коэффициент текущей ликвидности ${m.currentRatio.toFixed(2)} — критически низкий: оборотных активов не хватает, чтобы покрыть краткосрочные обязательства. Риск кассовых разрывов высокий.`,
    );
  } else if (m.currentRatio < 1.5) {
    notes.push(`Коэффициент текущей ликвидности ${m.currentRatio.toFixed(2)} — на грани нормы, запас прочности небольшой.`);
  } else if (m.currentRatio < 2.5) {
    notes.push(`Коэффициент текущей ликвидности ${m.currentRatio.toFixed(2)} — здоровый уровень, компания может своевременно закрывать текущие обязательства.`);
  } else {
    notes.push(`Коэффициент текущей ликвидности ${m.currentRatio.toFixed(2)} — избыточная ликвидность, часть свободных средств можно направить в оборот эффективнее.`);
  }
  if (m.equityRatio < 0.3) {
    notes.push(`Доля собственного капитала — всего ${pct(m.equityRatio * 100)} от активов, бизнес сильно зависит от заёмных средств.`);
  } else if (m.equityRatio < 0.5) {
    notes.push(`Доля собственного капитала — ${pct(m.equityRatio * 100)}, долговая нагрузка умеренная.`);
  } else {
    notes.push(`Доля собственного капитала — ${pct(m.equityRatio * 100)}, структура капитала устойчивая.`);
  }
  return notes;
}

function balanceRecs(m: BalanceMetrics): string[] {
  const recs: string[] = [];
  if (m.currentRatio < 1) recs.push("в первую очередь ускорить сбор дебиторской задолженности или договориться об отсрочке по краткосрочным обязательствам");
  if (m.equityRatio < 0.3) recs.push("не наращивать новые кредиты, пока доля собственного капитала не вырастет хотя бы до 30–35%");
  if (m.currentRatio >= 2.5) recs.push("рассмотреть размещение свободных средств — например, депозит или досрочное погашение более дорогих обязательств");
  if (recs.length === 0) recs.push("поддерживать текущее соотношение активов и обязательств — оно устойчиво");
  return recs;
}

function balanceCrossSell(m: BalanceMetrics): CrossSell | undefined {
  if (m.currentRatio < 1) return crossSell("sm2");
  if (m.equityRatio < 0.3) return crossSell("sm4");
  return undefined;
}

function composeBalanceText(m: BalanceMetrics, period: string): string {
  return [
    `Разобрал бухгалтерский баланс на конец периода (${period}).`,
    "",
    `Итого активы: ${fmt(m.totalAssets)} — внеоборотные ${fmt(m.nonCurrentAssets)}, оборотные ${fmt(m.currentAssets)} (запасы ${fmt(m.inventory)}, дебиторская задолженность ${fmt(m.receivables)}, денежные средства ${fmt(m.cash)})`,
    `Собственный капитал: ${fmt(m.equity)} (${pct(m.equityRatio * 100)} от активов)`,
    `Обязательства: ${fmt(m.ltLiabilities)} долгосрочных, ${fmt(m.stLiabilities)} краткосрочных`,
    "",
    balanceNotes(m).join(" "),
    "",
    `Рекомендации: ${balanceRecs(m).join("; ")}.`,
  ].join("\n");
}

function composeBalanceComparison(curr: BalanceMetrics, prev: BalanceMetrics): string {
  return [
    `Сравнил баланс на конец ${CURRENT_PERIOD} с ${PREVIOUS_PERIOD}.`,
    "",
    `Итого активы: ${fmt(curr.totalAssets)} (${deltaText(curr.totalAssets, prev.totalAssets)}, было ${fmt(prev.totalAssets)})`,
    `Коэффициент текущей ликвидности: ${curr.currentRatio.toFixed(2)} против ${prev.currentRatio.toFixed(2)} в прошлом периоде`,
    `Доля собственного капитала: ${pct(curr.equityRatio * 100)} против ${pct(prev.equityRatio * 100)} в прошлом периоде`,
    "",
    curr.currentRatio > prev.currentRatio
      ? "Ликвидность улучшилась по сравнению с прошлым периодом."
      : curr.currentRatio < prev.currentRatio
        ? "Ликвидность просела по сравнению с прошлым периодом — стоит проверить, за счёт чего выросли краткосрочные обязательства."
        : "Ликвидность на том же уровне, что и в прошлом периоде.",
  ].join("\n");
}

/* ---------- Отчёт о движении денежных средств ---------- */
interface CashflowMetrics {
  openingCash: number; operatingCF: number; investingCF: number; financingCF: number;
  netChange: number; closingCash: number;
}

function computeCashflow(): CashflowMetrics {
  const openingCash = rnd(500_000, 3_000_000);
  const operatingCF = rnd(-1_500_000, 4_000_000);
  const investingCF = rnd(-2_000_000, 200_000);
  const financingCF = rnd(-1_000_000, 1_500_000);
  const netChange = operatingCF + investingCF + financingCF;
  const closingCash = openingCash + netChange;
  return { openingCash, operatingCF, investingCF, financingCF, netChange, closingCash };
}

function cashflowNotes(m: CashflowMetrics): string[] {
  const notes: string[] = [];
  if (m.operatingCF < 0) {
    notes.push(
      "Денежный поток от операционной деятельности отрицательный — основной бизнес не генерирует деньги, а расходует их. Это требует внимания в первую очередь.",
    );
  } else if (m.netChange < 0) {
    notes.push(
      "Операционная деятельность приносит деньги, но из-за инвестиционных и финансовых операций общий денежный поток за период отрицательный — стоит проверить, разовая это ситуация или тенденция.",
    );
  } else {
    notes.push("Денежный поток от операционной деятельности положительный, и остаток денежных средств за период вырос.");
  }
  if (m.closingCash < m.openingCash * 0.3) {
    notes.push(`Остаток на конец периода (${fmt(m.closingCash)}) заметно ниже остатка на начало — при такой динамике риск кассового разрыва в следующем периоде повышенный.`);
  }
  if (m.investingCF < -1_000_000) {
    notes.push(`Отток на инвестиции — ${fmt(Math.abs(m.investingCF))}, это заметные вложения в развитие за период.`);
  }
  return notes;
}

function cashflowRecs(m: CashflowMetrics): string[] {
  const recs: string[] = [];
  if (m.operatingCF < 0) recs.push("разобрать, что именно вымывает деньги из операционной деятельности — сроки оплаты клиентов, запасы или разовые расходы");
  if (m.closingCash < m.openingCash * 0.3) recs.push("сформировать резерв на 1–2 месяца операционных расходов, прежде чем планировать новые крупные траты");
  if (m.financingCF < -300_000) recs.push("учесть график погашения обязательств при планировании следующего периода");
  if (recs.length === 0) recs.push("поддерживать текущий темп — денежный поток стабилен");
  return recs;
}

function cashflowCrossSell(m: CashflowMetrics): CrossSell | undefined {
  if (m.operatingCF < 0) return crossSell("sm2");
  if (m.closingCash < m.openingCash * 0.3) return crossSell("sm5");
  return undefined;
}

function composeCashflowText(m: CashflowMetrics, period: string): string {
  return [
    `Разобрал отчёт о движении денежных средств за ${period}.`,
    "",
    `Остаток на начало периода: ${fmt(m.openingCash)}`,
    `Операционная деятельность: ${signed(m.operatingCF)}`,
    `Инвестиционная деятельность: ${signed(m.investingCF)}`,
    `Финансовая деятельность: ${signed(m.financingCF)}`,
    `Остаток на конец периода: ${fmt(m.closingCash)}`,
    "",
    cashflowNotes(m).join(" "),
    "",
    `Рекомендации: ${cashflowRecs(m).join("; ")}.`,
  ].join("\n");
}

function composeCashflowComparison(curr: CashflowMetrics, prev: CashflowMetrics): string {
  return [
    `Сравнил денежный поток за ${CURRENT_PERIOD} с ${PREVIOUS_PERIOD}.`,
    "",
    `Операционный поток: ${signed(curr.operatingCF)} против ${signed(prev.operatingCF)} в прошлом периоде`,
    `Остаток на конец периода: ${fmt(curr.closingCash)} (${deltaText(curr.closingCash, prev.closingCash)}, было ${fmt(prev.closingCash)})`,
    "",
    curr.operatingCF > prev.operatingCF
      ? "Операционный поток стал сильнее по сравнению с прошлым периодом."
      : curr.operatingCF < prev.operatingCF
        ? "Операционный поток ослаб по сравнению с прошлым периодом — стоит проверить динамику продаж и сроки оплаты."
        : "Операционный поток на том же уровне, что и в прошлом периоде.",
  ].join("\n");
}

/* ---------- Публичное API ---------- */
export interface ReportResult { text: string; crossSell?: CrossSell }

export function generateReportAnalysis(kind: ReportKind): ReportResult {
  if (kind === "pnl") {
    const m = computePnL();
    return { text: composePnLText(m, CURRENT_PERIOD), crossSell: pnlCrossSell(m) };
  }
  if (kind === "balance") {
    const m = computeBalance();
    return { text: composeBalanceText(m, CURRENT_PERIOD), crossSell: balanceCrossSell(m) };
  }
  const m = computeCashflow();
  return { text: composeCashflowText(m, CURRENT_PERIOD), crossSell: cashflowCrossSell(m) };
}

export function generateReportComparison(kind: ReportKind): ReportResult {
  if (kind === "pnl") {
    const curr = computePnL();
    const prev = computePnL();
    return { text: composePnLComparison(curr, prev), crossSell: pnlCrossSell(curr) };
  }
  if (kind === "balance") {
    const curr = computeBalance();
    const prev = computeBalance();
    return { text: composeBalanceComparison(curr, prev), crossSell: balanceCrossSell(curr) };
  }
  const curr = computeCashflow();
  const prev = computeCashflow();
  return { text: composeCashflowComparison(curr, prev), crossSell: cashflowCrossSell(curr) };
}
