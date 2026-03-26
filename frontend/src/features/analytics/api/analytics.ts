import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { useAuthStore } from '../../auth/store/authStore';
import type { EmailJobAnalytics, AnalyticsEvent } from '../types';

export const analyticsApi = {
  getJobAnalytics: async (jobId: number): Promise<EmailJobAnalytics> => {
    const response = await apiClient.get(`/analytics/${jobId}`);
    return response.data;
  },
};

export const useJobAnalytics = (jobId: number | undefined | null) => {
  return useQuery({
    queryKey: ['jobAnalytics', jobId],
    queryFn: () => analyticsApi.getJobAnalytics(jobId!),
    enabled: !!jobId,
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useJobEvents = (jobId: number | undefined | null) => {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!jobId || !token) {
      setEvents([]);
      return;
    }

    const baseUrl = import.meta.env.VITE_API_URL || '/api/';
    // Passing token via query param as EventSource doesn't support custom headers
    const url = `${baseUrl}/analytics/${jobId}/events/stream?token=${token}`;

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const newEvent: AnalyticsEvent = JSON.parse(event.data);
        setEvents((prev) => [newEvent, ...prev]);
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      // In a real app we might want to implement reconnection logic here
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, token]);

  return events;
};
