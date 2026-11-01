import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Expand, Sun, X } from "lucide-react";
import ImagenResponsive, { type NombreImagen } from "@/components/ImagenResponsive";
import { useTranslations } from "@/i18n/LanguageProvider";
import { NEGOCIO } from "@/lib/negocio";
import "./espacios-gallery.css";

const photos: NombreImagen[][] = [
  ["salon-5", "salon-1", "salon-2", "salon-3", "salon-4"],
  ["comedor-1", "comedor-2", "comedor-3"],
  [],
];

const copy = {
  es: { names: ["Salón", "Comedor", "Terraza"], title: "Nuestros espacios", subtitle: "Un entorno para cada ocasión", view: "Ver todas las fotos", pending: "Fotografías próximamente", previous: "Foto anterior", next: "Foto siguiente", close: "Cerrar galería", expand: "Ampliar fotografía", photo: "Fotografía", alt: "{name} de {negocio}, {localidad} — fotografía {n}", gallery: "Galería de", swipe: "Desliza para explorar" },
  en: { names: ["Lounge", "Dining room", "Terrace"], title: "Our spaces", subtitle: "A setting for every occasion", view: "View all photos", pending: "Photographs coming soon", previous: "Previous photo", next: "Next photo", close: "Close gallery", expand: "Enlarge photo", photo: "Photo", alt: "{name} at {negocio}, {localidad} — photo {n}", gallery: "Gallery of", swipe: "Swipe to explore" },
  fr: { names: ["Salon", "Salle à manger", "Terrasse"], title: "Nos espaces", subtitle: "Un cadre pour chaque occasion", view: "Voir toutes les photos", pending: "Photographies à venir", previous: "Photo précédente", next: "Photo suivante", close: "Fermer la galerie", expand: "Agrandir la photo", photo: "Photographie", alt: "{name} de {negocio}, {localidad} — photographie {n}", gallery: "Galerie de", swipe: "Faites glisser pour découvrir" },
};

export default function EspaciosGallery({ portalContainer }: { portalContainer?: HTMLElement } = {}) {
  const { language, t } = useTranslations();
  const labels = copy[language];
  const [space, setSpace] = useState(0);
  const [current, setCurrent] = useState(0);
  const [opened, setOpened] = useState(false);
  const [start, setStart] = useState(0);
  const opener = useRef<HTMLButtonElement | null>(null);
  const mainViewport = useRef<HTMLDivElement | null>(null);
  const mainIndex = useRef(0);
  const scrollFrame = useRef<number | null>(null);
  const images = photos[space];
  const [viewport, api] = useEmblaCarousel({ startIndex: start, loop: false });
  const [viewed, setViewed] = useState<Set<number>>(new Set([0, 1]));
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!api) return;
    const select = () => {
      const index = api.selectedScrollSnap();
      setCurrent(index);
      mainIndex.current = index;
      setViewed((previous) => new Set([...previous, index - 1, index, index + 1]));
    };
    select();
    api.on("select", select);
    api.on("reInit", select);
    return () => { api.off("select", select); api.off("reInit", select); };
  }, [api]);

  const open = (index: number, trigger: HTMLButtonElement) => {
    if (scrollFrame.current !== null) {
      cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
    }
    opener.current = trigger;
    setStart(index);
    setCurrent(index);
    mainIndex.current = index;
    setViewed(new Set([index - 1, index, index + 1]));
    setOpened(true);
  };
  const move = useCallback((direction: number) => {
    if (api) api.scrollTo(api.selectedScrollSnap() + direction, reducedMotion);
  }, [api, reducedMotion]);
  const selectSpace = (index: number) => { setSpace(index); setCurrent(0); mainIndex.current = 0; };
  const scrollToPhoto = (index: number) => {
    const node = mainViewport.current;
    if (!node) return;
    node.scrollTo({ left: node.clientWidth * index, behavior: reducedMotion ? "auto" : "smooth" });
  };
  const onPhotoScroll = () => {
    if (opened || scrollFrame.current !== null) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null;
      const node = mainViewport.current;
      if (!node || !node.clientWidth) return;
      const index = Math.max(0, Math.min(images.length - 1, Math.round(node.scrollLeft / node.clientWidth)));
      mainIndex.current = index;
      setCurrent((previous) => previous === index ? previous : index);
    });
  };
  useEffect(() => {
    const node = mainViewport.current;
    if (!node || opened) return;
    const align = () => node.scrollTo({ left: mainIndex.current * node.clientWidth, behavior: "auto" });
    align();
    const observer = new ResizeObserver(align);
    observer.observe(node);
    return () => observer.disconnect();
  }, [space, opened]);
  useEffect(() => () => {
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
  }, []);
  const name = labels.names[space];
  // Con la marca y la localidad: el nombre del espacio solo ("Salón —
  // fotografía 1") no dice en qué restaurante ni dónde, para quien llega
  // a la foto desde una búsqueda de imágenes.
  const altFoto = (index: number) =>
    labels.alt
      .replace("{name}", name)
      .replace("{negocio}", NEGOCIO.nombre)
      .replace("{localidad}", NEGOCIO.localidad)
      .replace("{n}", String(index + 1));

  return (
    <div className="ct-spaces">
      <header className="ct-heading">
        <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">{labels.title}</h2>
        <p>{labels.subtitle}</p>
      </header>
      <div className="ct-tabs" aria-label={labels.title}>
        {labels.names.map((item, index) => <button type="button" key={item} aria-pressed={space === index} onClick={() => selectSpace(index)}>{item}</button>)}
      </div>
      {images.length > 0 ? (
        <>
          <div className="ct-mosaic">
            <div className="ct-main-viewport" ref={mainViewport} key={space} onScroll={onPhotoScroll} role="region" aria-label={labels.gallery + " " + name}>
              {images.map((photo, index) => (
                <button type="button" className="ct-main-photo" key={photo}
                  tabIndex={index === current ? 0 : -1}
                  aria-label={`${labels.expand}: ${name}, ${index + 1}`}
                  onClick={(event) => open(index, event.currentTarget)}>
                  <ImagenResponsive nombre={photo} alt={altFoto(index)} sizes="(max-width: 700px) 100vw, (max-width: 1200px) 65vw, 820px" loading="lazy" decoding="async" draggable={false} />
                  <span className="ct-expand"><Expand size={18} aria-hidden="true" /></span>
                  <span className="ct-photo-label">{name}<span>{String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</span></span>
                </button>
              ))}
            </div>
            <div className="ct-side-photos">
              {[1, 2].map((offset) => {
                const index = (current + offset) % images.length;
                return <button type="button" key={offset} aria-label={`${labels.expand}: ${name}, ${index + 1}`} onClick={(event) => open(index, event.currentTarget)}>
                  <ImagenResponsive nombre={images[index]} alt={altFoto(index)} sizes="(max-width: 1200px) 30vw, 360px" loading="lazy" decoding="async" />
                  {offset === 2 && <span className="ct-all-label">{labels.view} <ArrowUpRight size={16} aria-hidden="true" /></span>}
                </button>;
              })}
            </div>
          </div>
          <div className="ct-caption">
            <p>{t.espacios.cards[space].description}</p>
            <div className="ct-navigation">
              <button type="button" className="ct-round" aria-label={labels.previous} disabled={current === 0} onClick={() => scrollToPhoto(current - 1)}><ArrowLeft size={18} aria-hidden="true" /></button>
              <span className="ct-count" aria-live="polite">{current + 1} / {images.length}</span>
              <button type="button" className="ct-round" aria-label={labels.next} disabled={current === images.length - 1} onClick={() => scrollToPhoto(current + 1)}><ArrowRight size={18} aria-hidden="true" /></button>
              <button type="button" className="ct-view-all" onClick={(event) => open(current, event.currentTarget)}>{labels.view} <ArrowUpRight size={17} aria-hidden="true" /></button>
            </div>
          </div>
        </>
      ) : (
        <div className="ct-terrace">
          <Sun size={32} strokeWidth={1} aria-hidden="true" />
          <h3>{name}</h3>
          <p>{t.espacios.cards[space].description}</p>
          <span>{labels.pending}</span>
        </div>
      )}
      <Dialog.Root open={opened} onOpenChange={setOpened}>
        <Dialog.Portal container={portalContainer}>
          <Dialog.Overlay className="ct-viewer-overlay" />
          <Dialog.Content className="ct-viewer" onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = opener.current?.classList.contains("ct-main-photo")
              ? mainViewport.current?.querySelectorAll<HTMLButtonElement>(".ct-main-photo")[mainIndex.current]
              : opener.current;
            target?.focus({ preventScroll: true });
          }} onKeyDown={(event) => {
            if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
            if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
          }}>
            <header className="ct-viewer-header">
              <Dialog.Title>{name}</Dialog.Title>
              <Dialog.Close className="ct-round" aria-label={labels.close}><X size={22} aria-hidden="true" /></Dialog.Close>
            </header>
            <Dialog.Description className="ct-sr-only">{labels.gallery} {name}. {labels.swipe}.</Dialog.Description>
            <div className="ct-viewer-stage">
              <button type="button" className="ct-round ct-prev" aria-label={labels.previous} disabled={current === 0} onClick={() => move(-1)}><ArrowLeft size={22} aria-hidden="true" /></button>
              <div className="ct-viewport" ref={viewport}>
                <div className="ct-track">
                  {images.map((photo, index) => <div className="ct-slide" key={photo} aria-hidden={index !== current}>
                    {viewed.has(index) && <ImagenResponsive nombre={photo} alt={altFoto(index)} sizes="(max-width: 700px) 100vw, 900px" loading={index === current ? "eager" : "lazy"} decoding="async" />}
                  </div>)}
                </div>
              </div>
              <button type="button" className="ct-round ct-next" aria-label={labels.next} disabled={current === images.length - 1} onClick={() => move(1)}><ArrowRight size={22} aria-hidden="true" /></button>
            </div>
            <footer className="ct-viewer-footer">
              <div className="ct-thumbnails" aria-label={labels.gallery + " " + name}>
                {images.map((photo, index) => <button type="button" key={photo} aria-label={`${labels.photo} ${index + 1}`} aria-pressed={index === current} onClick={() => api?.scrollTo(index, reducedMotion)}>
                  <ImagenResponsive nombre={photo} alt="" sizes="72px" loading="lazy" decoding="async" />
                </button>)}
              </div>
              <div className="ct-viewer-status"><span>{labels.swipe}</span><span aria-live="polite">{String(current + 1).padStart(2, "0")} <span>/ {String(images.length).padStart(2, "0")}</span></span></div>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
