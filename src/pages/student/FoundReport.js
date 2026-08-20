// src/pages/student/FoundReport.js
import React, { useState, useEffect, useRef } from 'react';
import { db, storage, auth } from '../../firebase/config';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { checkMatch } from '../../utils/aiMatch.js'; 
import { MapPin, CheckCircle, Upload, List, ExternalLink, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../../components/shared/LoadingSpinner.js';

// Global Colors
const PACE_BLUE = '#0A4C9C';
const PACE_LIGHT_BLUE = '#E3F2FF';
const SUCCESS_GREEN = '#10B981';
const ERROR_RED = '#EF4444';
const INFO_BLUE = '#3B82F6';
const PACE_ACCENT = '#F59E0B';

const CATEGORIES = ["Electronics", "ID Card", "Books", "Clothing", "Keys", "Bag", "Bottle", "Other"];

const FoundReport = () => {
    const [form, setForm] = useState({ description: '', category: CATEGORIES[0], image: null });
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [matchResult, setMatchResult] = useState(null);
    const [error, setError] = useState('');
    const userId = auth.currentUser?.uid;
    const mapWindowRef = useRef(null);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setForm(prev => ({ ...prev, [name]: files ? files[0] : value }));
        setError('');
    };

    // Listen for messages from the map popup
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data?.type === 'MAP_LOCATION_SELECTED' && event.data.payload) {
                const { lat, lng, placeName } = event.data.payload;
                if (typeof lat === 'number' && typeof lng === 'number') {
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
        // --- FIXED LINE HERE ---
        const width = 700; 
        const height = 600; // Added 'const'
        // -----------------------
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        if (mapWindowRef.current && !mapWindowRef.current.closed) mapWindowRef.current.close();
        mapWindowRef.current = window.open(url, 'LocationSelector', `width=${width},height=${height},left=${left},top=${top}`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!userId) { setError("User not logged in."); return; }
        if (!location) { setError("Please select a location using the map."); return; }
        if (!form.description.trim()) { setError("Please provide a description."); return; }
        
        setLoading(true); setSuccess(false); setMatchResult(null);

        let imageURL = null;
        let foundReportID = null;

        try {
            // 1. Upload Image (Only if user selected one)
            if (form.image) {
                const storageRef = ref(storage, `found_images/${Date.now()}_${userId}_${form.image.name}`);
                const snapshot = await uploadBytes(storageRef, form.image);
                imageURL = await getDownloadURL(snapshot.ref);
            }

            // 2. Create Found Report in Database
            const newReportRef = await addDoc(collection(db, "foundReports"), {
                finderID: userId,
                description: form.description.trim(),
                category: form.category,
                imageURL: imageURL, 
                foundLocation: location,
                timestamp: serverTimestamp(),
                status: "PENDING",
            });
            foundReportID = newReportRef.id;

            // 3. --- START AI MATCHING ---
            
            // A. Create a detailed text string for the FOUND item
            const foundItemText = `
                Item Category: ${form.category}.
                Description: ${form.description}.
                Found at Location: ${location.placeName}.
            `.trim();

            // B. Get all LOST items
            const lostQuery = query(collection(db, "items"), where("status", "==", "LOST"));
            const lostSnapshot = await getDocs(lostQuery);
            const lostItems = lostSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (lostItems.length > 0) {
                // C. Compare in Parallel (Faster than a loop)
                const matchPromises = lostItems.map(async (lostItem) => {
                    // Create detailed text for the LOST item
                    const lostItemText = `
                        Item Name: ${lostItem.name || 'Unknown'}.
                        Category: ${lostItem.category}.
                        Description: ${lostItem.description}.
                        Last Seen at: ${lostItem.lastSeenLocation?.placeName || 'Unknown'}.
                    `.trim();

                    // CALL THE AI FUNCTION
                    const score = await checkMatch(lostItemText, foundItemText);
                    
                    return { itemID: lostItem.id, score, lostItemData: lostItem };
                });

                // Wait for all AI checks to finish
                const results = await Promise.all(matchPromises);

                // D. Find the highest score
                const bestMatch = results.reduce((max, curr) => curr.score > max.score ? curr : max, { score: 0 });

                // E. Check Threshold (0.75 = 75% Confidence)
                if (bestMatch.itemID && bestMatch.score >= 0.75) {
                    await addDoc(collection(db, "matches"), {
                        lostItemID: bestMatch.itemID,
                        foundReportID: foundReportID,
                        score: bestMatch.score,
                        status: "PENDING_VERIFICATION",
                        timestamp: serverTimestamp(),
                        lostItemDetails: {
                            name: bestMatch.lostItemData.name,
                            description: bestMatch.lostItemData.description
                        },
                        foundReportDetails: {
                            description: form.description
                        }
                    });
                    setMatchResult({ found: true, score: bestMatch.score });
                } else {
                    setMatchResult({ found: false });
                }
            } else {
                setMatchResult({ found: false });
            }

            setSuccess(true);
            setForm({ description: '', category: CATEGORIES[0], image: null });
            setLocation(null);

        } catch (error) {
            console.error("Error submitting report:", error);
            setError("Failed to save report. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    // --- Styles ---
    const styles = {
        container: { maxWidth: '700px', margin: '0 auto', backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderTop: `4px solid ${SUCCESS_GREEN}` },
        header: { fontSize: '1.75rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem', display: 'flex', alignItems: 'center' },
        subHeader: { color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' },
        form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
        section: { padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '12px', backgroundColor: '#f9fafb' },
        sectionHeader: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
        inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' },
        label: { fontSize: '0.875rem', fontWeight: '500', color: '#374151' },
        select: { padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', backgroundColor: 'white' },
        textarea: { padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', minHeight: '80px', fontFamily: 'inherit' },
        fileInputButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', backgroundColor: PACE_LIGHT_BLUE, color: PACE_BLUE, borderRadius: '8px', border: `1px solid ${PACE_BLUE}80`, cursor: 'pointer', fontWeight: '600' },
        fileName: { fontSize: '0.8rem', color: '#4b5563', marginLeft: '1rem', fontStyle: 'italic' },
        mapButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: INFO_BLUE, color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', width: '100%' },
        locationDisplay: { padding: '0.75rem', backgroundColor: '#e0f2fe', border: `1px solid ${INFO_BLUE}`, borderRadius: '8px', fontSize: '0.9rem', color: '#0c4a6e', textAlign: 'center', marginTop: '1rem' },
        submitButton: { padding: '0.8rem', border: 'none', borderRadius: '8px', backgroundColor: SUCCESS_GREEN, color: '#fff', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
        buttonDisabled: { backgroundColor: '#6ee7b7', cursor: 'not-allowed', opacity: 0.7 },
        errorText: { color: ERROR_RED, textAlign: 'center', padding: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '6px', marginTop: '0.5rem' },
        successContainer: { textAlign: 'center', padding: '3rem 2rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: `1px solid ${SUCCESS_GREEN}` },
        matchNotification: { marginTop: '1.5rem', padding: '1rem', backgroundColor: `${PACE_ACCENT}33`, border: `1px solid ${PACE_ACCENT}`, borderRadius: '8px', textAlign: 'left' },
    };

    if (success) {
        return (
            <div style={styles.successContainer}>
                <CheckCircle size={64} style={{ color: SUCCESS_GREEN, marginBottom: '1rem', margin: '0 auto' }} />
                <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#059669' }}>Report Submitted!</h2>
                {matchResult?.found ? (
                    <div style={styles.matchNotification}>
                        <p style={{ fontWeight: 'bold', color: '#713f12' }}>🎉 AI Match Found!</p>
                        <p style={{ color: '#713f12' }}>AI Confidence: <strong>{(matchResult.score * 100).toFixed(0)}%</strong></p>
                    </div>
                ) : (
                    <p style={{ marginTop: '1rem', color: '#4b5563', fontStyle: 'italic' }}>No immediate match found.</p>
                )}
                <button onClick={() => setSuccess(false)} style={{ ...styles.submitButton, width: '100%', marginTop: '2rem' }}>Report Another</button>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}><MapPin size={24} style={{ marginRight: '0.75rem', color: SUCCESS_GREEN }} /> Report Found Item</h1>
            <p style={styles.subHeader}>Describe the item and select the location.</p>

            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}><List size={20} /> Item Details</h2>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Category</label>
                        <select name="category" value={form.category} onChange={handleChange} style={styles.select}>
                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Description</label>
                        <textarea name="description" value={form.description} onChange={handleChange} rows="4" style={styles.textarea} placeholder="E.g., Blue backpack found near the cafeteria..." />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Upload Image (Optional)</label>
                        <div>
                            <label htmlFor="img-upload" style={styles.fileInputButton}><Upload size={18} /> {form.image ? 'Change' : 'Choose'}</label>
                            <input id="img-upload" type="file" name="image" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
                            {form.image && <span style={styles.fileName}>{form.image.name}</span>}
                        </div>
                    </div>
                </div>

                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}><MapPin size={20} /> Location</h2>
                    <button type="button" onClick={openMapPopup} style={styles.mapButton}>
                        <ExternalLink size={18} /> Open Map Selector
                    </button>
                    {location ? (
                        <div style={styles.locationDisplay}>Selected: <strong>{location.placeName}</strong></div>
                    ) : (
                        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                            <AlertTriangle size={14} style={{ verticalAlign: 'middle' }} /> Location required
                        </p>
                    )}
                </div>

                {error && <p style={styles.errorText}>{error}</p>}

                <button type="submit" disabled={loading || !location} style={(loading || !location) ? { ...styles.submitButton, ...styles.buttonDisabled } : styles.submitButton}>
                    {loading ? <LoadingSpinner size={20} color="#fff" /> : "Submit Report"}
                </button>
            </form>
        </div>
    );
};

export default FoundReport;