import { describe, expect, it } from "vitest";
import es from "@/i18n/languages/es";
import en from "@/i18n/languages/en";
import fr from "@/i18n/languages/fr";

const packs = { es, en, fr };
const nombre = { es: "Mi mesa", en: "My table", fr: "Ma table" } as const;

/** Todas las cadenas de un objeto de traducciones, en profundidad. */
const cadenas = (valor: unknown): string[] =>
  typeof valor === "string"
    ? [valor]
    : Array.isArray(valor)
      ? valor.flatMap(cadenas)
      : valor && typeof valor === "object"
        ? Object.values(valor).flatMap(cadenas)
        : [];

describe.each(Object.entries(packs))("Mi mesa — textos (%s)", (idioma, pack) => {
  const t = pack.translations;
  const mesa = nombre[idioma as keyof typeof nombre];

  it("usa el nombre «Mi mesa» en botón, título, toasts y aria", () => {
    expect(t.preview.title).toBe(mesa);
    expect(t.preview.floatingLabel).toBe(mesa);
    expect(t.carta.buttons.pedido).toBe(mesa);
    expect(t.platos.toasts.addedTitle).toContain(mesa);
    expect(t.vinos.toasts.addedTitle).toContain(mesa);
    expect(t.bebidas.toasts.addedTitle).toContain(mesa);
    expect(t.platos.addAria).toContain(mesa);
    expect(t.platos.addAria).toContain("{name}");
    expect(t.preview.openTicketAria).toContain("{count}");
  });

  it("avisa de que los precios son orientativos y no es un pedido online", () => {
    expect(t.preview.note).toMatch(/·/);
    expect(t.preview.note.length).toBeGreaterThan(10);
  });

  it("tiene los textos del reparto, compartir, reservar y Tomy con sus marcadores", () => {
    expect(t.preview.perPerson).toContain("{amount}");
    expect(t.preview.bookCta).toContain("{n}");
    expect(t.preview.aiPrompt).toContain("{n}");
    expect(t.preview.aiQuestion).toContain("{n}");
    expect(t.preview.aiQuestion).toContain("{items}");
    expect(t.preview.personDefault).toContain("{n}");
    expect(t.preview.sharedLine).toContain("{each}");
    expect(t.preview.share.summaryPerPerson).toContain("{amount}");
    expect(t.reservationForm.largeGroupNotice).toContain("{phone}");
    expect(t.preview.share.cta.length).toBeGreaterThan(0);
    expect(t.preview.share.download.length).toBeGreaterThan(0);
  });

  it("ya no habla de «pedido», «order» ni «commande» al visitante", () => {
    const visibles = cadenas({
      carta: t.carta,
      platos: t.platos,
      vinos: t.vinos,
      bebidas: t.bebidas,
      preview: t.preview,
    });
    const prohibido = /\bpedido\b(?! online)|(?<!online )\border\b|\bcommande\b(?! en ligne)/i;
    const coinciden = visibles.filter((s) => prohibido.test(s));
    expect(coinciden).toEqual([]);
  });
});
