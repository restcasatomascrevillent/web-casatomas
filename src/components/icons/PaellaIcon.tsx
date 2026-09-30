/**
 * Paellera vista desde arriba, con sus dos asas y el arroz suelto dentro.
 * De un color plano (`currentColor`), no de trazo, a partir del icono que
 * mandó el dueño — distinto del estilo de contorno de `lucide-react` que
 * usan los demás iconos de categoría de `/carta`, pero fiel a ese icono.
 */
const PaellaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    {/* Cuerpo de la paellera: un anillo (elipse exterior menos elipse interior). */}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 17.2c4.142 0 7.5-2.328 7.5-5.2S16.142 6.8 12 6.8 4.5 9.128 4.5 12s3.358 5.2 7.5 5.2Zm0-1.8c3.038 0 5.7-1.593 5.7-3.4S15.038 8.6 12 8.6 6.3 10.193 6.3 12s2.662 3.4 5.7 3.4Z"
    />
    {/* Asas */}
    <circle cx="3" cy="12" r="1.8" />
    <circle cx="21" cy="12" r="1.8" />
    {/* Arroz suelto dentro */}
    <circle cx="9.6" cy="10.8" r="1.1" />
    <circle cx="12.6" cy="10.2" r=".9" />
    <circle cx="9.9" cy="13.1" r="1.2" />
    <path d="M12.7 14.2c-.5-.9.1-2.4 1.3-3.2s2.5-.6 3 .3-.1 2.4-1.3 3.2-2.5.6-3-.3Z" />
  </svg>
);

export default PaellaIcon;
