DOCUMENTO DE TRABAJO INTERNO

**FinCompare**

_Plan de Deuda Técnica, Riesgos Reales y Hoja de Ruta de Mejoras_

|     |     |     |
| --- | --- | --- |
| PROBLEMAS CRÍTICOS<br><br>**2**<br><br>Bloqueantes para monetizar | DEUDA TÉCNICA<br><br>**5**<br><br>Ítems identificados | MEJORAS DE DISEÑO<br><br>**6**<br><br>Oportunidades de alto impacto |

_Junio 2026 · Revisión basada en código fuente completo del repositorio_

# **1\. Problemas Críticos — Bloqueantes para Monetizar**

Estos dos problemas no son deuda técnica menor. Son riesgos que pueden hacer daño real a usuarios reales si se escala el producto sin resolverlos primero. No se deberían abrir planes de pago hasta que ambos estén cerrados.

## **1.1 Sin Autenticación Real — El Riesgo Más Grave**

|     |     |
| --- | --- |
|     | **🔴 CRÍTICO · Impacto: Privacidad de datos de todos los usuarios**<br><br>El código fuente de Portfolios.tsx y el backend muestran que los portafolios están asociados a un user_id hardcodeado.<br><br>En producción con varios usuarios, todos escriben y leen en la misma entidad de portafolio.<br><br>Un usuario puede ver los portafolios de otro. Eso no es un bug — es una brecha de privacidad. |

### **Qué haría exactamente**

La solución es implementar un sistema de autenticación completo antes de habilitar cualquier feature que persista datos por usuario. El flujo correcto:

- **Paso 1 — Elegir proveedor de autenticación:** Para un MVP en producción, Supabase Auth es la opción más rápida. Incluye JWT, refresh tokens, OAuth (Google, GitHub) y se integra directamente con PostgreSQL mediante Row Level Security (RLS). Costo: $0 hasta 50.000 usuarios activos mensuales.
- **Paso 2 — RLS en PostgreSQL:** Habilitar Row Level Security en las tablas portfolios, portfolio_allocations y cualquier tabla con datos de usuario. Una política RLS garantiza a nivel de base de datos que SELECT/UPDATE/DELETE solo tocan filas del usuario autenticado. No se puede bypassear desde el backend aunque haya un bug.
- **Paso 3 — Middleware JWT en Go:** Agregar un middleware de validación de JWT en Gin que extraiga el user_id del token y lo inyecte en el contexto de cada request. Los handlers dejan de aceptar user_id del body — lo leen exclusivamente del contexto.
- **Paso 4 — Frontend:** Implementar las pantallas de login/signup. Con Supabase Auth el SDK de JavaScript maneja el flujo OAuth completo. Son aproximadamente 2 días de trabajo de frontend.

|     |     |
| --- | --- |
| **Aspecto** | **Solución Recomendada** |
| **Tecnología** | Supabase Auth (JWT + OAuth) — free tier cubre el MVP completo |
| **Tiempo estimado** | 5–8 días de desarrollo para implementación completa |
| **Complejidad** | Media — Go tiene buenas librerías para validación JWT (golang-jwt/jwt) |
| **RLS PostgreSQL** | ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY + política por user_id |
| **Riesgo de migración** | Los portafolios existentes tienen user_id = 1 hardcodeado. Se necesita migración de datos antes de encender RLS. |
| **Costo** | $0 con Supabase Free Tier hasta escala real de usuarios |

## **1.2 API Pública Sin Rate Limiting**

|     |     |
| --- | --- |
|     | **🔴 CRÍTICO · Impacto: Costos de API y disponibilidad del servicio**<br><br>Cualquier persona puede hacer requests ilimitados al backend sin autenticarse.<br><br>El backend llama a APIs externas de pago (Financial Modeling Prep, posiblemente DANE/Banrep). Una ráfaga de requests de un bot agota la cuota mensual en minutos.<br><br>Sin rate limiting, un competidor puede scrapear toda la base de datos de precios gratis. |

### **Qué haría exactamente**

- **Rate limiting por IP (inmediato):** Agregar el middleware github.com/ulule/limiter con almacenamiento en memoria para empezar. Límite sugerido: 60 requests/minuto para endpoints de lectura, 10/minuto para endpoints de simulación (computacionalmente costosos).
- **Rate limiting por usuario (después de auth):** Una vez implementado el JWT, los límites se aplican por user_id en lugar de IP. Los usuarios autenticados del plan Free tienen 300 req/min, Pro 1000 req/min, API 5000 req/min.
- **Cache de respuestas en Redis:** Los endpoints como /metrics, /assets/highlights y /cdts/best devuelven datos que cambian como máximo una vez al día. Cachear sus respuestas en Redis con TTL de 1 hora elimina el 80% de las llamadas a APIs externas y hace el sistema mucho más resistente.
- **Circuit breaker para APIs externas:** Si Financial Modeling Prep falla o devuelve errores, el backend debería devolver los últimos datos cacheados en lugar de propagar el error al usuario. La librería sony/gobreaker implementa esto en Go.

|     |     |
| --- | --- |
| **Aspecto** | **Solución Recomendada** |
| **Rate limiting lib** | github.com/ulule/limiter — soporte para in-memory y Redis |
| **Cache** | Redis 7 con go-redis — un container adicional en docker-compose.yml |
| **Tiempo estimado** | 2–3 días para rate limiting básico. 1 semana adicional para cache completo |
| **Efecto en costos API** | Reducción estimada del 70–85% en llamadas a FMP con cache de 1h |
| **Prioridad** | Rate limiting por IP se puede hacer en 4 horas — hacerlo hoy |

# **2\. Deuda Técnica — Los 5 Ítems**

Estos problemas no rompen el producto hoy, pero cada semana que pasan sin resolverse acumulan interés: más difíciles de refactorizar, más probable que causen bugs en producción.

## **DT-1 18 Hooks Concurrentes en el Dashboard**

|     |     |
| --- | --- |
|     | **🟡 IMPORTANTE · Score impactado: Calidad del Código Frontend (7/10)**<br><br>Dashboard.tsx instancia 18 llamadas useAssetHistory simultáneas en el primer render.<br><br>TanStack Query las maneja sin colapsar la UI, pero genera una ráfaga de 18 requests HTTP al backend.<br><br>El backend de HuggingFace Spaces puede tener cold starts de 10–30 segundos. 18 requests en ese estado generan timeouts en cascada.<br><br>A medida que se añadan más activos al catálogo, este número solo puede crecer. |

### **Qué haría**

- **Crear un endpoint BFF — /api/v1/dashboard/summary:** Un único endpoint que el backend computa internamente y devuelve todos los datos que el Dashboard necesita: mejores ETFs por categoría + sus historiales de 90 días + métricas de mercado. El frontend hace 1 request en lugar de 18.
- **Ventaja adicional:** El backend puede parallelizar las consultas a la DB internamente con goroutines, ejecutando las 18 consultas en paralelo y devolviendo el resultado consolidado en el tiempo de la consulta más lenta (no la suma de todas).
- **Implementación en Go:** Un sync.WaitGroup o errgroup.Group para queries paralelas a PostgreSQL. Tiempo estimado: 2–3 días de backend.

## **DT-2 console.log en el Bundle de Producción**

|     |     |
| --- | --- |
|     | **🟡 MODERADO · Expone estructura interna de la API**<br><br>useFinance.ts contiene console.log('Fetching assets with params:', params) y console.log('Raw Assets Response:', data).<br><br>Estos se ejecutan en el bundle de producción desplegado en Vercel.<br><br>Cualquier usuario puede abrir DevTools y ver la estructura exacta de la API, los endpoints, y los formatos de respuesta. |

### **Qué haría**

- Reemplazar todos los console.log por console.debug o wrapearlos en if (import.meta.env.DEV) — una línea por cada ocurrencia.
- Agregar un plugin de Vite para strip de logs en producción: vite-plugin-remove-console. Configurar en vite.config.ts con apply: 'build'. Elimina todos los console.\* del bundle de producción automáticamente.
- Tiempo: 30 minutos. No hay razón para posponerlo.

## **DT-3 express en Dependencias de Producción del Frontend**

|     |     |
| --- | --- |
|     | **🟡 MENOR · Aumenta el bundle innecesariamente**<br><br>package.json del frontend lista express como dependencia de producción.<br><br>Express es un servidor HTTP de Node.js. No tiene uso legítimo en un bundle de Vite que corre en el navegador.<br><br>Probablemente es un residuo de pruebas de proxy local. Vite tiene su propio servidor de desarrollo y proxy incorporado. |

### **Qué haría**

- npm uninstall express y removerlo de package.json. Verificar que no haya ningún import de express en los archivos .ts o .tsx del frontend.
- Si se necesita un proxy local para desarrollo, usar la configuración server.proxy en vite.config.ts — que ya está disponible y es la solución correcta.
- Correr npm run build y verificar que el bundle final es más pequeño. Tiempo: 10 minutos.

## **DT-4 Tipado Incorrecto de Variables de Entorno en Vite**

|     |     |
| --- | --- |
|     | **🟡 MENOR · Antipatrón de TypeScript que crece con el tiempo**<br><br>api.ts usa (import.meta as any).env?.VITE_API_URL para acceder a la variable de entorno.<br><br>El cast a any desactiva TypeScript para esa línea y no detectará si la variable tiene un nombre incorrecto.<br><br>Si alguien comete un typo en la variable de entorno (VITE_API_URL vs VITE_APIURL), el error no aparece en tiempo de compilación. |

### **Qué haría**

- En src/vite-env.d.ts (que ya existe en el proyecto) agregar la declaración de tipos: interface ImportMetaEnv { readonly VITE_API_URL: string; }
- Cambiar (import.meta as any).env?.VITE_API_URL por import.meta.env.VITE_API_URL — sin cast. TypeScript ahora valida el nombre en tiempo de compilación.
- Tiempo: 5 minutos. Es un cambio de una línea que mejora la seguridad de tipos del proyecto.

## **DT-5 Scheduler gocron en el Mismo Proceso que el Worker**

|     |     |
| --- | --- |
|     | **🟡 ARQUITECTURAL · No es urgente hoy, pero bloquea escala**<br><br>El worker.go corre el scheduler gocron en el mismo proceso Go.<br><br>Esto significa que si hay un job largo (scraping pesado de CDTs) y simultáneamente entra un job de actualización de precios, compiten por los recursos del mismo proceso.<br><br>Un panic en un job puede tumbar todo el scheduler, dejando sin actualización de datos hasta reinicio manual.<br><br>La arquitectura actual no permite escalar los jobs horizontalmente ni monitorearlos independientemente. |

### **Qué haría (en dos fases)**

- **Fase corta (ahora):** Añadir recovery de panics en cada job del gocron con defer/recover. Que un job que falla no tumbe el scheduler completo. Tiempo: 1 día.
- **Fase larga (en 3–6 meses):** Migrar a una cola de trabajos con Redis + Asynq (librería Go para colas con Redis). Cada job se convierte en una tarea encolada. Permite reintentos automáticos, dead letter queues, y un dashboard de monitoreo visual. No requiere cambiar el scheduler completo de golpe — se puede migrar job por job.

# **3\. Mejoras por Dimensión — Los Puntajes Bajos Explicados**

Los scores de 5 y 6 en el informe anterior no son fatalidades. Son oportunidades concretas con soluciones específicas. Acá está el plan para subir cada uno.

## **Seguridad: 5/10 → objetivo 9/10**

Este es el score más bajo y el más urgente. La buena noticia: los dos problemas críticos de la sección anterior son exactamente los que generan este score. Resolverlos sube la seguridad directamente a 9/10.

<div class="joplin-table-wrapper"><table><tbody><tr><td><p></p></td><td><ul><li><strong>Autenticación JWT + Supabase Auth: </strong>Ver sección 1.1. Esto resuelve el 60% del score de seguridad.</li><li><strong>Rate limiting: </strong>Ver sección 1.2. Resuelve el 25%.</li><li><strong>HTTPS forzado: </strong>Vercel ya maneja HTTPS. Verificar que el backend en HuggingFace también sirva únicamente HTTPS y que el CORS esté configurado para aceptar solo el dominio de Vercel, no *. Cambiar en el middleware de Gin.</li><li><strong>Headers de seguridad: </strong>Agregar el middleware gin-contrib/secure para headers HTTP de seguridad: X-Content-Type-Options, X-Frame-Options, Content-Security-Policy. Media hora de trabajo.</li><li><strong>Variables de entorno: </strong>Auditar que ninguna API key está hardcodeada en el binario desplegado. Usar los secrets de HuggingFace para inyectarlas como variables de entorno en el contenedor Docker.</li></ul></td></tr></tbody></table></div>

## **Escalabilidad: 6/10 → objetivo 8/10**

La escalabilidad del sistema está limitada principalmente por tres puntos: el scheduler monoproceso (DT-5), la ausencia de cache (que hace que cada request golpee a APIs externas de pago), y la falta de un endpoint BFF para el Dashboard (DT-1).

<div class="joplin-table-wrapper"><table><tbody><tr><td><p></p></td><td><ul><li><strong>Cache de respuestas con Redis: </strong>Los endpoints de mercado (/metrics, /cdts/best, /assets/highlights) pueden cachear sus respuestas por 1 hora sin impacto en la experiencia. Esto reduce el costo de APIs externas y desacopla la disponibilidad del servicio de la disponibilidad de FMP/DANE.</li><li><strong>Connection pooling en PostgreSQL: </strong>Verificar que pgx/v5 está configurado con un pool de conexiones apropiado (MaxConns: 20–50 según el plan del servidor). Por defecto pgx.Connect abre una sola conexión — usar pgxpool.New en su lugar.</li><li><strong>Índices en tablas de series de tiempo: </strong>Las queries de histórico de precios (price_history) son las más costosas. Verificar que existen índices compuestos en (asset_id, date DESC) y (date DESC) para las queries de rango de fechas. Un EXPLAIN ANALYZE en producción lo confirma.</li><li><strong>Endpoint BFF Dashboard: </strong>Ya cubierto en DT-1. Un cambio que reduce 18x las conexiones del frontend al backend.</li><li><strong>Horizontal scaling de la API: </strong>La API de Go es stateless (no guarda estado en memoria). Eso significa que ya se puede escalar horizontalmente añadiendo réplicas. En HuggingFace Spaces no es posible, pero en Fly.io o Railway sí. Cuando el tráfico lo justifique, la migración de plataforma es sencilla.</li></ul></td></tr></tbody></table></div>

## **Datos en Tiempo Real: 6/10 → objetivo 8/10**

La limitación principal no es un problema de código — es un problema de acceso a datos. Los jobs de gocron actualizan precios una vez al día después del cierre de mercado. Eso es correcto para un inversionista de largo plazo, pero insuficiente si el producto quiere competir con plataformas de trading.

**La realidad del mercado colombiano:**

- El mercado colombiano (BVC) opera de 9:30 AM a 3:55 PM hora Colombia. Los ETFs y acciones internacionales (NYSE/NASDAQ) operan de 9:30 AM a 4:00 PM EST.
- Para datos en tiempo real de ETFs internacionales, la API de FMP tiene un tier de streaming que requiere plan Business (aprox. USD 79/mes).
- Para datos en tiempo real de la BVC, no existe una API pública gratuita — requiere acuerdo comercial con la Bolsa de Valores de Colombia.

### **Lo que sí se puede hacer sin costos adicionales**

- **Actualización cada 15 minutos en horario de mercado:** Modificar el scheduler para que en horario hábil (9:00–17:00 ET, lunes a viernes) actualice precios cada 15 minutos en lugar de una vez al día. El tier gratuito de FMP permite hasta 250 requests/día — distribuidos en intervalos de 15 min durante 7h de mercado = 28 updates. Factible con los activos más importantes.
- **Indicador visual de frescura de datos:** Mostrar en el Dashboard la hora del último update de precios con un badge "Actualizado hace X minutos". El usuario sabe exactamente qué tan fresca es la información. Transparencia por diseño — alineado con los pilares del producto.
- **WebSockets para TRM:** La TRM del Banco de la República se publica diariamente pero con actualizaciones intradiarias. Un WebSocket que transmita la TRM en tiempo real al frontend sin polling es técnicamente sencillo (Gorilla WebSocket en Go) y de alto valor percibido para el usuario.

## **Calidad del Código Frontend: 7/10 → objetivo 9/10**

El código frontend es bueno. TypeScript bien usado, TanStack Query correctamente configurado, componentes razonablemente desacoplados. Los problemas que bajan el score son los identificados en DT-1 a DT-4. Una vez resueltos:

- Resolver DT-1 (18 hooks → 1 BFF): +0.8 puntos de arquitectura.
- Resolver DT-2 (console.log): +0.3 puntos de profesionalismo.
- Resolver DT-3 (express): +0.2 puntos de limpieza de dependencias.
- Resolver DT-4 (tipado env): +0.2 puntos de rigor TypeScript.

Mejoras adicionales de código frontend que suben el score:

- **Error boundaries en React:** Envolver las vistas principales en un ErrorBoundary component. Si useAssetHistory falla para un activo, solo se muestra el error en esa sección, no se rompe toda la vista.
- **Loading states unificados:** Actualmente cada módulo maneja su propio estado de loading de forma diferente. Un hook useLoadingState centralizado y un componente Skeleton coherente en toda la app elevan la percepción de calidad.
- **Lazy loading por ruta:** Actualmente todas las vistas se cargan en el bundle inicial. Con React.lazy() + Suspense, cada vista se carga on-demand. El bundle inicial se reduce en 40–60%.

# **4\. Scorecard Antes / Después — Si Aplicas el Plan**

Proyección de scores aplicando todas las recomendaciones de este documento. Los scores de Corrección Matemática, Propuesta de Valor y Documentación no se tocan — ya son sólidos.

|     |     |     |     |
| --- | --- | --- | --- |
| **Dimensión** | **Hoy** | **Post-Plan** | **Qué lo mueve** |
| **Seguridad** | **5/10** | **9/10** | _+4 puntos aplicando el plan_ |
| **Escalabilidad** | **6/10** | **8/10** | _+2 puntos aplicando el plan_ |
| **Datos en Tiempo Real** | **6/10** | **8/10** | _+2 puntos aplicando el plan_ |
| **Calidad Frontend** | **7/10** | **9/10** | _+2 puntos aplicando el plan_ |
| **Arquitectura de Software** | **8/10** | **9/10** | _+1 puntos aplicando el plan_ |
| **Experiencia de Usuario** | **8/10** | **9/10** | _+1 puntos aplicando el plan_ |
| **Corrección Matemática** | **9/10** | **9/10** | _+0 puntos aplicando el plan_ |
| **Propuesta de Valor** | **9/10** | **9/10** | _+0 puntos aplicando el plan_ |
| **Documentación Técnica** | **8/10** | **9/10** | _+1 puntos aplicando el plan_ |
| **Potencial Comercial** | **8/10** | **9/10** | _+1 puntos aplicando el plan_ |

|     |     |
| --- | --- |
| SCORE GLOBAL HOY<br><br>**7.4 / 10**<br><br>Sobresaliente para MVP | SCORE GLOBAL POST-PLAN<br><br>**8.7 / 10**<br><br>Listo para monetización |

# **5\. Orden de Ejecución Recomendado**

La secuencia importa. Algunas tareas habilitan otras. Este es el orden óptimo para un desarrollador trabajando solo o en equipo pequeño.

|     |     |     |     |
| --- | --- | --- | --- |
| **Semana** | **Ítem** | **Tarea** | **Resultado** |
| **1** | **DT-2, DT-3, DT-4** | Limpieza rápida de código | console.log removidos, express fuera, tipado de env correcto. 3–4 horas total. |
| **1** | **1.2 parcial** | Rate limiting por IP en Gin | La API ya no es abusable. 4–6 horas. |
| **2–3** | **1.1** | Autenticación JWT con Supabase Auth | Usuarios reales. Portafolios privados. Prerequisito de toda monetización. |
| **3–4** | **1.2 completo** | Cache Redis + rate limiting por user_id | Costos de API reducidos. Disponibilidad mejorada. |
| **4–5** | **DT-1** | Endpoint BFF /dashboard/summary | 18 requests → 1. Dashboard rápido incluso con cold start. |
| **5–6** | **DT-5 parcial** | Recovery de panics en jobs del scheduler | El scheduler no muere si un job falla. |
| **6–8** | **Mejoras UX** | Error boundaries, lazy loading, loading states | Frontend más robusto y rápido. Bundle 40% más pequeño. |
| **8–12** | **Escalabilidad** | Connection pooling, índices DB, WebSocket TRM | Base sólida para 10.000 usuarios activos. |

_"El mejor momento para resolver la deuda técnica fue antes de lanzar. El segundo mejor momento es ahora, antes de que lleguen los primeros usuarios de pago."_

**La diferencia entre 7.4 y 8.7 no es talento. Es ejecución disciplinada de una lista de tareas concretas.**

_FinCompare · Plan de Deuda Técnica y Mejoras · Junio 2026 · Basado en revisión de código fuente completo_