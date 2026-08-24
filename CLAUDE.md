# Versioning

The app version is `APP_VERSION` in `src/version.ts` (mirrored in `package.json`'s
`version` field), shown in Настройки → О приложении.

Bump it as part of every merge to `main`, based on what the merge contains:
- Hotfix / bug fix only → increment the **patch** number (third).
- Any new feature → increment the **minor** number (second).

Update both `src/version.ts` and `package.json` together so they stay in sync.

# Changelog

Keep `CHANGELOG.md` current. Add an entry under the new version heading as part of every
merge to `main`, grouped the same way as the existing entries (### Добавлено / Изменено /
Исправлено), written for a reader who wasn't in the session — plain description of what
changed, not commit messages.

# Карта проекта

React 18 + TypeScript + Vite + Tailwind v4. Роутинга нет — активный экран задаётся
числом `tab` (0–3) в `src/App.tsx`. Вход: `src/main.tsx` → `App` → `ToastProvider` →
`Shell` (выбирает экран по `tab`). Всё рендерится в «телефонной рамке» `#app-shell`.

## Вкладки (нижнее меню — `src/BottomNav.tsx`)
- **0 Главное меню** — `HomeScreen` в `src/App.tsx`, собран из блоков `src/HomeBlocks.tsx`
  (`HomePromos` — плашки над календарём: тизер витрины + «Продлить активность»; быстрые
  действия; разделы услуг; `PartnersBlock` — раздел «Возможности» с константой
  `POSSIBILITIES_SECTION_TITLE`; `InterestingBlock` — «Возможно интересно»),
  `src/CalendarStrip.tsx` (лента + месяц + производственный календарь), `src/Carousels.tsx`
  (курс валют, новости).
- **1 Услуги** — `ServicesScreen` в `src/screens.tsx` (каталог + форма заявки; категории
  включают «Коммерческие сервисы»).
- **2 События** — `EventsScreen` в `src/screens.tsx`.
- **3 Личный кабинет** — `src/microservices/ProfileService.tsx` (финансы, заявления,
  Радар обязательных требований — `RequirementsRadar.tsx`, персональная витрина —
  `SupportVitrina.tsx`, интеграции, сотрудники; своя внутренняя навигация).

## Поверх вкладок (модалки/шторки)
- ИИ-агент — `src/AIAssistant.tsx` · Настройки — `src/microservices/SettingsService.tsx`
- Экран платежа — `src/PaymentScreen.tsx` (из календаря)
- Шторки действий/партнёров/новостей — `ActionSheetView` в `src/App.tsx`

## Общие компоненты
- `src/ui.tsx` — UI-кит: `Sheet`, `ChartOverlay`, тосты (`ToastProvider`/`useToast`),
  `Reveal`, `Dots`, `Toggle`, `useSnap`, скелетоны, `ErrorState`/`EmptyState`.
- `src/icons.tsx` — `Icon` (по `IconName`) + логотипы `KremlinLogo`, `MobiusIcon`.
- Каркас на всех вкладках: `src/Header.tsx`, `src/BottomNav.tsx`.

## Данные и тексты
- **`src/data.ts`** — исходный контент-слой: типы, `QUICK_ACTIONS`, `SERVICE_SECTIONS`/
  `SERVICE_CATALOG`, `PARTNER_PAGES`, `NEWS`, `CURRENCIES`, `BANKS`, `EVENTS`,
  `SEARCH_INDEX`, ответы ИИ (`aiReply`), утилиты дат и `load*/save*` для localStorage.
- **`src/data/`** — новые data-модули (по одному на фичу):
  `holidays.ts` (производственный календарь 2026, `holidayFor`),
  `requirements.ts` (Радар: массив требований + счётчики + тексты шапки/риска/самообследования),
  `support-measures.ts` (меры поддержки; итог/кол-во для витрины п.7 и тизера п.8 — единый источник),
  `interesting.ts` (блок «Возможно интересно»: заглушки + персональные предложения с `tags`).
- `src/fxHistory.ts` — генерация исторических котировок для графика валют.
- Тексты по большей части захардкожены в `data.ts`; часть — inline в компонентах:
  демо-персона (Анна Петрова, ООО «Вектор Групп») в `Header.tsx`/`ProfileService.tsx`/
  `AIAssistant.tsx`; сотрудники/интеграции/права в `ProfileService.tsx`; поля форм заявок
  в `screens.tsx`; тексты настроек в `SettingsService.tsx`.
- Состояние между сессиями — `localStorage` (общие ключи объявлены в `data.ts`).
