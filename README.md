# KNS Órdenes de Traslado

PWA para digitalizar las órdenes de traslado de KNS Transportes, reemplazando
el talonario de papel. Chofer registra viajes offline-first (RUT + patente,
sin contraseña); el jefe de transportes ve todo, edita con historial, y tiene
un dashboard de análisis.

Stack: React + Vite (PWA, IndexedDB) · Supabase (Postgres + Auth + Edge
Functions + RLS) · Recharts.

## Estructura

- `frontend/` — app React/Vite.
- `supabase/migrations/` — esquema de base de datos, versionado.
- `supabase/functions/` — Edge Functions (Deno).
- `supabase/seed.sql` — datos de prueba para desarrollo.

## Estado

- [x] Fase 1 — Esquema SQL: `choferes`, `camiones`, `clientes`, `perfiles`,
      `traslados`, `traslados_auditoria`, correlativo automático,
      normalización de RUT/patente/cliente, RLS, vistas/funciones de alertas.
      Edge Function `login-chofer` (RUT + patente → JWT custom).
- [x] Fase 2 — Formulario offline del chofer: cola local en IndexedDB (Dexie),
      sincronización idempotente por `client_uuid`, historial propio con
      cache local, PWA instalable.
- [x] Fase 3 — Panel del jefe: tabla con filtros combinables, edición con
      historial de auditoría, catálogo de clientes (crear/renombrar/desactivar).
- [x] Fase 4 — Dashboard: tarjetas resumen con comparación vs período
      anterior, composición por producto, rankings por camión/chofer/cliente,
      evolución temporal (día/semana/mes), eficiencia por camión, alertas
      automáticas, exportación Excel/PDF de la vista filtrada.

## Puesta en marcha

### 1. Aplicar las migraciones en Supabase

Opción sin CLI: abre el **SQL Editor** del proyecto en supabase.com y ejecuta,
en orden, cada archivo de `supabase/migrations/` (0001 → 0005), y luego
`supabase/seed.sql` si quieres datos de prueba.

Opción con Supabase CLI (si la instalas más adelante):

```bash
supabase link --project-ref ftaaxwdmunghvmyciolz
supabase db push
```

### 2. Desplegar la Edge Function `login-chofer`

Necesita el **JWT Secret legado** del proyecto como variable de entorno de la
función (no se autoinyecta): Project Settings → API → JWT Settings → "JWT
Secret" (o "Legacy JWT Secret").

Con CLI:

```bash
supabase functions deploy login-chofer --no-verify-jwt
supabase secrets set JWT_SECRET=<el-jwt-secret-del-proyecto>
```

Sin CLI: crea la función desde el Dashboard (Edge Functions → New function →
pega el contenido de `supabase/functions/login-chofer/index.ts`), desactiva
"Verify JWT with legacy secret" para esa función, y agrega el secret
`JWT_SECRET` en Edge Functions → Secrets (el nombre no puede empezar con
`SUPABASE_`, prefijo reservado por Supabase).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Variables de entorno en `frontend/.env.local` (ya creado, no se sube a git):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 4. Crear el primer usuario "jefe"

Los choferes no usan Supabase Auth (login custom RUT+patente), pero el jefe
sí. Crea el usuario en Authentication → Users → Add user, y luego en el SQL
Editor:

```sql
insert into perfiles (id, nombre, rol)
values ('<uuid-del-usuario>', 'Nombre del Jefe', 'jefe');
```

## Despliegue

Vercel conectado al repo, root directory `frontend/`, con las mismas
variables de entorno `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` cargadas
en Vercel → Project Settings → Environment Variables.
