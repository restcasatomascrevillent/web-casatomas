/**
 * Que el traductor del navegador no tire la página (CAS-13).
 *
 * El traductor de Chrome (y otros como el de Edge) cambia cada texto de la
 * página por `<font><font>texto traducido</font></font>` y deja el nodo de
 * texto original FUERA del documento. React no se entera: sigue apuntando al
 * nodo original y, cuando quiere quitarlo o insertar algo delante de él, el
 * navegador lanza «NotFoundError: Failed to execute 'removeChild' on 'Node':
 * The node to be removed is not a child of this node» (o lo mismo con
 * `insertBefore`). Es un fallo conocido de React con los traductores
 * (facebook/react#11538) que no tiene arreglo en React.
 *
 * El 18/11/2026 le pasó a un visitante con Chrome en neerlandés justo después
 * de guardarse su reserva: al vaciar el formulario y abrir el resguardo, React
 * quiso quitar un texto ya traducido, la ruta cayó en «No se pudo cargar esta
 * página» y el cliente, creyendo que no había funcionado, reservó otra vez.
 *
 * Remedio (el que propone el equipo de React en ese issue): si a quien se le
 * pide quitar un hijo ya no es su padre, no se hace nada (el nodo ya no está
 * en la página); si el nodo de referencia de `insertBefore` ya no es hijo, se
 * añade al final en lugar de lanzar. Lo peor que puede quedar es un texto
 * traducido desfasado o fuera de sitio, nunca la página en blanco. En una
 * página sin traducir React nunca llega a estos casos, así que no cambia nada.
 *
 * Solo en el navegador y una vez; `main.tsx` lo instala antes de montar React.
 */

let restaurar: (() => void) | null = null;

/** Instala la protección. Devuelve la función que deja `Node.prototype` como estaba (para los tests). */
export function instalarProteccionDomTraductor(): () => void {
  if (restaurar) return restaurar;
  if (typeof Node !== "function" || !Node.prototype) return () => {};

  const removeChildOriginal = Node.prototype.removeChild;
  const insertBeforeOriginal = Node.prototype.insertBefore;
  let avisado = false;
  const avisar = (operacion: string) => {
    if (avisado) return;
    avisado = true;
    console.warn(`[proteger-dom-traductor] ${operacion}: el DOM lo cambió otro (¿traductor del navegador?); se sigue sin romper.`);
  };

  Node.prototype.removeChild = function removeChild<T extends Node>(this: Node, hijo: T): T {
    if (hijo.parentNode !== this) {
      avisar("removeChild");
      return hijo;
    }
    return removeChildOriginal.call(this, hijo) as T;
  };

  Node.prototype.insertBefore = function insertBefore<T extends Node>(this: Node, nuevo: T, referencia: Node | null): T {
    if (referencia && referencia.parentNode !== this) {
      avisar("insertBefore");
      return insertBeforeOriginal.call(this, nuevo, null) as T;
    }
    return insertBeforeOriginal.call(this, nuevo, referencia) as T;
  };

  restaurar = () => {
    Node.prototype.removeChild = removeChildOriginal;
    Node.prototype.insertBefore = insertBeforeOriginal;
    restaurar = null;
  };
  return restaurar;
}
