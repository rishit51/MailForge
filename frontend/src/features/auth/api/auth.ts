import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { useAuthStore } from '../store/authStore';
export const authApi = {
  login: async (credentials: { email: string, password: string }) => {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);
    const response = await apiClient.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return response.data;
  },
  signup: async (credentials: any) => {
    const response = await apiClient.post('/auth/register', {
      email: credentials.email,
      password: credentials.password
    });
    return response.data;
  },
  getMe: async () => {
    const response = await apiClient.get('/me');
    return response.data;
  }
};

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data: any) => {
      setAuth(null, data.access_token);
    }
  });
}

export function useUser() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    enabled: !!token,
    retry: false
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: authApi.signup,
  });
}
