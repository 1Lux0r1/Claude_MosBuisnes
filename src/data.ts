import type { IconName } from "./icons";

/* ---------- Типы ---------- */
export type EventKind = "critical" | "deadline" | "info";

export interface DayEvent {
  time: string;
  title: string;
  kind: EventKind;
  place?: string;
}

export interface CustomEvent extends DayEvent {
  id: string;
  custom: true;
}

export interface QuickAction {
  id: string;
  title: string;
  desc: string;
  icon: string;
  tint: string;
  badge?: number;
  steps: string[];
}

export interface ServiceSection {
  id: string;
  title: string;
  desc: string;
  icon: string;
  tint: string;
  category: string;
}

export interface Partner {
  id: string;
  name: string;
  desc: string;
  /** Короткая метка на карточке — что именно за предложение */
  badge: string;
  /** Конкретная выгода в цифрах — почему это стоит внимания */
  benefit: string;
  /** Чем условие уникально именно для резидентов МосБизнес */
  unique: string;
  /** Развёрнутые условия предложения */
  details: string[];
  city?: boolean;
  logo: string;
  logoBg: string;
  logoFg: string;
  /** Фон карточки: градиент + крупная декоративная иконка вместо фото */
  artFrom: string;
  artTo: string;
  artIcon: IconName;
}

export interface NewsItem {
  id: string;
  category: "mandatory" | "personal" | "edu";
  important?: boolean;
  title: string;
  desc: string;
  date: string;
  text: string;
  /** Тематическая «обложка» карточки — градиент + крупная иконка вместо фото */
  artFrom: string;
  artTo: string;
  artIcon: IconName;
}

/* ---------- Даты ---------- */
export const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
export const MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
export const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
export const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const sameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/* ---------- События (смещения от «сегодня») ---------- */
const EVENTS: { off: number; ev: DayEvent }[] = [
  { off: -4, ev: { time: "11:00", title: "Приём заявок: грант «Технологии»", kind: "deadline", place: "invest.mos.ru" } },
  { off: -1, ev: { time: "10:00", title: "Вебинар: маркировка товаров", kind: "info", place: "онлайн" } },
  { off: 0, ev: { time: "10:00", title: "Форум «Мой бизнес»: открытие", kind: "info", place: "ЦВЗ «Манеж»" } },
  { off: 0, ev: { time: "18:00", title: "Звонок с куратором субсидии", kind: "info" } },
  { off: 1, ev: { time: "23:59", title: "Оплата патента — истекает срок", kind: "critical", place: "ФНС" } },
  { off: 2, ev: { time: "17:00", title: "Отчёт по субсидии (форма 3)", kind: "deadline", place: "личный кабинет" } },
  { off: 4, ev: { time: "19:00", title: "Нетворкинг резидентов МосБизнес", kind: "info", place: "Технопарк «Сколково»" } },
  { off: 5, ev: { time: "12:00", title: "НДС: подача декларации", kind: "deadline", place: "ФНС" } },
  { off: 6, ev: { time: "15:00", title: "Экскурсия по технопарку", kind: "info", place: "Технопарк" } },
  { off: 9, ev: { time: "10:00", title: "Торги: аренда помещений", kind: "info", place: "Инвестпортал" } },
  { off: 12, ev: { time: "23:59", title: "Страховые взносы ИП", kind: "critical", place: "ФНС" } },
  { off: 15, ev: { time: "11:00", title: "Демо-день акселератора", kind: "info" } },
];

export const eventsForDate = (d: Date): DayEvent[] =>
  EVENTS.filter((x) => sameDay(addDays(startOfToday(), x.off), d)).map((x) => x.ev);

export const eventsForMonth = (y: number, m: number): Map<string, DayEvent[]> => {
  const map = new Map<string, DayEvent[]>();
  EVENTS.forEach(({ off, ev }) => {
    const d = addDays(startOfToday(), off);
    if (d.getFullYear() === y && d.getMonth() === m) {
      const k = dayKey(d);
      map.set(k, [...(map.get(k) ?? []), ev]);
    }
  });
  return map;
};

/* ---------- Быстрые действия ---------- */
export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "subsidy", title: "Запросить субсидию", desc: "Подбор и заявка", icon: "coins", tint: "#e6efff", badge: 2,
    steps: ["Проверьте соответствие критериям", "Соберите пакет документов", "Подайте заявку онлайн", "Получите решение за 10 дней"],
  },
  {
    id: "certificate", title: "Получить справку", desc: "Выписка за 1 день", icon: "scroll", tint: "#e3f6ec",
    steps: ["Выберите тип справки", "Подтвердите данные компании", "Оплатите пошлину", "Скачайте PDF с ЭП"],
  },
  {
    id: "fee", title: "Оплатить госпошлину", desc: "Без визита в ФНС", icon: "receipt", tint: "#fff3d4", badge: 1,
    steps: ["Выберите услугу", "Проверьте реквизиты", "Оплатите картой или СБП", "Квитанция придёт на почту"],
  },
  {
    id: "premises", title: "Найти помещение", desc: "1 240 объектов", icon: "building", tint: "#ece9ff",
    steps: ["Задайте район и площадь", "Сравните ставки", "Запишитесь на просмотр", "Заключите договор онлайн"],
  },
  {
    id: "education", title: "Бизнес-обучение", desc: "38 курсов", icon: "cap", tint: "#fdeef4",
    steps: ["Выберите программу", "Запишитесь на поток", "Учитесь онлайн", "Получите сертификат"],
  },
  {
    id: "counterparty", title: "Проверка контрагентов", desc: "Риски за 30 сек", icon: "search", tint: "#e6f7f7", badge: 5,
    steps: ["Введите ИНН компании", "Получите скоринг-отчёт", "Проверьте суды и долги", "Добавьте в мониторинг"],
  },
  {
    id: "account", title: "Открыть расчётный счёт", desc: "Онлайн, без визита в банк", icon: "link", tint: "#e8f0ff",
    steps: ["Выберите банк-партнёра", "Заполните анкету компании", "Курьер привезёт документы на подпись", "Счёт откроется за 1 день"],
  },
  {
    id: "trademark", title: "Товарный знак", desc: "Регистрация и защита бренда", icon: "shield", tint: "#e1f7f0",
    steps: ["Проверьте знак на уникальность", "Подайте заявку в Роспатент", "Оплатите пошлину", "Экспертиза займёт до 12 месяцев"],
  },
  {
    id: "tender", title: "Участие в тендере", desc: "Госзакупки и конкурсы", icon: "chart", tint: "#fdf1df", badge: 3,
    steps: ["Выберите подходящий тендер", "Подготовьте заявку и обеспечение", "Подайте заявку на площадке", "Следите за результатами в кабинете"],
  },
  {
    id: "stamp", title: "Заказать печать", desc: "Изготовление за 1 день", icon: "doc", tint: "#f0eafd",
    steps: ["Загрузите реквизиты организации", "Выберите макет печати", "Оплатите заказ", "Заберите готовую печать за 1 день"],
  },
  {
    id: "hiring", title: "Найти сотрудников", desc: "Публикация вакансий", icon: "users", tint: "#e6f4fb", badge: 12,
    steps: ["Опишите вакансию", "Опубликуйте на городских площадках", "Получайте отклики в кабинете", "Пригласите кандидатов на собеседование"],
  },
  {
    id: "export", title: "Поддержка экспорта", desc: "Гранты на выход за рубеж", icon: "send", tint: "#fbe9ee",
    steps: ["Проверьте условия для вашей отрасли", "Соберите пакет документов", "Подайте заявку на грант", "Получите решение за 15 дней"],
  },
];

/* Действия, включённые на панели «Быстрые действия» по умолчанию — до первой настройки пользователем */
export const DEFAULT_QUICK_ACTION_IDS: string[] = [
  "subsidy", "certificate", "fee", "premises", "education", "counterparty",
];

/* ---------- Разделы услуг ---------- */
export const SERVICE_SECTIONS: ServiceSection[] = [
  { id: "services", title: "Услуги и разрешения", desc: "Лицензии, согласования, разрешения", icon: "clipboard", tint: "#e6efff", category: "Разрешения" },
  { id: "support", title: "Меры поддержки", desc: "Субсидии, гранты, льготы", icon: "coins", tint: "#e3f6ec", category: "Поддержка" },
  { id: "realty", title: "Недвижимость", desc: "Аренда, выкуп, торги", icon: "building", tint: "#ece9ff", category: "Недвижимость" },
  { id: "analytics", title: "Аналитика", desc: "Статистика, отчеты, данные", icon: "chart", tint: "#fff3d4", category: "Аналитика" },
];

export const SERVICE_CATALOG: { id: string; title: string; desc: string; category: string; term: string; icon: string }[] = [
  { id: "s1", title: "Лицензия на торговлю", desc: "Розничная и дистанционная", category: "Разрешения", term: "15 дней", icon: "clipboard" },
  { id: "s2", title: "Согласование перепланировки", desc: "Нежилые помещения", category: "Разрешения", term: "20 дней", icon: "doc" },
  { id: "s3", title: "Субсидия на оборудование", desc: "До 10 млн ₽ компенсации", category: "Поддержка", term: "10 дней", icon: "coins" },
  { id: "s4", title: "Грант молодым предпринимателям", desc: "До 500 тыс. ₽", category: "Поддержка", term: "30 дней", icon: "spark" },
  { id: "s5", title: "Аренда у города", desc: "Ставка от 1 000 ₽/м² в год", category: "Недвижимость", term: "торги", icon: "building" },
  { id: "s6", title: "Выкуп арендуемого имущества", desc: "Преимущественное право МСП", category: "Недвижимость", term: "45 дней", icon: "pin" },
  { id: "s7", title: "Отчёт по форме МСП", desc: "Автоматическая выгрузка", category: "Аналитика", term: "мгновенно", icon: "chart" },
  { id: "s8", title: "Данные по отраслям", desc: "API и витрины данных", category: "Аналитика", term: "мгновенно", icon: "chart" },
];

/* ---------- Партнёры ---------- */
export const PARTNER_PAGES: { label: string; items: Partner[] }[] = [
  {
    label: "Городские площадки",
    items: [
      {
        id: "pp", name: "Портал поставщиков", city: true, logo: "ПП", logoBg: "#0e1220", logoFg: "#ffffff",
        artFrom: "#232a45", artTo: "#0c0f1c", artIcon: "clipboard",
        desc: "Закупки малого объёма для нужд города — от канцелярии до оборудования.",
        badge: "Комиссия 0%",
        benefit: "Доступ к закупкам на 12 млрд ₽ в год без тендерных процедур",
        unique: "Москва не берёт комиссию с поставщиков МСП — в отличие от коммерческих торговых площадок",
        details: [
          "Закупки от 100 тыс. до 5 млн ₽ без электронного аукциона",
          "Оплата по контракту — от 7 рабочих дней",
          "Рейтинг 4+ даёт приоритетный показ предложений",
          "Регистрация и участие — бесплатно",
        ],
      },
      {
        id: "ip", name: "Инвестпортал Москвы", city: true, logo: "ИП", logoBg: "#0a6bff", logoFg: "#ffffff",
        artFrom: "#2f8cff", artTo: "#0a52c9", artIcon: "trend-up",
        desc: "Льготная аренда городских помещений, торги и инвестиционные площадки.",
        badge: "Ставка от 1 000 ₽/м²",
        benefit: "Ставка аренды в 2-3 раза ниже рыночной для приоритетных видов деятельности",
        unique: "Льготная ставка закреплена постановлением города — не зависит от переговоров с арендодателем",
        details: [
          "Ставка от 1 000 ₽/м² в год — против 3 500 ₽/м² на открытом рынке",
          "1 240 объектов в каталоге, обновление ежедневно",
          "Электронные торги без посредников",
          "Приоритет для социального предпринимательства и производства",
        ],
      },
      {
        id: "mgf", name: "МосГарантФонд", city: true, logo: "МГ", logoBg: "#0f8f63", logoFg: "#ffffff",
        artFrom: "#1ec98a", artTo: "#0f8f63", artIcon: "shield",
        desc: "Поручительства по кредитам и займам для малого и среднего бизнеса Москвы.",
        badge: "Поручительство до 100 млн ₽",
        benefit: "Получите кредит, даже если банку не хватает залога — фонд поручится за недостающую часть",
        unique: "Государственное поручительство бесплатно для большинства программ — коммерческие поручители берут 2-5% годовых",
        details: [
          "Поручительство до 100 млн ₽ на одного заёмщика",
          "Покрывает до 50-70% суммы кредита",
          "Работает с 30+ банками-партнёрами",
          "Решение по заявке — за 5 рабочих дней",
        ],
      },
    ],
  },
  {
    label: "Коммерческие партнёры",
    items: [
      {
        id: "sber", name: "СберБизнес", logo: "СБ", logoBg: "#e3f6ec", logoFg: "#148a4c",
        artFrom: "#3fc172", artTo: "#1a8f4a", artIcon: "coins",
        desc: "Расчётно-кассовое обслуживание, кредиты и эквайринг для МСП.",
        badge: "Скидка 30% на РКО",
        benefit: "Экономия до 45 000 ₽ в год на обслуживании счёта и эквайринге",
        unique: "Скидка действует бессрочно для резидентов МосБизнес, а не только первые месяцы, как в стандартных тарифах",
        details: [
          "Скидка 30% на РКО — бессрочно, не только в первый год",
          "Эквайринг от 1,3% вместо стандартных 1,9%",
          "Кредит на пополнение оборотных средств — решение за 1 день",
          "Бесплатная бухгалтерия для ИП на первый год",
        ],
      },
      {
        id: "y360", name: "Яндекс 360", logo: "Я", logoBg: "#fff3d4", logoFg: "#b97a00",
        artFrom: "#ffd54f", artTo: "#e0a020", artIcon: "mail",
        desc: "Почта, диск, документы и видеозвонки для команды на одном домене.",
        badge: "2 месяца бесплатно",
        benefit: "Экономия от 15 000 ₽ в год на подписке для команды до 10 человек",
        unique: "2 бесплатных месяца — вдвое больше стандартного триала для новых организаций",
        details: [
          "До 10 сотрудников на тарифе «Старт» бесплатно 2 месяца",
          "1 ТБ на сотрудника для документов и файлов",
          "Почта на собственном домене компании",
          "Видеозвонки без ограничения по времени",
        ],
      },
      {
        id: "tbank", name: "Т-Банк Бизнес", logo: "Т", logoBg: "#fff3d4", logoFg: "#8a6100",
        artFrom: "#ffa94d", artTo: "#e8830a", artIcon: "building",
        desc: "Расчётный счёт, эквайринг и корпоративные карты без визита в офис.",
        badge: "0 ₽ первые 3 месяца",
        benefit: "Счёт открывается за 10 минут онлайн — без визита и бумажных документов",
        unique: "Обслуживание бесплатно первые 3 месяца независимо от оборота — у большинства банков есть лимит по обороту",
        details: [
          "Открытие счёта онлайн — от 10 минут",
          "0 ₽ обслуживание первые 3 месяца",
          "Кэшбэк до 4% на бизнес-расходы",
          "Бесплатные переводы физлицам с расчётного счёта",
        ],
      },
      {
        id: "hh", name: "hh.ru для бизнеса", logo: "hh", logoBg: "#fdeceb", logoFg: "#d6231c",
        artFrom: "#ff6b5b", artTo: "#e6432f", artIcon: "users",
        desc: "Публикация вакансий и доступ к базе резюме для найма сотрудников.",
        badge: "Скидка 20%",
        benefit: "В 3 раза быстрее закрываете вакансии за счёт базы из 60 млн резюме",
        unique: "Резидентам МосБизнес — минус 20% к прайсу hh.ru, скидка не публикуется в открытом доступе",
        details: [
          "Скидка 20% на размещение вакансий",
          "Доступ к базе резюме без ограничения по количеству просмотров",
          "Автоматический подбор кандидатов по вакансии",
          "Продвижение вакансии в топ выдачи — 3 дня бесплатно",
        ],
      },
      {
        id: "alfa", name: "АльфаСтрахование", logo: "АС", logoBg: "#fdeceb", logoFg: "#c81e4a",
        artFrom: "#ff4d6a", artTo: "#c81e4a", artIcon: "lock",
        desc: "Страхование имущества, ответственности и сотрудников малого бизнеса.",
        badge: "Первый год бесплатно",
        benefit: "Полис для небольшого офиса или магазина — от 990 ₽/мес вместо стандартных 2 500 ₽",
        unique: "Тариф для резидентов МосБизнес снижен на 60% — базовая программа включена в резидентство бесплатно на первый год",
        details: [
          "Страхование имущества и ответственности перед третьими лицами",
          "Первый год базовой программы — бесплатно",
          "Оформление полиса онлайн за 15 минут",
          "Выплата по страховому случаю — от 5 рабочих дней",
        ],
      },
    ],
  },
];

/* ---------- Банки и счета (общие данные для «Финансов» и обмена валюты) ---------- */
export interface BankAccount { id: string; name: string; mask: string; balance: number }
export interface BankFxBalance { code: string; amount: number }
export interface BankInfo {
  id: string; name: string; logo: string; logoBg: string; logoFg: string;
  accounts: BankAccount[];
  fx?: BankFxBalance[];
}

export const BANKS: BankInfo[] = [
  {
    id: "sber", name: "СберБизнес", logo: "С", logoBg: "#e3f6ec", logoFg: "#148a4c",
    accounts: [
      { id: "sb1", name: "Расчётный счёт", mask: "•• 4821", balance: 2_480_000 },
      { id: "sb2", name: "Резервный счёт", mask: "•• 9307", balance: 640_000 },
      { id: "sb3", name: "Депозит «Стабильный»", mask: "•• 1155", balance: 1_200_000 },
    ],
  },
  {
    id: "tbank", name: "Т-Банк Бизнес", logo: "Т", logoBg: "#fff3d4", logoFg: "#8a6100",
    accounts: [
      { id: "tb1", name: "Расчётный счёт", mask: "•• 7742", balance: 1_860_000 },
      { id: "tb2", name: "Накопительный счёт", mask: "•• 3018", balance: 950_000 },
    ],
    fx: [{ code: "CNY", amount: 58_400 }],
  },
  {
    id: "alfa", name: "Альфа-Бизнес", logo: "А", logoBg: "#fdeceb", logoFg: "#e11d3a",
    accounts: [
      { id: "af1", name: "Расчётный счёт", mask: "•• 5210", balance: 3_120_000 },
      { id: "af2", name: "Валютный (USD, экв.)", mask: "•• 8864", balance: 410_000 },
    ],
    fx: [{ code: "USD", amount: 4_820 }],
  },
  {
    id: "vtb", name: "ВТБ Бизнес", logo: "В", logoBg: "#e6efff", logoFg: "#0a6bff",
    accounts: [
      { id: "vt1", name: "Расчётный счёт", mask: "•• 6033", balance: 2_050_000 },
      { id: "vt2", name: "Овернайт", mask: "•• 2276", balance: 720_000 },
    ],
    fx: [{ code: "EUR", amount: 1_300 }],
  },
  {
    id: "tochka", name: "Точка Банк", logo: "•", logoBg: "#0e1220", logoFg: "#ffffff",
    accounts: [
      { id: "tc1", name: "Расчётный счёт", mask: "•• 1908", balance: 1_540_000 },
      { id: "tc2", name: "Сейв-счёт", mask: "•• 4471", balance: 830_000 },
    ],
  },
];

export const BANKS_STORAGE_KEY = "cevba-banks-v2";

/** Банки, которые пользователь подключил в «Финансах» — читаем тот же localStorage,
 *  которым управляет ProfileService, чтобы показать валютные остатки при обмене. */
export function loadConnectedBankIds(): string[] {
  try {
    const raw = localStorage.getItem(BANKS_STORAGE_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(ids) && ids.every((x) => typeof x === "string")) return ids;
  } catch {
    /* повреждённые данные — считаем, что банки не подключены */
  }
  return [];
}

/* ---------- Валюты ---------- */
export interface CurrencyOffer { bankId: string; buy: number; sell: number }

export interface CurrencyItem {
  code: string;
  country: string;
  rate: string;
  chg: string;
  up: boolean;
  flag: "us" | "eu" | "cn";
  spark: number[];
  offers: CurrencyOffer[];
}

export const CURRENCIES: CurrencyItem[] = [
  {
    code: "USD", country: "Доллар США", rate: "92,45", chg: "+0,35%", up: true, flag: "us",
    spark: [88, 88.3, 89, 88.7, 88.4, 89.1, 90, 89.6, 91.2, 90.8, 90.6, 91.3, 91.8, 91.5, 92.1, 92.45],
    offers: [
      { bankId: "sber", buy: 91.80, sell: 93.10 },
      { bankId: "tbank", buy: 92.00, sell: 92.95 },
      { bankId: "alfa", buy: 91.70, sell: 93.25 },
      { bankId: "vtb", buy: 91.90, sell: 93.00 },
      { bankId: "tochka", buy: 91.60, sell: 93.40 },
    ],
  },
  {
    code: "EUR", country: "Евро", rate: "99,87", chg: "−0,41%", up: false, flag: "eu",
    spark: [102, 101.7, 101.4, 101.8, 101.9, 101.5, 101.1, 100.8, 100.6, 100.9, 100.7, 100.2, 100.4, 99.9, 100.1, 99.87],
    offers: [
      { bankId: "sber", buy: 99.10, sell: 100.60 },
      { bankId: "tbank", buy: 99.30, sell: 100.40 },
      { bankId: "alfa", buy: 99.00, sell: 100.75 },
      { bankId: "vtb", buy: 99.20, sell: 100.50 },
      { bankId: "tochka", buy: 98.90, sell: 100.90 },
    ],
  },
  {
    code: "CNY", country: "Китайский юань", rate: "12,74", chg: "+0,39%", up: true, flag: "cn",
    spark: [12.2, 12.25, 12.3, 12.22, 12.28, 12.35, 12.4, 12.38, 12.5, 12.46, 12.45, 12.52, 12.6, 12.58, 12.66, 12.74],
    offers: [
      { bankId: "sber", buy: 12.62, sell: 12.86 },
      { bankId: "tbank", buy: 12.66, sell: 12.82 },
      { bankId: "alfa", buy: 12.60, sell: 12.90 },
      { bankId: "vtb", buy: 12.64, sell: 12.85 },
      { bankId: "tochka", buy: 12.58, sell: 12.93 },
    ],
  },
];

/* ---------- Новости ---------- */
export const NEWS: NewsItem[] = [
  {
    id: "n1", category: "mandatory", important: true, date: "Сегодня, 09:12",
    title: "Отчёт по субсидии — срок до пятницы",
    desc: "Форма 3 подаётся через личный кабинет. Просрочка ведёт к возврату средств.",
    text: "Напоминаем получателям субсидий: отчёт о целевом использовании средств (форма 3) необходимо подать до конца недели через личный кабинет МосБизнес. К отчёту приложите платёжные поручения и договоры. При возникновении вопросов напишите ИИ-агенту — он подскажет порядок заполнения.",
    artFrom: "#ff8a65", artTo: "#d6301c", artIcon: "clock",
  },
  {
    id: "n2", category: "personal", date: "Сегодня, 08:30",
    title: "Вам доступны 2 новые субсидии",
    desc: "По данным профиля: компенсация оборудования и грант на экспорт.",
    text: "На основе профиля вашей компании система подобрала две меры поддержки: компенсацию затрат на оборудование (до 10 млн ₽) и грант на развитие экспорта. Заявки принимаются до конца месяца, решение — за 10 рабочих дней.",
    artFrom: "#4f9dff", artTo: "#0a52c9", artIcon: "coins",
  },
  {
    id: "n3", category: "edu", date: "Вчера, 17:05",
    title: "Новый курс: работа с маркетплейсами",
    desc: "Бесплатно, 6 уроков, сертификат МосБизнес. Старт потока — в понедельник.",
    text: "Совместно с маркетплейсами запускаем практический курс: регистрация магазина, логистика, продвижение и аналитика продаж. 6 уроков по 40 минут, обучение бесплатное, сертификат выдаётся автоматически.",
    artFrom: "#34d399", artTo: "#0f8f63", artIcon: "trend-up",
  },
  {
    id: "n4", category: "mandatory", date: "Вчера, 12:40",
    title: "Портал поставщиков: обновлён каталог",
    desc: "Добавлено 1 800 закупок малого объёма для городских нужд.",
    text: "Каталог закупок малого объёма пополнен: оборудование, услуги, канцелярия. Средний чек закупки — 285 тыс. ₽. Поставщикам с рейтингом 4+ доступен приоритетный показ предложений.",
    artFrom: "#232a45", artTo: "#0c0f1c", artIcon: "grid",
  },
  {
    id: "n5", category: "edu", date: "2 дня назад",
    title: "Итоги форума «Мой бизнес»: 12 000 участников",
    desc: "Записи всех сессий уже в разделе «Бизнес-обучение».",
    text: "Форум посетили 12 000 предпринимателей, состоялось 80 сессий. Главные темы года — автоматизация, экспорт и меры поддержки. Записи доступны бесплатно в разделе «Бизнес-обучение».",
    artFrom: "#c084fc", artTo: "#7c3aed", artIcon: "users",
  },
];

/* ---------- ИИ-агент ---------- */
export const AI_CHIPS = ["Какие субсидии мне доступны?", "Срок оплаты патента", "Как получить справку?", "Подобрать помещение"];

export function aiReply(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("субсид") || t.includes("грант"))
    return "Вам доступны 2 меры: компенсация затрат на оборудование (до 10 млн ₽) и грант на экспорт. Заявка подаётся в разделе «Меры поддержки», решение — за 10 рабочих дней. Хотите, подготовлю черновик?";
  if (t.includes("патент"))
    return "Оплата патента — до завтра, 23:59 (красная отметка в календаре). Оплатить можно без визита в ФНС через плитку «Оплатить госпошлину». Квитанция придёт на почту.";
  if (t.includes("справк"))
    return "Справка о деятельности формируется за 1 день: выберите тип в «Быстрых действиях», подтвердите данные компании и скачайте PDF с электронной подписью. Пошлина — 0 ₽.";
  if (t.includes("помещ") || t.includes("аренд"))
    return "Сейчас на Инвестпортале 1 240 объектов. Средневзвешенная ставка — 1 000 ₽/м² в год для МСП. Откройте плитку «Найти помещение» — я применю фильтры вашего профиля.";
  if (t.includes("привет") || t.includes("здрав"))
    return "Здравствуйте! Могу подсказать по субсидиям, срокам, справкам и помещениям. С чего начнём?";
  return "Понял. Уточню детали и вернусь с ответом. А пока проверьте календарь: на ближайшие дни есть 3 задачи — патент, отчёт по субсидии и декларация НДС.";
}

/* ---------- Поиск ---------- */
export interface SearchHit { id: string; group: string; title: string; sub?: string }

export const SEARCH_INDEX: SearchHit[] = [
  ...QUICK_ACTIONS.map((a) => ({ id: `act-${a.id}`, group: "Действия", title: a.title, sub: a.desc })),
  ...SERVICE_SECTIONS.map((s) => ({ id: `sec-${s.id}`, group: "Услуги", title: s.title, sub: s.desc })),
  ...PARTNER_PAGES.flatMap((p) => p.items.map((x) => ({ id: `par-${x.id}`, group: "Партнёры", title: x.name, sub: x.badge }))),
  ...NEWS.map((n) => ({ id: `news-${n.id}`, group: "Новости", title: n.title, sub: n.date })),
];

export const sortByTime = <T extends DayEvent>(arr: T[]): T[] =>
  [...arr].sort((a, b) => a.time.localeCompare(b.time));
