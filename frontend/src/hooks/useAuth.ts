import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';

export function useAuth() {
  const { user, isAuthenticated, login, logout, setUser } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: authApi.getProfile,
    enabled: isAuthenticated && !user,
    retry: false,
  });

  useEffect(() => {
    if (profile) setUser(profile);
  }, [profile, setUser]);

  return { user: user || profile, isAuthenticated, isLoading, login, logout };
}
