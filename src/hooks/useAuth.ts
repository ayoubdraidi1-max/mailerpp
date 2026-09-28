import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'admin' | 'user';

export type AppUser = {
  id: string;
  email: string;
  role: UserRole;
  mailer_id: string | null;
};

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, mailer_id')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      setUser(null);
      return;
    }

    setUser({
      id: data.id,
      email,
      role: data.role as UserRole,
      mailer_id: data.mailer_id,
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }

        await fetchProfile(session.user.id, session.user.email ?? '');
        if (mounted) setLoading(false);
      })();
    });
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.includes('@') ? email : `${email}@admin.com`;
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, loading, signIn, signOut };
}
