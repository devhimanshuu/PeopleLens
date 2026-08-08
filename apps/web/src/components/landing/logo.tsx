'use client';

export function Logo({
  className = '',
  size = 'md',
  shimmer = false,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Brand-gradient hover shimmer over the wordmark (requires a `.group` ancestor). */
  shimmer?: boolean;
}) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Premium Geometric Lens Mark */}
      <div
        className={`relative flex items-center justify-center rounded-xl bg-gradient-to-b from-white/10 to-white/05 p-0.5 shadow-lg shadow-indigo-500/10 ring-1 ring-white/15 backdrop-blur-md transition-all group-hover:ring-indigo-400/40 ${
          isSm ? 'size-7' : isLg ? 'size-9' : 'size-8'
        }`}
      >
        <div className="flex size-full items-center justify-center rounded-[10px] bg-[#070c18]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={`${isSm ? 'size-4' : isLg ? 'size-5' : 'size-4.5'}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer precision focus ring */}
            <circle
              cx="12"
              cy="12"
              r="8.5"
              stroke="url(#pl-logo-outer)"
              strokeWidth="1.5"
              strokeDasharray="18 4 6 4"
            />
            {/* Inner optical lens curve */}
            <circle cx="12" cy="12" r="4.5" stroke="url(#pl-logo-inner)" strokeWidth="1.75" />
            {/* Core focus point */}
            <circle cx="12" cy="12" r="2" fill="url(#pl-logo-core)" />
            <defs>
              <linearGradient
                id="pl-logo-outer"
                x1="3"
                y1="3"
                x2="21"
                y2="21"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#818CF8" />
                <stop offset="0.5" stopColor="#6366F1" />
                <stop offset="1" stopColor="#06B6D4" />
              </linearGradient>
              <linearGradient
                id="pl-logo-inner"
                x1="7.5"
                y1="7.5"
                x2="16.5"
                y2="16.5"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#38BDF8" />
                <stop offset="1" stopColor="#818CF8" />
              </linearGradient>
              <linearGradient
                id="pl-logo-core"
                x1="10"
                y1="10"
                x2="14"
                y2="14"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#F8FAFC" />
                <stop offset="1" stopColor="#38BDF8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Enterprise SaaS Wordmark */}
      <span
        className={`relative font-display font-bold tracking-tight text-foreground ${
          isSm ? 'text-base' : isLg ? 'text-xl' : 'text-lg'
        }`}
      >
        People
        <span className="font-semibold bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-500 bg-clip-text text-transparent dark:from-indigo-300 dark:via-sky-300 dark:to-cyan-400">
          Lens
        </span>
        {shimmer ? (
          <span
            aria-hidden
            className="watermark-shimmer pointer-events-none absolute inset-0 font-bold"
          >
            PeopleLens
          </span>
        ) : null}
      </span>
    </div>
  );
}
