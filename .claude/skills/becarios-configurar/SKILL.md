---
name: becarios-configurar
description: "Prepara un repositorio para trabajar con los becarios. Detecta stack, comandos de pruebas, CI/CD y entornos, genera .claude/becarios.yaml y comprueba la condición de inicio (proyecto estabilizado, desplegado y con CI/CD operativo)."
argument-hint: "[ruta del repositorio]"
disable-model-invocation: true
---

# Configurar un proyecto para los becarios

Repositorio: $ARGUMENTS (si está vacío, el directorio actual).

Objetivo: dejar `.claude/becarios.yaml` completo y decir con claridad si el equipo puede empezar o está **en espera**. Esta skill no despliega, no fusiona y no modifica datos remotos.

## 1 · Detectar

Inspecciona el repositorio y anota lo que encuentres:

- **Stack**: `package.json`, `pnpm-lock.yaml`, `pyproject.toml`, `go.mod`, frameworks (Next.js, Vite, NestJS, Django…), carpeta `supabase/`, `prisma/`, ORM.
- **Comandos**: scripts de lint, typecheck, test, build y e2e. Comprueba cuál existe de verdad.
- **Carpetas por rol**: dónde vive la interfaz, los servicios/endpoints, las migraciones y los tests.
- **CI/CD**: `.github/workflows/`, `.gitlab-ci.yml`, `vercel.json`, `netlify.toml`, `Dockerfile`, `docker-compose*.yml`. Identifica cómo se despliega cada entorno (DEMO, QA, STG, PROD) y si existe un procedimiento de rollback.
- **Rama principal y estrategia de merge** (`gh repo view --json defaultBranchRef`, protección de ramas si hay acceso).

## 2 · Generar la configuración

Copia `.claude/becarios/templates/becarios.yaml` a `.claude/becarios.yaml` y rellénalo con lo detectado. Lo que no puedas deducir, pregúntalo al usuario en una sola tanda:

- URL de DEMO y PROD (y de QA/STG si se despliegan por separado) y la correspondencia de DEMO con QA y STG.
- Fuente del diseño (Figma u otra).
- URL de la base de datos de historias en Notion. Después **lee su esquema** y rellena tú `notion.propiedades`, `notion.estados` y `notion.registro` (la base enlazada por la columna «Registro de entrega», si existe); usa el nombre del repositorio como `valor_proyecto` salvo que el usuario diga otro.
- Nombres de las variables con las cuentas de prueba de DEMO y PROD (nunca las contraseñas).
- Si quiere una segunda pausa justo antes de PROD (`pausas.antes_de_prod`, por defecto no). La pausa del PR es siempre obligatoria.

Añade `.qa-evidencias/` al `.gitignore` del proyecto.

## 3 · Comprobar la condición de inicio

Verifica y marca en `condicion_inicio` solo lo que hayas comprobado:

| Condición | Comprobación |
| --- | --- |
| `estabilizado` | En la rama principal limpia, `instalar`, `lint`, `tipos`, `unitarias` y `build` terminan en verde |
| `desplegado` | DEMO y PROD responden (HTTP 2xx/3xx) y, si hay healthcheck, está OK |
| `ci_cd_operativo` | El último pipeline de la rama principal terminó en verde y existen los comandos de despliegue a DEMO y PROD |

Comprueba también que Notion responde (lee la base de datos de historias). Si falta la base de datos de registro, recomienda `/becarios-notion`.

## 4 · Informe

Breve, en líneas `[Becarios]`, sin tablas largas:

```
[Becarios] Proyecto configurado: Next.js + Supabase · GitHub Actions · .claude/becarios.yaml ✅
[Becarios] Estabilizado ✅ · Desplegado ✅ · CI/CD ❌ último pipeline de main en rojo
[Becarios] ⏸ En espera hasta que el CI/CD esté en verde
```

Si todo está en verde, la última línea es `[Becarios] Listo para trabajar ✅`. Si el usuario pide detalle, muestra la configuración completa y los permisos recomendados para `.claude/settings.json` (`Bash(gh run *)`, `Bash(gh pr *)`, `Bash(npm run *)`, `Bash(npx playwright *)`).
