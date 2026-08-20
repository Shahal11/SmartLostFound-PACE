import React, { useEffect, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  CircleMarker,
} from "react-leaflet";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import { MapPin, CheckCircle, X, Search } from "lucide-react";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

const DEFAULT_CENTER = [12.8794, 74.8856];
const DEFAULT_ZOOM = 13;

const FitBoundsToMarkers = ({ markers }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, markers]);
  return null;
};

const AdminMapPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [queryText, setQueryText] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    const q = onlyActive
      ? query(collection(db, "lostReports"), where("status", "==", "ACTIVE"))
      : query(collection(db, "lostReports"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setReports(arr);
        setLoading(false);
      },
      (err) => {
        console.error("AdminMapPage: onSnapshot error", err);
        setError("Failed to load reports.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [onlyActive]);

  const markers = useMemo(
    () =>
      reports
        .map((r) => {
          const loc = r?.lostLocation;
          if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number")
            return null;
          return {
            id: r.id,
            lat: loc.lat,
            lng: loc.lng,
            placeName: loc.placeName || "Unknown",
            itemID: r.itemID,
            ownerID: r.ownerID,
            timestamp: r.timestamp,
            status: r.status,
            raw: r,
          };
        })
        .filter(Boolean)
        .filter((m) => {
          if (!queryText.trim()) return true;
          const q = queryText.toLowerCase();
          return (
            (m.placeName && m.placeName.toLowerCase().includes(q)) ||
            (m.itemID && m.itemID.toLowerCase().includes(q)) ||
            (m.raw?.itemName && m.raw.itemName.toLowerCase().includes(q))
          );
        }),
    [reports, queryText]
  );

  const markFound = async (report) => {
    if (!report || !report.id) return;
    if (!window.confirm(`Mark report for item ${report.itemID} as FOUND and resolve?`)) return;
    try {
      const reportRef = doc(db, "lostReports", report.id);
      await updateDoc(reportRef, { status: "RESOLVED", foundAt: serverTimestamp() });

      if (report.itemID) {
        const itemRef = doc(db, "items", report.itemID);
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
          await updateDoc(itemRef, { status: "SAFE" });
        }
      }
    } catch (err) {
      console.error("Failed to mark found:", err);
      alert("Could not update report. Check console for details.");
    }
  };

  if (loading) return <LoadingSpinner message="Loading reports..." />;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-4 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin size={18} /> Reports ({reports.length})
          </h2>

          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Search by place, item ID..."
                className="w-full px-3 py-2 border rounded"
              />
              <div className="absolute right-2 top-2 text-gray-400">
                <Search size={16} />
              </div>
            </div>
            <button
              onClick={() => setOnlyActive((s) => !s)}
              title="Toggle active/all"
              className={`px-3 py-2 rounded ${onlyActive ? "bg-green-600 text-white" : "bg-gray-200"}`}
            >
              {onlyActive ? "Active" : "All"}
            </button>
          </div>

          <div className="mt-4 max-h-[60vh] overflow-auto space-y-2">
            {markers.length === 0 ? (
              <p className="text-sm text-gray-600">No matching reports.</p>
            ) : (
              markers.map((m) => (
                <div
                  key={m.id}
                  onMouseEnter={() => setSelectedId(m.id)}
                  onMouseLeave={() => setSelectedId((s) => (s === m.id ? null : s))}
                  className={`p-2 border rounded flex justify-between items-start gap-2 cursor-pointer ${
                    selectedId === m.id ? "bg-blue-50 border-blue-200" : "bg-white"
                  }`}
                  onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
                >
                  <div>
                    <div className="text-sm font-semibold">{m.raw?.itemName || `Item: ${m.itemID}`}</div>
                    <div className="text-xs text-gray-600">{m.placeName}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Status: <span className={m.status === "ACTIVE" ? "text-red-600" : "text-green-600"}>{m.status}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-gray-400">{m.lat.toFixed(3)},{m.lng.toFixed(3)}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markFound(m.raw);
                        }}
                        title="Mark Found"
                        className="px-2 py-1 bg-green-600 text-white rounded text-sm"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!window.confirm("Resolve report without changing item status?")) return;
                          updateDoc(doc(db, "lostReports", m.id), { status: "RESOLVED", foundAt: serverTimestamp() }).catch((err) => {
                            console.error(err);
                            alert("Failed to resolve");
                          });
                        }}
                        title="Resolve"
                        className="px-2 py-1 bg-gray-200 rounded text-sm"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-white rounded-lg border overflow-hidden">
          <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: "75vh", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            <FitBoundsToMarkers markers={markers} />
            {markers.map((m) => (
              <React.Fragment key={m.id}>
                <Marker position={[m.lat, m.lng]}>
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="text-sm font-semibold mb-1">{m.raw?.itemName || `Item: ${m.itemID}`}</div>
                      <div className="text-xs text-gray-700 mb-2">{m.placeName}</div>
                      <div className="text-xs text-gray-600 mb-2">Reported: {m.timestamp?.toDate ? m.timestamp.toDate().toLocaleString() : "—"}</div>
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.preventDefault(); markFound(m.raw); }} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Mark Found</button>
                        <button onClick={async (e) => { e.preventDefault(); if (!window.confirm("Resolve this report?")) return; try { await updateDoc(doc(db, "lostReports", m.id), { status: "RESOLVED", foundAt: serverTimestamp() }); } catch (err) { console.error(err); alert("Failed to resolve report."); } }} className="px-3 py-1 bg-gray-200 rounded text-sm">Resolve</button>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                <CircleMarker
                  center={[m.lat, m.lng]}
                  radius={selectedId === m.id ? 10 : 6}
                  pathOptions={{ color: m.status === "ACTIVE" ? "#DC2626" : "#10B981", fillOpacity: 0.8 }}
                />
              </React.Fragment>
            ))}
          </MapContainer>
        </div>
      </div>

      {error && <div className="max-w-6xl mx-auto mt-4 text-red-600 font-medium">{error}</div>}
    </div>
  );
};

export default AdminMapPage;