/** Marca de la app: estantería con lomos en los azules de la página.
 * Componente autocontenido (no depende del tema): el logo no se retiñe. */

export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="msl-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a3444" />
          <stop offset="1" stopColor="#12161d" />
        </linearGradient>
        <linearGradient id="msl-hero" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd8ff" />
          <stop offset="0.55" stopColor="#66c0f4" />
          <stop offset="1" stopColor="#2d73ff" />
        </linearGradient>
        <radialGradient id="msl-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#66c0f4" stopOpacity="0.5" />
          <stop offset="1" stopColor="#66c0f4" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="1" y="1" width="38" height="38" rx="9" fill="url(#msl-tile)" />
      <ellipse cx="20" cy="19" rx="14" ry="14" fill="url(#msl-glow)" />

      {/* lomo izquierdo */}
      <rect x="7" y="13" width="6.5" height="19" rx="1.5" fill="#2a475e" />
      <rect x="8.6" y="16" width="3.3" height="1.4" rx="0.7" fill="#c7d5e0" opacity="0.55" />
      <rect x="8.6" y="19" width="3.3" height="1.4" rx="0.7" fill="#c7d5e0" opacity="0.3" />

      {/* lomo central (héroe) */}
      <rect x="14.75" y="8" width="6.5" height="24" rx="1.5" fill="url(#msl-hero)" />
      <rect x="14.75" y="8" width="6.5" height="2.4" rx="1.2" fill="#ffffff" opacity="0.3" />
      <path d="M16.9 17.4 L21.7 20 L16.9 22.6 Z" fill="#ffffff" />

      {/* lomo derecho */}
      <rect x="23" y="15" width="6.5" height="17" rx="1.5" fill="#3f7cab" />
      <rect x="24.6" y="18" width="3.3" height="1.4" rx="0.7" fill="#ffffff" opacity="0.55" />
      <rect x="24.6" y="21" width="3.3" height="1.4" rx="0.7" fill="#ffffff" opacity="0.3" />

      {/* estantería */}
      <rect x="5" y="32" width="30" height="3" rx="1.5" fill="#0b0f14" />
      <rect x="5" y="32" width="30" height="1" rx="0.5" fill="#66c0f4" opacity="0.4" />

      <rect x="1" y="1" width="38" height="38" rx="9" fill="none" stroke="#ffffff" strokeOpacity="0.12" />
    </svg>
  );
}
