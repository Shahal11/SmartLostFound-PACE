import React, { useState, useEffect, useCallback, useRef } from 'react';
// REMOVED any imports for 'leaflet' or 'react-leaflet'

// --- Hardcoded PACE College Coordinates and Landmarks ---
const PACE_COLLEGE_CENTER = { lat: 13.0568, lng: 80.2445 }; // Approximate Center
const LANDMARKS = {
    "PACE College": PACE_COLLEGE_CENTER,
    "Main Gate": { lat: 13.0580, lng: 80.2430 },
    "Library (North Block)": { lat: 13.0575, lng: 80.2450 },
    "Cafeteria": { lat: 13.0560, lng: 80.2440 },
    "Hostel Block A": { lat: 13.0555, lng: 80.2455 },
    "Admin Office": { lat: 13.0570, lng: 80.2435 },
};

// --- Embedded Loading Spinner (Inline CSS) ---
// No separate import needed
function LoadingSpinner({ message = 'Loading Map...' }) {
     const spinnerStyle = {
        width: `32px`,
        height: `32px`,
        border: `4px solid rgba(0, 0, 0, 0.1)`,
        borderTop: `4px solid #0A4C9C`, // PACE_BLUE
        borderRadius: '50%',
        // Basic rotation simulation without keyframes
        animation: 'spin 1s linear infinite', // Still relies on a potentially defined global 'spin' or basic browser support
         // Fallback/Simpler visual if animation injection fails:
         borderTopColor: '#0A4C9C', // Make top border distinct
         // Consider adding a simple pulsing opacity effect via JS if needed
    };
     const containerStyle = {
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: '2rem', textAlign: 'center',
    };
     const messageStyle = { marginTop: '1rem', fontSize: '1rem', color: '#4b5563', fontWeight: '500' };

     // Inject minimal keyframes needed for spinner - LAST attempt for animation
     const keyframes = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;

    return (
        <div style={containerStyle}>
             <style>{keyframes}</style> {/* Try injecting keyframes */}
            <div style={spinnerStyle}></div>
            {message && <p style={messageStyle}>{message}</p>}
        </div>
    );
}


// --- Embedded Location Utility (Inline) ---
// No separate import needed
async function getPlaceName(lat, lng) {
    // Simulated Landmark Check (Based on PACE coordinates)
    const distanceLat = Math.abs(lat - PACE_COLLEGE_CENTER.lat);
    const distanceLng = Math.abs(lng - PACE_COLLEGE_CENTER.lng);

    // Find closest known landmark
    let closestLandmark = "PACE Campus Area";
    let minDistance = 0.005; // Initial threshold

    for (const name in LANDMARKS) {
        const landmarkLoc = LANDMARKS[name];
        const dLat = Math.abs(lat - landmarkLoc.lat);
        const dLng = Math.abs(lng - landmarkLoc.lng);
        const distance = Math.sqrt(dLat * dLat + dLng * dLng); // Simple distance

        if (distance < minDistance) {
            minDistance = distance;
            closestLandmark = name;
        }
    }

    // Add coordinate precision if it's just a general area
    if (closestLandmark === "PACE Campus Area" && distanceLat < 0.01 && distanceLng < 0.01) {
         return `PACE Campus Area (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } else if (closestLandmark !== "PACE Campus Area") {
         return `Near ${closestLandmark}`;
    }

    return "Unknown Location (Outside Campus Approx.)"; // Fallback
};

// --- ReportMap Component ---
// Added default empty function for onSelectLocation to prevent crashes
const ReportMap = ({ initialLocation = PACE_COLLEGE_CENTER, onSelectLocation = () => {} }) => {
    const [mapReady, setMapReady] = useState(true); // Simulate map readiness (no external API needed)
    const [currentPin, setCurrentPin] = useState(initialLocation);
    const [pinPositionStyle, setPinPositionStyle] = useState({ top: '50%', left: '50%' }); // Pin position relative to map div
    const [placeName, setPlaceName] = useState('Loading...');
    const [searchTerm, setSearchTerm] = useState('PACE College'); // Default search
    const mapRef = useRef(null); // Ref to the mock map container

    // Function to update location details (lat, lng, placeName)
    const updateLocationDetails = useCallback(async (lat, lng) => {
        setCurrentPin({ lat, lng });
        const name = await getPlaceName(lat, lng);
        setPlaceName(name);
        // CRITICAL: Call the callback prop passed from the parent form
        onSelectLocation({ lat, lng, placeName: name });
    }, [onSelectLocation]); // Include onSelectLocation in dependency array

    // Simulate map click / pin drag
    const handleMapInteraction = (event) => {
        if (!mapRef.current) return;

        const mapBounds = mapRef.current.getBoundingClientRect();
        // Calculate click position relative to the map div
        const clickX = event.clientX - mapBounds.left;
        const clickY = event.clientY - mapBounds.top;

        // Convert pixel position to percentage for styling
        const percentX = (clickX / mapBounds.width) * 100;
        const percentY = (clickY / mapBounds.height) * 100;

        // Simulate lat/lng based on percentage (very approximate)
        // This is a rough simulation, not geographically accurate
        const approxLat = PACE_COLLEGE_CENTER.lat + (percentY - 50) * 0.0001; // Adjust multiplier for sensitivity
        const approxLng = PACE_COLLEGE_CENTER.lng + (percentX - 50) * 0.0002;

        setPinPositionStyle({ top: `${percentY}%`, left: `${percentX}%` });
        updateLocationDetails(approxLat, approxLng);
    };

     // Simulate search or landmark selection
     const handleSearchOrSelect = (termOrCoords) => {
         let targetCoords;
         if (typeof termOrCoords === 'string') {
             // Basic search simulation
             if (termOrCoords.toLowerCase().includes('pace college')) {
                 targetCoords = PACE_COLLEGE_CENTER;
             } else {
                 // Try finding landmark by name (case-insensitive)
                 const found = Object.entries(LANDMARKS).find(([name]) => name.toLowerCase().includes(termOrCoords.toLowerCase()));
                 targetCoords = found ? found[1] : PACE_COLLEGE_CENTER; // Default to center if not found
             }
         } else {
             // Directly use coordinates if passed (e.g., from dropdown)
             targetCoords = termOrCoords;
         }

         // Simulate centering and placing pin (approximate percentage)
          const percentX = 50 + (targetCoords.lng - PACE_COLLEGE_CENTER.lng) / 0.0002;
          const percentY = 50 + (targetCoords.lat - PACE_COLLEGE_CENTER.lat) / 0.0001;

         setPinPositionStyle({ top: `${percentY}%`, left: `${percentX}%` });
         updateLocationDetails(targetCoords.lat, targetCoords.lng);
         // Update search term if landmark was selected
         const landmarkName = Object.entries(LANDMARKS).find(([, coords]) => coords === targetCoords)?.[0];
         setSearchTerm(landmarkName || termOrCoords || 'PACE College'); // Update search box display
     };


    // Initial setup - get place name for default location
    useEffect(() => {
        updateLocationDetails(initialLocation.lat, initialLocation.lng);
    }, [initialLocation, updateLocationDetails]); // Run only on initial mount/prop change


    // --- Inline Styles for Mock Map ---
    const mapContainerStyle = {
        position: 'relative', // Needed for absolute positioning of pin
        width: '100%',
        height: '400px',
        backgroundColor: '#e0e0e0', // Simple grey background
        border: '1px solid #bdbdbd',
        borderRadius: '8px',
        overflow: 'hidden', // Hide parts of pin outside boundary
        cursor: 'crosshair', // Indicate clickability
        backgroundImage: `
            linear-gradient(to right, #bdbdbd 1px, transparent 1px),
            linear-gradient(to bottom, #bdbdbd 1px, transparent 1px)
        `, // Simple grid lines
        backgroundSize: '20px 20px',
    };

    const pinStyle = {
        position: 'absolute',
        transform: 'translate(-50%, -100%)', // Center horizontally, place bottom tip at location
        width: '24px',
        height: '36px',
        // Simple SVG Pin using inline data URL (avoids external files)
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23EF4444"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.13.48 1.53 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>')`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        cursor: 'pointer', // Indicate it's interactive (though dragging isn't implemented here)
        // Removed filter for compatibility
    };

     const searchContainerStyle = {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1rem',
        alignItems: 'center',
    };

    const inputStyle = {
        flexGrow: 1, padding: '0.5rem 0.75rem', border: '1px solid #ccc',
        borderRadius: '6px', fontSize: '0.9rem', outline: 'none',
    };
    const selectStyle = {
         padding: '0.5rem 0.75rem', border: '1px solid #ccc',
         borderRadius: '6px', fontSize: '0.9rem', backgroundColor: 'white',
    };
     const infoBoxStyle = {
        marginTop: '1rem', padding: '0.75rem', backgroundColor: '#e3f2ff', // Light blue background
        border: '1px solid #bbdefb', borderRadius: '6px', fontSize: '0.85rem',
        color: '#1e3a8a', // Darker blue text
    };

    return (
        <div>
            {/* Search and Landmark Selection */}
             <div style={searchContainerStyle}>
                <input
                    type="text"
                    placeholder="Search Location (e.g., PACE College)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                     onKeyPress={(e) => e.key === 'Enter' && handleSearchOrSelect(searchTerm)}
                    style={inputStyle}
                />
                 <button onClick={() => handleSearchOrSelect(searchTerm)} style={{ padding: '0.5rem 0.75rem', cursor:'pointer' }}>Search</button>
                 <select
                    onChange={(e) => handleSearchOrSelect(LANDMARKS[e.target.value])}
                    style={selectStyle}
                    value={Object.keys(LANDMARKS).find(key => LANDMARKS[key] === currentPin) || ""} // Try to select current if it matches landmark
                 >
                     <option value="" disabled>-- Select Landmark --</option>
                     {Object.entries(LANDMARKS).map(([name, coords]) => (
                         <option key={name} value={name}>{name}</option>
                     ))}
                 </select>
            </div>


            {!mapReady ? (
                <LoadingSpinner message="Initializing Mock Map..." />
            ) : (
                <div
                    ref={mapRef}
                    style={mapContainerStyle}
                    onClick={handleMapInteraction} // Use onClick for simple interaction
                >
                    {/* The Draggable Pin */}
                    <div style={{ ...pinStyle, ...pinPositionStyle }}></div>
                </div>
            )}

            {/* Display Selected Location Info */}
             <div style={infoBoxStyle}>
                 <strong>Selected Location:</strong> {placeName} <br />
                 <strong>Coordinates:</strong> Lat: {currentPin.lat.toFixed(6)}, Lng: {currentPin.lng.toFixed(6)}
            </div>
        </div>
    );
};

export default ReportMap;

