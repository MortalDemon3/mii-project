import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateGuestId } from '@/lib/gameTypes';

interface PlayerIdentity {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isGuest: boolean;
  isLoading: boolean;
}

export function usePlayerIdentity(): PlayerIdentity & {
  setGuestName: (name: string) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
} {
  const [identity, setIdentity] = useState<PlayerIdentity>({
    id: '',
    displayName: '',
    isGuest: true,
    isLoading: true,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        setIdentity({
          id: session.user.id,
          displayName: profile?.display_name || session.user.email?.split('@')[0] || 'Player',
          avatarUrl: profile?.avatar_url || undefined,
          isGuest: false,
          isLoading: false,
        });
      } else {
        const stored = localStorage.getItem('mii_guest');
        if (stored) {
          const guest = JSON.parse(stored);
          setIdentity({ ...guest, isGuest: true, isLoading: false });
        } else {
          const guestId = generateGuestId();
          const guest = { id: guestId, displayName: '', isGuest: true, isLoading: false };
          setIdentity(guest);
        }
      }
    });

    supabase.auth.getSession();

    return () => subscription.unsubscribe();
  }, []);

  const setGuestName = (name: string) => {
    const updated = { ...identity, displayName: name };
    localStorage.setItem('mii_guest', JSON.stringify({ id: identity.id || generateGuestId(), displayName: name }));
    setIdentity({ ...updated, id: identity.id || generateGuestId() });
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signup = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    const guestId = generateGuestId();
    setIdentity({ id: guestId, displayName: '', isGuest: true, isLoading: false });
  };

  return { ...identity, setGuestName, login, signup, logout };
}
