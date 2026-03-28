import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
export type DatasetListItem = {
  id: number
  name: string
  type: string
  rows: number
  status: string
  date: string
}

export const datasetsApi = {
  uploadDataset: async ({
    file,
    email_column,
    datasetName,
    onProgress,
  }: {
    file: File;
    email_column: string;
    datasetName: string;
    onProgress: (percent: number) => void;
  }) => {
    const form = new FormData();
    form.append("file", file);
    form.append("email_column", email_column);
    form.append("name", datasetName);

    const response = await apiClient.post("/datasets/", form, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (event) => {
        if (!event.total) return;
        const percent = Math.round((event.loaded * 100) / event.total);
        if (onProgress) {
          onProgress(percent);
        }
      },
    });
    return response.data;
  },

  fetchPreviewDatasets: async () => {
    const response = await apiClient.get("/datasets?page=1&page_size=5");
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  fetchPreview: async (dataset_id: number) => {
    const response = await apiClient.get(`/datasets/preview/${dataset_id}`);
    return response.data;
  },
};
export const usePreviewDatasets = () => {
  const query = useQuery<DatasetListItem[]>({
    queryKey: ["previewDatasets"],
    queryFn: datasetsApi.fetchPreviewDatasets,
  });

  return {
    datasets: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};

export const useDatasetPreview = (dataset_id: number | null) => {
  return useQuery({
    queryKey: ["datasetPreview", dataset_id],
    queryFn: () => datasetsApi.fetchPreview(dataset_id!),
    enabled: !!dataset_id,
  });
};

export const useUploadDataset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: datasetsApi.uploadDataset,
    onSuccess: () => {
      // Invalidate the datasets list query to refetch after a successful upload
      queryClient.invalidateQueries({ queryKey: ["previewDatasets"] });
    },
  });
};
