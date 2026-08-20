import React from 'react';
// Make sure to import useLocation from react-router-dom
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStatus } from './utils/authHooks';
import Navbar from './components/shared/Navbar';
import LoadingSpinner from './components/shared/LoadingSpinner';

// Import all page components
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import DashboardStudent from './pages/student/DashboardStudent';
import DashboardAdmin from './pages/admin/DashboardAdmin';
import ItemRegistration from './pages/student/ItemRegistration';
import LostReport from './pages/student/LostReport';
import FoundReport from './pages/student/FoundReport';
import ChatPage from './pages/global/ChatPage';
import AIMatchVerification from './pages/admin/AIMatchVerification';
import ChatMonitor from './pages/admin/ChatMonitor';
import MainMapView from './pages/global/MainMapView'; // The new map page

// --- This layout uses Tailwind classes ---
const AuthenticatedLayout = ({ children, role }) => (
    // Use the light blue background from your config
    <div className="min-h-screen bg-pace-blue-light pt-16"> {/* pt-16 for fixed navbar height */}
        <Navbar role={role} />
        {/* max-w-7xl mx-auto centers content and limits width */}
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
        </main>
    </div>
);

// --- ProtectedRoute (Checks for auth state) ---
const ProtectedRoute = ({ element, requiredRole }) => {
    const { user, role, loading } = useAuthStatus();
    const location = useLocation();

    if (loading) {
        return <LoadingSpinner message="Checking access..." />;
    }
    
    if (!user) {
        // Redirect to login, saving the location they tried to access
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    if (requiredRole && role !== requiredRole) {
        // Redirect to their own dashboard if role doesn't match
        return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;
    }
    
    // User is authenticated and has correct role (or no role required)
    return <AuthenticatedLayout role={role}>{element}</AuthenticatedLayout>;
};

// --- Component containing the Routes ---
const AppContent = () => {
    const { user, loading, role } = useAuthStatus();
    const location = useLocation(); // Hook to get current path

    // Show full-page spinner only on initial load
    if (loading) {
        return <LoadingSpinner message="Authenticating..." />;
    }

    return (
        <Routes>
            {/* Public Routes: Redirect if logged in */}
            <Route
                path="/login"
                element={!user ? <Login /> : <Navigate to={role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />}
            />
            <Route
                path="/register"
                element={!user ? <Register /> : <Navigate to={role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />}
            />

             {/* Root Redirect */}
             <Route
                path="/"
                element={user ? <Navigate to={role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace /> : <Navigate to="/login" replace />}
            />

            {/* --- Protected Routes --- */}
            {/* Student */}
            <Route path="/student/dashboard" element={<ProtectedRoute element={<DashboardStudent />} requiredRole="student" />} />
            <Route path="/student/register-item" element={<ProtectedRoute element={<ItemRegistration />} requiredRole="student" />} />
            <Route path="/student/report-lost" element={<ProtectedRoute element={<LostReport />} requiredRole="student" />} />
            <Route path="/student/report-found" element={<ProtectedRoute element={<FoundReport />} requiredRole="student" />} />

            {/* Admin */}
            <Route path="/admin/dashboard" element={<ProtectedRoute element={<DashboardAdmin />} requiredRole="admin" />} />
            <Route path="/admin/verify-match" element={<ProtectedRoute element={<AIMatchVerification />} requiredRole="admin" />} />
            <Route path="/admin/monitor-chat" element={<ProtectedRoute element={<ChatMonitor />} requiredRole="admin" />} />

            {/* Shared */}
            <Route path="/chat/list" element={<ProtectedRoute element={<ChatPage isChatList={true} />} />} />
            <Route path="/chat/:chatId" element={<ProtectedRoute element={<ChatPage isChatList={false} />} />} />
            <Route path="/chat" element={<Navigate to="/chat/list" replace />} />
            {/* The new map page route */}
            <Route path="/map-overview" element={<ProtectedRoute element={<MainMapView />} />} />


            {/* Fallback 404 */}
            <Route
                path="*"
                element={user ? <div className="p-12 text-center text-ink-light">404 - Page Not Found</div> : <Navigate to="/login" replace />}
            />
        </Routes>
    );
};

// --- Top-level Wrapper containing the Router ---
// This wrapper is necessary so that AppContent can use the useLocation hook
const AppWrapper = () => (
    <Router>
        <AppContent /> {/* Render the component containing Routes */}
    </Router>
);

export default AppWrapper; // Export the wrapper