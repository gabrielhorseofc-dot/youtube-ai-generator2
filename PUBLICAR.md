# Publicar Largo con inicio de sesión de Google

## Qué está preparado

- Next.js App Router, PostgreSQL/Drizzle y Auth.js con Google OAuth/OIDC.
- Acceso público de solo lectura a ejemplos generados por código; no expone filas privadas.
- Espacio y proyectos separados por usuario, comprobados en **todas** las rutas, incluidas las descargas y la duplicación.
- Sesiones en PostgreSQL, cierre de sesión y eliminación de cuenta con borrado en cascada.
- Google solo solicita `openid email profile`. No solicita Gmail, Drive ni permisos de YouTube. Los tokens de API de Google no se conservan.
- Pantalla `/login`, estados de cancelación/error y ayuda para configurar el proveedor.

**Importante:** el botón no simula una cuenta. Hasta configurar las credenciales OAuth de una aplicación real, muestra que Google está pendiente de activar. No es posible registrar una aplicación en Google ni publicar en tu dominio sin acceso a tus cuentas de Google Cloud, alojamiento y DNS.

## 1. Alojamiento recomendado

Usa Vercel para Next.js y PostgreSQL de Neon, o cualquier alojamiento compatible con Next.js/Node.js 22 y PostgreSQL. El servidor y la base de datos deben estar en regiones cercanas.

1. Sube el repositorio sin `.env`, `.env.local` ni claves privadas. `.gitignore` ya los excluye; `.env.example` es la única plantilla de entorno que debe versionarse.
2. Crea la base PostgreSQL de producción en Neon. No uses la base temporal del entorno de vista previa como almacenamiento público permanente.
3. Importa el repositorio como proyecto Next.js en Vercel. Usa instalación `npm ci` y compilación `npm run build`.
4. Obtén un dominio HTTPS estable del alojamiento o conecta tu dominio propio. La URL temporal de vista previa no equivale a una publicación definitiva.
5. En **Vercel → Project → Settings → Environment Variables**, configura `DATABASE_URL` y las variables existentes de autenticación para los entornos correspondientes. No uses el prefijo `NEXT_PUBLIC_` para claves. Usa una rama/base distinta de Neon para Preview y desarrollo, evitando escrituras accidentales en producción.
6. Crea las tablas desde una terminal segura con `DATABASE_URL` configurada: `npm run db:push`. Sigue los pasos del apartado 2.1. Revisa siempre los cambios y haz una copia si ya hay datos. No se aplican cambios de esquema automáticamente durante `npm run build`.
7. Vuelve a desplegar tras configurar las variables. Comprueba `/api/health`, `/login` y el guardado de un proyecto con tu cuenta.

Se mantiene el driver existente `pg` con `drizzle-orm/node-postgres`, compatible con Neon en el runtime Node.js de Vercel. No se cambia a un driver HTTP ni se altera el adaptador Drizzle de Google Login.

## 2. Variables del servidor

Consulta `.env.example`. `DATABASE_URL` está deliberadamente vacía: debes proporcionar tu propia conexión, sin valores de ejemplo inventados ni fallback local en el código.

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Cadena completa copiada de Neon → Connect. En Vercel utiliza **Connection pooling**. Para comandos de esquema se recomienda la conexión **directa** a la misma rama y base. Conserva los parámetros SSL/TLS suministrados por Neon, incluido `sslmode=require` cuando aparezca. |
| `AUTH_SECRET` | Secreto aleatorio de al menos 32 caracteres, distinto del secreto del sandbox. Genéralo con `openssl rand -base64 48`. Consérvalo entre despliegues. |
| `AUTH_GOOGLE_ID` | ID del cliente OAuth de Google para Aplicación web. |
| `AUTH_GOOGLE_SECRET` | Secreto de ese mismo cliente. |
| `AUTH_URL` | Origen canónico de tu web, p. ej. `https://tu-dominio.com`, sin `/login` ni `/api/auth`. |
| `AUTH_TRUST_HOST` | `true` solo si el alojamiento/proxy es de confianza y controla las cabeceras Host/X-Forwarded-*. |
| `SITE_OPERATOR_NAME` | Nombre legal del responsable que aparecerá en las páginas legales. |
| `SITE_CONTACT_EMAIL` | Correo real de contacto para privacidad y soporte. |

También se admiten `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` como alias de las variables de Google. Evita configurar ambos pares con valores distintos.

No imprimas secretos en registros ni los incluyas en capturas. Reinicia o redespliega después de modificarlos. No desactives la validación de certificados TLS para resolver errores de conexión.

### 2.1. Crear las tablas en tu base Neon

El flujo actual del proyecto es **Drizzle push**, sin migraciones SQL versionadas preexistentes. Para crear las tablas en una base Neon nueva:

1. Instala las dependencias con `npm ci`. `drizzle-kit` ya está en `devDependencies`; la máquina que ejecuta los comandos de esquema debe instalar también esas dependencias.
2. En Neon → **Connect**, selecciona la rama, base y rol correctos. Para administrar el esquema, copia la conexión **directa** con sus parámetros SSL/TLS; no construyas manualmente una URL.
3. Crea o edita `.env.local` en la **raíz del proyecto** y asigna esa conexión a `DATABASE_URL`. Puedes copiar `.env.example` si aún no tienes un archivo local; no sobrescribas uno que ya contenga tus credenciales de Google.
4. Si la terminal ya tiene `DATABASE_URL` exportada, ese valor tiene prioridad. Verifica de forma privada que corresponde al destino correcto; no imprimas la conexión en registros compartidos.
5. Desde la raíz, ejecuta **`npm run db:push`**. Su equivalente es `npx drizzle-kit push --config=drizzle.config.ts`.
6. Revisa las tablas en Neon. El esquema incluye `auth_users`, `auth_accounts`, `auth_sessions`, `auth_verification_tokens`, `studio_workspace` y `video_projects`.

El comando utiliza exclusivamente `DATABASE_URL`, lee `src/db/schema.ts` y no necesita credenciales OAuth para crear las tablas de autenticación. Si la variable falta, está vacía o no contiene una URL PostgreSQL válida, termina con un error sin mostrar su valor. Si la base ya contiene datos, revisa la propuesta de cambios antes de aceptar y no uses `--force` a ciegas.

Para la aplicación publicada, configura en Vercel la conexión **con pooling** a la misma base mediante `DATABASE_URL`. No hace falta añadir una segunda variable al código: la terminal de administración y Vercel pueden tener valores distintos de `DATABASE_URL` que apunten, respectivamente, al endpoint directo y al endpoint con pool de la misma base.

### 2.2. Prioridad de variables y desarrollo local

Drizzle y los scripts auxiliares usan `scripts/load-env.ts` con esta prioridad:

1. Variables ya definidas en el proceso: Vercel, CI o tu terminal.
2. `.env.local` en la raíz.
3. `.env` en la raíz, solo como alternativa para variables aún no definidas.

Next.js carga `.env.local` de forma nativa. Puedes iniciar la aplicación con `npm run dev` manteniendo los secretos fuera del repositorio. No se ha creado ni rellenado `.env.local` automáticamente.

`.gitignore` excluye `.env` y `.env.*`, excepto `.env.example`. Una regla de ignore no elimina archivos previamente subidos: si alguna clave llegó a GitHub, retírala del seguimiento, revócala y genera otra; borrarla del último commit no basta.

### 2.3. Comandos de esquema disponibles

| Comando | Efecto |
| --- | --- |
| `npm run db:push` | Compara el esquema TypeScript con la base indicada por `DATABASE_URL` y aplica los cambios revisados. Es el flujo compatible con el estado actual del proyecto. |
| `npm run db:generate` | Genera archivos SQL y metadatos en `drizzle/` a partir de `src/db/schema.ts`; no aplica los cambios a la base. |
| `npm run db:migrate` | Aplica las migraciones pendientes de `drizzle/` a la base indicada por `DATABASE_URL`. Requiere haber generado y revisado las migraciones. |

Para empezar directamente con migraciones versionadas en una **base vacía**, puedes elegir `npm run db:generate -- --name=initial` y después `npm run db:migrate`, **en lugar de** `db:push`. Versiona los SQL y metadatos de `drizzle/` y ejecuta las migraciones como un paso de despliegue controlado, no desde una ruta web ni en cada petición.

**No mezcles los dos flujos sin preparar una línea base:** si las tablas ya se crearon con `db:push`, una migración inicial generada después intentará crearlas de nuevo. Antes de adoptar `db:migrate` en una base existente, establece y verifica su baseline. En este cambio no se genera ni se aplica ninguna migración nueva y no se modifica `src/db/schema.ts`.

## 3. Configurar Google Auth Platform

1. Abre https://console.cloud.google.com/auth/overview y crea o selecciona un proyecto.
2. Completa **Branding**: nombre de aplicación Largo, correo de soporte, dominio, página principal y enlaces públicos a `/privacidad` y `/terminos`. Verifica el dominio si Google lo solicita.
3. En **Audience**, elige externa si admitirás cuentas fuera de tu organización. Durante las pruebas, añade cada cuenta autorizada como usuario de prueba.
4. En **Data Access**, utiliza únicamente los permisos básicos `openid`, `email` y `profile`. No habilites la API de YouTube: no hace falta para iniciar sesión.
5. En **Clients**, crea un cliente de tipo **Web application / Aplicación web**.
6. Añade como URI de redirección autorizada, con coincidencia exacta:
   - Producción: `https://tu-dominio.com/api/auth/callback/google`
   - Desarrollo opcional: `http://localhost:3000/api/auth/callback/google`
   - Para probar esta vista previa, añade su origen HTTPS exacto seguido de `/api/auth/callback/google`. La pantalla `/login` muestra la URL correspondiente. Si el origen cambia, hay que registrar el nuevo.
7. Copia el ID y el secreto en las variables privadas del alojamiento.
8. Antes de la apertura al público, pasa la audiencia de **Testing** a **In production** y completa cualquier verificación que Google requiera. El servicio no estará disponible para cualquier cuenta mientras solo admita usuarios de prueba.

No uses comodines en los redirect URIs. `www`, puerto, protocolo y barra final deben coincidir. Configura `AUTH_URL` con el dominio definitivo para evitar callbacks hacia una URL interna.

## 4. Verificación antes de publicar

- En una ventana privada, ve a `/login` y pulsa **Continuar con Google**.
- Confirma que el navegador abre `accounts.google.com` y pide solo los permisos básicos.
- Acepta y comprueba que vuelves al estudio con tu nombre y correo en el perfil.
- Crea un proyecto, guarda, recarga y comprueba que persiste.
- Usa otra cuenta: no debe ver ni descargar el proyecto de la primera, ni conociendo su URL.
- Comprueba **Cerrar sesión**, cancela un acceso de Google y prueba una sesión caducada.
- Comprueba HTTPS y cookies HttpOnly/SameSite; las de sesión deben ser Secure en producción.
- Prueba la exportación en Chrome/Edge manteniendo la pestaña abierta.
- Completa los avisos legales según tus proveedores, ubicación, retención de datos y normativa aplicable. Los textos incluidos son una base informativa técnica, no asesoramiento legal.
- Configura backups y monitorización de PostgreSQL, mantenimiento de dependencias y límites/medidas antiabuso del alojamiento según el tráfico. Las cuentas privadas no sustituyen estas tareas operativas.

## 5. Proyectos de la versión local anterior

Las filas existentes se conservan con `owner_id = NULL` y **no se publican ni se asignan al primer usuario**. Esto impide que una persona ajena se apropie de trabajos antiguos.

Después de entrar con tu cuenta real, el administrador puede transferir los proyectos locales a esa cuenta explícita desde una terminal segura:

`npx tsx scripts/transfer-local-projects.ts --email tu-correo@ejemplo.com`

El comando anterior solo muestra una vista previa. Añade `--confirm` para transferir las filas sin propietario a la cuenta indicada. Necesita acceso privado a `DATABASE_URL`. No hay una ruta web para reclamar esos proyectos.

## 6. Pruebas locales automatizadas

Con las tablas aplicadas y la aplicación en ejecución en `http://localhost:3000`:

- `node --conditions=react-server --import tsx scripts/check-google-oauth.mjs` (comprueba el protocolo OAuth con un cliente ficticio local; no inicia sesión en Google).
- `node --import tsx scripts/check-auth.mjs`
- `node --import tsx scripts/check-studio.mjs`
- `node --import tsx scripts/check-edge-cases.mjs`

Instala primero Chromium y sus dependencias si hacen falta: `npx playwright install chromium` y `npx playwright install-deps chromium`.

Las pruebas usan usuarios y sesiones de base de datos temporales y los borran al terminar. No añaden un proveedor falso ni un endpoint que salte Google. Las pruebas no sustituyen comprobar el consentimiento real con las credenciales del proyecto de Google.

## Problemas frecuentes

- **Google pendiente de activar:** faltan el ID/secreto o un `AUTH_SECRET` válido. Revisa variables y redespliega.
- **redirect_uri_mismatch:** compara la URI exacta de Google con `AUTH_URL` + `/api/auth/callback/google`.
- **access_denied:** el usuario canceló, no está entre los usuarios de prueba o la política de la organización lo impide.
- **UntrustedHost:** configura un proxy de confianza y `AUTH_TRUST_HOST=true`; en producción fija además `AUTH_URL`.
- **No se conserva la sesión:** comprueba HTTPS, cookies, estabilidad del dominio/secreto y acceso a la base de datos. No cambies el secreto en cada build.
- **403 en peticiones del estudio:** el origen público de las peticiones debe coincidir con `AUTH_URL`; configura correctamente el proxy inverso.

## Documentación oficial

- https://authjs.dev/getting-started/installation
- https://authjs.dev/getting-started/providers/google
- https://authjs.dev/getting-started/adapters/drizzle
- https://authjs.dev/getting-started/deployment
- https://developers.google.com/identity/protocols/oauth2/web-server
