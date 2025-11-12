import { supabase } from "@/integrations/supabase/client";
import cartaCompleta from "@/data/carta_completa.json";
import vinosData from "@/data/vinos.json";

export const migrateDataToSupabase = async () => {
  try {
    console.log("Iniciando migración de datos...");

    // Migrar platos
    const platosToInsert = [];
    for (const category of cartaCompleta.menu) {
      for (const item of category.items) {
        platosToInsert.push({
          nombre: item.name,
          categoria: category.category,
          precio_eur: item.price_eur,
          unidad: (item as any).unit || null,
          descripcion: (item as any).description || null,
          alergenos_oficiales: item.alergenos?.oficiales || [],
          alergenos_inferidos: item.alergenos?.inferidos || [],
          alergenos_notas: item.alergenos?.notas || null,
          activado: true,
        });
      }
    }

    console.log(`Insertando ${platosToInsert.length} platos...`);
    const { error: platosError } = await supabase
      .from('platos')
      .insert(platosToInsert);

    if (platosError) {
      console.error('Error insertando platos:', platosError);
      throw platosError;
    }

    console.log("✅ Platos insertados correctamente");

    // Migrar vinos
    const vinosToInsert = [];
    for (const category of vinosData.menu) {
      for (const vino of category.items) {
        vinosToInsert.push({
          nombre: vino.name,
          categoria: category.category,
          precio_eur: vino.price_eur,
          denominacion_origen: vino.denominacion_origen || null,
          ubicacion_pais: vino.ubicacion?.pais || null,
          ubicacion_region: vino.ubicacion?.region || null,
          descripcion: null,
          alergenos_oficiales: (vino as any).alergenos?.oficiales || [],
          alergenos_inferidos: (vino as any).alergenos?.inferidos || [],
          alergenos_notas: (vino as any).alergenos?.notas || null,
          activado: true,
        });
      }
    }

    console.log(`Insertando ${vinosToInsert.length} vinos...`);
    const { error: vinosError } = await supabase
      .from('vinos')
      .insert(vinosToInsert);

    if (vinosError) {
      console.error('Error insertando vinos:', vinosError);
      throw vinosError;
    }

    console.log("✅ Vinos insertados correctamente");
    console.log("✅ Migración completada!");

    return {
      success: true,
      platosInserted: platosToInsert.length,
      vinosInserted: vinosToInsert.length,
    };
  } catch (error) {
    console.error('Error en la migración:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
};
