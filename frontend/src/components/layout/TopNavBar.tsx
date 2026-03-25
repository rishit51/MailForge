import { Link } from "react-router-dom";

export function TopNavBar() {
  return (
    <header className="flex justify-between items-center h-16 px-8 ml-64 w-[calc(100%-16rem)] fixed top-0 z-30 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm shadow-blue-900/5">
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full focus-within:ring-2 focus-within:ring-blue-500/20 rounded-lg">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
          <input
            type="text"
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-0 focus:outline-none placeholder-slate-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:text-blue-600 transition-opacity">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="p-2 text-slate-500 hover:text-blue-600 transition-opacity">
          <span className="material-symbols-outlined">help</span>
        </button>
        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
        <Link to="/campaigns/new" className="bg-gradient-to-br from-primary to-primary-container text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">rocket_launch</span>
          Launch Campaign
        </Link>
      </div>
    </header>
  );
}
