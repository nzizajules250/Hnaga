

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
// Replace with your backend API endpoints
const API_BASE = 'http://localhost:5000/api';



type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  isActive?: boolean;
  lastSeen?: any;
};


type AuthContextType = {
  userProfile: UserProfile | null;
  loading: boolean;
};


const AuthContext = createContext<AuthContextType>({
  userProfile: null,
  loading: true,
});



export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Example: fetch user profile from backend
    async function fetchUserProfile() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/users/profile`, { credentials: 'include' });
        if (res.ok) {
          const profile = await res.json();
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
      } catch (err) {
        setUserProfile(null);
      }
      setLoading(false);
    }
    fetchUserProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4 bg-app-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Restoring your session...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
