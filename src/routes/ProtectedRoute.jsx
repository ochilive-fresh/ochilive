import { Navigate, useLocation } from 'react-router-dom';
import { getStoredSession } from '../utils/session';

export default function ProtectedRoute({ children }) {
  const { token } = getStoredSession();
  const location = useLocation();
  return token ? children : <Navigate to="/login" replace state={{ from: location }} />;
}
