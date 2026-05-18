# BVCT - Fire Station Procurement System

## 🎯 Project Overview

Professional web application for managing purchase orders, priorities, and budgets for fire stations with hierarchical ticketing workflow and role-based access control (RBAC).

**Stack:** Next.js 15 + TypeScript + Supabase + Tailwind + React Hook Form + Zod

**Status:** Base architecture complete, ready for module implementation

## ✅ Completed

- [x] Project scaffolding (Next.js 15, TypeScript, Tailwind)
- [x] Type system (roles, tickets, budgets, notifications, audit)
- [x] Role-based permission system
- [x] Supabase client configuration
- [x] Authentication flows (signin, signup, signout)
- [x] PostgreSQL schema with RLS
- [x] Triggers and audit logging
- [x] React Auth Context
- [x] Basic UI components (Button, Card, Input, Badge)
- [x] Login page (branded)
- [x] Dashboard layout with sidebar
- [x] Dashboard homepage
- [x] Placeholder pages for modules
- [x] Validation schemas (Zod)
- [x] Permission & priority utilities
- [x] README with setup instructions

## 🚀 Next Steps (Phase 2)

1. **Tickets Module** - CRUD operations
2. **Workflow Automation** - Accept/reject/assign
3. **Kanban Board** - Visualize by priority
4. **Budget Management** - Financial tracking
5. **Dashboards** - Analytics by role
6. **Notifications** - Real-time updates
7. **Reports** - Export capabilities
8. **File Management** - Attachment handling

## 📁 Project Structure

```
src/
├── app/                    # Next.js pages & layouts
├── components/             # React components
├── lib/                    # Utilities & clients
├── types/                  # TypeScript models
└── hooks/                  # Custom React hooks
```

## 🔐 Roles & Permissions

- **REPRESENTANTE_AREA** - Create/edit own tickets
- **JEFATURA** - Accept/reject, assign priorities
- **COMISION_DIRECTIVA** - Budget management
- **ADMIN** - Full system access

## 📊 Database

PostgreSQL schema in `database.sql` with Row Level Security (RLS) on all tables.

## 🚀 Quick Start

```bash
cd c:\Users\Usuario\Documents\bvctapp
cp .env.local.example .env.local
# Add Supabase credentials to .env.local
npm install
npm run dev
```

## 📚 Documentation

- `README.md` - User guide
- `database.sql` - DB schema
- `.env.local.example` - Environment template
- `AGENTS.md` - AI agent guide

