import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Import menu data
    const menuData = await import('../../../src/data/carta_completa.json', {
      assert: { type: 'json' }
    });

    const menu = menuData.default.menu;
    const platosToInsert = [];
    
    // Process menu items
    for (const category of menu) {
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

    // Insert platos
    const { error: platosError } = await supabaseClient
      .from('platos')
      .insert(platosToInsert);

    if (platosError) throw platosError;

    // Import vinos data
    const vinosData = await import('../../../src/data/vinos.json', {
      assert: { type: 'json' }
    });

    const vinosToInsert = [];
    const vinosMenu = (vinosData.default as any).menu;
    
    if (Array.isArray(vinosMenu)) {
      for (const category of vinosMenu) {
        for (const vino of category.items) {
        vinosToInsert.push({
          nombre: vino.name,
          categoria: category.category,
          precio_eur: vino.price_eur,
          denominacion_origen: vino.denominacion_origen || null,
          ubicacion_pais: vino.ubicacion?.pais || null,
          ubicacion_region: vino.ubicacion?.region || null,
          descripcion: null,
          alergenos_oficiales: vino.alergenos?.oficiales || [],
          alergenos_inferidos: vino.alergenos?.inferidos || [],
          alergenos_notas: vino.alergenos?.notas || null,
          activado: true,
        });
      }
    }
    }

    // Insert vinos
    const { error: vinosError } = await supabaseClient
      .from('vinos')
      .insert(vinosToInsert);

    if (vinosError) throw vinosError;

    return new Response(
      JSON.stringify({
        success: true,
        platosInserted: platosToInsert.length,
        vinosInserted: vinosToInsert.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
