/**
 * Paellera vista desde arriba, con sus dos asas. `lucide-react` no tiene un
 * icono de paella; este sigue su mismo estilo de trazo (`viewBox 24x24`,
 * `strokeWidth 2`, sin relleno) para encajar junto a los demás iconos de
 * categoría de `/carta`.
 */
const PaellaIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M2 12h3" />
    <path d="M19 12h3" />
    <circle cx="12" cy="12" r="7" />
    <path d="M9 11h.01" />
    <path d="M12 10h.01" />
    <path d="M15 13h.01" />
    <path d="M10 15h.01" />
    <path d="M14 15.5h.01" />
  </svg>
);

export default PaellaIcon;
