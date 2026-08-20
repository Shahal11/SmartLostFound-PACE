// src/pages/global/MainMapView.js
import React, { useState, useEffect, useRef } from 'react';

import { db } from '../../firebase/config';
import { collection, query, onSnapshot, where, doc, getDoc } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3'; 
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; 
import { Layers, MapPin, Map } from 'lucide-react';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import PropTypes from 'prop-types';

// --- Fix Leaflet's default icon issue ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// --- Component to update map bounds based on data ---
const MapBoundsUpdater = ({ reports }) => {
    const map = useMap();
    useEffect(() => {
        if (!reports || reports.length === 0) {
             map.setView([12.8794, 74.8856], 15); // Default to PACE
             return;
        }
        const validReports = reports.filter(r => 
            r.location && typeof r.location.lat === 'number' && typeof r.location.lng === 'number'
        );
        if (validReports.length > 0) {
            const bounds = L.latLngBounds(validReports.map(r => [r.location.lat, r.location.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [reports, map]);
    return null;
};
MapBoundsUpdater.propTypes = { reports: PropTypes.array.isRequired };


const MainMapView = () => {
    const [lostReports, setLostReports] = useState([]);
    const [foundReports, setFoundReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('marker');
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const mapRef = useRef(null);

    useEffect(() => {
        setLoading(true);

        // 1. Listener for ACTIVE Lost Reports
        const lostQuery = query(collection(db, 'lostReports'), where('status', '==', 'ACTIVE'));
        const unsubLost = onSnapshot(lostQuery, async (snapshot) => {
            const detailedReports = await Promise.all(snapshot.docs.map(async (reportDoc) => {
                const data = reportDoc.data();
                const location = data.lostLocation;

                if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
                    let itemName = data.itemName || 'Unknown Item';
                    let itemDesc = data.itemDescription || data.description || 'No description';
                    let itemImg = data.itemImage || null;

                    if (data.itemID) {
                        try {
                            const itemSnap = await getDoc(doc(db, 'items', data.itemID));
                            if (itemSnap.exists()) {
                                const itemData = itemSnap.data();
                                itemName = itemData.name || itemName;
                                itemDesc = itemData.description || itemDesc;
                                itemImg = itemData.imageURL || itemImg;
                            }
                        } catch (err) {
                            console.error("Error fetching item details", err);
                        }
                    }

                    return {
                        id: reportDoc.id,
                        type: 'lost',
                        location: { lat: location.lat, lng: location.lng, placeName: location.placeName || 'N/A' },
                        name: itemName,
                        description: itemDesc,
                        imageURL: itemImg
                    };
                }
                return null;
            }));

            setLostReports(detailedReports.filter(Boolean));
            setLoading(false);
        }, (error) => { console.error("Error fetching lost reports:", error); setLoading(false); });

        // 2. Listener for PENDING Found Reports
        const foundQuery = query(collection(db, 'foundReports'), where('status', '==', 'PENDING'));
        const unsubFound = onSnapshot(foundQuery, (snapshot) => {
            const reports = snapshot.docs.map(doc => {
                const data = doc.data();
                const location = data.foundLocation;
                if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
                    return {
                        id: doc.id,
                        type: 'found',
                        location: { lat: location.lat, lng: location.lng, placeName: location.placeName || 'N/A' },
                        name: data.category || 'Found Item',
                        description: data.description || 'No description',
                        imageURL: data.imageURL
                    };
                }
                return null;
            }).filter(Boolean);
            setFoundReports(reports);
            setLoading(false);
        }, (error) => { console.error("Error fetching found reports:", error); setLoading(false); });

        return () => { unsubLost(); unsubFound(); };
    }, []);

    const allReports = [...lostReports, ...foundReports];
    
    // Prepare separate data points for lost (Red) and found (Green)
    const lostPoints = lostReports.map(r => [r.location.lat, r.location.lng, 1.0]); // Intensity 1.0
    const foundPoints = foundReports.map(r => [r.location.lat, r.location.lng, 1.0]); // Intensity 1.0

    if (loading) {
        return <LoadingSpinner message="Loading map data..." />;
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-ink-darkest flex items-center">
                    <Map size={28} className="mr-3 text-pace-blue" />
                    Campus Report Map
                </h1>
                <div className="flex items-center p-1 bg-pace-blue-light rounded-lg">
                    <button 
                        onClick={() => setViewMode('marker')}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                            viewMode === 'marker' ? 'bg-white text-pace-blue shadow' : 'text-ink-light'
                        }`}
                    >
                        <MapPin size={16} className="inline-block mr-2" /> Pins
                    </button>
                    <button 
                        onClick={() => setViewMode('heatmap')}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                            viewMode === 'heatmap' ? 'bg-white text-pace-blue shadow' : 'text-ink-light'
                        }`}
                    >
                         <Layers size={16} className="inline-block mr-2" /> Heatmap
                    </button>
                </div>
            </div>
            
            <div className="h-[600px] w-full rounded-lg shadow-lg overflow-hidden z-0 border border-gray-200">
                <MapContainer
                    center={[12.8794, 74.8856]}
                    zoom={15}
                    whenCreated={(mapInstance) => { mapRef.current = mapInstance; }}
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapBoundsUpdater reports={allReports} />

                    {/* --- Heatmap View --- */}
                    {viewMode === 'heatmap' && HeatmapLayer ? (
                        <>
                            {/* Lost Items Heatmap (Red Gradient) */}
                            {lostPoints.length > 0 && (
                                <HeatmapLayer
                                    points={lostPoints}
                                    longitudeExtractor={m => m[1]}
                                    latitudeExtractor={m => m[0]}
                                    intensityExtractor={m => m[2]}
                                    radius={25}
                                    blur={15}
                                    max={1.0}
                                    // Red Gradient: light red -> red -> dark red
                                    gradient={{ 0.4: '#fca5a5', 0.8: '#ef4444', 1.0: '#b91c1c' }}
                                />
                            )}
                            
                            {/* Found Items Heatmap (Green Gradient) */}
                            {foundPoints.length > 0 && (
                                <HeatmapLayer
                                    points={foundPoints}
                                    longitudeExtractor={m => m[1]}
                                    latitudeExtractor={m => m[0]}
                                    intensityExtractor={m => m[2]}
                                    radius={25}
                                    blur={15}
                                    max={1.0}
                                    // Green Gradient: light green -> green -> dark green
                                    gradient={{ 0.4: '#86efac', 0.8: '#22c55e', 1.0: '#15803d' }}
                                />
                            )}
                        </>
                    ) : null}

                    {/* --- Marker View --- */}
                    {viewMode === 'marker' && (
                        <>
                            {/* Lost Items (Red Markers) */}
                            {lostReports.map(report => (
                                <Marker 
                                    key={report.id} 
                                    position={[report.location.lat, report.location.lng]}
                                    icon={redIcon}
                                >
                                    <Popup>
                                        <div className="font-sans" style={{minWidth: '200px'}}>
                                            <div className="flex items-center gap-2 mb-2 border-b pb-1">
                                                <div className="w-2 h-2 rounded-full bg-pace-red"></div>
                                                <span className="font-bold text-pace-red uppercase text-xs tracking-wider">Lost Item</span>
                                            </div>
                                            <div className="text-lg font-bold text-gray-800 mb-1">{report.name}</div>
                                            <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                                                {report.description.length > 80 ? report.description.substring(0, 80) + '...' : report.description}
                                            </p>
                                            
                                            {report.imageURL && (
                                                <div className="mb-2 w-full h-32 bg-gray-100 rounded-md overflow-hidden">
                                                    <img src={report.imageURL} alt="Item" className="w-full h-full object-cover" />
                                                </div>
                                            )}

                                            <div className="flex items-start gap-1 text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                                                <MapPin size={12} className="mt-0.5 shrink-0" />
                                                <span>{report.location.placeName}</span>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}

                            {/* Found Items (Green Markers) */}
                            {foundReports.map(report => (
                                <Marker 
                                    key={report.id} 
                                    position={[report.location.lat, report.location.lng]}
                                    icon={greenIcon}
                                >
                                    <Popup>
                                         <div className="font-sans" style={{minWidth: '200px'}}>
                                            <div className="flex items-center gap-2 mb-2 border-b pb-1">
                                                <div className="w-2 h-2 rounded-full bg-pace-green"></div>
                                                <span className="font-bold text-pace-green uppercase text-xs tracking-wider">Found Item</span>
                                            </div>
                                            <div className="text-lg font-bold text-gray-800 mb-1">{report.name}</div>
                                            <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                                                {report.description.length > 80 ? report.description.substring(0, 80) + '...' : report.description}
                                            </p>

                                            {report.imageURL && (
                                                <div className="mb-2 w-full h-32 bg-gray-100 rounded-md overflow-hidden">
                                                    <img src={report.imageURL} alt="Item" className="w-full h-full object-cover" />
                                                </div>
                                            )}

                                            <div className="flex items-start gap-1 text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                                                <MapPin size={12} className="mt-0.5 shrink-0" />
                                                <span>{report.location.placeName}</span>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </>
                    )}
                </MapContainer>
            </div>
            <div className="bg-white p-4 rounded-lg shadow flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-ink-darkest">Search on map</h2>
                <form
                    className="flex gap-3"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!searchQuery.trim()) return;
                        setSearching(true);
                        setSearchError('');
                        setSearchResults([]);
                        try {
                            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
                            if (!response.ok) throw new Error('Search failed');
                            const results = await response.json();
                            if (Array.isArray(results)) {
                                setSearchResults(results);
                                if (results.length === 0) {
                                    setSearchError('No results found for that query.');
                                }
                            } else {
                                setSearchError('Unexpected response.');
                            }
                        } catch (err) {
                            console.error('Search error:', err);
                            setSearchError('Unable to search locations right now.');
                        } finally {
                            setSearching(false);
                        }
                    }}
                >
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for buildings, landmarks..."
                        className="flex-1 rounded-lg border border-gray-200 px-4 py-2 focus:ring-2 focus:ring-pace-blue"
                    />
                    <button
                        type="submit"
                        disabled={searching}
                        className="px-4 py-2 rounded-lg bg-pace-blue text-white font-semibold disabled:bg-gray-400"
                    >
                        {searching ? 'Searching...' : 'Search'}
                    </button>
                </form>
                {searchError && <p className="text-sm text-red-600">{searchError}</p>}
                {searchResults.length > 0 && (
                    <ul className="max-h-48 overflow-y-auto divide-y">
                        {searchResults.map((result) => (
                            <li
                                key={result.place_id}
                                className="py-2 cursor-pointer hover:text-pace-blue"
                                onClick={() => {
                                    if (mapRef.current) {
                                        const lat = parseFloat(result.lat);
                                        const lon = parseFloat(result.lon);
                                        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
                                            mapRef.current.setView([lat, lon], 17);
                                        }
                                    }
                                }}
                            >
                                <p className="text-sm font-semibold text-ink-darkest">{result.display_name.split(',')[0]}</p>
                                <p className="text-xs text-ink-light">{result.display_name}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default MainMapView;