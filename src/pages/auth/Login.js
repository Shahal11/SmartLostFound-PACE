// src/pages/auth/Login.js
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowRight, ShieldCheck, Users } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        // Force refresh so we get the latest custom claims
        await user.getIdToken(true);
        const idTokenResult = await user.getIdTokenResult();
        console.log('Login: uid=', user.uid, 'email=', user.email, 'claims=', idTokenResult.claims);

        const isAdminClaim = Boolean(idTokenResult.claims && idTokenResult.claims.admin);
        if (isAdminClaim) {
          navigate('/admin/dashboard', { replace: true });
          return;
        }

        // fallback: check users doc (not authoritative for admin)
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        const role = docSnap.exists() ? docSnap.data().role : null;
        console.log('Login: users doc role =', role);
        if (role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/student/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Auth redirect error', err);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle redirect
    } catch (err) {
      console.error('SignIn error', err);
      setError(err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' ? 'Invalid credentials.' : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pace-blue/10 via-white to-pace-green/10 py-12 px-4">
      <div className="mx-auto max-w-5xl bg-white/90 backdrop-blur shadow-2xl rounded-3xl overflow-hidden grid md:grid-cols-2">
        <section className="hidden md:flex flex-col gap-6 bg-pace-blue text-white p-10">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">PACE L&F</p>
            <h1 className="text-3xl font-bold mt-2">CampusFind Admin & Student Portal</h1>
            <p className="mt-4 text-white/80">Securely track lost and found items, verify AI matches, and stay connected with campus communities.</p>
          </div>
          <div className="space-y-4 text-white/90">
            <div className="flex items-center gap-3">
              <ShieldCheck size={26} />
              <p>Single sign-on with instant role recognition.</p>
            </div>
            <div className="flex items-center gap-3">
              <Users size={26} />
              <p>Admin-only dashboards plus streamlined student workflows.</p>
            </div>
          </div>
        </section>

        <section className="p-10">
          <div className="mb-8">
            <div className="flex items-center gap-3 text-pace-blue">
              <LogIn size={26} />
              <p className="text-sm font-semibold uppercase tracking-widest">Welcome back</p>
            </div>
            <h2 className="text-3xl font-bold text-ink-darkest mt-4">Sign in to continue</h2>
            <p className="text-ink-light mt-2">Use your campus credentials to access dashboards and chat.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-ink-dark">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@pace.edu.in"
                required
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-pace-blue focus:border-pace-blue"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-ink-dark">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-pace-blue focus:border-pace-blue"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pace-blue px-5 py-3 font-semibold text-white transition hover:bg-pace-blue-dark disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-dashed border-pace-blue/30 p-4 text-sm text-ink-dark flex flex-col gap-3">
            <p>New to CampusFind?</p>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="flex items-center gap-2 rounded-xl border border-pace-blue px-4 py-2 font-semibold text-pace-blue hover:bg-pace-blue/10"
            >
              Create an account
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}