import React from 'react';
import type { AnalyticsEvent, EventType } from '../types';

interface ActivityLogProps {
  events: AnalyticsEvent[];
}

const getEventConfig = (type: EventType) => {
  switch (type) {
    case 'opened':
      return {
        icon: 'mail',
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
        label: 'Email Opened',
      };
    case 'clicked':
      return {
        icon: 'ads_click',
        bgColor: 'bg-tertiary/10',
        iconColor: 'text-tertiary',
        label: 'Link Clicked',
      };
    case 'unsubscribed':
      return {
        icon: 'unsubscribe',
        bgColor: 'bg-error/10',
        iconColor: 'text-error',
        label: 'Unsubscribed',
      };
    case 'sent':
      return {
        icon: 'send',
        bgColor: 'bg-slate-100',
        iconColor: 'text-slate-600',
        label: 'Email Sent',
      };
    case 'bounced':
      return {
        icon: 'warning',
        bgColor: 'bg-error/10',
        iconColor: 'text-error',
        label: 'Bounced',
      };
    default:
      return {
        icon: 'info',
        bgColor: 'bg-slate-100',
        iconColor: 'text-slate-600',
        label: 'Activity',
      };
  }
};

export const ActivityLog: React.FC<ActivityLogProps> = ({ events }) => {
  return (
    <div className="bg-surface-container-lowest rounded-xl ambient-shadow overflow-hidden">
      <div className="p-8 border-b border-surface-variant/20 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-headline text-on-surface">Detailed Activity Log</h2>
          <p className="text-sm text-on-surface-variant mt-1">Live stream of all recipient interactions</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined text-sm">filter_list</span> Filter
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low">
              <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Event Type</th>
              <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Recipient Identifier</th>
              <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Timestamp</th>
              <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-variant/10">
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-8 py-10 text-center text-on-surface-variant italic">
                  Waiting for live events...
                </td>
              </tr>
            ) : (
              events.map((event) => {
                const config = getEventConfig(event.type);
                return (
                  <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
                          <span className={`material-symbols-outlined ${config.iconColor} text-sm`}>
                            {config.icon}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-on-surface">{config.label}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm text-on-surface-variant font-medium">{event.recipient}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs text-on-surface-variant">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-xs font-medium text-slate-400">
                        {event.details || 'N/A'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {events.length > 0 && (
        <div className="p-6 bg-surface-container-low flex justify-center">
          <button className="px-6 py-2 bg-white border border-surface-variant/30 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-variant transition-all active:scale-95">
            Load More Events
          </button>
        </div>
      )}
    </div>
  );
};
