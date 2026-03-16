export function HeroGlobeBackground() {
  return (
    <div aria-hidden="true" className="landing-hero-globe pointer-events-none select-none">
      <div className="landing-hero-globe__halo" />
      <svg className="landing-hero-globe__svg" viewBox="0 0 520 520" role="presentation" focusable="false">
        <defs>
          <radialGradient id="landingHeroGlobeOcean" cx="35%" cy="28%" r="76%">
            <stop offset="0%" stopColor="#b7ebf0" />
            <stop offset="42%" stopColor="#6bc8d3" />
            <stop offset="74%" stopColor="#2b93a2" />
            <stop offset="100%" stopColor="#195460" />
          </radialGradient>
          <linearGradient id="landingHeroGlobeShade" x1="20%" y1="18%" x2="82%" y2="86%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="36%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#0d382d" stopOpacity="0.48" />
          </linearGradient>
          <radialGradient id="landingHeroGlobeHighlight" cx="28%" cy="22%" r="46%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.78" />
            <stop offset="58%" stopColor="#fff7ec" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#fff7ec" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="landingHeroGlobeLand" x1="18%" y1="12%" x2="82%" y2="92%">
            <stop offset="0%" stopColor="#f4fbf7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#185538" stopOpacity="0.24" />
          </linearGradient>
          <linearGradient id="landingHeroGlobeLandSoft" x1="4%" y1="14%" x2="100%" y2="86%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#185538" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="landingHeroGlobeRim" x1="18%" y1="18%" x2="82%" y2="82%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="52%" stopColor="#d2f3f6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#185538" stopOpacity="0.18" />
          </linearGradient>
          <clipPath id="landingHeroGlobeClip">
            <circle cx="260" cy="260" r="177" />
          </clipPath>
          <filter id="landingHeroGlobeShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="24" stdDeviation="24" floodColor="#185538" floodOpacity="0.2" />
          </filter>
          <filter id="landingHeroGlobeBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        <ellipse cx="284" cy="346" rx="152" ry="44" fill="#185538" fillOpacity="0.16" filter="url(#landingHeroGlobeBlur)" />

        <g filter="url(#landingHeroGlobeShadow)">
          <circle cx="260" cy="260" r="177" fill="url(#landingHeroGlobeOcean)" />
          <circle cx="260" cy="260" r="177" fill="url(#landingHeroGlobeShade)" />
        </g>

        <g clipPath="url(#landingHeroGlobeClip)" className="landing-hero-globe__details">
          <ellipse
            cx="204"
            cy="188"
            rx="128"
            ry="84"
            fill="url(#landingHeroGlobeHighlight)"
            transform="rotate(-18 204 188)"
          />
          <ellipse cx="260" cy="260" rx="160" ry="44" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2.4" />
          <ellipse cx="260" cy="260" rx="160" ry="78" fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="2.2" />
          <ellipse cx="260" cy="260" rx="160" ry="112" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1.8" />
          <ellipse cx="260" cy="260" rx="42" ry="177" fill="none" stroke="#fef7ef" strokeOpacity="0.16" strokeWidth="2" />
          <ellipse
            cx="260"
            cy="260"
            rx="90"
            ry="177"
            fill="none"
            stroke="#fef7ef"
            strokeOpacity="0.12"
            strokeWidth="1.8"
            transform="rotate(14 260 260)"
          />
          <ellipse
            cx="260"
            cy="260"
            rx="122"
            ry="177"
            fill="none"
            stroke="#fef7ef"
            strokeOpacity="0.1"
            strokeWidth="1.6"
            transform="rotate(-18 260 260)"
          />

          <path
            d="M151 175c16-15 34-26 55-31c27-7 52-2 70 15c17 15 30 37 31 60c1 17 11 27 31 30c27 5 45 20 52 42c8 25 2 49-16 65c-15 13-35 18-54 14c-20-4-35 1-47 16c-16 20-38 28-64 23c-30-6-53-24-67-53c-11-23-20-39-42-48c-23-9-36-27-38-49c-3-33 13-65 45-84z"
            fill="url(#landingHeroGlobeLand)"
            fillOpacity="0.74"
          />
          <path
            d="M129 188c-13 23-18 48-13 73c4 22 16 38 35 50c14 9 21 20 19 35c-2 18 6 35 23 50c16 13 34 13 47 1c14-13 18-31 11-49c-6-14-6-28 2-41c9-14 10-30 2-47c-9-17-22-30-39-38c-17-8-25-18-27-33c-2-13-7-21-16-25c-12-5-26 4-44 24z"
            fill="url(#landingHeroGlobeLandSoft)"
            fillOpacity="0.72"
          />
          <path
            d="M331 337c20-9 43-7 60 4c18 11 27 30 22 45c-5 16-22 27-44 30c-23 3-45-2-59-14c-15-12-18-28-10-43c7-10 18-18 31-22z"
            fill="url(#landingHeroGlobeLandSoft)"
            fillOpacity="0.62"
          />
          <path
            d="M146 245c55-34 130-42 200-15"
            fill="none"
            stroke="#fff7ec"
            strokeDasharray="6 11"
            strokeLinecap="round"
            strokeOpacity="0.22"
            strokeWidth="3"
          />
          <circle cx="147" cy="245" r="5" fill="#fff8ef" fillOpacity="0.56" />
          <circle cx="346" cy="232" r="5" fill="#fff8ef" fillOpacity="0.44" />
        </g>

        <circle cx="260" cy="260" r="177" fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="2.5" />
        <circle cx="260" cy="260" r="188" fill="none" stroke="url(#landingHeroGlobeRim)" strokeWidth="8" strokeOpacity="0.52" />
      </svg>
    </div>
  );
}
