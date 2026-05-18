/**
 * User & Authentication Types
 */

import { UserRole } from './roles';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  area_id?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  area_id?: string;
  permissions: string[];
  is_active: boolean;
}

export interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

export interface CreateUserInput {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  area_id?: string;
}

export interface UpdateProfileInput {
  full_name?: string;
  avatar_url?: string;
}
