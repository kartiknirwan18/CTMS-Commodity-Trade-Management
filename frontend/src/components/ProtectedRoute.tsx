import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingBlock, EmptyState, ButtonLink } from './ui';
import type { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When provided, only these roles may render the route. */
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user, initialising } = useAuth();
  const location = useLocation();

  if (initialising) return <LoadingBlock label="Checking your session..." />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          icon="🔒"
          title="You do not have access to this area"
          description={`This section is limited to ${roles.join(' / ')} accounts. Your account is signed in as ${user.role}.`}
          action={<ButtonLink to="/">Back to home</ButtonLink>}
        />
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
