/* ---------------------------------------------------------------------------
   Ответы ИИ-агента, построенные на реальных данных других разделов
   приложения (а не на статичных заглушках): Радар обязательных требований
   и меры поддержки. Текст собирается из тех же массивов, что рендерят
   сами разделы — цифры в чате всегда совпадают с личным кабинетом.
--------------------------------------------------------------------------- */

import { REQUIREMENTS, REQUIREMENTS_HEADER, requirementCounts } from "./requirements";
import { SUPPORT_MEASURES, fmtSupportAmount } from "./support-measures";

export function requirementsReply(): string {
  const c = requirementCounts();
  const violations = REQUIREMENTS.filter((r) => r.status === "violation");
  const noData = REQUIREMENTS.filter((r) => r.status === "no_data");

  const lines = [
    `По Радару обязательных требований (${REQUIREMENTS_HEADER.updated.toLowerCase()}): всего ${c.total}, соблюдается ${c.ok}, не соблюдается ${c.violation}, нет данных по ${c.no_data}.`,
  ];

  if (violations.length) {
    lines.push("", "Не соблюдается:");
    violations.forEach((r) => {
      lines.push(`— ${r.title}${r.source ? ` (${r.source})` : ""}.${r.consequence ? ` Последствие: ${r.consequence}.` : ""}`);
    });
  }
  if (noData.length) {
    lines.push("", "Нет данных — стоит подтвердить самостоятельно:");
    noData.forEach((r) => {
      lines.push(`— ${r.title}${r.source ? ` (${r.source})` : ""}.`);
    });
  }
  if (!violations.length && !noData.length) {
    lines.push("", "Все требования соблюдаются — поводов для беспокойства по Радару сейчас нет.");
  } else {
    lines.push("", "Открыть Радар требований, чтобы разобрать по одному?");
  }
  return lines.join("\n");
}

export function supportMeasuresReply(): string {
  const available = SUPPORT_MEASURES.filter((m) => m.status !== "locked");
  const locked = SUPPORT_MEASURES.filter((m) => m.status === "locked");

  const lines = [`Сейчас вам доступно ${available.length} ${measuresWord(available.length)}:`, ""];
  available.forEach((m) => {
    lines.push(`— ${m.title} — до ${fmtSupportAmount(m.amount)}, ${m.deadline || "без срока"}, ${m.conditionText.toLowerCase()}.`);
  });
  if (locked.length) {
    lines.push("", `Ещё ${locked.length} ${measuresWord(locked.length)} станет доступно при выполнении дополнительных условий.`);
  }
  lines.push("", "Показать все меры в личном кабинете?");
  return lines.join("\n");
}

function measuresWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "мера";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "меры";
  return "мер";
}
