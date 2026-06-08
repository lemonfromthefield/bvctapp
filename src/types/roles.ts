/**
 * Role-Based Access Control Types
 * Hierarchical permission system for fire station procurement workflow
 */

export enum UserRole {
  REPRESENTANTE_AREA = 'REPRESENTANTE_AREA',
  JEFATURA = 'JEFATURA',
  COMISION_DIRECTIVA = 'COMISION_DIRECTIVA',
  ADMIN = 'ADMIN',
}

export enum Permission {
  // Ticket operations
  CREATE_TICKET = 'CREATE_TICKET',
  EDIT_TICKET = 'EDIT_TICKET',
  DELETE_TICKET = 'DELETE_TICKET',
  VIEW_TICKET = 'VIEW_TICKET',
  VIEW_ALL_TICKETS = 'VIEW_ALL_TICKETS',

  // Ticket workflow
  ACCEPT_TICKET = 'ACCEPT_TICKET',
  REJECT_TICKET = 'REJECT_TICKET',
  CREATE_SPECIAL_TICKET = 'CREATE_SPECIAL_TICKET',

  // Priority management
  ASSIGN_PRIORITY = 'ASSIGN_PRIORITY',
  MODIFY_PRIORITY = 'MODIFY_PRIORITY',
  REORDER_PRIORITIES = 'REORDER_PRIORITIES',

  // Budget management
  LOAD_FUNDS = 'LOAD_FUNDS',
  ASSIGN_BUDGET = 'ASSIGN_BUDGET',
  CHANGE_BUDGET_STATUS = 'CHANGE_BUDGET_STATUS',
  VIEW_BUDGETS = 'VIEW_BUDGETS',

  // File management
  UPLOAD_FILE = 'UPLOAD_FILE',
  DELETE_FILE = 'DELETE_FILE',
  VIEW_FILES = 'VIEW_FILES',

  // Audit and history
  VIEW_HISTORY = 'VIEW_HISTORY',
  VIEW_AUDIT_LOG = 'VIEW_AUDIT_LOG',

  // Settings
  MANAGE_AREAS = 'MANAGE_AREAS',
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_SETTINGS = 'VIEW_SETTINGS',
  EDIT_SETTINGS = 'EDIT_SETTINGS',
}

export interface RolePermissionMap {
  [UserRole.REPRESENTANTE_AREA]: Permission[];
  [UserRole.JEFATURA]: Permission[];
  [UserRole.COMISION_DIRECTIVA]: Permission[];
  [UserRole.ADMIN]: Permission[];
}

export const ROLE_PERMISSIONS: RolePermissionMap = {
  [UserRole.REPRESENTANTE_AREA]: [
    Permission.CREATE_TICKET,
    Permission.EDIT_TICKET,
    Permission.DELETE_TICKET,
    Permission.VIEW_TICKET,
    Permission.VIEW_ALL_TICKETS,
    Permission.UPLOAD_FILE,
    Permission.VIEW_FILES,
    Permission.VIEW_HISTORY,
  ],

  [UserRole.JEFATURA]: [
    Permission.CREATE_TICKET,
    Permission.EDIT_TICKET,
    Permission.DELETE_TICKET,
    Permission.VIEW_TICKET,
    Permission.VIEW_ALL_TICKETS,
    Permission.ACCEPT_TICKET,
    Permission.REJECT_TICKET,
    Permission.CREATE_SPECIAL_TICKET,
    Permission.ASSIGN_PRIORITY,
    Permission.MODIFY_PRIORITY,
    Permission.REORDER_PRIORITIES,
    Permission.UPLOAD_FILE,
    Permission.DELETE_FILE,
    Permission.VIEW_FILES,
    Permission.VIEW_HISTORY,
    Permission.VIEW_AUDIT_LOG,
    Permission.VIEW_SETTINGS,
  ],

  [UserRole.COMISION_DIRECTIVA]: [
    Permission.CREATE_TICKET,
    Permission.EDIT_TICKET,
    Permission.DELETE_TICKET,
    Permission.VIEW_TICKET,
    Permission.VIEW_ALL_TICKETS,
    Permission.ASSIGN_PRIORITY,
    Permission.MODIFY_PRIORITY,
    Permission.REORDER_PRIORITIES,
    Permission.UPLOAD_FILE,
    Permission.DELETE_FILE,
    Permission.VIEW_FILES,
    Permission.VIEW_HISTORY,
    Permission.VIEW_AUDIT_LOG,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_USERS,
  ],

  [UserRole.ADMIN]: [
    // Admin has all permissions
    Permission.CREATE_TICKET,
    Permission.EDIT_TICKET,
    Permission.DELETE_TICKET,
    Permission.VIEW_TICKET,
    Permission.VIEW_ALL_TICKETS,
    Permission.ACCEPT_TICKET,
    Permission.REJECT_TICKET,
    Permission.CREATE_SPECIAL_TICKET,
    Permission.ASSIGN_PRIORITY,
    Permission.MODIFY_PRIORITY,
    Permission.REORDER_PRIORITIES,
    Permission.LOAD_FUNDS,
    Permission.ASSIGN_BUDGET,
    Permission.CHANGE_BUDGET_STATUS,
    Permission.VIEW_BUDGETS,
    Permission.UPLOAD_FILE,
    Permission.DELETE_FILE,
    Permission.VIEW_FILES,
    Permission.VIEW_HISTORY,
    Permission.VIEW_AUDIT_LOG,
    Permission.MANAGE_AREAS,
    Permission.MANAGE_USERS,
    Permission.VIEW_SETTINGS,
    Permission.EDIT_SETTINGS,
  ],
};

export interface RoleInfo {
  role: UserRole;
  displayName: string;
  description: string;
  color: string;
}

export const ROLES_INFO: Record<UserRole, RoleInfo> = {
  [UserRole.REPRESENTANTE_AREA]: {
    role: UserRole.REPRESENTANTE_AREA,
    displayName: 'Representante de Área',
    description: 'Usuario del cuerpo activo que crea y gestiona solicitudes',
    color: 'text-blue-600',
  },
  [UserRole.JEFATURA]: {
    role: UserRole.JEFATURA,
    displayName: 'Jefatura',
    description: 'Usuario jerárquico que acepta, rechaza y asigna prioridades',
    color: 'text-amber-600',
  },
  [UserRole.COMISION_DIRECTIVA]: {
    role: UserRole.COMISION_DIRECTIVA,
    displayName: 'Comisión Directiva',
    description: 'Usuario administrativo que selecciona tickets para Compras y valida propuestas',
    color: 'text-red-600',
  },
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    displayName: 'Administrador',
    description: 'Administrador del sistema con acceso total',
    color: 'text-gray-900',
  },
};
