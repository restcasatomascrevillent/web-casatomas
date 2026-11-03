/**
 * Foto/vídeo de los platos de la carta (`modoFotoPlato`, `videoDePlato`,
 * `FotoPlato`):
 *  - foto `-carta` → sticker animado por CSS; foto antigua → quieta.
 *  - con `video_url` → `<video>` solo tras hidratar y sin reduced-motion;
 *    en el prerenderizado queda el `<img>` (SEO/LCP).
 *  - `video_url` ausente (columna sin crear), null o basura → sin vídeo.
 */
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

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

describe("<FotoPlato>", () => {
  afterEach(() => vi.unstubAllGlobals());

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

  it("con vídeo, tras hidratar → <video> SIN src (no descarga) con póster, preload=none y botón «Reproducir vídeo» de 44 px", () => {
    const { container, getByRole } = render(<FotoPlato {...props} video={VIDEO} />);
    const video = container.querySelector("video")!;
    expect(video).not.toBeNull();
    expect(video.hasAttribute("src")).toBe(false);
    expect(video.getAttribute("poster")).toBe(STICKER);
    expect(video.getAttribute("preload")).toBe("none");
    expect(video.hasAttribute("loop")).toBe(true);
    expect(video.hasAttribute("playsinline")).toBe(true);
    expect(video.muted).toBe(true);
    expect(container.querySelector("img")).toBeNull();
    const boton = getByRole("button", { name: "Reproducir vídeo" });
    expect(boton.className).toContain("h-11");
    expect(boton.className).toContain("w-11");
  });

  it("al pulsar «Reproducir vídeo» se asigna el src y se reproduce", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const { container, getByRole } = render(<FotoPlato {...props} video={VIDEO} />);
    fireEvent.click(getByRole("button", { name: "Reproducir vídeo" }));
    expect(container.querySelector("video")!.getAttribute("src")).toBe(VIDEO);
    expect(play).toHaveBeenCalled();
    play.mockRestore();
  });

  it("el botón usa las etiquetas traducidas que recibe", () => {
    const { getByRole } = render(
      <FotoPlato {...props} video={VIDEO} etiquetaReproducir="Play video" />,
    );
    expect(getByRole("button", { name: "Play video" })).not.toBeNull();
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

  it("tras pulsar, pausa al salir de pantalla (nunca arranca solo)", () => {
    let callback: IntersectionObserverCallback = () => undefined;
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(function (this: unknown, cb: IntersectionObserverCallback) {
        callback = cb;
        return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
      }),
    );
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});

    const { getByRole, unmount } = render(<FotoPlato {...props} video={VIDEO} />);
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(getByRole("button", { name: "Reproducir vídeo" }));
    expect(play).toHaveBeenCalledTimes(1);
    pause.mockClear();
    callback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(pause).toHaveBeenCalled();
    unmount();

    play.mockRestore();
    pause.mockRestore();
  });

  it("si el vídeo da error, vuelve a la foto", () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const { container, getByRole } = render(<FotoPlato {...props} video={VIDEO} />);
    fireEvent.click(getByRole("button", { name: "Reproducir vídeo" }));
    fireEvent.error(container.querySelector("video")!);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
  });
});
