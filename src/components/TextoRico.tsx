import { Fragment } from "react";
import { TelLink } from "@/components/TelLink";
import { NEGOCIO } from "@/lib/negocio";

/**
 * Texto con un marcado mínimo, para los textos legales largos que viven en
 * ficheros de traducción (`politica-privacidad-textos.ts`):
 *
 *   - `**negrita**`                -> `<strong>`
 *   - `[texto](https://enlace)`    -> enlace externo (pestaña nueva, `noopener`)
 *   - `{phone}`                    -> teléfono pulsable (`TelLink`)
 *   - `{email}`                    -> enlace `mailto:` al email del negocio
 *
 * Todo lo demás se pinta como texto (React lo escapa): no hay HTML en crudo.
 */
const MARCADO = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\)|\{phone\}|\{email\})/;
const CLASE_ENLACE = "text-accent hover:underline";

export const TextoRico = ({ texto }: { texto: string }) => (
  <>
    {texto.split(MARCADO).map((parte, indice) => {
      if (parte === "{phone}") return <TelLink key={indice} className={CLASE_ENLACE} />;
      if (parte === "{email}") {
        return (
          <a key={indice} href={`mailto:${NEGOCIO.email}`} className={CLASE_ENLACE}>
            {NEGOCIO.email}
          </a>
        );
      }
      const negrita = /^\*\*([^*]+)\*\*$/.exec(parte);
      if (negrita) return <strong key={indice}>{negrita[1]}</strong>;
      const enlace = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(parte);
      if (enlace) {
        return (
          <a key={indice} href={enlace[2]} target="_blank" rel="noopener noreferrer" className={CLASE_ENLACE}>
            {enlace[1]}
          </a>
        );
      }
      return <Fragment key={indice}>{parte}</Fragment>;
    })}
  </>
);

export default TextoRico;
