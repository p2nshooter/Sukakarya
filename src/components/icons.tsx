import type { SVGProps } from "react";

/**
 * Inline icon set.
 *
 * Deliberately not an icon package: the Worker bundle stays small, there is no
 * external request for a font or sprite to violate the CSP, and every glyph is
 * currentColor so it inherits theme and brand colour for free.
 *
 * Drawn on a 24x24 grid with a 1.75 stroke to match the type weight.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const IconMenu = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" />
  </Icon>
);

export const IconPhone = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 4h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L14 13l4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 2.5 6.2 2 2 0 0 1 4.5 4Z" />
  </Icon>
);

export const IconMail = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </Icon>
);

export const IconPin = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Icon>
);

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const IconCalendar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);

export const IconDocument = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M13 3v5h5M8.5 13h7M8.5 17h5" />
  </Icon>
);

export const IconDownload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 19h16" />
  </Icon>
);

export const IconUsers = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 11.5a3 3 0 0 0 0-6M18 20a6 6 0 0 0-2-4.5" />
  </Icon>
);

/** One person, for a single resident's account - IconUsers is a group. */
export const IconUser = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Icon>
);

export const IconMegaphone = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9v5a2 2 0 0 0 2 2h1l1.5 4h2L9 16h1l8 4V5l-8 4H6a2 2 0 0 0-2 2Z" />
    <path d="M20 9.5a3.5 3.5 0 0 1 0 5" />
  </Icon>
);

export const IconChat = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.5 12c0 4-3.8 7-8.5 7a10 10 0 0 1-2.6-.34L4 20.5l1.3-3.6A6.7 6.7 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z" />
  </Icon>
);

export const IconShield = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.4-7.5 9.5-4.4-1.1-7.5-4.9-7.5-9.5V6L12 3Z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

export const IconChart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Icon>
);

export const IconWallet = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h11a2 2 0 0 1 2 2v1" />
    <rect x="3.5" y="7.5" width="17" height="12" rx="2.5" />
    <circle cx="16.5" cy="13.5" r="1.25" />
  </Icon>
);

export const IconStore = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9" />
    <path d="M3 6.5 4.5 4h15L21 6.5a3 3 0 0 1-5.6 1.5A3 3 0 0 1 12 9a3 3 0 0 1-3.4-1A3 3 0 0 1 3 6.5Z" />
  </Icon>
);

export const IconMountain = (p: IconProps) => (
  <Icon {...p}>
    <path d="m3 19 6-10 3.5 5.5L15 11l6 8H3Z" />
    <circle cx="17" cy="6.5" r="2" />
  </Icon>
);

export const IconImage = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="9" cy="10" r="1.75" />
    <path d="m4.5 17.5 5-4.5 4 3.5 3-2.5 3.5 3" />
  </Icon>
);

export const IconPlay = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5v7l6-3.5-6-3.5Z" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
);

export const IconInfo = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.75v.5" />
  </Icon>
);

export const IconAlert = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4M12 16.75v.5" />
  </Icon>
);

export const IconSun = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
  </Icon>
);

export const IconMoon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </Icon>
);

export const IconExternal = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4h6v6M20 4l-8.5 8.5" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Icon>
);

export const IconSparkle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9 12 3.5Z" />
    <path d="M19 4v2.5M20.25 5.25h-2.5" />
  </Icon>
);

/** Brand marks for social links. Filled, not stroked, so they read at 16px. */
export function SocialIcon({
  platform,
  className,
}: {
  platform: string;
  className?: string;
}) {
  const paths: Record<string, string> = {
    facebook:
      "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z",
    instagram:
      "M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3-.1 1.7-.1 4.8-.1Zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.2.8-.4.3-.6.7-.8 1.2-.2.4-.3 1-.4 2.1C2.7 9.6 2.7 10 2.7 12s0 2.4.1 3.6c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.2.3.4.7.6 1.2.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.2-.8.4-.3.6-.7.8-1.2.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-3.6s0-2.4-.1-3.6c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.2-.3-.4-.7-.6-1.2-.8-.4-.2-1-.3-2.1-.4-1.2-.1-1.6-.1-4.7-.1Zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 8.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm6.2-8.3a1.1 1.1 0 1 1-2.3 0 1.1 1.1 0 0 1 2.3 0Z",
    youtube:
      "M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.1V8.9l5.2 3.1-5.2 3.1Z",
    tiktok:
      "M16.5 2.5c.4 2.2 1.7 3.6 3.9 3.8v2.5c-1.3.1-2.5-.2-3.8-.9v6.3c0 4.6-4.4 6.9-8 4.9-2.3-1.3-3.1-4.4-1.9-6.9 1-2.1 3.2-3.2 5.7-2.8v2.7c-.4-.1-.8-.2-1.2-.2-1.3 0-2.4 1-2.4 2.3 0 1.5 1.4 2.6 2.8 2.3 1.2-.2 1.9-1.2 1.9-2.7V2.5h3Z",
    whatsapp:
      "M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.8.8-1 1.9-.6 3.1a11 11 0 0 0 4.6 5c1.9.8 2.7.9 3.6.7.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.1-.5-.3Z",
    telegram:
      "M22 3.5 2.6 11c-1.3.5-1.3 1.3-.2 1.6l4.9 1.5 1.9 5.7c.2.6.4.9.9.9.4 0 .6-.2.9-.5l2.4-2.3 4.9 3.6c.9.5 1.5.2 1.7-.8l3.2-14.9c.3-1.3-.5-1.9-1.2-1.3ZM7.6 13.3l10.4-6.5c.5-.3.9-.1.6.2l-8.9 8-.3 3.7-1.8-5.4Z",
    x: "M18.2 2.5h3.3l-7.2 8.2 8.4 11.1h-6.6l-5.2-6.8-5.9 6.8H1.7l7.7-8.8L1.3 2.5h6.8l4.7 6.2 5.4-6.2Zm-1.2 17.4h1.8L7.1 4.4H5.2l11.8 15.5Z",
    linkedin:
      "M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM2.5 21.5h5v-11h-5v11Zm7.5-11v11h5v-6c0-1.4.9-2.3 2-2.3s1.9.9 1.9 2.3v6h5v-6.7c0-3.4-1.9-5-4.4-5-2 0-2.9 1.1-3.4 1.9v-1.6h-5Z",
  };

  const d = paths[platform];
  if (!d) {
    return (
      <span aria-hidden className={className}>
        <IconExternal className="h-full w-full" />
      </span>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
