import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginSignup } from './features/auth/pages/LoginSignup';
import { DataSources } from './features/datasets/pages/DataSources';
import { Integrations } from './features/integrations/pages/Integrations';
import { CampaignBuilder } from './features/campaigns/pages/CampaignBuilder';
import { CampaignsList } from './features/campaigns/pages/CampaignsList';
import { JobDashboard } from './features/analytics/pages/JobDashboard';

const queryClient = new QueryClient();

const Scheduling = () => <div><h1 className="text-3xl font-headline font-bold">Scheduling</h1></div>;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<LoginSignup />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/campaigns" replace />} />
              <Route path="campaigns/new" element={<CampaignBuilder />} />
              <Route path="campaigns/:id/edit" element={<CampaignBuilder />} />
              <Route path="datasets" element={<DataSources />} />
              <Route path="analytics/:id" element={<JobDashboard />} />
              <Route path="analytics" element={<Navigate to="/campaigns" replace />} />
              <Route path="campaigns" element={<CampaignsList />} />
              <Route path="integrations" element={<Integrations />} />

              <Route path="scheduling" element={<Scheduling />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
