export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="pg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#1DD05E" />
          <stop offset="100%" stopColor="#0E7A38" />
        </linearGradient>
      </defs>
      <path
        d="M16 2 L28 7 V16 C28 23 22 28 16 30 C10 28 4 23 4 16 V7 Z"
        fill="url(#pg)"
      />
      <path
        d="M11 16 L14.5 19.5 L21 13"
        stroke="white"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo />
      <span className="font-display text-lg font-semibold tracking-tight">
        Proteccio<span className="text-primary">.</span>
      </span>
    </div>
  );
}
