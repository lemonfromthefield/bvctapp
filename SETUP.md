# 🚀 BVCT Setup Completo - Guía Paso a Paso

## ✅ Estado Actual

La arquitectura base está **100% completa** y lista para usar. Todos los tipos, auth, validaciones, esquema SQL y componentes están implementados.

## 📝 Pasos para Terminar la Configuración

### Paso 1: Crear Proyecto Supabase

1. Ir a [supabase.com](https://supabase.com)
2. Click "New Project"
3. Seleccionar organización
4. Nombre: "bvctapp"
5. Password: generar seguro
6. Region: seleccionar la más cercana
7. Click "Create new project"
8. **Esperar** a que termina (5-10 minutos)

### Paso 2: Obtener Credenciales

Cuando Supabase esté listo:

1. Ir a Settings → API
2. Copiar:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ confidencial)

### Paso 3: Configurar Variables de Entorno

1. Crear archivo `.env.local` en raíz del proyecto
2. Pegar las 3 variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

3. **NO** hacer commit de este archivo (ya está en `.gitignore`)

### Paso 4: Crear Base de Datos

1. En Supabase → SQL Editor
2. Click "New Query"
3. Copiar todo el contenido de `database.sql`
4. Pegar en el editor
5. Click "Run"
6. **Esperar** a que termine

✅ Base de datos lista

### Paso 5: Crear Usuarios Demo

En SQL Editor, crear nuevo query y ejecutar:

```sql
-- Usuario: Representante de Área
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'representante@bvct.local',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Usuario: Jefatura
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'jefatura@bvct.local',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Usuario: Comisión Directiva
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'comision@bvct.local',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Usuario: Admin
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@bvct.local',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);
```

⚠️ **Los perfiles se crean automáticamente** gracias al trigger `handle_new_user`

### Paso 6: Instalar Dependencias Locales

```bash
cd c:\Users\Usuario\Documents\bvctapp
npm install
```

### Paso 7: Ejecutar en Desarrollo

```bash
npm run dev
```

Abrir: [http://localhost:3000](http://localhost:3000)

Debería redirigir automáticamente a `/auth/login`

### Paso 8: Probar Acceso

Credenciales demo:
```
Email: representante@bvct.local
Pass: password123
```

Debería:
1. Loguear exitosamente
2. Redirigir a `/dashboard`
3. Mostrar datos del usuario
4. Permitir navegar por sidebar

## 📚 Estructura Creada

### Tipos TypeScript (Dominio)
- ✅ Roles y permisos
- ✅ Estados y prioridades de tickets
- ✅ Usuarios y perfiles
- ✅ Presupuestos
- ✅ Notificaciones
- ✅ Auditoría

### Autenticación
- ✅ Supabase client setup
- ✅ Auth context (React)
- ✅ Login/signup/logout flows
- ✅ Permission checking
- ✅ Protected routes

### Base de Datos
- ✅ 10+ tablas normalizadas
- ✅ Triggers para auditoría
- ✅ RLS en todas las tablas
- ✅ Índices para performance
- ✅ Foreign keys y constraints

### UI Base
- ✅ Componentes: Button, Card, Input, Badge
- ✅ Login page con branding
- ✅ Dashboard layout con sidebar
- ✅ Navegación responsiva
- ✅ Temas de colores bomberiles

### Validaciones
- ✅ Zod schemas para todos los formularios
- ✅ React Hook Form integrada
- ✅ Mensajes de error en español

## 🎯 Qué Viene Después

### Fase 2: Módulos Core
1. **Tickets** - CRUD, filtering, search
2. **Workflow** - Accept/reject, priority assignment
3. **Kanban** - Board visualización
4. **Presupuestos** - Gestión financiera

### Fase 3: Características Avanzadas
1. **Notifications Realtime** - Supabase Realtime
2. **Dashboards** - Analytics y charts
3. **Reportes** - PDF/Excel export
4. **Auditoría** - Logs completos

### Fase 4: Polish
1. **Performance** - Optimizaciones
2. **Testing** - Unit & E2E tests
3. **Deployment** - Vercel + Supabase
4. **Documentation** - API docs

## 🔐 Security Checklist

- ✅ RLS configurado
- ✅ Auth context protected
- ✅ Server-side validation (Zod)
- ✅ Types enforce safety
- ⏳ CSRF protection (implementar en próxima fase)
- ⏳ Rate limiting (implementar)
- ⏳ Input sanitization (implementar)

## 📊 Estadísticas del Proyecto

| Métrica | Valor |
|---------|-------|
| Archivos TypeScript | 20+ |
| Componentes React | 6+ |
| Tipos definidos | 50+ |
| Esquema DB | 1 (database.sql) |
| Tablas | 11 |
| RLS Policies | 15+ |
| Validaciones | 7 schemas |
| Líneas de código | 3000+ |

## 🚀 Comandos Útiles

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Format
npx prettier --write .

# Type check
npx tsc --noEmit
```

## 📞 Troubleshooting

### Error: "Invariant: Expected workStore"
- Este es un bug conocido de Turbopack en Next.js 16.2.6
- **Solución:** Ya está deshabilitado en `next.config.ts`
- Dev server funciona perfecto

### Error: "Supabase URL is empty"
- Verificar `.env.local` existe
- Verificar variables están correctamente copiadas
- Reiniciar dev server: `npm run dev`

### Error: RLS policy error
- Verificar usuario está autenticado
- Verificar rol en tabla `profiles`
- Verificar policy en table específica

## ✅ Checklist Final

- [ ] Supabase proyecto creado
- [ ] Credenciales en `.env.local`
- [ ] `database.sql` ejecutado
- [ ] Usuarios demo creados
- [ ] `npm install` completado
- [ ] `npm run dev` funciona
- [ ] Login funciona
- [ ] Dashboard se muestra
- [ ] Ready for Phase 2!

---

**Una vez completado: Listo para implementar módulos Phase 2 🚀**
