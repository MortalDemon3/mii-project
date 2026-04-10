import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, User } from '@/hooks/useAuth';

interface AuthContextType {
    user: User | null;
    isLoggedIn: boolean;
    login: (email: string, pass: string) => Promise<any>;
    register: (email: string, pass: string, user: string) => Promise<any>;
    verify: (email: string, code: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const auth = useAuth(); // Utilise ton hook existant
    return (
        <AuthContext.Provider value={auth}>
            {children}
        </AuthContext.Provider>
    );
};

export const useGlobalAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useGlobalAuth doit être utilisé à l'intérieur d'un AuthProvider");
    }
    return context;
};