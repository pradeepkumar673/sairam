import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from './store';
import { initSocket } from './lib/socket';
import Login from './screens/Login';
import Register from './screens/Register';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import Chat from './screens/Chat';
import Chatbot from './screens/Chatbot';
import More from './screens/More';
import FamilyDashboard from './screens/FamilyDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  const { token, user, setUser } = useStore();

  useEffect(() => {
    // Restore user from localStorage if not in state
    const storedUser = localStorage.getItem('user');
    if (storedUser && !user) {
      setUser(JSON.parse(storedUser));
    }
    
    // Initialize socket if token exists
    if (token) {
      try {
        initSocket();
      } catch (err) {
        console.warn('Socket init failed, will retry on next action');
      }
    }
  }, [token, user, setUser]);

  // Determine if onboarding needed
  const needsOnboarding = token && user && !localStorage.getItem('onboardingComplete');

  return (
    <BrowserRouter>
      <div className="md:max-w-md md:mx-auto bg-warm-50 min-h-screen shadow-xl relative overflow-hidden">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />
            
            <Route element={<Layout />}>
              <Route path="/" element={needsOnboarding ? <Navigate to="/onboarding" /> : <Home />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chatbot" element={<Chatbot />} />
              <Route path="/more" element={<More />} />
              <Route path="/dashboard" element={<FamilyDashboard />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
