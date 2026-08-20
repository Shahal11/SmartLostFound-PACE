import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

/**
 * useAuthStatus
 * - user: firebase user object or null
 * - role: 'admin' | 'student' | null (null while loading or unknown)
 * - loading: boolean
 */
export function useAuthStatus() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!mounted) return;
      setLoading(true);
      setUser(u || null);
      setRole(null);

      if (!u) {
        setLoading(false);
        return;
      }

      try {
        // Force refresh once so we pick up any recently-set custom claims
        await u.getIdToken(true);
        const token = await u.getIdTokenResult();
        // Token claims are authoritative for admin
        if (token.claims && token.claims.admin) {
          if (!mounted) return;
          setRole('admin');
          setLoading(false);
          return;
        }

        // Fallback: read users/{uid} doc to get role
        const snap = await getDoc(doc(db, 'users', u.uid));
        const docRole = snap.exists() ? snap.data().role : null;
        if (!mounted) return;
        setRole(docRole || 'student'); // default to student if no role found
      } catch (err) {
        console.error('useAuthStatus error:', err);
        if (mounted) setRole('student');
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => { mounted = false; unsub(); };
  }, []);

  return { user, role, loading };
}

export default useAuthStatus;

