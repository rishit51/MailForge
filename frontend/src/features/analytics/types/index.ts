export interface EmailJobAnalytics {
  id: number;
  job_id: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  failed_count: number;
}

export type EventType = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribed';

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  recipient: string;
  timestamp: string;
  details?: string;
}
