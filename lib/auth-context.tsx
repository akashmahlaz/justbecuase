"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSession, signOut as authSignOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: "volunteer" | "ngo";
  isOnboarded: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refetchSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending, refetch } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image || undefined,
        role: (session.user as any).role || "volunteer",
        isOnboarded: (session.user as any).isOnboarded || false,
      });
    } else {
      setUser(null);
    }
  }, [session]);

  const handleSignOut = async () => {
    await authSignOut();
    setUser(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isPending,
        signOut: handleSignOut,
        refetchSession: refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
