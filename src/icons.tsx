import type { JSX } from "react";

const paths: Record<string, JSX.Element> = {
  "chevron-left": <path d="M14.5 5.5 8 12l6.5 6.5" />,
  "chevron-right": <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  "chevron-down": <path d="M5.5 9.5 12 16l6.5-6.5" />,
  "arrow-right": <path d="M4 12h16m0 0-6-6m6 6-6 6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.8-3.8" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  tools: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L4 16.7V20h3.3l5.3-5.3a4 4 0 0 0 5.1-5.4L15 12l-3-3 2.7-2.7Z" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.2" r="3.7" />
      <path d="M4.8 20.2c1.3-3.2 4-4.8 7.2-4.8s5.9 1.6 7.2 4.8" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="12" cy="6.5" rx="6.5" ry="3" />
      <path d="M5.5 6.5v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3v-5" />
      <path d="M5.5 11.5v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3v-5" />
    </>
  ),
  scroll: (
    <>
      <path d="M7 4h11a2 2 0 0 1 2 2v12.5a1.5 1.5 0 0 1-3 0V6a2 2 0 0 0-2-2" />
      <path d="M7 4a2 2 0 0 0-2 2v12a2 2 0 0 1-2 2h9M8.5 9h6M8.5 12.5h6" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12V20l-2.4-1.6L13.2 20l-2.4-1.6L8.4 20 6 18.4V3.5Z" />
      <path d="M9 8h6M9 11.5h6M9 15h3.5" />
    </>
  ),
  building: (
    <>
      <path d="M4.5 20.5V5.5A1.5 1.5 0 0 1 6 4h7a1.5 1.5 0 0 1 1.5 1.5v15M14.5 9.5H18a1.5 1.5 0 0 1 1.5 1.5v9.5M3 20.5h18" />
      <path d="M7.5 8h2m-2 3.5h2m-2 3.5h2M17 13.5h.8M17 16.8h.8" />
    </>
  ),
  cap: (
    <>
      <path d="m12 4 10 4.5L12 13 2 8.5 12 4Z" />
      <path d="M6.5 10.5V16c0 1.2 2.5 2.8 5.5 2.8s5.5-1.6 5.5-2.8v-5.5M21.5 9v5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 5.8v5.4c0 4.6 3 7.8 7 9.3 4-1.5 7-4.7 7-9.3V5.8L12 3Z" />
      <path d="m9 11.8 2.2 2.2 4-4.3" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="5" width="14" height="16" rx="2.5" />
      <path d="M9 5a3 3 0 0 1 6 0M9 11h6M9 14.5h6M9 18h3.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h16" />
      <path d="m7.5 14.5 3.5-4 3 2.5 4.5-6" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.9L12 3.5Z" />,
  news: (
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
      <path d="M7.5 8.5h5v5h-5v-5ZM15.5 8.5h1.5M15.5 11.5h1.5M7.5 16.5h9.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 2.8 19.5h18.4L12 4Z" />
      <path d="M12 10v4M12 16.8v.4" />
    </>
  ),
  excl: <path d="M12 5v9m0 3.2v.3" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 7.6v.3" />
    </>
  ),
  "trend-up": <path d="m4 16 5-5 3.5 3.5L20 7m0 0h-5m5 0v5" />,
  "trend-down": <path d="m4 8 5 5 3.5-3.5L20 17m0 0h-5m5 0v-5" />,
  send: <path d="M4 11.5 20 4l-4.5 16-4-6.5L4 11.5Zm7.5 2L20 4" />,
  refresh: (
    <>
      <path d="M4.5 8.5A8 8 0 0 1 19 10m.5-5.5V10h-5.5" />
      <path d="M19.5 15.5A8 8 0 0 1 5 14m-.5 5.5V14H10" />
    </>
  ),
  "wifi-off": (
    <>
      <path d="M2 8.8a15 15 0 0 1 6.6-3.2M12.5 5.6a15 15 0 0 1 9.5 3.2M5.3 12.5a10.4 10.4 0 0 1 4.4-2.4m4.9.3a10.4 10.4 0 0 1 4.1 2.1M8.5 16a5.6 5.6 0 0 1 7 0M12 19.5v.2" />
      <path d="m3.5 3.5 17 17" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.9" />
    </>
  ),
  "eye-off": (
    <>
      <path d="m4 4 16 16" />
      <path d="M10 5.9c.65-.07 1.32-.1 2-.1 6 0 9.5 6.2 9.5 6.2a16.6 16.6 0 0 1-3 3.7M6.4 7.3A16.4 16.4 0 0 0 2.5 12S6 18.2 12 18.2c1.1 0 2.14-.2 3.1-.55" />
      <path d="M9.9 9.9a2.9 2.9 0 0 0 4.1 4.1" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.6" r="3.2" />
      <path d="M2.8 19.6c1-2.9 3.3-4.3 6.2-4.3s5.2 1.4 6.2 4.3" />
      <circle cx="16.9" cy="9.6" r="2.4" />
      <path d="M15.7 15c2.6.1 4.6 1.4 5.5 3.8" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m4.5 7.5 7.5 5.6 7.5-5.6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.5-6.5-10.3A6.4 6.4 0 0 1 12 4a6.4 6.4 0 0 1 6.5 6.7C18.5 15.5 12 21 12 21Z" />
      <circle cx="12" cy="10.6" r="2.3" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9.8a6 6 0 0 1 12 0c0 4.2 1.6 5.6 1.6 5.6H4.4S6 14 6 9.8Z" />
      <path d="M10 18.6a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3.5h8l4 4V20.5H6V3.5Z" />
      <path d="M14 3.5v4h4M9 12h6M9 15.5h6" />
    </>
  ),
  spark: <path d="M12 3v4.5M12 16.5V21M3 12h4.5M16.5 12H21M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />,
  logout: (
    <>
      <path d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14" />
      <path d="M10 12h10m0 0-3.5-3.5M20 12l-3.5 3.5" />
    </>
  ),
  link: (
    <>
      <path d="M10.4 13.6a4 4 0 0 0 5.9.3l2.3-2.3a4 4 0 1 0-5.7-5.7l-1.3 1.3" />
      <path d="M13.6 10.4a4 4 0 0 0-5.9-.3l-2.3 2.3a4 4 0 1 0 5.7 5.7l1.3-1.3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4M12 14.5v2" />
    </>
  ),
  moon: <path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a7 7 0 0 0 10.8 10.8Z" />,
};

export type IconName = keyof typeof paths;

export function Icon({
  name, className = "h-5 w-5", strokeWidth = 1.8,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

/* Лента Мёбиуса — плоская линейная иконка (для шапки чата) */
export function MobiusIcon({
  className = "h-6 w-6", strokeWidth = 1.9,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5.5 14.6C3.2 13.2 2 11.3 2 9.6 2 6.9 5.6 5 10 5c2.6 0 4.9.6 6.6 1.6"
        stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"
      />
      <path
        d="M18.5 9.4c2.3 1.4 3.5 3.3 3.5 5 0 2.7-3.6 4.6-8 4.6-2.6 0-4.9-.6-6.6-1.6"
        stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"
      />
      <path
        d="M6.5 6.6c3 1.5 8 8.5 11 10.8M17.5 6.6c-1.9 1-4.2 3-6.5 5.4-2.3 2.4-4.6 4.4-6.5 5.4"
        stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.72"
      />
    </svg>
  );
}
