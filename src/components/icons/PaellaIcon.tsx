/**
 * Paellera vista desde arriba, con sus dos asas y el arroz suelto dentro.
 * `lucide-react` no tiene icono de paella; este sigue su mismo estilo de
 * trazo (`viewBox 24x24`, `strokeWidth 2`, sin relleno) para encajar junto a
 * los demás iconos de categoría de `/carta` en vez de desentonar con un
 * relleno macizo.
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
    <path d="M2 12h2.5" />
    <path d="M19.5 12h2.5" />
    <ellipse cx="12" cy="12" rx="7.5" ry="5" />
    <path d="M9.5 10.5h.01" />
    <path d="M13 10h.01" />
    <path d="M11 14h.01" />
    <path d="M14.5 13h.01" />
  </svg>
);

export default PaellaIcon;
