import { Icon, type IconName } from "./icons";

const TABS: { id: number; label: string; icon: IconName }[] = [
  { id: 0, label: "Главное меню", icon: "grid" },
  { id: 1, label: "Услуги", icon: "tools" },
  { id: 2, label: "События", icon: "calendar" },
  { id: 3, label: "Личный кабинет", icon: "user" },
];

/* ---------- 3D-лента Мёбиуса (слои, блики, тени) ---------- */
function Mobius3D({ className = "h-9 w-9" }: { className?: string }) {
  const back =
    "M22 12 C 26 6.8, 30.8 4, 35.2 4 C 39.9 4, 42.6 7.3, 42.6 11.4 C 42.6 15.5, 39.9 18.8, 35.2 18.8 C 30.8 18.8, 26 17.2, 22 12";
  const front =
    "M22 14 C 18 8.8, 13.2 6, 8.8 6 C 4.1 6, 1.4 9.3, 1.4 13.4 C 1.4 17.5, 4.1 20.8, 8.8 20.8 C 13.2 20.8, 18 19.2, 22 14";
  return (
    <svg viewBox="0 0 44 26" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="mob-front" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd3da" />
          <stop offset="0.35" stopColor="#ff8fa0" />
          <stop offset="0.68" stopColor="#ef4560" />
          <stop offset="1" stopColor="#a3122b" />
        </linearGradient>
        <linearGradient id="mob-back" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e86a7e" />
          <stop offset="0.5" stopColor="#c02743" />
          <stop offset="1" stopColor="#7c0b1f" />
        </linearGradient>
        <linearGradient id="mob-shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="mob-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      {/* контактная тень под лентой */}
      <g transform="translate(0 1.9)" filter="url(#mob-blur)" stroke="#5c0716" strokeWidth="5.4" strokeLinecap="round" opacity="0.5">
        <path d={back} />
        <path d={front} />
      </g>

      {/* задняя петля — уходит в тень */}
      <path d={back} stroke="url(#mob-back)" strokeWidth="5.2" strokeLinecap="round" />
      <path d={back} transform="translate(0.5 1.1)" stroke="#6f0a1d" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d={back} transform="translate(-0.4 -1)" stroke="url(#mob-shine)" strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />

      {/* передняя петля — перекручивается сверху */}
      <path d={front} stroke="url(#mob-front)" strokeWidth="5.2" strokeLinecap="round" />
      <path d={front} transform="translate(0.5 1.1)" stroke="#8f0e24" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <path d={front} transform="translate(-0.4 -1)" stroke="url(#mob-shine)" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

export default function BottomNav({
  tab, onTab, onAI, eventsBadge, profileBadge,
}: {
  tab: number;
  onTab: (t: number) => void;
  onAI: () => void;
  eventsBadge: number;
  profileBadge: number;
}) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-50">
      {/* Кнопка ИИ-агента: справа, над меню, зазор 10 px */}
      <div className="pointer-events-none absolute inset-x-0 bottom-full">
        <div className="pointer-events-auto absolute bottom-[10px] right-4">
          <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-[#e11d3a]/45 blur-xl" aria-hidden="true" />
          <button
            onClick={onAI}
            aria-label="Открыть диалог с ИИ-агентом"
            title="ИИ-агент МосБизнес"
            className="press group grid h-14 w-14 place-items-center rounded-full transition-transform duration-200 hover:scale-105"
            style={{
              background:
                "radial-gradient(120% 120% at 30% 22%, #ff5c72 0%, #e51f3e 42%, #b01230 74%, #8c0d25 100%)",
              boxShadow:
                "0 16px 30px -8px rgba(185,15,45,0.55), 0 5px 12px rgba(120,8,28,0.4), inset 0 1.5px 1px rgba(255,255,255,0.4), inset 0 -2.5px 5px rgba(80,4,18,0.5)",
            }}
          >
            <Mobius3D className="h-9 w-9 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
          </button>
        </div>
      </div>

      <div className="border-t border-line/80 bg-card/95 pb-4 pt-2 backdrop-blur-md">
        <div className="grid grid-cols-4 items-start">
          {TABS.map((t) => {
            const badge = t.id === 2 ? eventsBadge : t.id === 3 ? profileBadge : 0;
            return <Tab key={t.id} t={t} active={tab === t.id} onClick={() => onTab(t.id)} badge={badge} />;
          })}
        </div>
      </div>
      <div className="flex justify-center bg-card/95 pb-2 backdrop-blur-md">
        <span className="h-[4px] w-32 rounded-full bg-ink/85" />
      </div>
    </nav>
  );
}

function Tab({
  t, active, onClick, badge = 0,
}: {
  t: { id: number; label: string; icon: IconName };
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button onClick={onClick} className="press relative flex flex-col items-center gap-0.5 py-1">
      <span className="relative">
        <Icon
          name={t.icon}
          className={`h-[22px] w-[22px] transition-colors duration-300 ${active ? "text-accent" : "text-faint"}`}
          strokeWidth={active ? 2.1 : 1.7}
        />
        {badge > 0 && (
          <span className="absolute -right-2 -top-1.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9.5px] font-extrabold leading-none text-white">
            {badge}
          </span>
        )}
      </span>
      <span className={`text-[9.5px] font-bold leading-tight transition-colors duration-300 ${active ? "text-accent" : "text-sub"}`}>
        {t.label}
      </span>
      <span
        className={`h-[3px] rounded-full bg-accent transition-all duration-300 ${active ? "w-6 opacity-100" : "w-0 opacity-0"}`}
      />
    </button>
  );
}
