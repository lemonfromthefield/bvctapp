import { supabaseClient } from '../supabase/client';
import { UserSession } from '@/types';
import { ROLE_PERMISSIONS, UserRole } from '@/types/roles';

/**
 * Get current user session from Supabase Auth
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch profile data from database
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return null;
  }

  const role = profile.role as UserRole;

  return {
    id: user.id,
    user_id: user.id,
    email: user.email || '',
    full_name: profile.full_name,
    role,
    area_id: profile.area_id,
    permissions: ROLE_PERMISSIONS[role].map((permission) => permission.toString()),
    is_active: profile.is_active ?? true,
  };
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign up new user
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
  role: UserRole = UserRole.REPRESENTANTE_AREA,
  areaId?: string
) {
  const { data, error: signUpError } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
        area_id: areaId,
      },
    },
  });

  if (signUpError) {
    throw signUpError;
  }

  return data;
}

/**
 * Sign out current user
 */
export async function signOut() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    throw error;
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(
  callback: (user: UserSession | null) => void
) {
  return supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const user = await getCurrentUser();
      callback(user);
    } else if (event === 'SIGNED_OUT') {
      callback(null);
    }
  });
}
