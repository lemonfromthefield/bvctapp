'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserSession } from '@/types';
import { getCurrentUser, onAuthStateChange } from '@/lib/auth/supabase-auth';
import { hasPermission } from '@/lib/auth/permissions';
import { Permission, UserRole } from '@/types/roles';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  signOut: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session on mount
    const initializeAuth = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };

    initializeAuth();

    // Listen to auth state changes
    const { data } = onAuthStateChange((updatedUser) => {
      setUser(updatedUser);
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const { signOut } = await import('@/lib/auth/supabase-auth');
    await signOut();
    setUser(null);
  };

  const checkPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  const checkRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut: handleSignOut,
        hasPermission: checkPermission,
        hasRole: checkRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
