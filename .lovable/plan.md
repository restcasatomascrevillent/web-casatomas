

## Plan: Cambiar enlace de "Visitar Touza" a URL externa

El botón actualmente usa `<Link to="/touza-cocktail">` (ruta interna que lleva a NotFound). Hay que cambiarlo a un enlace externo a `https://touzact.lovable.app`.

### Cambios

**`src/components/EspaciosSection.tsx` (líneas 86-91)**
- Cambiar `link: "/touza-cocktail"` → `link: "https://touzact.lovable.app"`

**`src/components/EspaciosSection.tsx` (líneas 155-164)**
- Reemplazar `<Link to={...}>` por `<a href={...} target="_blank" rel="noopener noreferrer">` para que abra en nueva pestaña como enlace externo.

**`src/App.tsx` (línea 37)**
- Eliminar la ruta `/touza-cocktail` ya que no se necesita.

