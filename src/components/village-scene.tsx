/**
 * Village office at golden hour, drawn rather than photographed.
 *
 * Why draw it: a village that has not uploaded a hero photograph yet still
 * needs a hero that looks finished. A stock image would be wrong for a
 * government site and a grey placeholder box is worse than nothing, so the
 * fallback is a real illustration - a two-tier tiled roof over a colonnaded
 * porch, the shape a kantor desa actually has.
 *
 * It is a single inline SVG: no image request, no external asset, nothing for
 * the CSP to block, and it stays crisp at any size. The sky and the foliage
 * pick up the tenant's brand and accent colours through CSS custom properties,
 * so a village with a maroon or navy identity gets a scene in its own palette
 * without a second file.
 *
 * The signboard reads from `villageName`, so the drawing always names the
 * village it belongs to.
 */
export function VillageScene({
  villageName,
  entityLabel = "DESA",
  className = "",
}: {
  villageName: string;
  entityLabel?: string;
  className?: string;
}) {
  // Long names would overrun the board; the board is fixed, so the type shrinks.
  const board = `KANTOR ${entityLabel} ${villageName}`.toUpperCase();
  const boardSize = board.length > 26 ? 15 : board.length > 20 ? 17 : 20;

  return (
    <svg
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label={`Ilustrasi kantor ${entityLabel.toLowerCase()} ${villageName}`}
      className={className}
    >
      <defs>
        {/* Dusk sky: brand at the zenith falling to the accent at the horizon,
            which is what gives the scene its warmth without a photograph. */}
        <linearGradient id="vs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-900)" />
          <stop offset="45%" stopColor="var(--color-brand-800)" />
          <stop
            offset="78%"
            stopColor="color-mix(in oklab, var(--color-brand-accent) 55%, var(--color-brand-800))"
          />
          <stop
            offset="100%"
            stopColor="color-mix(in oklab, var(--color-brand-accent) 80%, white)"
          />
        </linearGradient>

        <radialGradient id="vs-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff6dd" stopOpacity="0.95" />
          <stop offset="35%" stopColor="var(--color-brand-accent)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--color-brand-accent)" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="vs-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8d3f2a" />
          <stop offset="100%" stopColor="#6b2c1d" />
        </linearGradient>

        <linearGradient id="vs-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbf6ec" />
          <stop offset="100%" stopColor="#e6dbc7" />
        </linearGradient>

        <linearGradient id="vs-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-700)" />
          <stop offset="100%" stopColor="var(--color-brand-900)" />
        </linearGradient>

        {/* Roof tiles: one pattern reused at two scales beats drawing 200 tiles. */}
        <pattern
          id="vs-tiles"
          width="18"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <rect width="18" height="12" fill="url(#vs-roof)" />
          <path
            d="M0 12 Q4.5 6 9 12 Q13.5 6 18 12"
            fill="none"
            stroke="#000"
            strokeOpacity="0.16"
            strokeWidth="1.4"
          />
        </pattern>

        <filter id="vs-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* ------------------------------------------------------------------ */}
      {/* Sky                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <rect width="1200" height="700" fill="url(#vs-sky)" />
      <circle cx="1010" cy="392" r="250" fill="url(#vs-sun)" />
      <circle cx="1010" cy="396" r="44" fill="#fff3d4" opacity="0.7" />

      {/* Cloud bands, kept to three so the sky stays quiet behind the type. */}
      <g fill="#ffffff" opacity="0.10">
        <ellipse cx="250" cy="150" rx="170" ry="26" />
        <ellipse cx="380" cy="196" rx="120" ry="18" />
        <ellipse cx="950" cy="130" rx="150" ry="22" />
      </g>

      {/* Distant ridgelines, three depths of the same silhouette. */}
      <path
        d="M0 430 L150 358 L260 402 L390 330 L520 400 L640 352 L780 408 L900 344 L1040 396 L1200 350 L1200 470 L0 470 Z"
        fill="var(--color-brand-900)"
        opacity="0.45"
      />
      <path
        d="M0 452 L120 404 L250 442 L360 396 L500 446 L620 410 L760 452 L880 404 L1020 448 L1200 408 L1200 480 L0 480 Z"
        fill="var(--color-brand-900)"
        opacity="0.65"
      />

      {/* Tree line */}
      <g fill="var(--color-brand-900)" opacity="0.8">
        {[40, 95, 150, 205, 260, 980, 1035, 1090, 1145].map((x) => (
          <ellipse key={x} cx={x} cy={462} rx={34} ry={26} />
        ))}
      </g>

      {/* ------------------------------------------------------------------ */}
      {/* Building                                                            */}
      {/*                                                                     */}
      {/* Composed into the right third. The headline occupies the left of the */}
      {/* hero, and a building centred in the frame would sit underneath it.   */}
      {/* Scaling is about the origin, so the y offset puts the plinth back on */}
      {/* the horizon at 566.                                                  */}
      {/* ------------------------------------------------------------------ */}
      <g transform="translate(268 124) scale(0.78)">
        {/* Cast shadow on the ground */}
        <ellipse
          cx="600"
          cy="566"
          rx="330"
          ry="26"
          fill="#000"
          opacity="0.3"
          filter="url(#vs-soft)"
        />

        {/* Body */}
        <rect x="352" y="368" width="496" height="198" fill="url(#vs-wall)" />
        {/* Plinth */}
        <rect x="338" y="546" width="524" height="20" fill="#cbbfa6" />

        {/* Lower roof: wide, deep eaves */}
        <path
          d="M296 372 L432 296 L768 296 L904 372 Z"
          fill="url(#vs-tiles)"
        />
        <path
          d="M296 372 L904 372 L904 384 L296 384 Z"
          fill="#5c2517"
        />

        {/* Upper roof, the second tier that reads as Indonesian */}
        <path
          d="M406 300 L520 232 L680 232 L794 300 Z"
          fill="url(#vs-tiles)"
        />
        <path d="M406 300 L794 300 L794 310 L406 310 Z" fill="#5c2517" />
        {/* Ridge cap and finials */}
        <rect x="514" y="226" width="172" height="10" rx="5" fill="#7d3524" />
        <path d="M508 226 L520 204 L532 226 Z" fill="var(--color-brand-accent)" />
        <path d="M668 226 L680 204 L692 226 Z" fill="var(--color-brand-accent)" />

        {/* Gable tympanum */}
        <path d="M520 300 L600 250 L680 300 Z" fill="#efe6d4" />
        <circle cx="600" cy="282" r="15" fill="var(--color-brand-accent)" opacity="0.9" />

        {/* Colonnade */}
        {[386, 470, 554, 638, 722, 806].map((x) => (
          <g key={x}>
            <rect x={x} y="392" width="26" height="154" fill="#f6efe1" />
            <rect x={x - 5} y="386" width="36" height="10" rx="2" fill="#e2d6bd" />
            <rect x={x - 5} y="540" width="36" height="10" rx="2" fill="#d8caae" />
            <rect x={x + 10} y="392" width="3" height="154" fill="#000" opacity="0.06" />
          </g>
        ))}

        {/* Entrance recess */}
        <rect x="556" y="424" width="88" height="122" fill="#3f3a30" opacity="0.85" />
        <rect x="566" y="436" width="68" height="110" fill="#5a4a35" />
        <rect x="598" y="436" width="4" height="110" fill="#3f3428" />
        <circle cx="590" cy="492" r="3" fill="var(--color-brand-accent)" />
        <circle cx="610" cy="492" r="3" fill="var(--color-brand-accent)" />

        {/* Windows either side of the door */}
        {[418, 486, 678, 746].map((x) => (
          <g key={x}>
            <rect x={x} y="430" width="52" height="66" rx="3" fill="#8fb6ad" opacity="0.85" />
            <rect x={x} y="430" width="52" height="66" rx="3" fill="none" stroke="#d8caae" strokeWidth="5" />
            <path d={`M${x} 496 L${x + 52} 430`} stroke="#ffffff" strokeOpacity="0.35" strokeWidth="8" />
          </g>
        ))}

        {/* Signboard */}
        <rect x="446" y="330" width="308" height="36" rx="4" fill="var(--color-brand-900)" />
        <rect
          x="446"
          y="330"
          width="308"
          height="36"
          rx="4"
          fill="none"
          stroke="var(--color-brand-accent)"
          strokeWidth="2"
        />
        <text
          x="600"
          y="354"
          textAnchor="middle"
          fontSize={boardSize}
          fontWeight="700"
          letterSpacing="1.5"
          fill="var(--color-brand-accent)"
          fontFamily="var(--font-display), sans-serif"
        >
          {board}
        </text>

        {/* Steps */}
        <rect x="536" y="566" width="128" height="10" rx="2" fill="#d8caae" />
        <rect x="520" y="576" width="160" height="10" rx="2" fill="#cbbfa6" />
        <rect x="504" y="586" width="192" height="10" rx="2" fill="#bdb096" />
      </g>

      {/* Flagpole. A village office flies the national flag; drawing it is the
          difference between "a building" and "a government building". */}
      <g transform="translate(268 124) scale(0.78)">
        <rect x="936" y="286" width="5" height="284" fill="#e8e2d4" />
        <circle cx="938" cy="284" r="6" fill="var(--color-brand-accent)" />
        <g className="vs-flag" style={{ transformOrigin: "941px 298px" }}>
          <path d="M941 294 Q977 286 1013 294 L1013 318 Q977 310 941 318 Z" fill="#d5202f" />
          <path d="M941 318 Q977 310 1013 318 L1013 342 Q977 334 941 342 Z" fill="#fdfdfb" />
        </g>
      </g>

      {/* ------------------------------------------------------------------ */}
      {/* Palms                                                               */}
      {/* ------------------------------------------------------------------ */}
      {[
        { x: 118, y: 572, s: 1.2, d: "0s" },
        { x: 262, y: 556, s: 0.8, d: "-4.1s" },
        { x: 1148, y: 584, s: 1.35, d: "-2.4s" },
      ].map((palm) => (
        <g
          key={palm.x}
          transform={`translate(${palm.x} ${palm.y}) scale(${palm.s})`}
        >
          {/* Trunk: two curves closed into a taper, so it narrows toward the
              crown the way a coconut palm does. */}
          <path
            d="M-4 0 C-6 -52 -10 -104 -20 -150 L-8 -150 C0 -104 2 -52 4 0 Z"
            fill="#3e2f22"
          />
          <g
            className="vs-frond"
            style={{ transformOrigin: "-14px -150px", animationDelay: palm.d }}
          >
            <path d="M-14 -150 C-64 -172 -96 -160 -116 -142 C-88 -152 -50 -156 -14 -144 Z" fill="var(--color-brand-700)" />
            <path d="M-14 -150 C-58 -190 -92 -196 -118 -190 C-86 -184 -46 -172 -14 -146 Z" fill="var(--color-brand-800)" />
            <path d="M-14 -150 C-6 -200 12 -226 40 -238 C22 -212 8 -180 -8 -148 Z" fill="var(--color-brand-700)" />
            <path d="M-14 -150 C30 -178 66 -178 92 -164 C60 -168 24 -160 -8 -144 Z" fill="var(--color-brand-800)" />
            <path d="M-14 -150 C26 -132 56 -116 74 -96 C44 -112 14 -128 -12 -140 Z" fill="var(--color-brand-700)" />
            <path d="M-14 -150 C-52 -134 -80 -118 -98 -98 C-70 -114 -42 -130 -16 -140 Z" fill="var(--color-brand-800)" />
          </g>
        </g>
      ))}

      {/* ------------------------------------------------------------------ */}
      {/* Ground                                                              */}
      {/* ------------------------------------------------------------------ */}
      <path d="M0 566 L1200 566 L1200 700 L0 700 Z" fill="url(#vs-ground)" />
      {/* Path from the steps to the foreground */}
      <path
        d="M504 596 L696 596 L790 700 L410 700 Z"
        fill="color-mix(in oklab, var(--color-brand-accent) 30%, #6b6250)"
        opacity="0.55"
      />

      {/* Shrubs */}
      <g fill="var(--color-brand-900)" opacity="0.85">
        {[46, 116, 196, 980, 1058, 1132, 1186].map((x, i) => (
          <ellipse key={x} cx={x} cy={600 + (i % 3) * 14} rx={44} ry={22} />
        ))}
      </g>

      {/* Drifting leaves. Decorative only, and the animation is disabled
          wholesale under prefers-reduced-motion. */}
      <g className="vs-leaves" fill="var(--color-brand-accent)" opacity="0.5">
        <ellipse className="vs-leaf vs-leaf-a" cx="220" cy="180" rx="9" ry="4" />
        <ellipse className="vs-leaf vs-leaf-b" cx="880" cy="230" rx="7" ry="3.5" />
        <ellipse className="vs-leaf vs-leaf-c" cx="1080" cy="150" rx="10" ry="4.5" />
        <ellipse className="vs-leaf vs-leaf-b" cx="420" cy="120" rx="6" ry="3" />
      </g>
    </svg>
  );
}
