import React, { useCallback, useEffect, useState } from 'react';
import VerificationTable from '../../components/admin/VerificationTable'; // Ensure this component exists
import { db } from '../../firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../../components/shared/LoadingSpinner'; // Import spinner

// --- EMAILJS CONFIGURATION ---
const EMAILJS_SERVICE_ID = "service_9okj6ds"; // Updated with your provided ID
const EMAILJS_TEMPLATE_ID = "template_60v377k"; // Your previously provided Template ID
const EMAILJS_PUBLIC_KEY = "bprCxoq0K-vr3kJPo"; // Your previously provided Public Key

const PAGE_SIZE = 10; // Adjusted for better loading capability

export default function AIMatchVerification() {
  const [rows, setRows] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Helper to send email via EmailJS
  const sendMatchEmail = async (recipientEmail, itemName, matchId) => {
      if (!recipientEmail) return;
      const templateParams = {
          to_email: recipientEmail,
          item_name: itemName,
          match_id: matchId,
          message: "A match has been verified for your lost item. Please check your dashboard."
      };
      try {
          await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
          console.log("Email sent to:", recipientEmail);
      } catch (error) {
          console.error("EmailJS Error:", error);
          // We alert but don't stop the flow, as the DB update is more critical
          alert("Match verified, but failed to send email notification. Please check console.");
      }
  };

  const loadPage = useCallback(
    async (cursor = null) => {
      try {
        if (cursor) setLoadingMore(true);
        else {
          setLoading(true);
          setError('');
        }

        // Base Query
        let q = query(
          collection(db, 'matches'),
          where('status', '==', 'PENDING_VERIFICATION'),
          orderBy('timestamp', 'desc'), // Ensure your 'matches' have a 'timestamp' field
          limit(PAGE_SIZE)
        );

        // Apply Cursor for Next Page
        if (cursor) {
          q = query(
            collection(db, 'matches'),
            where('status', '==', 'PENDING_VERIFICATION'),
            orderBy('timestamp', 'desc'),
            startAfter(cursor),
            limit(PAGE_SIZE)
          );
        }

        const snap = await getDocs(q);
        const docs = snap.docs;

        // --- ENRICH DATA: Fetch Lost Item & Found Report details for each match ---
        // This is necessary because the 'matches' collection usually only has IDs
        const detailedRows = await Promise.all(docs.map(async (matchDoc) => {
            const data = matchDoc.data();
            let lostItem = {};
            let foundReport = {};

            // Fetch Lost Item Details
            if (data.lostItemID) {
                const itemSnap = await getDoc(doc(db, "items", data.lostItemID));
                if (itemSnap.exists()) lostItem = itemSnap.data();
            }

            // Fetch Found Report Details
            if (data.foundReportID) {
                const reportSnap = await getDoc(doc(db, "foundReports", data.foundReportID));
                if (reportSnap.exists()) foundReport = reportSnap.data();
            }

            return {
                id: matchDoc.id,
                ...data,
                lostItem: { id: data.lostItemID, ...lostItem },
                foundReport: { id: data.foundReportID, ...foundReport },
                // Flatten key fields for the table if needed
                name: lostItem.name || 'Unknown Item', 
                score: data.score,
                date: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleDateString() : 'N/A'
            };
        }));

        // Update State
        if (cursor) {
          setRows((prev) => [...prev, ...detailedRows]);
        } else {
          setRows(detailedRows);
        }

        const newLast = docs.length > 0 ? docs[docs.length - 1] : null;
        setLastDoc(newLast);
        setHasMore(docs.length === PAGE_SIZE);

      } catch (err) {
        console.error('AIMatchVerification fetch error:', err);
        setError('Failed to load verification items.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    loadPage(null); // Initial Load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = async () => {
    if (!lastDoc) return;
    await loadPage(lastDoc);
  };

  const handleRefresh = async () => {
    setLastDoc(null);
    await loadPage(null);
  };

  // --- Verification Logic ---
  const handleApprove = async (matchId) => {
      if (!window.confirm("Approve this match?")) return;
      
      const match = rows.find(r => r.id === matchId);
      if (!match) return;

      setSendingEmail(true);
      const batch = writeBatch(db);

      try {
          // 1. Update Match status
          batch.update(doc(db, "matches", matchId), { status: "VERIFIED" });
          
          // 2. Update Found Report status
          if (match.foundReportID) {
              batch.update(doc(db, "foundReports", match.foundReportID), { status: "MATCHED" });
          }
          
          // 3. Create Chat
          const chatRef = doc(collection(db, "chats"));
          const participants = [match.lostItem?.ownerID, match.foundReport?.finderID].filter(Boolean);
          
          batch.set(chatRef, {
              matchId: matchId,
              participants: participants,
              status: 'ACTIVE',
              createdAt: serverTimestamp(),
              itemInfo: { 
                  name: match.lostItem?.name || 'Item',
                  category: match.lostItem?.category || 'Unknown'
              }
          });
          
          // Update match with chat ID
          batch.update(doc(db, "matches", matchId), { chatId: chatRef.id });

          await batch.commit();

          // 4. Send Email
          if (match.lostItem?.ownerID) {
               const userSnap = await getDoc(doc(db, "users", match.lostItem.ownerID));
               if (userSnap.exists()) {
                   const userEmail = userSnap.data().email;
                   await sendMatchEmail(userEmail, match.lostItem.name || "Lost Item", matchId);
               }
          }

          alert("Match Approved & Notification Sent!");
          handleRefresh(); // Reload list to remove the item

      } catch (error) {
          console.error("Approval Error:", error);
          alert("Failed to approve match. Check console for details.");
      } finally {
          setSendingEmail(false);
      }
  };

  const handleReject = async (matchId) => {
      if (!window.confirm("Reject this match?")) return;
      try {
          await updateDoc(doc(db, "matches", matchId), { status: "REJECTED" });
          handleRefresh();
      } catch (error) {
          console.error("Rejection Error:", error);
          alert("Failed to reject match.");
      }
  };

  // Columns definition for VerificationTable
  const columns = [
      { key: 'score', header: 'Score', render: (r) => <strong>{(r.score * 100).toFixed(0)}%</strong> },
      { key: 'name', header: 'Lost Item' },
      { key: 'foundReport.category', header: 'Found Category', render: (r) => r.foundReport?.category },
      { key: 'date', header: 'Date' },
      { key: 'actions', header: 'Actions', render: (r) => (
          <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                  onClick={() => handleApprove(r.id)}
                  disabled={sendingEmail}
                  style={{ 
                      padding: '5px 10px', 
                      backgroundColor: '#10B981', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: sendingEmail ? 'not-allowed' : 'pointer',
                      opacity: sendingEmail ? 0.7 : 1
                  }}
              >
                  {sendingEmail ? 'Sending...' : 'Approve'}
              </button>
              <button 
                  onClick={() => handleReject(r.id)}
                  disabled={sendingEmail}
                  style={{ 
                      padding: '5px 10px', 
                      backgroundColor: '#EF4444', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: sendingEmail ? 'not-allowed' : 'pointer',
                      opacity: sendingEmail ? 0.7 : 1
                  }}
              >
                  Reject
              </button>
          </div>
      )}
  ];

  // Define inline styles for layout
  const styles = {
      container: { padding: '20px', fontFamily: 'Poppins, sans-serif' },
      header: { color: '#0A4C9C', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: 'bold' },
      subHeader: { color: '#666', marginBottom: '20px' },
      sending: { color: '#F59E0B', fontWeight: 'bold', marginBottom: '10px' }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>
          <AlertTriangle /> AI Match Verification
      </h1>
      <p style={styles.subHeader}>Review and manage pending matches.</p>
      
      {sendingEmail && <p style={styles.sending}>Processing Approval & Sending Email...</p>}
      
      <VerificationTable
        rows={rows}         // Pass the enriched data
        columns={columns}   // Pass column definitions
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        onRefresh={handleRefresh}
        // No need to pass onApprove/onReject here as they are handled in the columns render
      />
    </div>
  );
}