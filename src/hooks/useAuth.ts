import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'admin' | 'user';

export type AppUser = {
  id: string;
  email: string;
  role: UserRole;
  mailer_id: string | null;
  avatar_url: string | null;
  gender: 'male' | 'female' | null;
  display_name: string | null;
};

export type PresenceUser = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  gender: 'male' | 'female' | null;
  is_online: boolean;
};

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management`;

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, mailer_id, avatar_url, gender, display_name')
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
      avatar_url: data.avatar_url ?? null,
      gender: data.gender as 'male' | 'female' | null,
      display_name: data.display_name ?? null,
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    const session = await supabase.auth.getSession();
    if (session.data.session?.user) {
      await fetchProfile(session.data.session.user.id, session.data.session.user.email ?? '');
    }
  }, [fetchProfile]);

  const startHeartbeat = useCallback(async () => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return;

    await fetch(`${FN_URL}/heartbeat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    heartbeatRef.current = setInterval(async () => {
      const s = await supabase.auth.getSession();
      const t = s.data.session?.access_token;
      if (!t) return;
      await fetch(`${FN_URL}/heartbeat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      });
    }, 30000);
  }, []);

  const stopHeartbeat = useCallback(async () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (token) {
      await fetch(`${FN_URL}/go-offline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session?.user) {
          await stopHeartbeat();
          setUser(null);
          setLoading(false);
          return;
        }

        await fetchProfile(session.user.id, session.user.email ?? '');
        await startHeartbeat();
        if (mounted) setLoading(false);
      })();
    });

    const handleBeforeUnload = () => {
      stopHeartbeat();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      mounted = false;
      stopHeartbeat();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [fetchProfile, startHeartbeat, stopHeartbeat]);

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.includes('@') ? email : `${email}@admin.com`;
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await stopHeartbeat();
    await supabase.auth.signOut();
    setUser(null);
  }, [stopHeartbeat]);

  return { user, loading, signIn, signOut, refreshProfile };
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const fetchOnline = async () => {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, avatar_url, gender, is_online, display_name')
        .eq('is_online', true);

      if (!error && profileData) {
        const session = await supabase.auth.getSession();
        const currentUserId = session.data.session?.user?.id ?? '';
        setOnlineUsers(
          profileData.map((p) => ({
            id: p.id,
            email: p.id === currentUserId ? (session.data.session?.user?.email ?? '') : '',
            display_name: p.display_name ?? null,
            avatar_url: p.avatar_url ?? null,
            gender: p.gender as 'male' | 'female' | null,
            is_online: p.is_online ?? false,
          }))
        );
      }
    };

    fetchOnline();

    const channel = supabase
      .channel('presence-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchOnline())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return onlineUsers;
}
