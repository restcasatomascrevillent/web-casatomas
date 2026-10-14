// Genera SQL para esta edición; no conecta ni escribe por sí solo.
// --rollback revierte únicamente descripciones que aún coinciden con el lote.
import { readFileSync } from 'node:fs';
const { vinos } = JSON.parse(readFileSync(new URL('../docs/descripciones-vinos-2026-10-14.json', import.meta.url), 'utf8'));
const rollback = process.argv.includes('--rollback');
if (vinos.length !== 244 || new Set(vinos.map(v => v.id)).size !== vinos.length)
  throw new Error('El catálogo no contiene los 244 vinos únicos revisados.');
for (const vino of vinos) {
  if (typeof vino.descripcion !== 'string' || vino.descripcion.length < 200 || vino.descripcion.length > 300)
    throw new Error(`Descripción inválida: ${vino.nombre}`);
}
const registros = vinos.map(v => ({
  id: v.id, nombre: v.nombre,
  esperado: rollback ? v.descripcion : v.descripcion_anterior,
  nuevo: rollback ? v.descripcion_anterior : v.descripcion,
  actualizado: v.updated_at_anterior,
}));
const datos = JSON.stringify(registros).replaceAll("'", "''");
const filas = `jsonb_to_recordset(lote) AS d(id text, nombre text, esperado text, nuevo text, actualizado timestamptz)`;
console.log(`DO $descripciones_vinos$
DECLARE cambiados integer; lote jsonb := '${datos}'::jsonb;
BEGIN
  PERFORM v.id FROM public."Vinos" v JOIN ${filas} ON d.id = v.id ORDER BY v.id FOR UPDATE OF v;
  IF EXISTS (
    SELECT 1 FROM ${filas} LEFT JOIN public."Vinos" v ON v.id = d.id
    WHERE v.id IS NULL OR v.nombre IS DISTINCT FROM d.nombre
      OR v.descripcion IS DISTINCT FROM d.esperado
      ${rollback ? '' : 'OR v.updated_at IS DISTINCT FROM d.actualizado'}
  ) THEN RAISE EXCEPTION 'El catálogo ha cambiado: revisar el lote antes de aplicarlo'; END IF;
  UPDATE public."Vinos" v SET descripcion = d.nuevo, updated_at = now()
  FROM ${filas} WHERE v.id = d.id;
  GET DIAGNOSTICS cambiados = ROW_COUNT;
  IF cambiados <> ${vinos.length} THEN RAISE EXCEPTION 'Número de vinos inesperado: %', cambiados; END IF;
END;
$descripciones_vinos$;`);
