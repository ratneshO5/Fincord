"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

export type User = {
    name: string;
    color: string;
    image?: string;
    email?: string;
};

type UserContextType = {
    user: User | null;
    login: (name: string, color: string) => void; // Keeps the signature but updates server
    logout: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { data: session, update } = useSession();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        if (session?.user) {
            setUser({
                name: session.user.name || "Unknown",
                email: session.user.email || "",
                image: session.user.image || undefined,
                // @ts-ignore
                color: session.user.color || "#007acc"
            });
        } else {
            setUser(null);
        }
    }, [session]);

    const login = async (name: string, color: string) => {
        // Optimistic update
        setUser(prev => prev ? { ...prev, name, color } : null);

        // Update server
        try {
            await fetch("/api/user/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, color }),
            });
            // Update session to reflect changes
            await update({ name, color });
        } catch (e) {
            console.error("Failed to update profile", e);
        }
    };

    const logout = () => {
        // Handled by NextAuth signOut usually, but we can clear local state
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, login, logout }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) throw new Error("useUser must be used within UserProvider");
    return context;
}
