/**
 * Núcleo del rastreador de actividad (Super Admin › Logs). Sin DOM global:
 * todo lo que toca el navegador se inyecta, para probarlo con vitest.
 *
 *  · Sesión seudónima: UUID aleatorio; 30 min sin actividad abren otra.
 *    Visitante seudónimo: UUID aleatorio que caduca a los 6 meses. Los dos solo
 *    se guardan (localStorage `ct_actividad`) con el consentimiento
 *    «Estadísticas»; si se retira, se borran y deja de mandarse actividad.
 *  · Sin consentimiento: solo errores, con un id efímero de la pestaña (en
 *    memoria) que sirve para relacionar los errores de esa carga de página.
 *  · Cada evento lleva un id propio y una secuencia: los reenvíos no se
 *    duplican en el servidor y el recorrido sale en orden.
 *  · Lotes: cada 5 s o 20 eventos; al ocultar/cerrar la página, sendBeacon.
 *    Si el envío falla, el lote se reintenta (mismos ids) con espera creciente.
 *  · Topes: 300 eventos por carga de página y 3 repeticiones del mismo error.
 */

import type { DatosActividad } from "./registro";

export const CLAVE_ALMACEN = "ct_actividad";
export const INACTIVIDAD_SESION_MS = 30 * 60_000;
export const VIDA_VISITANTE_MS = 182 * 86_400_000;
const MAX_LOTE = 20;
const ESPERA_LOTE_MS = 5_000;
const MAX_EVENTOS_CARGA = 300;
const MAX_COLA = 200;
const MAX_REPETICION_ERROR = 3;
const VENTANA_DUPLICADO_MS = 400;

/** Tipos que se mandan sin consentimiento (técnicos, sin identificadores persistentes). */
export const SIN_CONSENTIMIENTO = new Set(["error_js", "error_promesa", "error_recurso", "error_peticion", "error_react", "error_404"]);

export interface EventoCliente {
  id: string;
  t: string;
  tipo: string;
  accion?: string;
  sesion?: string;
  visitante?: string | null;
  seq?: number;
  ruta?: string;
  objetivo?: string | null;
  valor?: number | null;
  props?: Record<string, string | number | boolean>;
  error?: { mensaje?: string; pila?: string };
}

export interface EntornoRastreador {
  url: string;
  ahora: () => number;
  uuid: () => string;
  almacen: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  consentimiento: () => boolean;
  /** Envía un lote; `beacon` = la página se está cerrando. Devuelve si el servidor lo aceptó. */
  enviar: (cuerpo: string, beacon: boolean) => Promise<boolean>;
  rutaActual: () => string;
  contexto: () => { version: string | null; despliegue: string | null; interno: boolean; prueba: boolean; tactil: boolean };
  temporizador?: { set: (fn: () => void, ms: number) => unknown; clear: (id: unknown) => void };
}

interface Almacenado {
  v: string; // visitante
  vc: number; // creado
  s: string; // sesión
  su: number; // última actividad
  q: number; // secuencia
}

export class Rastreador {
  private cola: EventoCliente[] = [];
  private enCurso = false;
  private temporizadorId: unknown = null;
  private reintentos = 0;
  private enviadosCarga = 0;
  private sesionEfimera: string;
  private seqEfimera = 0;
  private ultimoEvento: { clave: string; t: number } | null = null;
  private erroresVistos = new Map<string, number>();
  private consentimientoPrevio: boolean;

  constructor(private readonly e: EntornoRastreador) {
    this.sesionEfimera = e.uuid();
    this.consentimientoPrevio = e.consentimiento();
  }

  /** Lee o crea la sesión persistente (solo con consentimiento). */
  private sesion(): { sesion: string; visitante: string | null; seq: number } {
    const ahora = this.e.ahora();
    if (!this.e.consentimiento() || !this.e.almacen) {
      return { sesion: this.sesionEfimera, visitante: null, seq: ++this.seqEfimera };
    }
    let a: Almacenado | null = null;
    try {
      a = JSON.parse(this.e.almacen.getItem(CLAVE_ALMACEN) ?? "null");
    } catch {
      a = null;
    }
    if (!a || typeof a.v !== "string" || ahora - a.vc > VIDA_VISITANTE_MS) {
      a = { v: this.e.uuid(), vc: ahora, s: this.e.uuid(), su: ahora, q: 0 };
    } else if (ahora - a.su > INACTIVIDAD_SESION_MS) {
      a = { ...a, s: this.e.uuid(), su: ahora, q: 0 };
    }
    a.q += 1;
    a.su = ahora;
    try {
      this.e.almacen.setItem(CLAVE_ALMACEN, JSON.stringify(a));
    } catch {
      // almacenamiento lleno o bloqueado: la sesión vive en memoria esta vez
    }
    return { sesion: a.s, visitante: a.v, seq: a.q };
  }

  /** ¿Empieza una sesión nueva con el próximo evento? (para mandar la procedencia). */
  sesionNueva(): boolean {
    if (!this.e.consentimiento() || !this.e.almacen) return this.seqEfimera === 0;
    try {
      const a: Almacenado | null = JSON.parse(this.e.almacen.getItem(CLAVE_ALMACEN) ?? "null");
      return !a || this.e.ahora() - a.su > INACTIVIDAD_SESION_MS || this.e.ahora() - a.vc > VIDA_VISITANTE_MS;
    } catch {
      return true;
    }
  }

  /** Cambió el consentimiento: al retirarlo se borran los identificadores y la actividad pendiente. */
  revisarConsentimiento(): void {
    const ahora = this.e.consentimiento();
    if (this.consentimientoPrevio && !ahora) {
      try {
        this.e.almacen?.removeItem(CLAVE_ALMACEN);
      } catch {
        // ignorado
      }
      this.cola = this.cola.filter((ev) => SIN_CONSENTIMIENTO.has(ev.tipo));
    }
    this.consentimientoPrevio = ahora;
  }

  registrar(tipo: string, d: DatosActividad = {}): EventoCliente | null {
    const conConsentimiento = this.e.consentimiento();
    if (!SIN_CONSENTIMIENTO.has(tipo) && !conConsentimiento) return null;
    if (this.enviadosCarga >= MAX_EVENTOS_CARGA) return null;
    const ruta = d.ruta ?? this.e.rutaActual();
    const ahora = this.e.ahora();

    // El mismo evento dos veces seguidas (doble clic, efecto repetido): uno.
    const clave = `${tipo}|${d.accion ?? ""}|${d.objetivo ?? ""}|${ruta}|${d.valor ?? ""}`;
    // Los errores no: dos iguales seguidos son dos fallos (tienen su propio tope de repeticiones, abajo).
    const esError = tipo.startsWith("error_");
    if (!esError && tipo !== "pagina_salida" && tipo !== "scroll" && this.ultimoEvento?.clave === clave && ahora - this.ultimoEvento.t < VENTANA_DUPLICADO_MS) return null;
    this.ultimoEvento = { clave, t: ahora };

    if (esError) {
      const firma = `${tipo}|${(d.error?.mensaje ?? d.objetivo ?? "").slice(0, 120)}`;
      const n = (this.erroresVistos.get(firma) ?? 0) + 1;
      this.erroresVistos.set(firma, n);
      if (n > MAX_REPETICION_ERROR) return null;
    }

    const { sesion, visitante, seq } = this.sesion();
    const props: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(d.props ?? {})) {
      if (v !== null && v !== undefined && (typeof v !== "number" || Number.isFinite(v))) props[k] = v as string | number | boolean;
    }
    const ev: EventoCliente = {
      id: this.e.uuid(),
      t: new Date(ahora).toISOString(),
      tipo,
      ...(d.accion ? { accion: d.accion } : {}),
      sesion,
      visitante,
      seq,
      ruta,
      ...(d.objetivo ? { objetivo: String(d.objetivo).slice(0, 120) } : {}),
      ...(typeof d.valor === "number" && Number.isFinite(d.valor) ? { valor: d.valor } : {}),
      ...(Object.keys(props).length ? { props } : {}),
      ...(d.error ? { error: { mensaje: d.error.mensaje?.slice(0, 500), pila: d.error.pila?.slice(0, 4000) } } : {}),
    };
    this.enviadosCarga++;
    this.cola.push(ev);
    if (this.cola.length > MAX_COLA) this.cola.splice(0, this.cola.length - MAX_COLA);
    if (this.cola.length >= MAX_LOTE || tipo.startsWith("error_") || ev.tipo === "reserva_solicitada" || ev.tipo === "cheque_pagado") {
      void this.vaciar();
    } else this.programar(ESPERA_LOTE_MS);
    return ev;
  }

  private programar(ms: number) {
    if (this.temporizadorId !== null) return;
    const t = this.e.temporizador ?? { set: (fn: () => void, m: number) => setTimeout(fn, m), clear: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>) };
    this.temporizadorId = t.set(() => {
      this.temporizadorId = null;
      void this.vaciar();
    }, ms);
  }

  private cuerpo(eventos: EventoCliente[]): string {
    return JSON.stringify({ v: 1, contexto: { consentimiento: this.e.consentimiento(), ...this.e.contexto() }, eventos });
  }

  /** Manda lo pendiente. Con `beacon`, todo de golpe y sin esperar respuesta (la página se va). */
  async vaciar(beacon = false): Promise<void> {
    if (!this.cola.length) return;
    if (beacon) {
      while (this.cola.length) {
        const lote = this.cola.splice(0, MAX_LOTE * 2);
        void this.e.enviar(this.cuerpo(lote), true).catch(() => false);
      }
      return;
    }
    if (this.enCurso) return;
    this.enCurso = true;
    const lote = this.cola.splice(0, MAX_LOTE * 2);
    let ok = false;
    try {
      ok = await this.e.enviar(this.cuerpo(lote), false);
    } catch {
      ok = false;
    }
    this.enCurso = false;
    if (ok) {
      this.reintentos = 0;
      if (this.cola.length) void this.vaciar();
      return;
    }
    // Falló: vuelve delante de la cola, con los MISMOS ids (el servidor no duplica).
    this.cola.unshift(...lote);
    if (this.cola.length > MAX_COLA) this.cola.splice(MAX_COLA);
    this.reintentos++;
    if (this.reintentos <= 5) this.programar(Math.min(2_000 * 2 ** this.reintentos, 60_000));
  }

  /** Para pruebas y para el cierre. */
  pendientes(): EventoCliente[] {
    return [...this.cola];
  }
}
