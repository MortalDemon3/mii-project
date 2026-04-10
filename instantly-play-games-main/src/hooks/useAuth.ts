import { useState, useCallback } from 'react';
import { toast } from "sonner";

export interface User {
  id: string;
  username: string;
  email: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.status === 403 && data.error === 'account_not_verified') {
        return { success: false, needsVerification: true, email };
      }

      if (!response.ok) throw new Error(data.error || 'Erreur de connexion');

      setUser(data);
      setIsLoggedIn(true);
      toast.success(`Heureux de vous revoir, ${data.username} !`);
      return { success: true };
    } catch (error: any) {
      toast.error(error.message);
      return { success: false };
    }
  };

  const register = async (email: string, password: string, username: string) => {
    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur lors de l\'inscription');
      toast.info("Un code de vérification vous a été envoyé par email.");
      return { success: true, email };
    } catch (error: any) {
      toast.error(error.message);
      return { success: false };
    }
  };

  const verify = async (email: string, code: string) => {
    try {
      const response = await fetch('/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (!response.ok) throw new Error('Code de vérification invalide');
      toast.success("Compte vérifié avec succès !");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    toast.success("Déconnecté");
  };

  return { user, isLoggedIn, login, register, verify, logout };
};