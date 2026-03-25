import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

export const integrationsApi = {
  fetchAccounts: async () => {
    const response = await apiClient.get("/email-accounts");
    return response.data;
  },

  deleteAccount: async (id: string | number) => {
    const response = await apiClient.delete(`/email-accounts/${id}`);
    return response.data;
  },

  gmailAuth: async () => {
    const response = await apiClient.get("/email-accounts/gmail/auth-url");
    return response.data.auth_url;
  },

  createSendgridAccount: async (payload: { email_address: string; name?: string; config: { api_key: string } }) => {
    try {
      const response = await apiClient.post("/email-accounts/sendgrid", payload);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || "Failed to connect SendGrid account.");
    }
  },

  updateSendgridAccount: async ({ id, payload }: { id: string | number; payload: { config: { api_key: string } } }) => {
    try {
      const response = await apiClient.patch(`/email-accounts/sendgrid/${id}`, payload);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || "Failed to update SendGrid account.");
    }
  },

  generateSendgridCredentials: async (id: string | number) => {
    try {
      const response = await apiClient.post(`/email-accounts/auth/sendgrid/${id}/generate`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || "Failed to generate credentials.");
    }
  },
};

export const useAccounts = () => {
  return useQuery({
    queryKey: ["emailAccounts"],
    queryFn: integrationsApi.fetchAccounts,
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: integrationsApi.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailAccounts"] });
    },
  });
};

export const useCreateSendgrid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: integrationsApi.createSendgridAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailAccounts"] });
    },
  });
};

export const useUpdateSendgrid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: integrationsApi.updateSendgridAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailAccounts"] });
    },
  });
};
