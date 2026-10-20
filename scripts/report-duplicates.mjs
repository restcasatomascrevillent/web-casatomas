import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const loadEnv = () => {
  const envPath = path.join(process.cwd(), ".env");
  const envFile = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
  return envFile.split("\n").reduce((acc, line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      acc[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
    }
    return acc;
  }, {});
};

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("❌ Missing Supabase env vars. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function fetchTable(table, fields) {
  const { data, error } = await supabase.from(table).select(fields).eq("activado", true);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

function findDuplicates(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = `${(row.nombre || "").trim().toUpperCase()}||${(row.categoria || "").trim().toUpperCase()}`;
    const entry = map.get(key) || { count: 0, items: [] };
    entry.count += 1;
    entry.items.push(row);
    map.set(key, entry);
  }
  return [...map.entries()]
    .filter(([, value]) => value.count > 1)
    .sort((a, b) => b[1].count - a[1].count);
}

const summarize = (dups) =>
  dups.map(([, { items }]) => ({
    nombre: items[0]?.nombre,
    categoria: items[0]?.categoria,
    count: items.length,
    ids: items.map((i) => i.id),
    precios: [...new Set(items.map((i) => i.precio_eur))],
  }));

(async () => {
  const platos = await fetchTable("Platos", "id,nombre,categoria,precio_eur");
  const vinos = await fetchTable("Vinos", "id,nombre,categoria,precio_eur,denominacion_origen");

  const dupPlatos = summarize(findDuplicates(platos));
  const dupVinos = summarize(findDuplicates(vinos));

  console.log("Duplicados encontrados (solo activados):");
  console.log(JSON.stringify({ platos: dupPlatos, vinos: dupVinos }, null, 2));

  if (dupVinos.length === 0 && dupPlatos.length === 0) {
    console.log("No duplicates detected.");
  }
})();
