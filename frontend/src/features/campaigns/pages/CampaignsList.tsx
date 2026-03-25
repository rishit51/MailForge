import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllJobs } from '../api/campaigns';
import { useAccounts } from '../../integrations/api/integrations';
import { useAllDatasets } from '../api/campaigns';

export function CampaignsList() {
  const navigate = useNavigate();

  // Fetch Data
  const { data: jobs = [], isLoading: isLoadingJobs } = useAllJobs();
  const { data: accounts = [] } = useAccounts();
  const { data: datasets = [] } = useAllDatasets();

  // Filters State
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Mapping Helpers
  const getDatasetName = (id: number) => {
    if (!id) return 'Unassigned';
    const ds = datasets.find((d: any) => d.id === id);
    return ds ? ds.name : `Dataset #${id}`;
  };

  const getAccountEmail = (id: number) => {
    if (!id) return 'Unknown Account';
    const acc = accounts.find((a: any) => a.id === id);
    return acc ? acc.email_address : `Account #${id}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Filter Jobs
  const filteredJobs = jobs.filter((job: any) => {
    if (filterStatus === 'All') return true;
    return job.status.toLowerCase() === filterStatus.toLowerCase();
  });

  return (
    <div className="space-y-12 animate-in fade-in duration-500">

      {/* Metric Blade */}


      {/* Filters & Active View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-headline font-bold text-on-surface">Drafts & Campaigns</h3>
          <p className="text-on-surface-variant text-sm mt-1">Manage your editorial outreach and automated sequencing.</p>
        </div>
        <div className="flex gap-3">
          <select
            className="bg-surface-container-low px-4 py-2 border-none rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">Status: All</option>
            <option value="created">Drafts</option>
            <option value="scheduled">Scheduled</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <button className="bg-surface-container-low px-4 py-2 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">calendar_month</span>
            This Month
          </button>
        </div>
      </div>

      {isLoadingJobs ? (
        <div className="py-24 text-center text-on-surface-variant animate-pulse">
          <span className="material-symbols-outlined text-4xl mb-4 text-outline-variant">hourglass_empty</span>
          <p className="font-bold">Syncing Campaign Telemetry...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* Mapped Campaigns */}
          {filteredJobs.map((job: any) => {
            const isSent = job.status === 'completed' || job.status === 'running';
            const isDraft = job.status === 'created';
            const isScheduled = job.status === 'scheduled';

            return (
              <div key={job.id} className="bg-surface-container-lowest p-8 rounded-xl flex flex-col justify-between group hover:shadow-[0_12px_32px_rgba(18,74,240,0.06)] transition-all border border-transparent hover:border-outline-variant/20">

                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1 pr-4">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-tighter">Job ID: {job.id}</span>
                    <h4 className={`text-xl font-bold font-headline leading-tight text-on-surface ${!job.subject_template ? 'italic text-surface-dim' : ''}`}>
                      {job.subject_template || `Untitled Campaign Draft #${job.id}`}
                    </h4>
                  </div>

                  {isSent && <span className="bg-tertiary/10 text-tertiary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">{job.status}</span>}
                  {isScheduled && <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">SCHEDULED</span>}
                  {isDraft && <span className="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">DRAFT</span>}
                </div>

                <div className="grid grid-cols-2 gap-6 py-6 bg-surface-container-low/30 rounded-lg px-6 mb-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-outline-variant uppercase">Dataset</p>
                    <p className={`text-sm font-semibold ${!job.dataset_id ? 'text-outline-variant italic' : 'text-on-surface-variant truncate'}`}>
                      {getDatasetName(job.dataset_id)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-outline-variant uppercase">Sending Account</p>
                    <p className="text-sm font-semibold text-on-surface-variant truncate">
                      {getAccountEmail(job.email_account_id)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-outline-variant uppercase">
                      {isScheduled ? 'Scheduled For' : 'Created At'}
                    </p>
                    <p className={`text-sm font-semibold truncate ${isScheduled ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {isScheduled ? formatDate(job.scheduled_at) : formatDate(job.created_at)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-outline-variant uppercase">Throttle Rate</p>
                    <p className="text-sm font-semibold text-on-surface-variant">{job.throttle_per_minute || 60} / min</p>
                  </div>
                </div>

                <div className="flex justify-between items-center h-10">
                  {isDraft && (
                    <>
                      <div className="text-outline text-xs">Last auto-saved recently</div>
                      <div className="flex gap-4">
                        <button className="bg-primary-fixed text-on-primary-fixed px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-primary-fixed-dim transition-colors" onClick={() => navigate(`/campaigns/${job.id}/edit`)}>
                          Resume Draft
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      </div>
                    </>
                  )}
                  {isScheduled && (
                    <>
                      <div className="text-on-surface-variant text-xs flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-outline">timer</span>
                        Awaiting dispatch
                      </div>
                      <div className="flex gap-4">
                        <button className="text-primary font-bold text-sm flex items-center gap-1 hover:underline">
                          Cancel Schedule
                        </button>
                      </div>
                    </>
                  )}
                  {isSent && (
                    <>
                      <div className="flex -space-x-2">
                        {/* Placeholder generic avatars for visual completeness */}
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">A</div>
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">B</div>
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant">...</div>
                      </div>
                      <button
                        className="text-primary font-bold text-sm flex items-center gap-1 hover:underline bg-primary/5 px-4 py-1.5 rounded-lg active:scale-95 transition-all"
                        onClick={() => navigate(`/analytics/${job.id}`)}
                      >
                        View Performance
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })}

          {/* Create New Card */}
          <div
            onClick={() => navigate('/campaigns/new')}
            className="bg-surface-container p-8 rounded-xl border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-all cursor-pointer min-h-[350px]"
          >
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4 group-hover:bg-primary-fixed transition-colors">
              <span className="material-symbols-outlined text-3xl text-outline group-hover:text-primary">add_circle</span>
            </div>
            <h4 className="text-lg font-bold text-on-surface">Initiate New Sequence</h4>
            <p className="text-on-surface-variant text-sm mt-2 max-w-[200px]">Define your audience and editorial content for a new campaign.</p>
          </div>

        </div>
      )}

      {/* Footer Stats Area */}
      <footer className="pt-12 border-t border-outline-variant/10 flex flex-wrap gap-12 pb-12">
        <div>
          <span className="text-[10px] font-bold text-outline uppercase tracking-widest block mb-2">Total Managed Data</span>
          <p className="text-2xl font-headline font-extrabold text-on-surface">{datasets.reduce((sum: number, ds: any) => sum + (ds.rows || 0), 0)} <span className="text-sm font-medium text-outline font-body">Records</span></p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-outline uppercase tracking-widest block mb-2">Drafted Jobs</span>
          <p className="text-2xl font-headline font-extrabold text-on-surface">{jobs.filter((j: any) => j.status === 'created').length} <span className="text-sm font-medium text-tertiary font-body">Active</span></p>
        </div>
        <div className="ml-auto flex items-center gap-6">
          <p className="text-label-sm text-outline-variant italic">System Status: Operational</p>
          <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></div>
        </div>
      </footer>

    </div>
  );
}
