import { Navigate, Outlet } from 'react-router-dom';
import { useStore } from '../store';

export default function ProtectedRoute() {
  const { token } = useStore();
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
