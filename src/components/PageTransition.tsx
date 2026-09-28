import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useOutlet } from "react-router-dom";

/**
 * Reemplaza al `<Outlet />` de siempre para que cambiar de página (portada →
 * `/carta/vinos`, `/carta/vinos` → `/carta/bebidas`...) sea un cruce suave en
 * vez de un corte seco.
 *
 * `initial={false}` en `AnimatePresence`: en el primer pintado (el HTML del
 * SSG, o la hidratación sobre ese mismo HTML) el contenido ya es el real de
 * esa ruta — animarlo desde `opacity:0` ahí arriesgaría el mismo bug de
 * contenido invisible sin JS que ya se corrigió varias veces esta sesión.
 * Comprobado con un SSR de prueba: con `initial={false}` el HTML sale con
 * `opacity:1` directamente, nunca `opacity:0`. Solo a partir del SEGUNDO
 * elemento con una `key` distinta (una navegación real, ya en el navegador)
 * `AnimatePresence` anima la entrada — y ahí no hay nada que perder, porque
 * ese HTML nunca lo ve un buscador ni una visita sin JS.
 *
 * `mode="popLayout"`: sin él, la página que se va y la que entra conviven un
 * instante en el flujo normal del documento y se empujan entre sí (salto
 * visible). Con `popLayout`, la que sale se saca del flujo (`position:
 * absolute` calculado a partir de su sitio real) en cuanto empieza a
 * desvanecerse, así que la nueva ya ocupa su posición final desde el primer
 * fotograma — sin esperar (nada de `mode="wait"`) a que la anterior termine
 * de irse.
 */
const PageTransition = () => {
  const outlet = useOutlet();
  const { pathname } = useLocation();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
