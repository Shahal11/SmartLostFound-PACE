// src/pages/student/LostReport.js
import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { getPlaceName } from '../../utils/locationUtils';
import { List, CheckCircle, MapPin, ExternalLink, Upload, PlusCircle, Package } from 'lucide-react';
import LoadingSpinner from '../../components/shared/LoadingSpinner.js';
import imageCompression from 'browser-image-compression';

// Global Colors
const PACE_BLUE = '#0A4C9C';
const PACE_LIGHT_BLUE = '#E3F2FF';
const ERROR_RED = '#EF4444';
const INFO_BLUE = '#3B82F6';

const CATEGORIES = ["Electronics", "ID Card", "Books", "Clothing", "Keys", "Bag", "Bottle", "Other"];

const LostReport = () => {
    // Toggle State: 'registered' or 'manual'
    const [reportMethod, setReportMethod] = useState('registered');

    // Existing State for Registered Items
    const [userItems, setUserItems] = useState([]);
    const [selectedItemId, setSelectedItemId] = useState('');

    // New State for Manual Entry
    const [manualForm, setManualForm] = useState({ name: '', category: CATEGORIES[0], description: '' });

    // Common State
    const [location, setLocation] = useState(null); 
    const [image, setImage] = useState(null); 
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [loadingItems, setLoadingItems] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const userId = auth.currentUser?.uid;
    const mapWindowRef = useRef(null);

    // Fetch user's registered 'SAFE' items
    useEffect(() => {
        const fetchUserItems = async () => {
            if (!userId) { setLoadingItems(false); return; }
            setLoadingItems(true);
            try {
                const q = query(collection(db, "items"), where("ownerID", "==", userId), where("status", "==", "SAFE"));
                const snapshot = await getDocs(q);
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUserItems(items);
                if (items.length > 0) setSelectedItemId(items[0].id);
            } catch (err) {
                console.error("Error fetching items:", err);
            } finally {
                setLoadingItems(false);
            }
        };
        fetchUserItems();
    }, [userId]);

    // Map Listener
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data?.type === 'MAP_LOCATION_SELECTED' && event.data.payload) {
                const { lat, lng, placeName } = event.data.payload;
                if (typeof lat === 'number' && !isNaN(lat)) {
                    setLocation({ lat, lng, placeName: placeName || 'Selected Location' });
                    window.focus(); 
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const openMapPopup = () => {
        const url = "/pace_report_map.html"; 
        const width = 700; const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        if (mapWindowRef.current && !mapWindowRef.current.closed) mapWindowRef.current.close();
        mapWindowRef.current = window.open(url, 'LocationSelector', `width=${width},height=${height},left=${left},top=${top}`);
    };

    const handleImageChange = (e) => {
        if (e.target.files[0]) setImage(e.target.files[0]);
    };

    const handleManualChange = (e) => {
        setManualForm({ ...manualForm, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation based on method
        if (reportMethod === 'registered' && !selectedItemId) {
            setError("Please select the registered item."); return;
        }
        if (reportMethod === 'manual' && (!manualForm.name || !manualForm.description)) {
            setError("Please fill in Name and Description."); return;
        }
        if (!location) { setError("Please select a location using the map."); return; }

        setLoading(true); setSuccess(false);
        
        try {
            // 1. Upload Image (With Compression)
            let imageURL = null;
            if (image) {
                try {
                    setLoadingMessage("Compressing image...");
                    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true };
                    const compressedFile = await imageCompression(image, options);

                    setLoadingMessage("Uploading image...");
                    const storageRef = ref(storage, `lost_images/${Date.now()}_${userId}_${image.name}`);
                    const snapshot = await uploadBytes(storageRef, compressedFile);
                    imageURL = await getDownloadURL(snapshot.ref);
                } catch (uploadErr) {
                    setError("Failed to upload image. Try a smaller file.");
                    setLoading(false);
                    return;
                }
            }

            setLoadingMessage("Processing report...");
            const finalPlaceName = location.placeName || await getPlaceName(location.lat, location.lng);
            
            let finalItemId = selectedItemId;
            let finalItemName = '';
            let finalItemCategory = '';

            if (reportMethod === 'registered') {
                // --- METHOD A: EXISTING ITEM ---
                const selectedItemDetails = userItems.find(item => item.id === selectedItemId);
                finalItemName = selectedItemDetails.name;
                finalItemCategory = selectedItemDetails.category;

                // Update existing item status
                await updateDoc(doc(db, "items", selectedItemId), { status: "LOST" });

            } else {
                // --- METHOD B: NEW MANUAL ITEM ---
                finalItemName = manualForm.name;
                finalItemCategory = manualForm.category;

                // Create a NEW item document first (so we have an ID to track)
                const newItemRef = await addDoc(collection(db, "items"), {
                    ownerID: userId,
                    name: manualForm.name,
                    category: manualForm.category,
                    description: manualForm.description,
                    status: "LOST", // Immediately mark as lost
                    imageURL: imageURL, // Attach the image to the item too
                    registeredAt: serverTimestamp(),
                    isManualReport: true
                });
                finalItemId = newItemRef.id;
            }

            // 2. Create Lost Report
            await addDoc(collection(db, "lostReports"), {
                itemID: finalItemId,
                ownerID: userId,
                lostLocation: { ...location, placeName: finalPlaceName },
                imageURL: imageURL, 
                timestamp: serverTimestamp(),
                status: "ACTIVE",
            });

            // 3. Broadcast Notification
            await addDoc(collection(db, "notifications"), {
                type: "LOST_ALERT",
                message: `🚨 LOST: A ${finalItemName} (${finalItemCategory}) was reported missing near ${finalPlaceName}.`,
                timestamp: serverTimestamp(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });

            setSuccess(true);
            setLocation(null);
            setImage(null);
            setManualForm({ name: '', category: CATEGORIES[0], description: '' });
            
            // If registered item was used, remove it from the dropdown list locally
            if (reportMethod === 'registered') {
                setSelectedItemId('');
                setUserItems(prev => prev.filter(i => i.id !== finalItemId));
            }
            
        } catch (error) {
            console.error("Error submitting:", error);
            setError("Failed to submit report. " + error.message);
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    // --- Styles ---
    const styles = {
        container: { maxWidth: '700px', margin: '0 auto', backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderTop: `4px solid ${ERROR_RED}` },
        header: { fontSize: '1.75rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem', display: 'flex', alignItems: 'center' },
        
        // Tab Switcher Styles
        tabContainer: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' },
        tabButton: (isActive) => ({
            flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
            backgroundColor: isActive ? ERROR_RED : '#f3f4f6',
            color: isActive ? 'white' : '#4b5563',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
        }),

        form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
        section: { padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '12px', backgroundColor: '#f9fafb' },
        sectionHeader: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
        inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' },
        label: { fontSize: '0.875rem', fontWeight: '500', color: '#374151' },
        input: { padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', outline: 'none' },
        select: { padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', backgroundColor: 'white', outline: 'none' },
        textarea: { padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' },
        
        // Map & File Styles
        mapButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: INFO_BLUE, color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', width: '100%' },
        locationDisplay: { marginTop: '1rem', padding: '0.75rem', backgroundColor: '#e0f2fe', border: `1px solid ${INFO_BLUE}`, borderRadius: '8px', fontSize: '0.9rem', color: '#0c4a6e', textAlign: 'center' },
        fileInputButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', backgroundColor: PACE_LIGHT_BLUE, color: PACE_BLUE, borderRadius: '8px', border: `1px solid ${PACE_BLUE}80`, cursor: 'pointer', fontWeight: '600' },
        fileName: { fontSize: '0.8rem', color: '#4b5563', marginLeft: '1rem', fontStyle: 'italic' },
        
        submitButton: { padding: '0.8rem', border: 'none', borderRadius: '8px', backgroundColor: ERROR_RED, color: '#fff', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
        buttonDisabled: { backgroundColor: '#fda4af', cursor: 'not-allowed', opacity: 0.7 },
        errorText: { color: ERROR_RED, textAlign: 'center', padding: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '6px', marginTop: '0.5rem' },
        
        successContainer: { textAlign: 'center', padding: '3rem 2rem', backgroundColor: '#fff7ed', borderRadius: '12px', border: `1px solid ${ERROR_RED}` },
        successTitle: { fontSize: '1.75rem', fontWeight: 'bold', color: '#c2410c' },
        newReportButton: { padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px', backgroundColor: ERROR_RED, color: 'white', fontWeight: '600', cursor: 'pointer', marginTop: '1.5rem' },
        noItemsText: { fontStyle: 'italic', color: '#6b7280', textAlign: 'center', padding: '1rem' },
    };

    if (success) {
        return (
            <div style={styles.successContainer}>
                <CheckCircle size={64} style={{ color: ERROR_RED, marginBottom: '1rem', margin: '0 auto' }} />
                <h2 style={styles.successTitle}>Item Reported Lost</h2>
                <p style={{ color: '#9a3412', marginBottom: '1.5rem' }}>An alert has been broadcast to the campus.</p>
                <button onClick={() => setSuccess(false)} style={styles.newReportButton}>Report Another</button>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}> <MapPin size={24} style={{ marginRight: '0.75rem', color: ERROR_RED }} /> Report Lost Item </h1>

            {/* TOGGLE TABS */}
            <div style={styles.tabContainer}>
                <button 
                    type="button" 
                    onClick={() => setReportMethod('registered')}
                    style={styles.tabButton(reportMethod === 'registered')}
                >
                    <Package size={18} /> Select Registered Item
                </button>
                <button 
                    type="button" 
                    onClick={() => setReportMethod('manual')}
                    style={styles.tabButton(reportMethod === 'manual')}
                >
                    <PlusCircle size={18} /> Report New Item
                </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
                
                {/* CONDITIONAL SECTION: REGISTERED VS MANUAL */}
                {reportMethod === 'registered' ? (
                    <div style={styles.section}>
                        <h2 style={styles.sectionHeader}> <List size={20} /> Select Item </h2>
                        {loadingItems ? <LoadingSpinner message="Loading items..." />
                        : userItems.length === 0 ? <p style={styles.noItemsText}>No registered items found. Use "Report New Item" instead.</p>
                        : (
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Which item did you lose?</label>
                                <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} style={styles.select}>
                                    <option value="" disabled>-- Select --</option>
                                    {userItems.map(item => (<option key={item.id} value={item.id}>{item.name}</option>))}
                                </select>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={styles.section}>
                        <h2 style={styles.sectionHeader}> <List size={20} /> Item Details </h2>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Item Name</label>
                            <input name="name" value={manualForm.name} onChange={handleManualChange} placeholder="e.g. Red Water Bottle" style={styles.input} />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Category</label>
                            <select name="category" value={manualForm.category} onChange={handleManualChange} style={styles.select}>
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Description</label>
                            <textarea name="description" value={manualForm.description} onChange={handleManualChange} placeholder="Details about the item..." rows="3" style={styles.textarea} />
                        </div>
                    </div>
                )}

                {/* COMMON: IMAGE UPLOAD */}
                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}> <Upload size={20} /> Upload Photo (Optional) </h2>
                    <div style={styles.inputGroup}>
                        <label htmlFor="file-upload" style={styles.fileInputButton}> <Upload size={18} /> {image ? 'Change File' : 'Choose File'} </label>
                        <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                        {image && <span style={styles.fileName}>{image.name}</span>}
                    </div>
                </div>

                {/* COMMON: LOCATION */}
                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}> <MapPin size={20} /> Location Lost </h2>
                    <button type="button" onClick={openMapPopup} style={styles.mapButton}> <ExternalLink size={18} /> Open Map Selector </button>
                    {location ? (
                        <div style={styles.locationDisplay}>Selected: <strong>{location.placeName}</strong></div>
                    ) : (
                        <p style={{textAlign: 'center', fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.5rem'}}>Location required</p>
                    )}
                </div>

                {error && <p style={styles.errorText}>{error}</p>}

                <button type="submit" disabled={loading || !location} style={(loading || !location) ? { ...styles.submitButton, ...styles.buttonDisabled } : styles.submitButton}>
                    {loading ? <LoadingSpinner size={20} color="#fff" message={loadingMessage} /> : "Report Lost"}
                </button>
            </form>
        </div>
    );
};

export default LostReport;