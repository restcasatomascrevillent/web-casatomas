# Proceso obligatorio de entrega

Secuencia única para toda historia de usuario:

**desarrollo → pruebas unitarias → despliegue en DEMO → QA en DEMO → PR → revisión → despliegue en PROD → QA en PROD → cierre del ciclo**

Ninguna fase empieza sin que la anterior haya cumplido su criterio de salida y lo haya registrado en Notion.

## Equipo

| Agente | Rol | Fases |
| --- | --- | --- |
| `cto` | Decisiones técnicas, coordinación, jefe de revisión | 0, 4, 7 |
| `delivery` | Dependencias, configuración, entornos, despliegues CI/CD, PR | 2, 4 (prepara y fusiona), 5 |
| `frontend` | Interfaces, componentes, responsive, integración con la API | 1 |
| `backend-datos` | Modelos, migraciones, consultas, permisos, rendimiento de BBDD | 1 |
| `backend-servicios` | Lógica de negocio, servicios, endpoints, integraciones | 1 |
| `qa-funcional` | Exploratorias de interfaz, recorridos de usuario, móvil y escritorio | 3, 6 |
| `qa-tecnico` | Integración, API, suite automatizada, regresión técnica | 3, 6 |

## Fuentes de verdad

- **Historia de usuario**: Notion (criterios de aceptación, dependencias, diseño).
- **Configuración del proyecto**: `.claude/becarios.yaml` en la raíz del repositorio (comandos, CI/CD, entornos, diseño, Notion, puertas humanas).
- **Registro y estado**: Notion, según `reference/notion.md`.

## Fases

| # | Fase (valor en Notion) | Responsable | Criterio de entrada | Criterio de salida | Evidencia mínima |
| --- | --- | --- | --- | --- | --- |
| 0 | Preparación | `cto` | Historia con criterios de aceptación; proyecto configurado; condición de inicio cumplida | Plan técnico con reparto por agente, contrato de API, impacto en datos y riesgos; rama de la historia creada | Plan enlazado en Notion |
| 1 | Desarrollo y unitarias | `backend-datos`, `backend-servicios`, `frontend` | Plan aprobado | Código en la rama; lint, build y unitarias en verde en local; cada criterio de aceptación tiene código y prueba asociados | Comandos ejecutados y resumen de resultados; commit |
| 2 | Despliegue DEMO | `delivery` | Fase 1 superada y rama publicada | Pipeline en verde; DEMO sirve exactamente el commit candidato; smoke test OK | Versión/commit, enlace a la ejecución del CI/CD, URL de DEMO |
| 3 | QA DEMO | `qa-funcional`, `qa-tecnico` | DEMO con el commit candidato | Todos los criterios de aceptación superados; móvil y escritorio correctos; regresión en verde; ningún defecto bloqueante o alto abierto | Informe de QA, capturas por resolución, resultados de la suite |
| 4 | PR y revisión | `delivery` prepara; `cto` revisa | QA DEMO superado | PR aprobado por el CTO, «sí» del usuario en la pausa del PR y PR fusionado | Enlace al PR, informe de revisión, commit de fusión |
| 5 | Despliegue PROD | `delivery` | PR fusionado; dependencias y configuración de PROD verificadas; segunda confirmación si `pausas.antes_de_prod` | Pipeline en verde; PROD sirve la versión aprobada; healthcheck OK | Versión publicada, enlace a la ejecución |
| 6 | QA PROD | `qa-funcional`, `qa-tecnico` | PROD con la versión aprobada | Flujos de la historia correctos en PROD; sin regresiones críticas | Informe de QA en PROD |
| 7 | Cerrada | `cto` (o el orquestador) | QA PROD superado y evidencias completas | Estado **Hecha** en Notion | Resumen de cierre |

## Reglas de ramas y versiones

- Rama de la historia: `historia/<id-notion-corto>-<slug>` creada desde la rama principal.
- La versión que llega a PROD debe ser **la misma** que se validó en DEMO. Si la rama principal avanzó después del despliegue en DEMO, se actualiza la rama, se vuelve a desplegar en DEMO y se repite la regresión antes de fusionar.
- Todo commit candidato se identifica por su SHA corto en Notion, en el PR y en los informes.

## Bucles de corrección

| Situación | Qué ocurre | Estado en Notion |
| --- | --- | --- |
| Fallan unitarias, lint o build | El desarrollador corrige; la fase 1 no se cierra | En progreso |
| Falla el despliegue en DEMO por código | `delivery` lo documenta y lo devuelve a desarrollo (fase 1) | En progreso |
| Falla el despliegue por causa externa (credenciales, infraestructura, CI caído) | Se documenta el bloqueo y se escala | En espera |
| Defecto en QA DEMO | Se registra la incidencia, desarrollo corrige, `delivery` redespliega, QA reprueba el defecto **y** la regresión | En progreso |
| El CTO pide cambios en la revisión | Desarrollo corrige; se repiten las validaciones afectadas y QA en DEMO sobre la nueva versión; vuelve a revisión | En progreso |
| Falla el despliegue en PROD | `delivery` aplica el rollback definido en la configuración, lo registra y avisa al CTO | En espera |
| Falla QA en PROD | El ciclo sigue abierto; el CTO decide entre corrección (vuelta a fase 1) o rollback, coordinado con desarrollo y delivery | En progreso / En espera |

Tras **3 rondas** de corrección sin superar una misma fase, el orquestador para y escala al usuario con el historial de incidencias.

## Pausa del PR

Cuando el CTO aprueba el PR, el equipo **siempre** se para, muestra el enlace al PR y espera al usuario:

- «sí» → se fusiona, se despliega en PROD, se hace QA en PROD y se cierra.
- «cambios: …» → los cambios vuelven a desarrollo y se repiten DEMO, QA en DEMO y revisión antes de una nueva pausa.

Con `pausas.antes_de_prod: true` en la configuración del proyecto, hay una segunda pausa justo antes de desplegar en PROD.

Los agentes nunca se dan entre sí la aprobación para fusionar o desplegar en PROD: solo vale la respuesta del usuario.

> Nota sobre GitHub: si todos los agentes usan la misma cuenta, GitHub no permite aprobar un PR propio. El CTO deja su veredicto como comentario de revisión en el PR y en Notion. Si la rama principal exige aprobaciones, hace falta una cuenta revisora distinta (persona o bot).

## Informe de fase

Todo agente termina su trabajo devolviendo **solo** este bloque al orquestador (sin texto antes ni después), y registra lo mismo en Notion. El orquestador muestra al usuario únicamente la línea `RESUMEN`, así que tiene que entenderse sola.

```
RESUMEN: <qué has hecho, máx. 15 palabras, sin repetir tu rol; p. ej. «POST /auth/google + 9 tests»>
FASE: <nombre de la fase>
AGENTE: <nombre del agente>
HISTORIA: <URL de Notion>
RESULTADO: SUPERADO | FALLIDO | BLOQUEADO
VERSIÓN: <SHA corto> (rama <rama>)
EVIDENCIAS:
- <comando o prueba> → <resultado> (<enlace o ruta>)
INCIDENCIAS:
- [BLOQUEANTE|ALTA|MEDIA|BAJA] <título> — pasos, esperado, obtenido, entorno, evidencia
SIGUIENTE PASO RECOMENDADO: <qué y quién>
NOTION: <URL de la entrada de registro creada>
```

## Reglas comunes a todos los agentes

- Lee la historia, sus criterios de aceptación y sus dependencias en Notion antes de trabajar.
- Trabaja solo dentro de tu responsabilidad. Si necesitas un cambio fuera de ella, descríbelo en el informe para que el orquestador lo asigne.
- No inventes resultados: si no pudiste ejecutar algo, el resultado es BLOQUEADO y explicas por qué.
- Nunca pongas secretos, tokens ni datos personales en Notion, en el PR ni en los informes.
- PROD usa datos reales: en PROD solo pruebas no destructivas y con las cuentas de prueba definidas en la configuración.
