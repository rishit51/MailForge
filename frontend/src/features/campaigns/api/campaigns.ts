import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

// Types
export interface CreateDraftPayload {
  dataset_id?: number | null;
  email_account_id?: number | null;
  prompt_template?: string | null;
  subject_template?: string | null;
}

export interface ScheduleJobPayload {
  scheduled_at?: string | null;
  throttle_per_minute?: number;
}

// API methods
export const campaignsApi = {
  // Fetch all datasets for the Modal (ignoring pagination for simplicity in draft)
  fetchAllDatasets: async () => {
    const response = await apiClient.get("/datasets?page=1&page_size=100");
    return response.data?.data || [];
  },
  // Job Endpoints
  fetchAllJobs: async () => {
    const response = await apiClient.get("/email-jobs/");
    // Assuming standard pagination structure: data.data or items
    return response.data?.data || response.data?.items || response.data || [];
  },

  createDraft: async (payload: CreateDraftPayload) => {
    const response = await apiClient.post("/email-jobs/", payload);
    return response.data;
  },

  updateDraft: async ({ id, payload }: { id: number; payload: CreateDraftPayload }) => {
    const response = await apiClient.patch(`/email-jobs/${id}`, payload);
    return response.data;
  },

  scheduleJob: async ({ id, payload }: { id: number; payload: ScheduleJobPayload }) => {
    const response = await apiClient.post(`/email-jobs/${id}/schedule`, payload);
    return response.data;
  },
  
  getJob: async (id: number) => {
    // Assuming you have or will have a GET /email-jobs/{id}
    const response = await apiClient.get(`/email-jobs/${id}`);
    return response.data;
  }
};

// React Query Hooks
export const useAllDatasets = () => {
  return useQuery({
    queryKey: ["allDatasets"],
    queryFn: campaignsApi.fetchAllDatasets,
  });
};

export const useCreateDraft = () => {
  return useMutation({
    mutationFn: campaignsApi.createDraft,
  });
};

export const useAllJobs = () => {
  return useQuery({
    queryKey: ["allJobs"],
    queryFn: campaignsApi.fetchAllJobs,
  });
};

export const useUpdateDraft = () => {
  return useMutation({
    mutationFn: campaignsApi.updateDraft,
  });
};

export const useScheduleJob = () => {
  return useMutation({
    mutationFn: campaignsApi.scheduleJob,
  });
};

export const useJob = (id: number | null) => {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => campaignsApi.getJob(id!),
    enabled: !!id,
  });
};
