import { useEffect, useState } from "react";
import { Icon, type IconName } from "../icons";
import { Toggle, useToast } from "../ui";

/* ============================================================
   Микросервис «Настройки» · v1.0
   Автономный модуль: уведомления, безопасность, данные,
   о приложении. Состояние — в localStorage.
   ============================================================ */

const LS_SETTINGS = "cevba-settings-v1";

interface SettingsState {
  push: boolean;
  email: boolean;
  sms: boolean;
  digest: boolean;
  twoFactor: boolean;
  autoSync: boolean;
  theme: "light" | "dark";
}

const DEFAULTS: SettingsState = {
  push: true,
  email: true,
  sms: false,
  digest: true,
  twoFactor: false,
  autoSync: true,
  theme: "light",
};

function load(): SettingsState {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SettingsState>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function SettingsService({
  open, onClose, offline, onOffline,
}: {
  open: boolean;
  onClose: () => void;
  offline: boolean;
  onOffline: (v: boolean) => void;
}) {
  const toast = useToast();
  const [s, setS] = useState<SettingsState>(load);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.getElementById("app-shell")?.setAttribute("data-theme", s.theme);
  }, [s.theme]);

  if (!open) return null;

  const update = (patch: Partial<SettingsState>) => {
    const next = { ...s, ...patch };
    setS(next);
    localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
  };

  const clearCache = () => {
    localStorage.removeItem(LS_SETTINGS);
    setS(DEFAULTS);
    toast("Кэш и локальные настройки очищены", "refresh");
  };

  return (
    <div className="absolute inset-0 z-[65]">
      <button
        className="animate-fade-in absolute inset-0 h-full w-full bg-ink-solid/45"
        onClick={onClose}
        aria-label="Закрыть настройки"
      />
      <div className="animate-sheet-up absolute inset-x-0 bottom-0 flex h-[88%] flex-col overflow-hidden rounded-t-[26px] bg-paper shadow-float">
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div>
            <h2 className="font-display text-[17px] font-semibold tracking-tight">Настройки</h2>
            <p className="text-[11px] font-semibold text-sub">Микросервис · v1.0</p>
          </div>
          <button onClick={onClose} className="press grid h-8 w-8 place-items-center rounded-full bg-card text-sub" aria-label="Закрыть">
            <Icon name="close" className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-10">
          {/* Уведомления */}
          <Section icon="bell" title="Уведомления">
            <Row
              icon="bell"
              tint="#e6efff"
              label="Push-уведомления"
              desc="Дедлайны, статусы и меры поддержки"
              value={s.push}
              onChange={(v) => { update({ push: v }); toast(v ? "Push включены" : "Push выключены", "bell"); }}
            />
            <Row
              icon="mail"
              tint="#e3f6ec"
              label="E-mail"
              desc="Подтверждения и документы"
              value={s.email}
              onChange={(v) => { update({ email: v }); toast(v ? "E-mail включён" : "E-mail выключен", "mail"); }}
            />
            <Row
              icon="alert"
              tint="#fff3d4"
              label="SMS"
              desc="Только критичные сроки"
              value={s.sms}
              onChange={(v) => { update({ sms: v }); toast(v ? "SMS включены" : "SMS выключены", "alert"); }}
            />
            <Row
              icon="news"
              tint="#ece9ff"
              label="Еженедельный дайджест"
              desc="Сводка по экосистеме в понедельник"
              value={s.digest}
              onChange={(v) => update({ digest: v })}
            />
          </Section>

          {/* Внешний вид */}
          <Section icon="moon" title="Внешний вид">
            <Row
              icon="moon"
              tint="#ece9ff"
              label="Тёмная тема"
              desc="Тёмное оформление интерфейса"
              value={s.theme === "dark"}
              onChange={(v) => { update({ theme: v ? "dark" : "light" }); toast(v ? "Тёмная тема включена" : "Тёмная тема выключена", "moon"); }}
            />
          </Section>

          {/* Безопасность */}
          <Section icon="shield" title="Безопасность">
            <Row
              icon="shield"
              tint="#e3f6ec"
              label="Двухфакторная аутентификация"
              desc="Код из приложения при входе"
              value={s.twoFactor}
              onChange={(v) => { update({ twoFactor: v }); toast(v ? "2FA включена" : "2FA отключена", "shield"); }}
            />
            <ActionRow
              icon="lock"
              tint="#e6efff"
              label="Сменить пароль"
              desc="Последняя смена — 3 месяца назад"
              onClick={() => toast("Ссылка для смены пароля отправлена на e-mail", "mail")}
            />
          </Section>

          {/* Данные и подключение */}
          <Section icon="refresh" title="Данные и подключение">
            <Row
              icon="refresh"
              tint="#e6efff"
              label="Автосинхронизация"
              desc="Обновлять остатки и статусы в фоне"
              value={s.autoSync}
              onChange={(v) => update({ autoSync: v })}
            />
            <Row
              icon="wifi-off"
              tint="#fdeceb"
              label="Офлайн-режим"
              desc="Демо состояния «нет сети»"
              value={offline}
              onChange={(v) => { onOffline(v); toast(v ? "Офлайн-режим включён" : "Соединение восстановлено", v ? "wifi-off" : "check"); }}
            />
            <ActionRow
              icon="refresh"
              tint="#fff3d4"
              label="Очистить кэш"
              desc="Сбросить локальные настройки"
              onClick={clearCache}
            />
          </Section>

          {/* О приложении */}
          <Section icon="info" title="О приложении">
            <ActionRow icon="doc" tint="#e6efff" label="Пользовательское соглашение" onClick={() => toast("Открываем документ…", "doc")} />
            <ActionRow icon="shield" tint="#e3f6ec" label="Политика конфиденциальности" onClick={() => toast("Открываем документ…", "doc")} />
            <ActionRow icon="mail" tint="#ece9ff" label="Поддержка" desc="help@cevba.mos.ru" onClick={() => toast("Чат поддержки откроется в ИИ-агенте", "mail")} />
            <div className="flex items-center justify-between rounded-2xl border border-line/80 bg-card px-3.5 py-3 shadow-card">
              <span className="text-[13px] font-bold">Версия</span>
              <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-extrabold text-sub">2.4.1 (build 2210)</span>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ---------- Вспомогательные компоненты ---------- */
function Section({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 first:mt-1">
      <h3 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wide text-faint">
        <Icon name={icon} className="h-3.5 w-3.5" strokeWidth={2.2} />
        {title}
      </h3>
      <div className="mt-2 space-y-2.5">{children}</div>
    </section>
  );
}

function Row({
  icon, tint, label, desc, value, onChange,
}: {
  icon: IconName;
  tint: string;
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line/80 bg-card px-3.5 py-3 shadow-card">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: tint }}>
          <Icon name={icon} className="h-[18px] w-[18px] text-ink2-solid" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold tracking-tight">{label}</p>
          <p className="truncate text-[10.5px] font-semibold text-sub">{desc}</p>
        </div>
      </div>
      <Toggle checked={value} onChange={onChange} />
    </div>
  );
}

function ActionRow({
  icon, tint, label, desc, onClick,
}: {
  icon: IconName;
  tint: string;
  label: string;
  desc?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="press group flex w-full items-center justify-between gap-3 rounded-2xl border border-line/80 bg-card px-3.5 py-3 text-left shadow-card transition-all hover:border-accent/40 hover:shadow-float"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: tint }}>
          <Icon name={icon} className="h-[18px] w-[18px] text-ink2-solid" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold tracking-tight">{label}</p>
          {desc && <p className="truncate text-[10.5px] font-semibold text-sub">{desc}</p>}
        </div>
      </div>
      <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
    </button>
  );
}
