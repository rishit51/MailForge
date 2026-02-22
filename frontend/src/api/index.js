import axios from "axios";
import { useState,useEffect,useCallback } from "react";

const BASE_URL =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL || "http://localhost:8000";



const getAuthHeaders = async () => {
  const accessToken = localStorage.getItem("access_token");
  if (!accessToken) {
    console.warn("No access token found for API request.");
  }

  return {
    "Authorization": `Bearer ${accessToken || ""}`,
  };
};

const handleApiError = async (response) => {
  if (response.status === 401 || response.status === 403) {
    window.location.href = "/login";
    return new Promise(() => {});
  }
  const errorResult = await response.json().catch(() => ({
    error: `An unknown error occurred (status: ${response.status})`,
  }));
  throw new Error(errorResult.error || "An unexpected error occurred.");
};

export const uploadDataset = async ({
  file,
  email_column,
  datasetName,
  onProgress,
}) => {

  const form = new FormData();

  form.append("file", file);
  form.append("email_column", email_column);
  form.append("name", datasetName);

  const authHeaders = await getAuthHeaders();

  const response = await axios.post(
    `${BASE_URL}/datasets/`,
    form,
    {
      headers: {
        ... authHeaders,
      },

      withCredentials: true,

      onUploadProgress: (event) => {

        if (!event.total) return;

        const percent = Math.round(
          (event.loaded * 100) / event.total
        );

        if (onProgress) {
          onProgress(percent);
        }
      },
    }
  );

  return response.data;
};

export const usePreviewDatasets = () => {
  const [datasets, setDatasets] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchDatasets = useCallback(async () => {
    setIsLoading(true)
    try {
      
      const authHeaders = await getAuthHeaders() 
      const res = await fetch(
        `${BASE_URL}/datasets?page=1&page_size=5`,
        { headers:{...authHeaders} }
      )

      if (!res.ok) throw new Error("Failed to fetch datasets")

      const json = await res.json()
      setDatasets(Array.isArray(json.data) ? json.data : [])

    } catch (err) {
      console.error(err)
      setDatasets([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDatasets()
  }, [fetchDatasets])

  return { datasets, isLoading, refetch: fetchDatasets }
}

export const fetchPreview = async (dataset_id) => {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${BASE_URL}/datasets/preview/${dataset_id}`, {
    headers: authHeaders,
  });

  if (!res.ok) {
    handleApiError(res);
  }

  return await res.json();
};