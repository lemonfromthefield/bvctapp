# 🚒 BVCT - Sistema de Gestión de Tickets

Sistema profesional de gestión integral de pedidos, prioridades y presupuestos para cuarteles de bomberos con workflow jerárquico y control de acceso basado en roles.

## 📋 Características

### ✅ Implementado
- ✓ Estructura de proyecto Next.js 15 + TypeScript
- ✓ Sistema de roles jerárquicos (REPRESENTANTE_AREA, JEFATURA, COMISION_DIRECTIVA, ADMIN)
- ✓ Tipos TypeScript completos para dominio
- ✓ Autenticación con Supabase
- ✓ Sistema de permisos granulares
- ✓ Layout con sidebar responsive
- ✓ Validaciones con Zod
- ✓ Componentes UI base (Button, Card, Input, Badge)
- ✓ Base de datos PostgreSQL con RLS completo

### 🚀 Próximas Fases
- Edge Functions para automatización de prioridades
- Sistema Kanban completo
- Dashboards por rol
- Notificaciones Realtime
- Reportes y exportación
- Auditoría completa
- Sistema de presupuestos

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 15** - App Router, Server Components
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Hook Form** - Forms
- **Zod** - Validation
- **TanStack Table** - Data tables
- **dnd-kit** - Drag & drop
- **Recharts** - Charts & dashboards
- **Lucide Icons** - UI Icons

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL** - Database
- **Supabase Auth** - Authentication
- **Row Level Security (RLS)** - Authorization
- **Supabase Realtime** - Real-time features
- **Supabase Storage** - File management

### Deployment
- **Vercel** - Frontend hosting
- **Supabase** - Backend hosting

## 📁 Estructura del Proyecto

```
src/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # Auth routes
│   │   └── login/
│   ├── (dashboard)/             # Dashboard routes (protected)
│   │   ├── dashboard/
│   │   ├── tickets/
│   │   ├── priorities/
│   │   ├── budgets/
│   │   └── layout.tsx
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home (redirect)
├── components/
│   ├── auth/
│   ├── ui/
│   ├── tickets/
│   ├── dashboard/
│   └── notifications/
├── lib/
│   ├── supabase/
│   ├── auth/
│   ├── utils/
│   └── validators/
├── types/                       # TypeScript domain models
└── hooks/
```

## 🔐 Roles y Permisos

### REPRESENTANTE_AREA
Usuarios del cuerpo activo
- Crear/editar/eliminar tickets propios
- Editar solo si están en BORRADOR/PENDIENTE
- Ver todos los tickets visibles
- Subir archivos

### JEFATURA
Usuarios jerárquicos
- Aceptar/rechazar tickets
- Asignar prioridades definitivas
- Crear pedidos especiales
- Editar cualquier ticket no final
- Ver auditoría

### COMISION_DIRECTIVA
Usuarios administrativos/financieros
- Gestión financiera completa
- Asignar presupuestos
- Reordenar tickets
- Cargar comprobantes
- Ver todo

### ADMIN
- Acceso completo
- Gestión de usuarios
- Configuración global

## 🚀 Quick Start

### 1. Preparar workspace

```bash
cd c:\Users\Usuario\Documents\bvctapp
```

### 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Editar `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

### 3. Crear base de datos en Supabase

1. Crear nuevo proyecto en [supabase.com](https://supabase.com)
2. Ir a SQL Editor → New Query
3. Copiar contenido de `database.sql`
4. Ejecutar

### 4. Instalar dependencias

```bash
npm install
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Acceder a `http://localhost:3000`

## 📊 Estados de Ticket

- **BORRADOR** - Creado, no enviado
- **PENDIENTE** - Esperando aprobación
- **ACEPTADO** - Aprobado
- **RECHAZADO** - Rechazado
- **PRESUPUESTADO** - Con presupuesto
- **EN_PROCESO** - En ejecución
- **COMPLETADO** - Finalizado
- **CANCELADO** - Cancelado

## ⭐ Prioridades

| Prioridad | Cobertura | Auto-escala |
|-----------|-----------|------------|
| URGENTE | 7 días | — |
| ALTA_IMPORTANCIA | 30 días | → URGENTE |
| MEDIA_IMPORTANCIA | 90 días | → ALTA |
| BAJA_IMPORTANCIA | 180 días | → MEDIA |
| SIN_PRIORIDAD | 365 días | → BAJA |

## 🗄️ Base de Datos

### Tablas
- `profiles` - Usuarios
- `areas` - Departamentos
- `tickets` - Solicitudes
- `ticket_history` - Auditoría
- `ticket_comments` - Comentarios
- `attachments` - Archivos
- `budgets` - Presupuestos
- `notifications` - Notificaciones
- `audit_logs` - Logs

### RLS (Row Level Security)
Todas las tablas cuentan con RLS para proteger datos según rol y visibilidad.

## 📝 Validaciones

Zod schemas para todos los formularios:
- `createTicketSchema`
- `assignPrioritySchema`
- `assignBudgetSchema`
- `signInSchema`

## 🔐 Autenticación

```typescript
import { useAuth } from '@/components/auth/auth-context';

export default function Component() {
  const { user, hasPermission, hasRole } = useAuth();
  
  if (!user) return null;
  
  if (hasPermission('ACCEPT_TICKET')) {
    // Mostrar opción
  }
}
```

## 🚀 Deployment

### Vercel (Frontend)
1. Push a GitHub
2. Conectar con Vercel
3. Configurar env vars
4. Deploy automático

### Supabase (Backend)
Ya está hosteado y listo.

## 🛠️ Desarrollo

### Nuevo componente
```typescript
// src/components/tickets/my-component.tsx
'use client';

import { Card } from '@/components/ui/card';

export function MyComponent() {
  return <Card>Contenido</Card>;
}
```

### Nueva página
```typescript
// src/app/(dashboard)/newpage/page.tsx
export default function NewPage() {
  return <div>Nueva página</div>;
}
```

## 📚 Stack Instalado

```json
{
  "@supabase/supabase-js": "^2.x",
  "@hookform/resolvers": "^3.x",
  "react-hook-form": "^7.x",
  "zod": "^3.x",
  "@tanstack/react-table": "^8.x",
  "@dnd-kit/core": "^6.x",
  "@dnd-kit/sortable": "^7.x",
  "recharts": "^2.x",
  "lucide-react": "^latest",
  "clsx": "^2.x",
  "tailwind-merge": "^2.x"
}
```

## 🎨 Diseño

- Tema: Colores bomberiles (rojo, naranja, grises oscuros)
- UI minimalista y moderna
- Mobile-first responsive
- Dark mode compatible
- Accesibilidad WCAG

## 📖 Documentación

- [Supabase](https://supabase.io/docs)
- [Next.js 15](https://nextjs.org/docs)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com)
- [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev)

## 🔄 Siguiente: Implementar Módulos

1. **Tickets Management** - CRUD completo
2. **Kanban Board** - Visualización por prioridad
3. **Dashboards** - Por rol
4. **Notificaciones** - Realtime
5. **Reportes** - PDF/Excel
6. **Presupuestos** - Gestión financiera
7. **Auditoría** - Tracking completo

---

**Desenvolvido com ❤️ para mejores procesos administrativos en cuarteles de bomberos**

