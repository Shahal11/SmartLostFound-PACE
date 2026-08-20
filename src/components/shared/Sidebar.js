import React from 'react';
import { useNavigate } from 'react-router-dom';

// Global Colors (match Navbar)
const PACE_BLUE = '#0A4C9C';
const PACE_LIGHT_BLUE = '#E3F2FF';

// Simple Sidebar Link Button
const SidebarLinkButton = ({ label, onClick, isActive }) => {
    const baseStyle = {
        display: 'block',
        width: '100%',
        padding: '0.75rem 1.5rem',
        marginBottom: '0.5rem',
        textAlign: 'left',
        color: isActive ? PACE_BLUE : '#374151', // Dark blue if active, gray otherwise
        backgroundColor: isActive ? PACE_LIGHT_BLUE : 'transparent', // Light blue background if active
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: isActive ? '600' : '500',
        transition: 'background-color 0.2s, color 0.2s',
        textDecoration: 'none',
    };

    // Simple hover effect (darken background slightly)
    const hoverStyle = {
        backgroundColor: isActive ? PACE_LIGHT_BLUE : '#f3f4f6', // Keep active bg, or light gray for others
    };

    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <button
            onClick={onClick}
            style={isHovered ? { ...baseStyle, ...hoverStyle } : baseStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {label}
        </button>
    );
};

const Sidebar = ({ role, currentPath }) => {
    const navigate = useNavigate();

    const sidebarStyle = {
        width: '240px', // Standard sidebar width
        height: 'calc(100vh - 64px)', // Full height minus Navbar height
        position: 'fixed', // Or 'absolute' depending on layout needs
        left: 0,
        top: '64px', // Position below the Navbar
        backgroundColor: '#ffffff', // White background
        padding: '1.5rem 1rem',
        borderRight: '1px solid #e5e7eb', // Subtle border
        boxShadow: '2px 0 5px rgba(0, 0, 0, 0.05)',
        overflowY: 'auto', // Allow scrolling if content overflows
        zIndex: 900, // Below Navbar but above content
    };

    const sectionTitleStyle = {
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        marginBottom: '0.75rem',
        paddingLeft: '1.5rem', // Align with button text
    };

    return (
        <aside style={sidebarStyle}>
            <nav>
                {/* Student Links */}
                {role === 'student' && (
                    <>
                        <div style={sectionTitleStyle}>Student Menu</div>
                        <SidebarLinkButton
                            label="Dashboard"
                            onClick={() => navigate('/student/dashboard')}
                            isActive={currentPath === '/student/dashboard'}
                        />
                        <SidebarLinkButton
                            label="Register Item"
                            onClick={() => navigate('/student/register-item')}
                            isActive={currentPath === '/student/register-item'}
                        />
                        <SidebarLinkButton
                            label="Report Lost"
                            onClick={() => navigate('/student/report-lost')}
                            isActive={currentPath === '/student/report-lost'}
                        />
                         <SidebarLinkButton
                            label="Report Found"
                            onClick={() => navigate('/student/report-found')}
                            isActive={currentPath === '/student/report-found'}
                        />
                        <SidebarLinkButton
                            label="My Chats"
                            onClick={() => navigate('/chat')}
                            isActive={currentPath && currentPath.startsWith('/chat')} // Highlight for any chat route
                        />
                        {/* Add Rewards link maybe */}
                    </>
                )}

                {/* Admin Links */}
                {role === 'admin' && (
                     <>
                        <div style={sectionTitleStyle}>Admin Menu</div>
                        <SidebarLinkButton
                            label="Dashboard"
                            onClick={() => navigate('/admin/dashboard')}
                            isActive={currentPath === '/admin/dashboard'}
                        />
                        <SidebarLinkButton
                            label="Verify Matches"
                            onClick={() => navigate('/admin/verify-match')}
                            isActive={currentPath === '/admin/verify-match'}
                        />
                        <SidebarLinkButton
                            label="Monitor Chats"
                            onClick={() => navigate('/admin/monitor-chat')}
                            isActive={currentPath === '/admin/monitor-chat'}
                        />
                         {/* Add User Management link maybe */}
                    </>
                )}
            </nav>
        </aside>
    );
};

export default Sidebar;
