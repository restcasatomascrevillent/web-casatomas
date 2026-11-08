/**
 * Forma del payload que genera `scripts/carta-ssg.mjs` en tiempo de build.
 *
 * Casi todo es opcional a propósito: el script compacta las filas y elimina
 * las claves vacías para no arrastrar cientos de `null` al bundle.
 */
export interface PlatoSSG {
  id: string;
  nombre: string;
  nombre_en?: string;
  nombre_fr?: string;
  categoria?: string;
  categoria_en?: string;
  categoria_fr?: string;
  descripcion?: string;
  /** Preparación alternativa ofrecida explícitamente por el restaurante. */
  sin_gluten_disponible?: boolean;
  descripcion_en?: string;
  descripcion_fr?: string;
  precio_eur: number;
  unidad?: string;
  /**
   * Posición dentro de su categoría ("1", "2"… — texto en Platos y Vinos,
   * número en Bebidas). Las filas ya llegan ordenadas por ella (numérica);
   * viaja para poder reordenar igual al mezclar con datos en vivo.
   */
  orden?: string | number;
  imagen_url?: string;
  imagen_posicion_y?: number;
  /**
   * Vídeo 4:3 de 3–4 s del plato (bucket `platos`). Columna nueva: puede no
   * venir en la fila; se lee siempre con `videoDePlato` (`@/lib/foto-plato`).
   */
  video_url?: string | null;
  expanded?: boolean;
  ingredientes?: string[] | string;
  /** Solo etiquetas validadas por el restaurante. */
  etiquetas_dieteticas?: string[] | string;
  alergenos_oficiales?: string[] | string;
  alergenos_inferidos?: string[] | string;
  alergenos_notas?: string;
  /** Lista traducida, separada por comas ("Gluten, Milk"). Columna única. */
  alergenos_en?: string;
  alergenos_fr?: string;
  traducciones?: unknown;
}

/** Un vino de la carta. Mismas columnas que consume `CartaVinos.tsx`. */
export interface VinoSSG {
  id: string;
  nombre: string;
  nombre_en?: string;
  nombre_fr?: string;
  categoria?: string;
  categoria_en?: string;
  categoria_fr?: string;
  descripcion?: string;
  descripcion_en?: string;
  descripcion_fr?: string;
  precio_eur: number;
  unidad?: string;
  /** Ver `PlatoSSG.orden`. */
  orden?: string | number;
  imagen_url?: string;
  imagen_posicion_y?: number;
  denominacion_origen?: string;
  ubicacion_region?: string;
  ubicacion_pais?: string;
  alergenos_oficiales?: string[] | string;
  alergenos_inferidos?: string[] | string;
  alergenos_notas?: string;
  alergenos_en?: string;
  alergenos_fr?: string;
  traducciones?: unknown;
  /** Se sirve por copas (04/11/2026): la tarjeta enseña un botón con una copa. */
  copeo?: boolean;
  /** Precio de una copa; solo cuenta con `copeo`. */
  precio_copa_eur?: number | null;
  /** Puntos de Robert Parker / The Wine Advocate (50–100) y su añada. */
  puntuacion_parker?: number | null;
  puntuacion_parker_anada?: number | null;
  /** «94», «94+» o «93–95» (08/11/2026): solo verificadas y de la añada que se sirve. */
  puntuacion_parker_texto?: string | null;
}

/** Una bebida sin alcohol. Mismas columnas que consume `CartaBebidas.tsx`. */
export interface BebidaSSG {
  id: string;
  nombre: string;
  nombre_en?: string;
  nombre_fr?: string;
  categoria?: string;
  categoria_en?: string;
  categoria_fr?: string;
  descripcion?: string;
  descripcion_en?: string;
  descripcion_fr?: string;
  precio_eur: number;
  tamano?: string;
  /** Ver `PlatoSSG.orden`. En Bebidas la columna es numérica (`bigint`). */
  orden?: number;
  imagen_url?: string;
  traducciones?: unknown;
}

/** Recuento por categoría de una tabla que NO viaja entera en este módulo. */
export interface ResumenCarta {
  total: number;
  categorias: { nombre: string; total: number }[];
}

export interface CartaSSG {
  /** ISO del momento del build. Útil para saber cuándo caducó el snapshot. */
  generadoEn: string;
  platos: PlatoSSG[];
  /**
   * Recuentos de vinos y bebidas. Solo los números: las filas completas están
   * en `virtual:carta-ssg/vinos` y `virtual:carta-ssg/bebidas` para que la
   * portada y `/carta` puedan mostrar "185 referencias" sin descargarlas.
   */
  resumen: { vinos: ResumenCarta; bebidas: ResumenCarta };
  /**
   * Ajustes del panel leídos en build (`configuracion_web`). Opcional: si falta
   * (snapshot viejo, tests) vale lo de siempre, fotos visibles.
   */
  config?: {
    /**
     * false = el panel apagó «Fotos de platos en Casa Tomás» (al construir).
     * La tarjeta no ofrece el botón de foto ni el hueco de «sin foto», y el
     * JSON-LD omite las fotos. `imagen_url` se conserva en los platos para que
     * el navegador pueda volver a enseñarlas si se encienden sin redeploy.
     */
    mostrarFotosPlatos: boolean;
    mostrarMenuDelDia?: boolean;
    mostrarTapas?: boolean;
    /** Días y horas guardados en el panel (`HorarioWeb` o null = lo de siempre). */
    horarioMenuDelDia?: unknown;
    horarioTapas?: unknown;
  };
}

export interface VinosSSG {
  generadoEn: string;
  vinos: VinoSSG[];
}

export interface BebidasSSG {
  generadoEn: string;
  bebidas: BebidaSSG[];
}


/**
 * `virtual:carta-ssg/tienda`: la fila de `configuracion_tienda` tal y como se
 * leyó al construir (solo las columnas que usa `/tienda`), o `null` si no se
 * pudo leer. Sin normalizar: lo hace `normalizarConfigTienda` (`@/lib/tienda`),
 * igual que con lo que llega en vivo.
 */
export interface TiendaSSG {
  generadoEn: string;
  config: Record<string, unknown> | null;
}
