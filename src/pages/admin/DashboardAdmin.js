import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { BarChart3, Users, CheckCircle, MapPin, MessageSquare, AlertTriangle, Settings, Eye } from 'lucide-react'; // Added icons
import LoadingSpinner from '../../components/shared/LoadingSpinner'; // Import spinner

// Global Colors
const PACE_BLUE = '#0A4C9C';
const SUCCESS_GREEN = '#10B981';
const PENDING_ORANGE = '#F59E0B';
const INFO_BLUE = '#3B82F6';
const ERROR_RED = '#EF4444'; // <-- FIX: ADDED MISSING DEFINITION

// Reusable Stat Card Component (Inline Styled)
const StatCard = ({ title, value, icon, bgColor = '#f3f4f6', borderColor = '#e5e7eb' }) => (
    <div style={{
        backgroundColor: bgColor,
        padding: '1.25rem', // ~ p-5
        borderRadius: '12px', // ~ rounded-xl
        flex: '1 1 0%', // Allows cards to grow and shrink
        minWidth: '180px', // Prevent cards from becoming too small
        textAlign: 'center',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)', // ~ shadow-lg
        borderLeft: `5px solid ${borderColor}`, // Border accent
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem', // Space between icon, value, title
    }}>
        {React.cloneElement(icon, { size: 32, style: { color: borderColor, opacity: 0.8 } })}
        <h2 style={{
            fontSize: '2rem', // ~ text-3xl
            fontWeight: '800', // ~ font-extrabold
            color: '#111827', // ~ text-gray-900
            margin: 0,
            lineHeight: 1.2,
        }}>{value}</h2>
        <p style={{
            fontSize: '0.875rem', // ~ text-sm
            fontWeight: '500',   // ~ font-medium
            color: '#6b7280',   // ~ text-gray-500
            margin: 0,
        }}>{title}</p>
    </div>
);

// Reusable Action Button Component (Inline Styled)
const ActionButton = ({ title, icon, onClick, color = PACE_BLUE }) => {
     const [isHovered, setIsHovered] = useState(false);
     const buttonStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem', // space-x-3
        padding: '0.75rem 1.5rem', // py-3 px-6
        backgroundColor: isHovered ? `${color}E6` : color, // Darken on hover (approximate)
        color: '#ffffff', // text-white
        borderRadius: '8px', // rounded-lg
        fontWeight: '600', // font-semibold
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
        transition: 'background-color 0.2s ease-in-out',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)', // shadow-md
     };
    return (
        <button
            onClick={onClick}
            style={buttonStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {React.cloneElement(icon, { size: 20 })}
            <span>{title}</span>
        </button>
    );
};


const DashboardAdmin = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ users: 0, items: 0, lost: 0, found: 0, pendingMatches: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        const fetchStats = async () => {
            try {
                const fetchCount = async (col, constraints = []) => {
                    const target = constraints.length ? query(col, ...constraints) : col;
                    const snapshot = await getCountFromServer(target);
                    return snapshot.data().count || 0;
                };

                const usersCol = collection(db, 'users');
                const itemsCol = collection(db, 'items');
                const lostCol = collection(db, 'lostReports');
                const foundCol = collection(db, 'foundReports');
                const matchesCol = collection(db, 'matches');

                const [usersCount, safeItems, activeLost, pendingFound, pendingMatches] = await Promise.all([
                    fetchCount(usersCol),
                    fetchCount(itemsCol, [where('status', '==', 'SAFE')]),
                    fetchCount(lostCol, [where('status', '==', 'ACTIVE')]),
                    fetchCount(foundCol, [where('status', '==', 'PENDING')]),
                    fetchCount(matchesCol, [where('status', '==', 'PENDING_VERIFICATION')]),
                ]);

                setStats({
                    users: usersCount,
                    items: safeItems,
                    lost: activeLost,
                    found: pendingFound,
                    pendingMatches,
                });
                setError('');
            } catch (error) {
                console.error("Error fetching admin stats:", error);
                setError('Failed to load admin stats.');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []); // Empty dependency array ensures this effect runs once on mount

    // --- Inline Styles ---
    const styles = {
        dashboardContainer: {
            padding: '20px', // As requested
            fontFamily: 'Arial, sans-serif', // As requested
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
        },
        headerSection: {
            paddingBottom: '1rem',
            borderBottom: '1px solid #e5e7eb',
        },
        title: {
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: '#111827',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
        },
        statsGrid: {
            display: 'flex', // As requested
            flexWrap: 'wrap', // Allow wrapping on smaller screens
            gap: '20px', // As requested
            marginTop: '1rem',
        },
        actionsSection: {
            marginTop: '1.5rem',
            padding: '1.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        },
        actionsHeader: {
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '1rem',
        },
        actionsGrid: {
             display: 'flex',
             flexWrap: 'wrap',
             gap: '1rem',
        },
    };


    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div style={styles.dashboardContainer}>
            {/* Header */}
            <section style={styles.headerSection}>
                <h1 style={styles.title}>
                    <Settings size={28} style={{ color: PACE_BLUE }} /> Admin Dashboard
                </h1>
            </section>

            {error && (
                <p style={{ color: ERROR_RED, fontWeight: 600, textAlign: 'center' }}>{error}</p>
            )}

            {/* Stats Grid */}
            <section>
                <div style={styles.statsGrid}>
                    <StatCard title="Total Users" value={stats.users} icon={<Users />} borderColor={INFO_BLUE} />
                    <StatCard title="Registered Items" value={stats.items} icon={<BarChart3 />} borderColor={PACE_BLUE} />
                    {/* Ensure ERROR_RED is defined or replace if necessary */}
                    <StatCard title="Currently Lost" value={stats.lost} icon={<MapPin />} borderColor={ERROR_RED} />
                    <StatCard title="Pending Found" value={stats.found} icon={<CheckCircle />} borderColor={SUCCESS_GREEN} />
                    <StatCard title="Matches to Verify" value={stats.pendingMatches} icon={<AlertTriangle />} borderColor={PENDING_ORANGE} />
                </div>
            </section>

            {/* Actions Section */}
            <section style={styles.actionsSection}>
                 <h2 style={styles.actionsHeader}>Quick Actions</h2>
                 <div style={styles.actionsGrid}>
                     <ActionButton
                        title={`Verify AI Matches (${stats.pendingMatches})`} // Show count in button
                        icon={<Eye />}
                        onClick={() => navigate('/admin/verify-match')}
                        color={PENDING_ORANGE}
                    />
                    <ActionButton
                        title="Monitor Chats"
                        icon={<MessageSquare />}
                        onClick={() => navigate('/admin/monitor-chat')}
                        color={INFO_BLUE}
                    />
                     {/* Add more admin actions here as needed, e.g., User Management */}
                 </div>
            </section>

             {/* Potentially add tables/lists for recent reports, user management etc. */}
        </div>
    );
};

export default DashboardAdmin;

