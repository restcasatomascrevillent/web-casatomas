const assert = (valor: unknown, mensaje: string) => { if (!valor) throw new Error(mensaje); };

Deno.test("la precarga solo consulta el diseño público y no genera PDF ni compras", async () => {
  const originalFetch = globalThis.fetch, originalServe = Deno.serve;
  const env = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY"];
  const originales = env.map(k => Deno.env.get(k));
  let handler!: (req: Request) => Promise<Response>;
  const consultas: URL[] = [];
  const plantilla = { pdf_titulo: "Título editado", pdf_subtitulo: "Subtítulo", pdf_instrucciones: "Instrucciones", pdf_pie: "Pie", logo_data: "", color_acento: "#795440", color_fondo: "#faf7f1" };
  Deno.env.set("SUPABASE_URL", "https://supabase.example.com");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "clave-prueba");
  Deno.env.delete("STRIPE_SECRET_KEY");
  Deno.serve = ((fn: typeof handler) => { handler = fn; return {} as Deno.HttpServer; }) as typeof Deno.serve;
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    consultas.push(url);
    assert(url.pathname === "/rest/v1/plantilla_cheques_regalo", "No debe consultar compradores ni crear compras");
    assert(!init?.method || init.method === "GET", "Solo lectura");
    return Promise.resolve(new Response(JSON.stringify(plantilla), { headers: { "Content-Type": "application/json" } }));
  };
  try {
    await import("./index.ts");
    const response = await handler(new Request("https://example.com/cheques-regalo-web/plantilla-vista", { method: "POST", body: "{}" }));
    assert(response.status === 200, "Debe funcionar sin Stripe configurado");
    const data = await response.json();
    assert(JSON.stringify(data.plantilla) === JSON.stringify(plantilla), "Devuelve la plantilla editada");
    assert(consultas.length === 1, "Una única consulta sin generar un PDF");
    assert(consultas[0].searchParams.get("select") === Object.keys(plantilla).join(","), "Solo selecciona campos públicos");
    const preflight = await handler(new Request("https://example.com/cheques-regalo-web/plantilla-vista", { method: "OPTIONS" }));
    assert(preflight.status === 200, "Permite el preflight");
    assert(consultas.length === 1, "Preflight no consulta la base de datos");
  } finally {
    globalThis.fetch = originalFetch; Deno.serve = originalServe;
    env.forEach((k, i) => { if (originales[i] === undefined) Deno.env.delete(k); else Deno.env.set(k, originales[i]!); });
  }
});
