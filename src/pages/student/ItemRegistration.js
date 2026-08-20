// src/pages/student/ItemRegistration.js
import React, { useState } from 'react';
import { db, storage, auth } from '../../firebase/config';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import QRGenerator from '../../components/items/QRGenerator';
import { Upload, Box, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

// --- 1. IMPORT THE COMPRESSION LIBRARY HERE ---
import imageCompression from 'browser-image-compression'; 

// Global Colors
const PACE_BLUE = '#0A4C9C';
const PACE_LIGHT_BLUE = '#E3F2FF';
const SUCCESS_GREEN = '#10B981';
const ERROR_RED = '#EF4444';

const CATEGORIES = ["Electronics", "ID Card", "Books", "Clothing", "Keys", "Bag", "Bottle", "Other"];

const ItemRegistration = () => {
    const [form, setForm] = useState({ name: '', description: '', category: CATEGORIES[0], image: null });
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(''); // To show "Compressing..." vs "Uploading..."
    const [success, setSuccess] = useState(false);
    const [newItemId, setNewItemId] = useState(null); 
    const [error, setError] = useState('');
    const userId = auth.currentUser?.uid;

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setForm(prev => ({ ...prev, [name]: files ? files[0] : value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setNewItemId(null);

        if (!form.name.trim() || !form.description.trim() || !form.category || !userId) {
            setError("Please fill in Item Name, Category, and Description.");
            return;
        }

        setLoading(true);
        let imageURL = null;

        try {
            // Generate ID immediately
            const newItemRef = doc(collection(db, "items"));
            const generatedId = newItemRef.id;

            // --- 2. IMAGE COMPRESSION & UPLOAD LOGIC ---
            if (form.image) {
                try {
                    setLoadingMessage("Compressing image...");
                    
                    // Options: Max size 0.5MB, Max width 1280px
                    const options = {
                        maxSizeMB: 0.5,
                        maxWidthOrHeight: 1280,
                        useWebWorker: true
                    };
                    
                    // Compress the file
                    const compressedFile = await imageCompression(form.image, options);

                    setLoadingMessage("Uploading image...");
                    const storageRef = ref(storage, `item_images/${userId}/${generatedId}_${form.image.name}`);
                    
                    // Upload the COMPRESSED file, not the original form.image
                    const snapshot = await uploadBytes(storageRef, compressedFile);
                    imageURL = await getDownloadURL(snapshot.ref);

                } catch (uploadError) {
                    console.error("Image processing failed:", uploadError);
                    setError(`Image error: ${uploadError.message}. Try a smaller photo.`);
                    setLoading(false);
                    return;
                }
            }

            setLoadingMessage("Saving details...");

            // Construct the QR Code URL
            const appBaseUrl = window.location.origin; 
            const finalQrValue = `${appBaseUrl}/student/report-found?lostItemId=${generatedId}`;

            // 3. Save to Firestore
            await setDoc(newItemRef, {
                id: generatedId,
                ownerID: userId,
                name: form.name.trim(),
                description: form.description.trim(),
                category: form.category,
                imageURL: imageURL,
                status: "SAFE",
                registeredAt: serverTimestamp(),
                qrCodeValue: finalQrValue,
            });

            setNewItemId(generatedId);
            setSuccess(true);

        } catch (error) {
            console.error("Error registering item:", error);
            setError(`Failed to register: ${error.message}`);
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    // --- Inline Styles ---
    const styles = {
        container: { maxWidth: '600px', margin: '0 auto', backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderTop: `4px solid ${PACE_BLUE}` },
        header: { fontSize: '1.75rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' },
        form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
        inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
        label: { fontSize: '0.875rem', fontWeight: '500', color: '#374151' },
        labelOptional: { fontSize: '0.75rem', fontWeight: '400', color: '#6b7280', marginLeft: '0.5rem'},
        input: { padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', outline: 'none' },
        select: { padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', backgroundColor: 'white', outline: 'none' },
        textarea: { padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', outline: 'none', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical'},
        fileInputButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', backgroundColor: PACE_LIGHT_BLUE, color: PACE_BLUE, borderRadius: '8px', border: `1px solid ${PACE_BLUE}80`, cursor: 'pointer', fontWeight: '600', transition: 'background-color 0.2s' },
        fileName: { fontSize: '0.8rem', color: '#4b5563', marginLeft: '1rem', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'},
        submitButton: { padding: '0.8rem 1rem', border: 'none', borderRadius: '8px', backgroundColor: PACE_BLUE, color: '#fff', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s, opacity 0.2s', marginTop: '1rem', minHeight: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
        buttonDisabled: { cursor: 'not-allowed', opacity: 0.6 },
        errorText: { color: ERROR_RED, fontSize: '0.875rem', fontWeight: '500', textAlign: 'center', padding: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '6px', border: `1px solid ${ERROR_RED}`, marginTop: '0.5rem' },
        successContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: `1px solid ${SUCCESS_GREEN}`, textAlign: 'center' },
        successTitle: { fontSize: '1.5rem', fontWeight: 'bold', color: '#059669', margin: '0 0 0.5rem 0' },
        successText: { color: '#047857', marginBottom: '1.5rem' },
        newButton: { padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px', backgroundColor: SUCCESS_GREEN, color: 'white', fontWeight: '600', cursor: 'pointer', marginTop: '1rem', transition: 'background-color 0.2s' },
    };

    // --- Success View with QR Code ---
    if (success && newItemId) {
        return (
            <div style={styles.successContainer}>
                <CheckCircle size={50} style={{ color: SUCCESS_GREEN, marginBottom: '1rem' }} />
                <h2 style={styles.successTitle}>Item Registered Successfully!</h2>
                <p style={styles.successText}>Download and attach the unique QR tag below to your item.</p>
                
                <QRGenerator itemID={newItemId} />
                
                <button
                    onClick={() => {
                        setSuccess(false);
                        setNewItemId(null);
                        setForm({ name: '', description: '', category: CATEGORIES[0], image: null }); 
                    }}
                    style={styles.newButton}
                >
                    Register Another Item
                </button>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>
                <Box size={24} style={{ color: PACE_BLUE }} /> Register Your Item
            </h1>
            <form onSubmit={handleSubmit} style={styles.form}>
                 <div style={styles.inputGroup}>
                    <label htmlFor="name" style={styles.label}>Item Name (Required)</label>
                    <input id="name" type="text" name="name" required value={form.name} onChange={handleChange} style={styles.input} placeholder="e.g., Black Jansport Backpack" />
                </div>
                <div style={styles.inputGroup}>
                    <label htmlFor="category" style={styles.label}>Category (Required)</label>
                    <select id="category" name="category" required value={form.category} onChange={handleChange} style={styles.select}>
                        {CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                </div>
                 <div style={styles.inputGroup}>
                    <label htmlFor="description" style={styles.label}>Description (Required)</label>
                    <textarea id="description" name="description" required value={form.description} onChange={handleChange} rows="4" style={styles.textarea} placeholder="e.g., Black color, white logo, small tear near left strap, contains textbooks."/>
                </div>
                 <div style={styles.inputGroup}>
                    <label htmlFor="image-upload-button" style={styles.label}>
                        Upload Image <span style={styles.labelOptional}>(Optional, but recommended)</span>
                    </label>
                     <div>
                        <label htmlFor="image-upload-button" style={styles.fileInputButton}>
                           <Upload size={18} /> {form.image ? 'Change File' : 'Choose File'}
                        </label>
                        <input id="image-upload-button" type="file" name="image" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
                        {form.image && <span style={styles.fileName}>{form.image.name}</span>}
                    </div>
                     <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>A clear photo helps significantly in matching.</p>
                </div>

                {error && <p style={styles.errorText}>{error}</p>}

                <button type="submit" disabled={loading} style={loading ? {...styles.submitButton, ...styles.buttonDisabled} : styles.submitButton}>
                     {loading ? <LoadingSpinner size={20} color="#ffffff" message={loadingMessage || "Saving..."} /> : <><CheckCircle size={20}/> Register Item & Get Tag</>}
                </button>
            </form>
        </div>
    );
};

export default ItemRegistration;