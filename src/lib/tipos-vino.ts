import type { Language } from '@/i18n/types';

export const TIPOS_VINO = ['todos', 'tinto', 'blanco', 'espumoso', 'rosado', 'otro'] as const;
export type TipoVino = (typeof TIPOS_VINO)[number];

export function tipoVino(categoria?: string | null): Exclude<TipoVino, 'todos'> {
  const texto = (categoria ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (texto.includes('TINTO')) return 'tinto';
  if (texto.includes('BLANCO')) return 'blanco';
  if (texto.includes('ROSADO') || texto.includes('ROSE')) return 'rosado';
  if (texto.includes('CHAMP') || texto.includes('CAVA') || texto.includes('ESPUMOS')) return 'espumoso';
  return 'otro';
}

const ETIQUETAS = {
  es: { todos: 'Todos', tinto: 'Tintos', blanco: 'Blancos', espumoso: 'Champagnes y espumosos', rosado: 'Rosados', otro: 'Otros' },
  en: { todos: 'All', tinto: 'Red wines', blanco: 'White wines', espumoso: 'Champagnes and sparkling wines', rosado: 'Rosé wines', otro: 'Others' },
  fr: { todos: 'Tous', tinto: 'Vins rouges', blanco: 'Vins blancs', espumoso: 'Champagnes et effervescents', rosado: 'Vins rosés', otro: 'Autres' },
};

export const etiquetaTipoVino = (tipo: TipoVino, idioma: Language) => ETIQUETAS[idioma][tipo];

export function tipoDesdeCategoria(categoria: string): TipoVino | null {
  const valor = categoria.startsWith('tipo:') ? categoria.slice(5) : '';
  return TIPOS_VINO.includes(valor as TipoVino) ? valor as TipoVino : null;
}

/**
 * La denominación de una categoría de la carta, sin el tipo delante y en
 * formato legible: «VINOS TINTOS — RIBERA DEL DUERO» → «Ribera del Duero».
 * Las categorías con el origen aún sin confirmar se enseñan como «Consultar
 * origen». La comparten la carta de vinos (`CartaVinos`) y la tienda.
 */
export function categoriaCorta(categoria: string, language: Language): string {
  if (/pendiente|por confirmar/i.test(categoria)) return { es: 'Consultar origen', en: 'Ask about origin', fr: 'Origine sur demande' }[language];
  const corta = categoria.replace(/^VINOS?\s+(?:TINTOS?|BLANCOS?|ROSADOS?|ESPUMOSOS?)\s*[—–-]\s*/i, '');
  const nombres: Record<string, string> = {
    'RIBERA DEL DUERO': 'Ribera del Duero',
    'IGP CASTILLA Y LEÓN': 'IGP Castilla y León',
    'IGP TRES RIBERAS': 'IGP Tres Riberas',
    'SIN D.O.': 'Sin D.O.',
    'ALBARIÑO (Rías Baixas)': 'Albariño · Rías Baixas',
    'NAVARRA / CHABLIS / RIOJA': 'Navarra · Chablis · Rioja',
    'RIBEIRO / CASTILLA Y LEÓN': 'Ribeiro · Castilla y León',
    'OTRAS DENOMINACIONES': 'Otras D.O.',
  };
  if (nombres[corta]) return nombres[corta];
  return corta === corta.toUpperCase()
    ? corta.toLocaleLowerCase('es').replace(/^\p{L}/u, letra => letra.toLocaleUpperCase('es'))
    : corta;
}
