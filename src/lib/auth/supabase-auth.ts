import { supabaseClient } from '../supabase/client';
import { UserSession } from '@/types';
import { ROLE_PERMISSIONS, UserRole } from '@/types/roles';

async function getProfileByUserId(userId: string) {
  return supabaseClient
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
}

function getRoleFromMetadata(roleValue: unknown): UserRole {
  if (typeof roleValue === 'string' && Object.values(UserRole).includes(roleValue as UserRole)) {
    return roleValue as UserRole;
  }

  return UserRole.REPRESENTANTE_AREA;
}

function buildFallbackSession(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): UserSession {
  const metadata = user.user_metadata ?? {};
  const role = getRoleFromMetadata(metadata.role);
  const fullName =
    typeof metadata.full_name === 'string' && metadata.full_name.trim().length > 0
      ? metadata.full_name
      : user.email?.split('@')[0] || 'Usuario';
  const areaId = typeof metadata.area_id === 'string' && metadata.area_id.trim().length > 0 ? metadata.area_id : undefined;

  return {
    id: user.id,
    user_id: user.id,
    email: user.email || '',
    full_name: fullName,
    role,
    area_id: areaId,
    permissions: ROLE_PERMISSIONS[role].map((permission) => permission.toString()),
    is_active: typeof metadata.is_active === 'boolean' ? metadata.is_active : true,
  };
}

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

  // Fetch profile data from database.
  // After sign-in there can be a brief race where token/session propagation lags,
  // so we retry once after forcing a session read.
  let { data: profile, error: profileError } = await getProfileByUserId(user.id);

  if (!profile && !profileError) {
    await supabaseClient.auth.getSession();
    const retryResult = await getProfileByUserId(user.id);
    profile = retryResult.data;
    profileError = retryResult.error;
  }

  if (!profile) {
    return buildFallbackSession(user);
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
  areaId?: string,
  emailRedirectTo?: string
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
      emailRedirectTo,
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
