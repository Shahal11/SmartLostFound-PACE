import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import LoadingSpinner from '../shared/LoadingSpinner';
import { Clock, Check, X, RefreshCw } from 'lucide-react';
import PropTypes from 'prop-types';

// Global Colors
const PACE_BLUE = '#0A4C9C';
const PENDING_ORANGE = '#F59E0B';
const SUCCESS_GREEN = '#10B981';
const ERROR_RED = '#EF4444';

// Helper to fetch item/report details
const fetchDetails = async (itemId, reportId) => {
  let itemDetails = { name: 'N/A', description: 'N/A', imageURL: null };
  let reportDetails = { description: 'N/A', imageURL: null, category: 'N/A' };
  try {
    if (itemId) {
      const itemSnap = await getDoc(doc(db, 'items', itemId));
      if (itemSnap.exists()) itemDetails = itemSnap.data();
    }
    if (reportId) {
      const reportSnap = await getDoc(doc(db, 'foundReports', reportId));
      if (reportSnap.exists()) reportDetails = reportSnap.data();
    }
  } catch (err) {
    console.error('fetchDetails error', err);
  }
  return { itemDetails, reportDetails };
};

const VerificationTable = ({ rows, loading, loadingMore, error, hasMore, onLoadMore, onRefresh }) => {
  const [detailsCache, setDetailsCache] = useState({}); // { cacheKey: { itemDetails, reportDetails } }

  // Fetch details for rows received from parent and cache them
  useEffect(() => {
    let mounted = true;
    const loadDetailsForRows = async () => {
      const toFetch = [];
      const newCache = { ...detailsCache };

      rows.forEach((match) => {
        const cacheKey = `${match.lostItemID || ''}-${match.foundReportID || ''}`;
        if (!newCache[cacheKey]) toFetch.push({ match, cacheKey });
      });

      if (toFetch.length === 0) return;

      try {
        await Promise.all(
          toFetch.map(async ({ match, cacheKey }) => {
            const det = await fetchDetails(match.lostItemID, match.foundReportID);
            if (!mounted) return;
            setDetailsCache((prev) => ({ ...prev, [cacheKey]: det }));
          })
        );
      } catch (err) {
        console.error('Error loading details for rows:', err);
      }
    };

    loadDetailsForRows();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const handleVerification = async (matchId, newStatus) => {
    try {
      await updateDoc(doc(db, 'matches', matchId), { status: newStatus });
    } catch (err) {
      console.error('Error updating match status:', err);
      alert('Failed to update status.');
    }
  };

  const styles = {
    container: { backgroundColor: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' },
    header: { fontSize: '1.1rem', fontWeight: 700, color: PACE_BLUE, display: 'flex', alignItems: 'center', gap: 12 },
    th: { backgroundColor: '#f3f4f6', padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', borderBottom: '2px solid #d1d5db' },
    td: { padding: '1rem 1rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem', verticalAlign: 'top' },
    image: { width: 50, height: 50, objectFit: 'cover', borderRadius: 8, marginRight: 8, border: '1px solid #ddd' },
    button: { padding: '.4rem .8rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 500, display: 'flex', alignItems: 'center' },
    approveButton: { backgroundColor: SUCCESS_GREEN, color: '#fff' },
    rejectButton: { backgroundColor: ERROR_RED, color: '#fff' },
    scoreBadge: { display: 'inline-block', padding: '.2rem .6rem', borderRadius: 12, fontSize: '.8rem', fontWeight: 700, color: '#fff', backgroundColor: PENDING_ORANGE },
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={styles.header}>
          <Clock size={20} color={PENDING_ORANGE} /> AI Match Verifications Pending
        </div>
        <div>
          <button type="button" onClick={onRefresh} style={{ ...styles.button, backgroundColor: '#f3f4f6' }} title="Refresh" aria-label="Refresh">
            <RefreshCw size={16} color={PACE_BLUE} style={{ marginRight: 6 }} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><LoadingSpinner message="Loading matches..." /></div>
      ) : error ? (
        <div style={{ padding: 12, backgroundColor: '#fee2e2', borderRadius: 8, color: ERROR_RED }}>{error}</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>No pending matches to verify.</div>
      ) : (
        <>
          <div style={{ overflow: 'auto', maxHeight: '60vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={styles.th}>Lost Item</th>
                  <th style={styles.th}>Found Report</th>
                  <th style={styles.th}>AI Score</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((match) => {
                  const cacheKey = `${match.lostItemID || ''}-${match.foundReportID || ''}`;
                  const details = detailsCache[cacheKey] || { itemDetails: {}, reportDetails: {} };
                  const scorePercent = typeof match.score === 'number' ? `${Math.round(match.score * 100)}%` : '—';

                  return (
                    <tr key={match.id}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {details.itemDetails.imageURL && <img src={details.itemDetails.imageURL} alt="Lost" style={styles.image} onError={(e) => e.target.style.display = 'none'} />}
                          <div>
                            <div style={{ fontWeight: 600 }}>{details.itemDetails.name || 'N/A'}</div>
                            <div style={{ color: '#374151', fontSize: '.85rem' }}>{details.itemDetails.description || 'No description'}</div>
                          </div>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {details.reportDetails.imageURL && <img src={details.reportDetails.imageURL} alt="Found" style={styles.image} onError={(e) => e.target.style.display = 'none'} />}
                          <div>
                            <div style={{ fontWeight: 600 }}>{details.reportDetails.category || 'N/A'}</div>
                            <div style={{ color: '#374151', fontSize: '.85rem' }}>{details.reportDetails.description || 'No description'}</div>
                          </div>
                        </div>
                      </td>

                      <td style={styles.td}><span style={styles.scoreBadge}>{scorePercent}</span></td>

                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" onClick={() => handleVerification(match.id, 'VERIFIED')} style={{ ...styles.button, ...styles.approveButton }}>
                            <Check size={14} style={{ marginRight: 6 }} /> Approve
                          </button>
                          <button type="button" onClick={() => handleVerification(match.id, 'REJECTED')} style={{ ...styles.button, ...styles.rejectButton }}>
                            <X size={14} style={{ marginRight: 6 }} /> Reject
                          </button>
                          <button type="button" onClick={() => window.alert(JSON.stringify(match.raw || match, null, 2))} style={{ ...styles.button, backgroundColor: '#eef2ff' }}>
                            <span style={{ fontSize: 12 }}>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
            {hasMore ? (
              <button type="button" onClick={onLoadMore} disabled={loadingMore} style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: PACE_BLUE, color: '#fff', border: 'none' }}>
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            ) : (
              <div style={{ color: '#6b7280' }}>End of results</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

VerificationTable.propTypes = {
  rows: PropTypes.array,
  loading: PropTypes.bool,
  loadingMore: PropTypes.bool,
  error: PropTypes.string,
  hasMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
  onRefresh: PropTypes.func,
};

VerificationTable.defaultProps = {
  rows: [],
  loading: false,
  loadingMore: false,
  error: '',
  hasMore: false,
  onLoadMore: () => {},
  onRefresh: () => {},
};

export default VerificationTable;

