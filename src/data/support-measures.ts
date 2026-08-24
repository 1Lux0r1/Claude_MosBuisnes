/* ---------------------------------------------------------------------------
   Меры поддержки для «Персональной витрины» (п.7 ТЗ) и плашки-тизера на
   Главной (п.8). Единый источник — и сумма в шапке, и количество мер
   считаются отсюда, а не хардкодятся в вёрстке.

   Итог витрины «до X ₽» = сумма amount доступных мер (статусы approved и
   needs_info). Меры со статусом locked («Станет доступно») в сумму НЕ входят.
   Количество «по N мерам» = длина массива.

   Три подробные меры (approved / needs_info / locked) взяты из наброска
   vitrina-desktop.png. Ещё три — заглушки, чтобы всего было 6 мер и сумма
   доступных сошлась к 4 700 000 ₽ (120 000 + 3 000 000 + 1 200 000 + 380 000).
   Суммы заглушек — плейсхолдер, подлежат уточнению.
--------------------------------------------------------------------------- */

import type { IconName } from "../icons";

export type SupportStatus = "approved" | "needs_info" | "locked";

export interface SupportMeasure {
  id: string;
  status: SupportStatus;
  title: string;
  /** Предельная сумма меры, ₽ */
  amount: number;
  /** Срок приёма («приём до 30 сентября», «без срока», «» — не указан) */
  deadline: string;
  conditionText: string;
  conditionIcon: IconName;
  /** Текст кнопки действия */
  action: string;
}

export const SUPPORT_MEASURES: SupportMeasure[] = [
  {
    id: "sm1", status: "approved", title: "Субсидия на обучение сотрудников",
    amount: 120_000, deadline: "приём до 30 сентября",
    conditionText: "4 из 4 критериев проверены", conditionIcon: "check", action: "Подать заявку",
  },
  {
    id: "sm2", status: "needs_info", title: "Поручительство по кредиту",
    amount: 3_000_000, deadline: "без срока",
    conditionText: "1 вопрос: сумма кредита", conditionIcon: "info", action: "Ответить и проверить",
  },
  {
    id: "sm3", status: "locked", title: "Грант на оборудование",
    amount: 30_000_000, deadline: "",
    conditionText: "Нужен статус промкомплекса", conditionIcon: "lock", action: "Как получить статус",
  },
  /* Заглушки до 6 мер — суммы подобраны, чтобы доступные дали 4 700 000 ₽ */
  {
    id: "sm4", status: "approved", title: "Компенсация процентной ставки по кредиту",
    amount: 1_200_000, deadline: "приём до 15 октября",
    conditionText: "3 из 3 критериев проверены", conditionIcon: "check", action: "Подать заявку",
  },
  {
    id: "sm5", status: "needs_info", title: "Субсидия на аренду помещения",
    amount: 380_000, deadline: "без срока",
    conditionText: "1 вопрос: площадь помещения", conditionIcon: "info", action: "Ответить и проверить",
  },
  {
    id: "sm6", status: "locked", title: "Льготный заём МСП",
    amount: 5_000_000, deadline: "",
    conditionText: "Нужен статус резидента технопарка", conditionIcon: "lock", action: "Как получить статус",
  },
];

/** Сумма доступных мер (approved + needs_info), ₽ — итог витрины «до X ₽». */
export const supportAvailableTotal = (): number =>
  SUPPORT_MEASURES.filter((m) => m.status !== "locked").reduce((s, m) => s + m.amount, 0);

/** Количество мер поддержки — «по N мерам». */
export const supportMeasuresCount = (): number => SUPPORT_MEASURES.length;

/** Формат суммы: 4700000 → «4 700 000 ₽». */
export const fmtSupportAmount = (v: number): string =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v)} ₽`;
