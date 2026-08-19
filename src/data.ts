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
  offer: string;
  city?: boolean;
  logo: string;
  logoBg: string;
  logoFg: string;
}

export interface NewsItem {
  id: string;
  category: "mandatory" | "personal" | "edu";
  important?: boolean;
  title: string;
  desc: string;
  date: string;
  text: string;
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
  { off: 4, ev: { time: "19:00", title: "Нетворкинг резидентов ЦЭВБ", kind: "info", place: "Технопарк «Сколково»" } },
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
      { id: "pp", name: "Портал поставщиков", desc: "Закупки малого объёма для нужд города", offer: "Комиссия 0%", city: true, logo: "ПП", logoBg: "#0e1220", logoFg: "#ffffff" },
      { id: "ip", name: "Инвестпортал Москвы", desc: "Льготная аренда, торги и инвестпроекты", offer: "Ставка от 1 000 ₽/м²", city: true, logo: "ИП", logoBg: "#0a6bff", logoFg: "#ffffff" },
    ],
  },
  {
    label: "Коммерческие партнёры",
    items: [
      { id: "sber", name: "СберБизнес", desc: "РКО, кредиты и эквайринг для МСП", offer: "Скидка 30% на РКО", logo: "СБ", logoBg: "#e3f6ec", logoFg: "#148a4c" },
      { id: "y360", name: "Яндекс 360", desc: "Почта, диск и офис для команд", offer: "2 месяца бесплатно", logo: "Я", logoBg: "#fff3d4", logoFg: "#b97a00" },
    ],
  },
];

/* ---------- Валюты ---------- */
export const CURRENCIES: { code: string; country: string; rate: string; chg: string; up: boolean; flag: "us" | "eu" | "cn"; spark: number[] }[] = [
  { code: "USD", country: "Доллар США", rate: "92,45", chg: "+0,35%", up: true, flag: "us", spark: [88, 89, 88.4, 90, 91.2, 90.6, 91.8, 92.45] },
  { code: "EUR", country: "Евро", rate: "99,87", chg: "−0,41%", up: false, flag: "eu", spark: [102, 101.4, 101.9, 101.1, 100.6, 100.9, 100.2, 99.87] },
  { code: "CNY", country: "Китайский юань", rate: "12,74", chg: "+0,39%", up: true, flag: "cn", spark: [12.2, 12.3, 12.25, 12.4, 12.5, 12.45, 12.6, 12.74] },
];

/* ---------- Новости ---------- */
export const NEWS: NewsItem[] = [
  {
    id: "n1", category: "mandatory", important: true, date: "Сегодня, 09:12",
    title: "Отчёт по субсидии — срок до пятницы",
    desc: "Форма 3 подаётся через личный кабинет. Просрочка ведёт к возврату средств.",
    text: "Напоминаем получателям субсидий: отчёт о целевом использовании средств (форма 3) необходимо подать до конца недели через личный кабинет ЦЭВБ. К отчёту приложите платёжные поручения и договоры. При возникновении вопросов напишите ИИ-агенту — он подскажет порядок заполнения.",
  },
  {
    id: "n2", category: "personal", date: "Сегодня, 08:30",
    title: "Вам доступны 2 новые субсидии",
    desc: "По данным профиля: компенсация оборудования и грант на экспорт.",
    text: "На основе профиля вашей компании система подобрала две меры поддержки: компенсацию затрат на оборудование (до 10 млн ₽) и грант на развитие экспорта. Заявки принимаются до конца месяца, решение — за 10 рабочих дней.",
  },
  {
    id: "n3", category: "edu", date: "Вчера, 17:05",
    title: "Новый курс: работа с маркетплейсами",
    desc: "Бесплатно, 6 уроков, сертификат ЦЭВБ. Старт потока — в понедельник.",
    text: "Совместно с маркетплейсами запускаем практический курс: регистрация магазина, логистика, продвижение и аналитика продаж. 6 уроков по 40 минут, обучение бесплатное, сертификат выдаётся автоматически.",
  },
  {
    id: "n4", category: "mandatory", date: "Вчера, 12:40",
    title: "Портал поставщиков: обновлён каталог",
    desc: "Добавлено 1 800 закупок малого объёма для городских нужд.",
    text: "Каталог закупок малого объёма пополнен: оборудование, услуги, канцелярия. Средний чек закупки — 285 тыс. ₽. Поставщикам с рейтингом 4+ доступен приоритетный показ предложений.",
  },
  {
    id: "n5", category: "edu", date: "2 дня назад",
    title: "Итоги форума «Мой бизнес»: 12 000 участников",
    desc: "Записи всех сессий уже в разделе «Бизнес-обучение».",
    text: "Форум посетили 12 000 предпринимателей, состоялось 80 сессий. Главные темы года — автоматизация, экспорт и меры поддержки. Записи доступны бесплатно в разделе «Бизнес-обучение».",
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
  ...PARTNER_PAGES.flatMap((p) => p.items.map((x) => ({ id: `par-${x.id}`, group: "Партнёры", title: x.name, sub: x.offer }))),
  ...NEWS.map((n) => ({ id: `news-${n.id}`, group: "Новости", title: n.title, sub: n.date })),
];

export const sortByTime = <T extends DayEvent>(arr: T[]): T[] =>
  [...arr].sort((a, b) => a.time.localeCompare(b.time));
