/* ---------------------------------------------------------------------------
   Анализ отчётности в чате ИИ-агента.

   Бэкенда и реального разбора файлов нет — пользователь выбирает тип отчёта
   и способ загрузки (файл / 1С), а этот модуль генерирует правдоподобные
   случайные показатели и на их основе, по пороговым правилам, формирует
   текстовое заключение с рекомендациями. При каждой загрузке — новые цифры
   и, соответственно, новый разбор.
--------------------------------------------------------------------------- */

import type { IconName } from "../icons";

export type ReportKind = "pnl" | "balance" | "cashflow";

export const REPORT_META: Record<ReportKind, { title: string; short: string; icon: IconName }> = {
  pnl: { title: "Отчёт о прибылях и убытках", short: "П и У", icon: "chart" },
  balance: { title: "Бухгалтерский баланс", short: "Баланс", icon: "scroll" },
  cashflow: { title: "Отчёт о движении денежных средств", short: "ДДС", icon: "coins" },
};

const PERIOD = "август 2026";

const rnd = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
const fmt = (v: number) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v)} ₽`;
const pct = (v: number) => `${v.toFixed(1).replace(".", ",")} %`;

/* ---------- Отчёт о прибылях и убытках ---------- */
function generatePnL(): string {
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

  const notes: string[] = [];
  if (netProfit <= 0) {
    notes.push(
      "Период закрыт с убытком — расходы превысили выручку. Это самый тревожный сигнал в отчёте: без изменений компания будет проедать оборотные средства.",
    );
  } else if (netMargin < 5) {
    notes.push(
      `Чистая рентабельность всего ${pct(netMargin)} — прибыль есть, но запас прочности минимальный: любой рост издержек или скидка клиенту может увести период в минус.`,
    );
  } else if (netMargin < 15) {
    notes.push(
      `Чистая рентабельность ${pct(netMargin)} — в пределах нормы для МСП, но есть заметный резерв для роста маржинальности.`,
    );
  } else if (netMargin < 25) {
    notes.push(`Чистая рентабельность ${pct(netMargin)} — хороший результат, выше среднего по малому бизнесу.`);
  } else {
    notes.push(`Чистая рентабельность ${pct(netMargin)} — очень сильный результат для сектора МСП.`);
  }
  if (cogsRatio > 0.65) {
    notes.push(`Себестоимость съедает ${pct(cogsRatio * 100)} выручки — доля высокая, стоит пересмотреть условия с поставщиками или ценообразование.`);
  }
  if (sgaRatio > 0.25) {
    notes.push(`Коммерческие и управленческие расходы — ${pct(sgaRatio * 100)} от выручки, это заметная нагрузка на прибыль.`);
  }

  const recs: string[] = [];
  if (netProfit <= 0) recs.push("сократить постоянные расходы и пересмотреть цены в первую очередь по низкомаржинальным позициям");
  else if (netMargin < 5) recs.push("создать финансовую подушку и не наращивать расходы, пока рентабельность не выйдет за пределы 10%");
  if (cogsRatio > 0.65) recs.push("запросить у 2–3 ключевых поставщиков пересмотр условий или найти альтернативных");
  if (sgaRatio > 0.25) recs.push("проверить структуру управленческих расходов на предмет статей, без которых можно обойтись");
  if (recs.length === 0) recs.push("зафиксировать текущую модель как целевую и следить, чтобы себестоимость не росла быстрее выручки");

  return [
    `Разобрал отчёт о прибылях и убытках за ${PERIOD}.`,
    "",
    `Выручка: ${fmt(revenue)}`,
    `Себестоимость продаж: ${fmt(cogs)} (${pct(cogsRatio * 100)} от выручки)`,
    `Валовая прибыль: ${fmt(grossProfit)}`,
    `Коммерческие и управленческие расходы: ${fmt(sga)}`,
    `Чистая прибыль: ${fmt(netProfit)} · рентабельность ${pct(netMargin)}`,
    "",
    notes.join(" "),
    "",
    `Рекомендации: ${recs.join("; ")}.`,
  ].join("\n");
}

/* ---------- Бухгалтерский баланс ---------- */
function generateBalance(): string {
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

  const notes: string[] = [];
  if (currentRatio < 1) {
    notes.push(
      `Коэффициент текущей ликвидности ${currentRatio.toFixed(2)} — критически низкий: оборотных активов не хватает, чтобы покрыть краткосрочные обязательства. Риск кассовых разрывов высокий.`,
    );
  } else if (currentRatio < 1.5) {
    notes.push(`Коэффициент текущей ликвидности ${currentRatio.toFixed(2)} — на грани нормы, запас прочности небольшой.`);
  } else if (currentRatio < 2.5) {
    notes.push(`Коэффициент текущей ликвидности ${currentRatio.toFixed(2)} — здоровый уровень, компания может своевременно закрывать текущие обязательства.`);
  } else {
    notes.push(`Коэффициент текущей ликвидности ${currentRatio.toFixed(2)} — избыточная ликвидность, часть свободных средств можно направить в оборот эффективнее.`);
  }
  if (equityRatio < 0.3) {
    notes.push(`Доля собственного капитала — всего ${pct(equityRatio * 100)} от активов, бизнес сильно зависит от заёмных средств.`);
  } else if (equityRatio < 0.5) {
    notes.push(`Доля собственного капитала — ${pct(equityRatio * 100)}, долговая нагрузка умеренная.`);
  } else {
    notes.push(`Доля собственного капитала — ${pct(equityRatio * 100)}, структура капитала устойчивая.`);
  }

  const recs: string[] = [];
  if (currentRatio < 1) recs.push("в первую очередь ускорить сбор дебиторской задолженности или договориться об отсрочке по краткосрочным обязательствам");
  if (equityRatio < 0.3) recs.push("не наращивать новые кредиты, пока доля собственного капитала не вырастет хотя бы до 30–35%");
  if (currentRatio >= 2.5) recs.push("рассмотреть размещение свободных средств — например, депозит или досрочное погашение более дорогих обязательств");
  if (recs.length === 0) recs.push("поддерживать текущее соотношение активов и обязательств — оно устойчиво");

  return [
    `Разобрал бухгалтерский баланс на конец периода (${PERIOD}).`,
    "",
    `Итого активы: ${fmt(totalAssets)} — внеоборотные ${fmt(nonCurrentAssets)}, оборотные ${fmt(currentAssets)} (запасы ${fmt(inventory)}, дебиторская задолженность ${fmt(receivables)}, денежные средства ${fmt(cash)})`,
    `Собственный капитал: ${fmt(equity)} (${pct(equityRatio * 100)} от активов)`,
    `Обязательства: ${fmt(ltLiabilities)} долгосрочных, ${fmt(stLiabilities)} краткосрочных`,
    "",
    notes.join(" "),
    "",
    `Рекомендации: ${recs.join("; ")}.`,
  ].join("\n");
}

/* ---------- Отчёт о движении денежных средств ---------- */
function generateCashflow(): string {
  const openingCash = rnd(500_000, 3_000_000);
  const operatingCF = rnd(-1_500_000, 4_000_000);
  const investingCF = rnd(-2_000_000, 200_000);
  const financingCF = rnd(-1_000_000, 1_500_000);
  const netChange = operatingCF + investingCF + financingCF;
  const closingCash = openingCash + netChange;

  const notes: string[] = [];
  if (operatingCF < 0) {
    notes.push(
      "Денежный поток от операционной деятельности отрицательный — основной бизнес не генерирует деньги, а расходует их. Это требует внимания в первую очередь.",
    );
  } else if (netChange < 0) {
    notes.push(
      "Операционная деятельность приносит деньги, но из-за инвестиционных и финансовых операций общий денежный поток за период отрицательный — стоит проверить, разовая это ситуация или тенденция.",
    );
  } else {
    notes.push("Денежный поток от операционной деятельности положительный, и остаток денежных средств за период вырос.");
  }
  if (closingCash < openingCash * 0.3) {
    notes.push(`Остаток на конец периода (${fmt(closingCash)}) заметно ниже остатка на начало — при такой динамике риск кассового разрыва в следующем периоде повышенный.`);
  }
  if (investingCF < -1_000_000) {
    notes.push(`Отток на инвестиции — ${fmt(Math.abs(investingCF))}, это заметные вложения в развитие за период.`);
  }

  const recs: string[] = [];
  if (operatingCF < 0) recs.push("разобрать, что именно вымывает деньги из операционной деятельности — сроки оплаты клиентов, запасы или разовые расходы");
  if (closingCash < openingCash * 0.3) recs.push("сформировать резерв на 1–2 месяца операционных расходов, прежде чем планировать новые крупные траты");
  if (financingCF < -300_000) recs.push("учесть график погашения обязательств при планировании следующего периода");
  if (recs.length === 0) recs.push("поддерживать текущий темп — денежный поток стабилен");

  return [
    `Разобрал отчёт о движении денежных средств за ${PERIOD}.`,
    "",
    `Остаток на начало периода: ${fmt(openingCash)}`,
    `Операционная деятельность: ${operatingCF >= 0 ? "+" : ""}${fmt(operatingCF)}`,
    `Инвестиционная деятельность: ${investingCF >= 0 ? "+" : ""}${fmt(investingCF)}`,
    `Финансовая деятельность: ${financingCF >= 0 ? "+" : ""}${fmt(financingCF)}`,
    `Остаток на конец периода: ${fmt(closingCash)}`,
    "",
    notes.join(" "),
    "",
    `Рекомендации: ${recs.join("; ")}.`,
  ].join("\n");
}

export function generateReportAnalysis(kind: ReportKind): string {
  if (kind === "pnl") return generatePnL();
  if (kind === "balance") return generateBalance();
  return generateCashflow();
}
