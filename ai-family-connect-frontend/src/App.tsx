import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import More from './screens/More';
import BottomNav from './components/BottomNav';

export default function App() {
  const { familyMembers } = useStore();

  const hasFamily = familyMembers.length > 0;

  return (
    <Router>
      <div className="min-h-screen pb-24 md:max-w-md md:mx-auto bg-warm-50 relative shadow-xl overflow-x-hidden font-sans">
        <Routes>
          <Route path="/" element={hasFamily ? <Home /> : <Navigate to="/onboarding" />} />
          <Route path="/onboarding" element={!hasFamily ? <Onboarding /> : <Navigate to="/" />} />
          <Route path="/more" element={<More />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        {hasFamily && <BottomNav />}
      </div>
    </Router>
  );
}
