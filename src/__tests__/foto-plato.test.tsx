/**
 * Foto/vídeo de los platos de la carta (`modoFotoPlato`, `videoDePlato`,
 * `FotoPlato`):
 *  - foto `-carta` → sticker animado por CSS; foto antigua → quieta.
 *  - con `video_url` → `<video>` solo tras hidratar, sin reduced-motion y sin
 *    «Ahorro de datos»; en el prerenderizado queda el `<img>` (SEO/LCP).
 *  - en la carta el vídeo arranca solo al verse (sin pulsar nada), se baja
 *    solo cerca de la pantalla y se pausa al salir; en grande sigue siendo vídeo.
 *  - `video_url` ausente (columna sin crear), null o basura → sin vídeo.
 */
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";

import FotoPlato from "@/components/carta/FotoPlato";
import { modoFotoPlato, videoDePlato } from "@/lib/foto-plato";

const STICKER = "https://x.supabase.co/storage/v1/object/public/platos/pulpo-carta.webp";
const ANTIGUA = "https://x.supabase.co/storage/v1/object/public/platos/pulpo.webp";
/** Nombres reales que guarda el panel: `<id>-carta.webp` (alta nueva) y `<id>-carta-<ext>.webp` (procesada). */
const STICKERS_DEL_PANEL = [
  "https://x.supabase.co/storage/v1/object/public/platos/0621b106-carta.webp",
  "https://x.supabase.co/storage/v1/object/public/platos/0621b106-carta-webp.webp",
  "https://x.supabase.co/storage/v1/object/public/platos/0621b106-carta-jpg.webp?t=1774192689021",
];
const VIDEO = "https://x.supabase.co/storage/v1/object/public/platos/pulpo.mp4";

const base = { reducirMovimiento: false, hidratado: true };

describe("modoFotoPlato", () => {
  it("sin foto no hay nada (ni vídeo)", () => {
    expect(modoFotoPlato({ ...base, imagen: null, video: VIDEO })).toBe("ninguna");
  });

  it("foto -carta → sticker; foto antigua → foto", () => {
    expect(modoFotoPlato({ ...base, imagen: STICKER, video: null })).toBe("sticker");
    expect(modoFotoPlato({ ...base, imagen: ANTIGUA, video: null })).toBe("foto");
  });

  it("los nombres que de verdad guarda el panel (-carta.webp, -carta-webp.webp, -carta-jpg.webp) son sticker", () => {
    for (const imagen of STICKERS_DEL_PANEL) {
      expect(modoFotoPlato({ ...base, imagen, video: null }), imagen).toBe("sticker");
    }
  });

  it("lo que NO es de carta sigue siendo foto (carta.webp, -cartas.webp, -carta solo en la consulta)", () => {
    for (const nombre of ["carta.webp", "pulpo-cartas.webp", "pulpo.webp?x=-carta.webp"]) {
      const imagen = `https://x.supabase.co/storage/v1/object/public/platos/${nombre}`;
      expect(modoFotoPlato({ ...base, imagen, video: null }), imagen).toBe("foto");
    }
  });

  it("con vídeo, hidratado y sin reduced-motion → vídeo", () => {
    expect(modoFotoPlato({ ...base, imagen: STICKER, video: VIDEO })).toBe("video");
  });

  it("reduced-motion → la foto (póster), nunca el vídeo", () => {
    expect(
      modoFotoPlato({ ...base, reducirMovimiento: true, imagen: STICKER, video: VIDEO }),
    ).toBe("sticker");
  });

  it("«Ahorro de datos» (Save-Data) → la foto, nunca el vídeo", () => {
    expect(
      modoFotoPlato({ ...base, ahorrarDatos: true, imagen: ANTIGUA, video: VIDEO }),
    ).toBe("foto");
  });

  it("sin hidratar (prerenderizado) → la foto", () => {
    expect(modoFotoPlato({ ...base, hidratado: false, imagen: STICKER, video: VIDEO })).toBe(
      "sticker",
    );
  });

  it("si el vídeo falla se vuelve a la foto", () => {
    expect(
      modoFotoPlato({ ...base, videoFallido: true, imagen: ANTIGUA, video: VIDEO }),
    ).toBe("foto");
  });
});

describe("videoDePlato (columna tolerante)", () => {
  it("columna ausente, null, vacía o no-URL → null", () => {
    expect(videoDePlato({ nombre: "Pulpo" })).toBeNull();
    expect(videoDePlato({ video_url: null })).toBeNull();
    expect(videoDePlato({ video_url: "  " })).toBeNull();
    expect(videoDePlato({ video_url: "javascript:alert(1)" })).toBeNull();
    expect(videoDePlato({ video_url: 42 })).toBeNull();
    expect(videoDePlato(null)).toBeNull();
  });

  it("URL https → la URL", () => {
    expect(videoDePlato({ video_url: ` ${VIDEO} ` })).toBe(VIDEO);
  });

  it("URL con query string del panel (?v=…&fondo=…) → la URL tal cual", () => {
    const conQuery = `${VIDEO}?v=1730000000&fondo=cartulina`;
    expect(videoDePlato({ video_url: conQuery })).toBe(conQuery);
  });
});

describe("CSP de vercel.json", () => {
  it("permite los <video> de Supabase Storage (media-src)", () => {
    // Sin `media-src` la CSP cae en `default-src 'self'` y el navegador
    // bloquea el vídeo de https://<proyecto>.supabase.co/storage/...
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    const csps: string[] = config.headers.flatMap((r: { headers: { key: string; value: string }[] }) =>
      r.headers.filter((h) => h.key === "Content-Security-Policy").map((h) => h.value),
    );
    expect(csps.length).toBeGreaterThan(0);
    for (const csp of csps) {
      const media = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("media-src "));
      expect(media, csp).toBeDefined();
      expect(media!.split(/\s+/)).toEqual(expect.arrayContaining(["'self'", "blob:", "https://*.supabase.co"]));
    }
  });
});

type Observador = {
  cb: IntersectionObserverCallback;
  opciones?: IntersectionObserverInit;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
};

/** IntersectionObserver de mentira: guarda cada observador para dispararlo a mano. */
function simularObservadores() {
  const observadores: Observador[] = [];
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn(function (cb: IntersectionObserverCallback, opciones?: IntersectionObserverInit) {
      const o = { cb, opciones, observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
      observadores.push(o);
      return o;
    }),
  );
  const avisar = (o: Observador | undefined, isIntersecting: boolean) =>
    act(() => {
      o!.cb([{ isIntersecting } as IntersectionObserverEntry], o as unknown as IntersectionObserver);
    });
  return {
    observadores,
    /** El que pone el `src` (con margen, antes de que se vea). */
    carga: () => observadores.find((o) => o.opciones?.rootMargin),
    /** El que decide si se reproduce (se ve) o se pausa. */
    vista: () => observadores.find((o) => !o.opciones?.rootMargin),
    avisar,
  };
}

const espias: { mockRestore: () => void }[] = [];

function espiarVideo() {
  const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  espias.push(play, pause);
  return { play, pause };
}

describe("<FotoPlato>", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    espias.splice(0).forEach((espia) => espia.mockRestore());
  });

  const props = { src: STICKER, imagenOriginal: STICKER, alt: "Pulpo", width: 640, height: 480 };

  it("en el HTML prerenderizado sale el <img> aunque haya vídeo", () => {
    const html = renderToString(<FotoPlato {...props} video={VIDEO} />);
    expect(html).toContain("<img");
    expect(html).toContain('alt="Pulpo"');
    expect(html).not.toContain("<video");
  });

  it("foto -carta → img con la animación sticker y el brillo", () => {
    const { container } = render(<FotoPlato {...props} video={null} />);
    const img = container.querySelector("img")!;
    expect(img.className).toContain("foto-sticker");
    expect(container.querySelector(".foto-sticker-brillo")).not.toBeNull();
  });

  it("la foto procesada por el panel (-carta-webp.webp) → img con la animación sticker y el brillo", () => {
    const imagen = STICKERS_DEL_PANEL[1];
    const { container } = render(<FotoPlato {...props} src={imagen} imagenOriginal={imagen} video={null} />);
    expect(container.querySelector("img")!.getAttribute("data-modo-foto")).toBe("sticker");
    expect(container.querySelector(".foto-sticker-brillo")).not.toBeNull();
  });

  it("foto antigua → img quieta, sin brillo", () => {
    const { container } = render(
      <FotoPlato {...props} src={ANTIGUA} imagenOriginal={ANTIGUA} video={null} />,
    );
    expect(container.querySelector("img")!.className).not.toContain("foto-sticker");
    expect(container.querySelector(".foto-sticker-brillo")).toBeNull();
  });

  it("con vídeo, tras hidratar y lejos de la pantalla → <video> SIN src (no descarga), con póster, en bucle, sin sonido y en línea (iPhone)", () => {
    simularObservadores();
    const { play } = espiarVideo();
    const { container } = render(<FotoPlato {...props} video={VIDEO} />);
    const video = container.querySelector("video")!;
    expect(video).not.toBeNull();
    expect(video.hasAttribute("src")).toBe(false);
    expect(video.getAttribute("poster")).toBe(STICKER);
    expect(video.getAttribute("preload")).toBe("none");
    expect(video.hasAttribute("loop")).toBe(true);
    expect(video.hasAttribute("playsinline")).toBe(true);
    expect(video.muted).toBe(true);
    expect(container.querySelector("img")).toBeNull();
    expect(play).not.toHaveBeenCalled();
  });

  it("al acercarse a la pantalla se pone el src y, al verse, arranca SOLO (sin pulsar nada)", () => {
    const io = simularObservadores();
    const { play } = espiarVideo();
    const { container } = render(<FotoPlato {...props} video={VIDEO} />);
    expect(io.carga()!.opciones!.rootMargin).toBeTruthy();

    io.avisar(io.carga(), true);
    const video = container.querySelector("video")!;
    expect(video.getAttribute("src")).toBe(VIDEO);
    expect(video.getAttribute("preload")).toBe("auto");
    // Con el src puesto ya no hace falta seguir mirando para la carga.
    expect(io.carga()!.disconnect).toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();

    io.avisar(io.vista(), true);
    expect(play).toHaveBeenCalledTimes(1);
    expect(video.muted).toBe(true);
  });

  it("se pausa al salir de pantalla y sigue al volver", () => {
    const io = simularObservadores();
    const { play, pause } = espiarVideo();
    render(<FotoPlato {...props} video={VIDEO} />);
    io.avisar(io.carga(), true);
    io.avisar(io.vista(), true);
    expect(play).toHaveBeenCalledTimes(1);

    io.avisar(io.vista(), false);
    expect(pause).toHaveBeenCalled();
    io.avisar(io.vista(), true);
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("el botón pequeño de la esquina pausa y reanuda; si el cliente lo pausa, no vuelve a arrancar solo", () => {
    const io = simularObservadores();
    const { play, pause } = espiarVideo();
    const { container, getByRole } = render(<FotoPlato {...props} video={VIDEO} />);
    const video = container.querySelector("video")!;
    io.avisar(io.carga(), true);
    io.avisar(io.vista(), true);
    fireEvent.play(video);

    const boton = getByRole("button", { name: "Pausar vídeo" });
    // 32 px a la vista, en la esquina, con 44 px de zona de toque.
    expect(boton.className).toContain("h-8");
    expect(boton.className).toContain("w-8");
    expect(boton.className).toContain("before:-inset-1.5");
    expect(boton.className).toContain("bottom-1.5");

    Object.defineProperty(video, "paused", { configurable: true, value: false });
    pause.mockClear();
    fireEvent.click(boton);
    expect(pause).toHaveBeenCalled();
    Object.defineProperty(video, "paused", { configurable: true, value: true });
    fireEvent.pause(video);
    expect(getByRole("button", { name: "Reproducir vídeo" })).not.toBeNull();

    play.mockClear();
    io.avisar(io.vista(), false);
    io.avisar(io.vista(), true);
    expect(play).not.toHaveBeenCalled();

    fireEvent.click(getByRole("button", { name: "Reproducir vídeo" }));
    expect(play).toHaveBeenCalled();
  });

  it("si el navegador no deja arrancar solo (iPhone en ahorro de batería), el botón lo arranca", async () => {
    const io = simularObservadores();
    const { play } = espiarVideo();
    play.mockRejectedValueOnce(new DOMException("bloqueado", "NotAllowedError"));
    const { getByRole } = render(<FotoPlato {...props} video={VIDEO} />);
    io.avisar(io.carga(), true);
    io.avisar(io.vista(), true);
    await act(async () => undefined);
    // No sonó: el botón ofrece reproducir, y al pulsarlo se reproduce.
    fireEvent.click(getByRole("button", { name: "Reproducir vídeo" }));
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("pulsar el botón no abre la vista en grande (no se propaga el clic)", () => {
    simularObservadores();
    espiarVideo();
    const abrir = vi.fn();
    const { getByRole } = render(
      <div onClick={abrir}>
        <FotoPlato {...props} video={VIDEO} />
      </div>,
    );
    fireEvent.click(getByRole("button", { name: "Reproducir vídeo" }));
    expect(abrir).not.toHaveBeenCalled();
  });

  it("el botón usa las etiquetas traducidas que recibe", () => {
    simularObservadores();
    const { getByRole } = render(
      <FotoPlato {...props} video={VIDEO} etiquetaReproducir="Play video" />,
    );
    expect(getByRole("button", { name: "Play video" })).not.toBeNull();
  });

  it("sin IntersectionObserver (navegador antiguo) arranca sin más", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { play } = espiarVideo();
    const { container } = render(<FotoPlato {...props} video={VIDEO} />);
    expect(container.querySelector("video")!.getAttribute("src")).toBe(VIDEO);
    expect(play).toHaveBeenCalled();
  });

  it("con reduced-motion → solo la foto", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    const { container } = render(<FotoPlato {...props} video={VIDEO} />);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("con «Ahorro de datos» (Save-Data) → solo la foto", () => {
    simularObservadores();
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    });
    try {
      const { container } = render(<FotoPlato {...props} video={VIDEO} />);
      expect(container.querySelector("video")).toBeNull();
      expect(container.querySelector("img")).not.toBeNull();
    } finally {
      delete (navigator as { connection?: unknown }).connection;
    }
  });

  it("si el vídeo da error, vuelve a la foto", () => {
    const io = simularObservadores();
    espiarVideo();
    const { container } = render(<FotoPlato {...props} video={VIDEO} />);
    io.avisar(io.carga(), true);
    fireEvent.error(container.querySelector("video")!);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
  });

  describe("en grande (variante ampliada)", () => {
    it("con vídeo, sigue siendo vídeo: arranca enseguida, sin sonido, en bucle, en línea y con la foto de póster", () => {
      const io = simularObservadores();
      const { play } = espiarVideo();
      const { container, getByRole } = render(
        <FotoPlato {...props} variante="ampliada" video={VIDEO} />,
      );
      const video = container.querySelector("video")!;
      expect(video.getAttribute("src")).toBe(VIDEO);
      expect(video.getAttribute("poster")).toBe(STICKER);
      expect(video.autoplay).toBe(true);
      expect(video.muted).toBe(true);
      expect(video.hasAttribute("loop")).toBe(true);
      expect(video.hasAttribute("playsinline")).toBe(true);
      expect(video.className).toContain("object-contain");
      expect(play).toHaveBeenCalled();
      // Se ve entero: no hay observadores de pantalla.
      expect(io.observadores).toHaveLength(0);
      expect(container.querySelector("img")).toBeNull();

      fireEvent.play(video);
      expect(getByRole("button", { name: "Pausar vídeo" }).className).toContain("h-11");
    });

    it("sin vídeo → la foto entera, sin animación de sticker", () => {
      const { container } = render(<FotoPlato {...props} variante="ampliada" video={null} />);
      const img = container.querySelector("img")!;
      expect(img.className).toContain("object-contain");
      expect(img.className).not.toContain("foto-sticker");
      expect(container.querySelector(".foto-sticker-brillo")).toBeNull();
    });

    it("con reduced-motion → la foto, no el vídeo", () => {
      vi.stubGlobal(
        "matchMedia",
        vi.fn().mockReturnValue({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      );
      const { container } = render(<FotoPlato {...props} variante="ampliada" video={VIDEO} />);
      expect(container.querySelector("video")).toBeNull();
      expect(container.querySelector("img")!.getAttribute("src")).toBe(STICKER);
    });
  });
});
