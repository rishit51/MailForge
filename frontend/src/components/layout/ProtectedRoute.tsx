
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/authStore';
import { useUser } from '../../features/auth/api/auth';

export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();
  const { isLoading } = useUser();

  if (!token) {
    // Redirect them to the /auth page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience.
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return <Outlet />;
}
