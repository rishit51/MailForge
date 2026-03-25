import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/utils';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Analytics', icon: 'analytics', path: '/analytics' },
  { label: 'Data Sources', icon: 'database', path: '/datasets' },
  { label: 'Campaigns', icon: 'mail', path: '/campaigns' },
  { label: 'Integrations', icon: 'extension', path: '/integrations' },

  { label: 'Scheduling', icon: 'schedule', path: '/scheduling' },
];

export function Sidebar() {
  return (
    <aside className="flex flex-col h-screen fixed left-0 top-0 z-40 bg-slate-50 dark:bg-slate-900 w-64 border-r-0">
      <div className="p-8">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 font-headline">The Editorial Analyst</h1>
        <p className="text-xs text-slate-500 font-label mt-1">Automation Suite</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 group active:scale-95",
                isActive
                  ? "text-blue-700 dark:text-blue-400 font-semibold border-r-4 border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800 font-medium"
              )
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="text-sm tracking-wide">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-slate-100 dark:bg-slate-800/50">
          <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-primary-container flex items-center justify-center text-white font-extrabold shrink-0">
            EA
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Editorial Analyst</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Pro Member</p>
          </div>
        </div>

        <div className="space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 transition-colors">
            <span className="material-symbols-outlined text-lg">settings</span>
            <span className="text-xs font-medium">Settings</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 transition-colors">
            <span className="material-symbols-outlined text-lg">help_outline</span>
            <span className="text-xs font-medium">Support</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
