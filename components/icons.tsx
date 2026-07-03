import type { ItemKind } from "@/lib/types";

type IconProps = { className?: string };

const s = (p: IconProps) => ({
  className: p.className,
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const SearchIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const UploadIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <path d="M12 16V4m0 0 4 4m-4-4-4 4" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const EditIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const LogoutIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <path d="M12 4v12m0 0 4-4m-4 4-4-4" />
    <path d="M4 20h16" />
  </svg>
);

export const ArrowIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const HeartIcon = ({ className, filled }: IconProps & { filled?: boolean }) => (
  <svg
    className={className}
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 14c1.5-1.5 2.5-3.2 2.5-5.1A4.4 4.4 0 0 0 12 5.6 4.4 4.4 0 0 0 2.5 8.9C2.5 13 12 21 12 21s3.5-2.9 7-7Z" />
  </svg>
);

export const SunIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const MoonIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

export const BookIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
  </svg>
);

export const SettingsIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const CopyIcon = (p: IconProps) => (
  <svg {...s(p)}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

/** 各类型的图标 */
export function KindIcon({
  kind,
  className,
  style,
}: {
  kind: ItemKind;
  className?: string;
  style?: React.CSSProperties;
}) {
  const base = { ...s({ className }), style };
  switch (kind) {
    case "image":
      return (
        <svg {...base}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="9.5" r="1.6" />
          <path d="m4 18 5-5 4 4 3-3 4 4" />
        </svg>
      );
    case "pdf":
      return (
        <svg {...base}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8.5 13.5h1a1.2 1.2 0 0 1 0 2.4h-1V13Zm0 4.5v-2.1M13 13.5v4.5m0-4.5h1.6m-1.6 2.2h1.3M17.5 13.5v4.5" />
        </svg>
      );
    case "slides":
      return (
        <svg {...base}>
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          <path d="M12 16v4m-3 0h6" />
        </svg>
      );
    case "sheet":
      return (
        <svg {...base}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M3 14h18M9 4v16M15 4v16" />
        </svg>
      );
    case "data":
      return (
        <svg {...base}>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
          <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
        </svg>
      );
    case "audio":
      return (
        <svg {...base}>
          <path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 11v2" />
        </svg>
      );
    case "video":
      return (
        <svg {...base}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m10 9 5 3-5 3z" />
        </svg>
      );
    case "archive":
      return (
        <svg {...base}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M12 4v4m0 0-1.5 1.5M12 8l1.5 1.5M11 13h2v3h-2z" />
        </svg>
      );
    case "doc":
      return (
        <svg {...base}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M8 13h8M8 17h6M8 9h2" />
        </svg>
      );
    default:
      return (
        <svg {...base}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );
  }
}
