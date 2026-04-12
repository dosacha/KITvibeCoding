import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function RequireAuth({ roles = [], children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    const fallback = user?.role === 'student' ? '/student' : '/instructor';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
