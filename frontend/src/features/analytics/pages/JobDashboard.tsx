import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useJobAnalytics, useJobEvents } from '../api/analytics';
import { useJob } from '../../campaigns/api/campaigns';
import { MetricCard } from '../components/MetricCard';
import { ActivityLog } from '../components/ActivityLog';

export const JobDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const jobId = id ? parseInt(id) : null;

  const { data: analytics, isLoading: analyticsLoading } = useJobAnalytics(jobId);
  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const events = useJobEvents(jobId);

  if (analyticsLoading || jobLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics || !job) {
    return (
      <div className="p-12 text-center bg-surface rounded-xl border border-surface-variant/20">
        <h2 className="text-2xl font-bold font-headline">Job Not Found</h2>
        <p className="text-on-surface-variant mt-2">The requested email job could not be located.</p>
        <Link to="/campaigns" className="mt-6 inline-block px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all">
          Return to Campaigns
        </Link>
      </div>
    );
  }

  // Calculate rates
  const openRate = analytics.delivered_count > 0
    ? ((analytics.opened_count / analytics.delivered_count) * 100).toFixed(1)
    : '0';
  const deliverability = analytics.delivered_count > 0
    ? ((analytics.delivered_count / analytics.sent_count) * 100).toFixed(1)
    : '0';
  const bounceRate = analytics.sent_count > 0
    ? ((analytics.bounced_count / analytics.sent_count) * 100).toFixed(2)
    : '0';

  return (
    <div className="pb-12">
      {/* Page Header */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <nav className="flex items-center gap-2 text-[12px] font-medium text-on-surface-variant mb-4">
            <Link to="/campaigns" className="hover:text-primary transition-colors">Campaigns</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary">{job.name || `Job #${jobId}`}</span>
          </nav>
          <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
            {job.name || `Job #${jobId}`} Performance
          </h1>
          <p className="text-on-surface-variant mt-2 font-medium">
            Real-time tracking for campaign started on {new Date(job.created_at || Date.now()).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Metric Blade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard
          label="Total Sent"
          value={analytics.sent_count.toLocaleString()}
          subtext="Processed Emails"
          icon="send"
          variant="default"
        />
        <MetricCard
          label="Open Rate"
          value={`${openRate}%`}
          subtext={`${analytics.opened_count} Emails Opened`}
          icon="mail"
          variant="tertiary"
        />
        <MetricCard
          label="Delivered Rate"
          value={`${deliverability}%`}
          subtext={`${analytics.delivered_count} Delivered`}
          icon="ads_click"
          variant="primary"
        />
        <MetricCard
          label="Bounce Rate"
          value={`${bounceRate}%`}
          subtext={`${analytics.bounced_count} Hard Bounces`}
          icon="warning"
          variant="error"
        />
      </div>

      {/* Activity Log */}
      <ActivityLog events={events} />
    </div>
  );
};
