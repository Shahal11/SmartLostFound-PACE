import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStatus } from '../../utils/authHooks';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Gift, MapPin, Search, Plus, ExternalLink, Box, Mail, X, HandHeart } from 'lucide-react'; 
import PropTypes from 'prop-types';

// --- Leaflet Icon Fix ---
const defaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = defaultIcon;

// --- 1. MODAL MAP COMPONENT ---
const LocationModal = ({ isOpen, onClose, location, itemName }) => {
  if (!isOpen || !location) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900">Location Details</h3>
            <p className="text-xs text-gray-500">Last seen: {location.placeName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="h-80 w-full relative">
           <MapContainer center={[location.lat, location.lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
             <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
             <Marker position={[location.lat, location.lng]}>
               <Popup>{itemName}</Popup>
             </Marker>
           </MapContainer>
        </div>
        <div className="p-4 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors">Close Map</button>
        </div>
      </div>
    </div>
  );
};

// --- 2. UPDATED ITEM CARD ---
const ItemCard = ({ item, isReport, onAction, actionLabel, onViewLocation, onReportFound }) => {
  const isLost = item.status === 'LOST' || isReport;
  // Fallback if image is missing
  const imageSrc = item.imageURL || item.itemImage || `https://placehold.co/400x300/F3F4F6/6B7280?text=${item.category || 'Item'}`;

  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        <img 
          src={imageSrc} 
          alt={item.name || item.itemName} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3">
          {isLost ? (
            <span className="px-3 py-1 text-xs font-bold text-red-700 bg-white/90 backdrop-blur-sm border border-red-200 rounded-full shadow-sm flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div> Lost
            </span>
          ) : (
            <span className="px-3 py-1 text-xs font-bold text-green-700 bg-white/90 backdrop-blur-sm border border-green-200 rounded-full shadow-sm flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div> Safe
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 truncate">
            {item.name || item.itemName}
          </h3>
          <p className="text-sm text-gray-500 font-medium bg-gray-100 inline-block px-2 py-0.5 rounded">
            {item.category || 'General'}
          </p>
        </div>

        <div className="flex-1">
          {isReport ? (
            <div className="space-y-2 mb-3">
               <button 
                 onClick={() => onViewLocation(item)}
                 className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg w-full justify-center hover:bg-blue-100 transition-colors font-medium"
               >
                 <MapPin size={16} /> View Lost Location
               </button>
               {/* NEW: Report Found Button */}
               <button 
                 onClick={() => onReportFound(item)}
                 className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg w-full justify-center hover:bg-amber-100 transition-colors font-medium border border-amber-200"
               >
                 <HandHeart size={16} /> I Found This!
               </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 line-clamp-2">
              {item.description || 'No description provided.'}
            </p>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={() => onAction(item)}
            disabled={isLost && !isReport}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm ${
              isReport 
                ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200' 
                : isLost 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN DASHBOARD ---
const DashboardStudent = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthStatus();
  const [userData, setUserData] = useState({ email: 'Loading...', rewardPoints: 0 });
  const [myItems, setMyItems] = useState([]);
  const [campusLostReports, setCampusLostReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory'); 
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return setLoading(false);

    let isMounted = true;
    setLoading(true);

    const fetchUserData = async () => {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && isMounted) setUserData(snap.data());
    };

    // 1. My Items
    const unsubItems = onSnapshot(query(collection(db, "items"), where("ownerID", "==", user.uid)), (snap) => {
        if(isMounted) setMyItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Campus Reports (Enhanced Fetching)
    const unsubReports = onSnapshot(
      query(collection(db, "lostReports"), where("status", "==", "ACTIVE"), orderBy("timestamp", "desc")), 
      async (snap) => {
        if (!isMounted) return;
        
        // Fetch detailed item info for each report to get the IMAGE
        const reportsWithDetails = await Promise.all(snap.docs.map(async (docSnap) => {
            const reportData = docSnap.data();
            let finalImage = reportData.imageURL; // Start with image from report
            let finalName = reportData.itemName || "Lost Item";
            let finalCategory = "Other";

            // If linked to an Item ID, fetch the original item to get the best photo
            if (reportData.itemID) {
                try {
                    const itemSnap = await getDoc(doc(db, "items", reportData.itemID));
                    if (itemSnap.exists()) {
                        const itemData = itemSnap.data();
                        if (itemData.imageURL) finalImage = itemData.imageURL; // Prefer Item image
                        if (itemData.name) finalName = itemData.name;
                        if (itemData.category) finalCategory = itemData.category;
                    }
                } catch (e) { console.error("Error fetching item details", e); }
            }

            return { 
                id: docSnap.id, 
                ...reportData, 
                imageURL: finalImage, // Ensure this is populated
                itemName: finalName,
                category: finalCategory
            };
        }));

        setCampusLostReports(reportsWithDetails);
      }
    );

    fetchUserData().finally(() => isMounted && setLoading(false));
    return () => { isMounted = false; unsubItems(); unsubReports(); };
  }, [user, authLoading]);

  // --- ACTIONS ---

  const handleViewLocation = (report) => {
    if (report.lostLocation?.lat) {
        setSelectedReport(report);
        setModalOpen(true);
    } else {
        alert("No GPS data available.");
    }
  };

  const handleReportFound = (report) => {
    // Navigate to Found Report page, passing state to pre-fill the form
    navigate('/student/report-found', { 
        state: { 
            preFillCategory: report.category, 
            preFillDescription: `Found: ${report.itemName}. ` 
        } 
    });
  };

  const handleSendMessage = (report) => {
    if (!report.ownerID) return alert("Error: No owner attached to this report.");
    
    // Create a deterministic Chat ID: sort UIDs so "A-B" is always same as "B-A"
    const participants = [user.uid, report.ownerID].sort();
    const chatId = `${participants[0]}_${participants[1]}`;
    
    // Navigate to Chat Page with this ID
    navigate(`/student/chat/${chatId}`);
  };

  if (loading || authLoading) return <LoadingSpinner message="Loading dashboard..." />;
  if (!user) return <div className="p-10 text-center">Please Log In</div>;

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome, {userData.email?.split('@')[0]}</h1>
            <div className="flex items-center gap-2 text-gray-500 mt-1">
               <Gift size={16} className="text-yellow-600"/> 
               <span className="font-semibold text-yellow-700">{userData.rewardPoints} Points</span>
            </div>
          </div>
          
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex">
            <button 
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <Box size={18} /> My Inventory
            </button>
            <button 
                onClick={() => setActiveTab('campus')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === 'campus' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <MapPin size={18} /> Campus Board
            </button>
          </div>
        </div>

        {/* --- VIEW 1: MY INVENTORY --- */}
        {activeTab === 'inventory' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">My Registered Items</h2>
                    <button onClick={() => navigate('/student/register-item')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm transition-all">
                        <Plus size={18} /> Add New Item
                    </button>
                </div>

                {myItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {myItems.map(item => (
                        <ItemCard 
                            key={item.id} 
                            item={item} 
                            actionLabel={item.status === 'LOST' ? "Marked as Lost" : "Report Lost"}
                            onAction={(i) => {
                                if (i.status !== 'LOST') navigate(`/student/report-lost?itemId=${i.id}`);
                            }}
                        />
                    ))}
                    </div>
                ) : (
                    <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><Box size={32}/></div>
                        <h3 className="text-lg font-bold text-gray-900">No items yet</h3>
                        <button onClick={() => navigate('/student/register-item')} className="text-blue-600 font-semibold hover:underline mt-2">Register Item Now</button>
                    </div>
                )}
            </div>
        )}

        {/* --- VIEW 2: CAMPUS BOARD --- */}
        {activeTab === 'campus' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Live Lost & Found Board</h2>
                        <p className="text-sm text-gray-500">Items reported lost by students</p>
                    </div>
                    <button onClick={() => navigate('/student/report-found')} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm transition-all">
                        <Search size={18} /> I Found Something
                    </button>
                </div>

                {campusLostReports.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {campusLostReports.map(report => (
                            <ItemCard
                                key={report.id}
                                item={report}
                                isReport={true}
                                // Action 1: Map
                                onViewLocation={handleViewLocation}
                                // Action 2: Report Found
                                onReportFound={handleReportFound}
                                // Action 3: Chat
                                actionLabel={<><Mail size={16} /> Send Message</>}
                                onAction={handleSendMessage}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center text-gray-400">
                        <p>No active reports on campus.</p>
                    </div>
                )}
            </div>
        )}

        <LocationModal 
            isOpen={modalOpen} 
            onClose={() => setModalOpen(false)} 
            location={selectedReport?.lostLocation}
            itemName={selectedReport?.itemName}
        />
  
      </div>
    </div>
  );
};

export default DashboardStudent;