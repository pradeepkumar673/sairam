import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="min-h-screen bg-warm-50 relative overflow-x-hidden">
      <Outlet />
      <BottomNav />
    </div>
  );
}
