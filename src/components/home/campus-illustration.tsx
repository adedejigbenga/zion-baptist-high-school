/**
 * TEMPORARY hero visual: a flat, on-brand illustration of a school building.
 * It exists only until the school supplies a real campus photograph
 * (set `siteConfig.heroImage` and <Hero /> shows the photo instead). It contains no logo or crest.
 */
function CampusIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 512"
      className={className}
      role="img"
      aria-label="Illustration of a school building with a flag, trees and a path to the front entrance"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* sky */}
      <rect width="640" height="512" className="fill-brand-50" />
      <circle cx="500" cy="104" r="52" className="fill-brand-200" />
      <ellipse cx="120" cy="92" rx="54" ry="15" className="fill-white" />
      <ellipse cx="156" cy="80" rx="36" ry="12" className="fill-white" />
      <ellipse cx="420" cy="168" rx="44" ry="12" className="fill-white" />

      {/* distant hills */}
      <path d="M0 352c80-52 160-60 250-34 80 24 150 4 210-26 64-30 120-20 180 8v212H0Z" className="fill-brand-100" />

      {/* ground */}
      <rect y="396" width="640" height="116" className="fill-brand-200" />
      <path d="M284 396h72l92 116H192Z" className="fill-white" />

      {/* trees, left */}
      <rect x="62" y="330" width="9" height="70" className="fill-brand-800" />
      <circle cx="66" cy="316" r="38" className="fill-brand-400" />
      <circle cx="46" cy="338" r="24" className="fill-brand-300" />
      {/* trees, right */}
      <rect x="570" y="334" width="9" height="66" className="fill-brand-800" />
      <circle cx="574" cy="320" r="36" className="fill-brand-400" />
      <circle cx="594" cy="342" r="22" className="fill-brand-300" />

      {/* flagpole */}
      <rect x="148" y="190" width="4" height="210" className="fill-brand-900" />
      <path d="M152 194h46l-12 15 12 15h-46Z" className="fill-brand-600" />

      {/* side wings */}
      <rect x="168" y="292" width="110" height="108" className="fill-white" />
      <rect x="362" y="292" width="110" height="108" className="fill-white" />
      <rect x="168" y="284" width="110" height="10" className="fill-brand-300" />
      <rect x="362" y="284" width="110" height="10" className="fill-brand-300" />
      {[188, 228, 386, 426].map((x) => (
        <rect key={x} x={x} y="318" width="26" height="34" rx="2" className="fill-brand-200" />
      ))}

      {/* main block */}
      <rect x="236" y="236" width="168" height="164" className="fill-white" />
      <rect x="236" y="236" width="168" height="164" className="fill-brand-50" opacity="0.5" />

      {/* pediment and roof */}
      <path d="M216 240 320 168l104 72Z" className="fill-brand-800" />
      <path d="M232 240 320 180l88 60Z" className="fill-brand-700" />
      <circle cx="320" cy="214" r="12" className="fill-brand-100" />
      <rect x="318" y="204" width="4" height="20" className="fill-brand-800" />
      <rect x="310" y="211" width="20" height="4" className="fill-brand-800" />
      <rect x="212" y="240" width="216" height="10" className="fill-brand-900" />

      {/* columns */}
      {[246, 278, 330, 362].map((x) => (
        <g key={x}>
          <rect x={x} y="252" width="14" height="136" className="fill-brand-100" />
          <rect x={x - 3} y="252" width="20" height="6" className="fill-brand-300" />
          <rect x={x - 3} y="382" width="20" height="6" className="fill-brand-300" />
        </g>
      ))}

      {/* entrance */}
      <path d="M298 400V330a22 22 0 0 1 44 0v70Z" className="fill-brand-800" />
      <path d="M320 330v70" className="stroke-brand-600" strokeWidth="2" />
      <rect x="286" y="392" width="68" height="8" className="fill-brand-300" />
      <rect x="278" y="400" width="84" height="8" className="fill-brand-200" />
    </svg>
  )
}

export { CampusIllustration }
