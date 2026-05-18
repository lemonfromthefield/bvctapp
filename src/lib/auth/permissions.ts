import { UserRole, ROLE_PERMISSIONS, Permission } from '@/types/roles';

/**
 * Check if user has specific permission
 */
export function hasPermission(
  userRole: UserRole,
  permission: Permission
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions?.includes(permission) ?? false;
}

/**
 * Check if user has any of the specified roles
 */
export function hasRole(
  userRole: UserRole,
  requiredRoles: UserRole | UserRole[]
): boolean {
  const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return rolesArray.includes(userRole);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(userRole: UserRole): Permission[] {
  return ROLE_PERMISSIONS[userRole] ?? [];
}

/**
 * Check if ticket is editable by user with given role
 */
export function isTicketEditable(
  userRole: UserRole,
  ticketStatus: string
): boolean {
  // ACEPTADO and RECHAZADO tickets cannot be edited
  if (ticketStatus === 'ACEPTADO' || ticketStatus === 'RECHAZADO') {
    return false;
  }

  // JEFATURA and ADMIN can edit any non-final ticket
  if (userRole === UserRole.JEFATURA || userRole === UserRole.ADMIN) {
    return true;
  }

  // REPRESENTANTE can only edit BORRADOR tickets
  if (userRole === UserRole.REPRESENTANTE_AREA) {
    return ticketStatus === 'BORRADOR' || ticketStatus === 'PENDIENTE';
  }

  return false;
}

/**
 * Check if user can view ticket based on ticket status and user role
 */
export function canViewTicket(
  userRole: UserRole,
  ticketStatus: string,
  ticketCreatorId: string,
  currentUserId: string
): boolean {
  // ADMIN can view everything
  if (userRole === UserRole.ADMIN) {
    return true;
  }

  // JEFATURA and COMISION_DIRECTIVA can view everything
  if (userRole === UserRole.JEFATURA || userRole === UserRole.COMISION_DIRECTIVA) {
    return true;
  }

  // REPRESENTANTE can view:
  // - Own tickets always
  // - Any ACEPTADO tickets
  // - Any COMPLETADO tickets
  if (userRole === UserRole.REPRESENTANTE_AREA) {
    if (ticketCreatorId === currentUserId) {
      return true;
    }
    return ticketStatus === 'ACEPTADO' || ticketStatus === 'COMPLETADO';
  }

  return false;
}
