import { Navigate, Outlet } from 'react-router-dom';
import { Role } from '../../domain';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.papel)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
