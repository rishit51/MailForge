import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavBar } from './TopNavBar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-on-background flex">
      <Sidebar />
      <TopNavBar />
      <main className="ml-64 w-full pt-24 px-8 lg:px-12 pb-12 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
