// src/components/shared/Navbar.js
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { LogOut, LayoutDashboard, Search, MapPin, PlusCircle, MessageSquare, CheckSquare, Shield, Map } from 'lucide-react'; // Added MapPin
import PropTypes from 'prop-types';

const NavLink = ({ label, icon, onClick, isActive }) => (
    <button
        onClick={onClick}
        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
            ${isActive
                ? 'bg-white/10 text-white' // Active state
                : 'text-gray-300 hover:bg-white/5 hover:text-white' // Inactive state
            }`}
    >
        {React.cloneElement(icon, { size: 16, className: "mr-2" })}
        {label}
    </button>
);

const Navbar = ({ role }) => {
    const navigate = useNavigate();
    const userEmail = auth.currentUser?.email;
    const location = useLocation(); // Get current path to determine active link

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) { console.error("Logout Error:", error); }
    };

    const getEmailUsername = (email) => email ? email.split('@')[0] : 'User';

    return (
        <nav className="fixed top-0 left-0 w-full bg-pace-blue shadow-md z-50 h-16 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="flex items-center justify-between">
                    
                    {/* Logo and Role-Based Nav */}
                    <div className="flex items-center space-x-6">
                        {/* Logo */}
                        <div 
                            onClick={() => navigate(role === 'admin' ? '/admin/dashboard' : '/student/dashboard')} 
                            className="text-white text-xl font-bold cursor-pointer"
                        >
                            PACE L&F
                        </div>
                        
                        {/* Navigation Links */}
                        <div className="hidden md:flex items-center space-x-2">
                            {role === 'student' && (
                                <>
                                    <NavLink label="Dashboard" icon={<LayoutDashboard />} onClick={() => navigate('/student/dashboard')} isActive={location.pathname === '/student/dashboard'} />
                                    <NavLink label="Register Item" icon={<PlusCircle />} onClick={() => navigate('/student/register-item')} isActive={location.pathname === '/student/register-item'} />
                                    <NavLink label="Report Lost" icon={<Search />} onClick={() => navigate('/student/report-lost')} isActive={location.pathname === '/student/report-lost'} />
                                    <NavLink label="Report Found" icon={<MapPin />} onClick={() => navigate('/student/report-found')} isActive={location.pathname === '/student/report-found'} />
                                    <NavLink label="My Chats" icon={<MessageSquare />} onClick={() => navigate('/chat/list')} isActive={location.pathname.startsWith('/chat')} />
                                </>
                            )}
                            {role === 'admin' && (
                                <>
                                    <NavLink label="Dashboard" icon={<LayoutDashboard />} onClick={() => navigate('/admin/dashboard')} isActive={location.pathname === '/admin/dashboard'} />
                                    <NavLink label="Verify Matches" icon={<CheckSquare />} onClick={() => navigate('/admin/verify-match')} isActive={location.pathname === '/admin/verify-match'} />
                                    <NavLink label="Monitor Chats" icon={<Shield />} onClick={() => navigate('/admin/monitor-chat')} isActive={location.pathname === '/admin/monitor-chat'} />
                                    <NavLink label="Campus Map" icon={<Map />} onClick={() => navigate('/map-overview')} isActive={location.pathname === '/map-overview'} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* User Info & Logout */}
                    <div className="flex items-center">
                        <div className="flex items-center text-gray-300 text-sm">
                            <span className="hidden sm:inline">{getEmailUsername(userEmail)}</span>
                            {role && (
                                <span className={`ml-3 px-2 py-0.5 rounded-full text-xs font-bold ${
                                    role === 'admin' ? 'bg-pace-yellow text-ink-darkest' : 'bg-pace-green text-white'
                                }`}>
                                    {role}
                                </span>
                            )}
                        </div>
                        <button 
                            onClick={handleLogout} 
                            title="Logout"
                            className="ml-4 p-2 rounded-full text-gray-300 hover:bg-pace-blue-dark hover:text-white transition-colors"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

// Add PropTypes
NavLink.propTypes = {
    label: PropTypes.string.isRequired,
    icon: PropTypes.element.isRequired,
    onClick: PropTypes.func.isRequired,
    isActive: PropTypes.bool.isRequired,
};

Navbar.propTypes = {
    role: PropTypes.string,
};

export default Navbar;