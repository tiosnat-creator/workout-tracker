import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import { api, request, serverOrigin, ApiError } from './api';
import { accountKey, type Account, type Snapshot } from './types';
import { clearLocal, readLocal, syncStore } from './store';
import { synchronize } from './sync';
const sessionKey = 'workout-account-v1';
type Local = Awaited<ReturnType<typeof readLocal>>;
const empty: Local = { snapshot: null, pending: [], draft: null, synced: null };
function useTrackerState() {
  const [account, setAccount] = useState<Account | null>(null);
  const accountRef = useRef<Account | null>(null);
  const [local, setLocal] = useState(empty);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const lock = useRef(false);
  const refresh = useCallback(async () => {
    const active = accountRef.current;
    if (active) {
      const data = await readLocal(accountKey(active));
      if (accountRef.current === active) setLocal(data);
    }
  }, []);
  const sync = useCallback(async () => {
    const active = accountRef.current;
    if (!active || lock.current) return;
    lock.current = true; setBusy(true);
    try {
      await synchronize(syncStore(accountKey(active)), {
        push: (mutation) => api(active, 'sync', mutation),
        pull: async () => {
          const snapshot = await api<Snapshot>(active, 'sync');
          if (snapshot.user.id !== active.user.id || !Array.isArray(snapshot.sessions) || !Array.isArray(snapshot.lifts)) throw new Error('Invalid account data received.');
          return snapshot;
        },
      });
      setMessage('Everything is up to date.'); setNeedsLogin(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message); if (error.status === 401) setNeedsLogin(true);
      } else setMessage('Could not connect. Workouts stay on this phone; we’ll retry.');
    } finally {
      try { await refresh(); } catch { setMessage('Unable to read local storage. Please reopen the app.'); }
      lock.current = false; setBusy(false);
    }
  }, [refresh]);
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(sessionKey);
        if (saved) { const active: Account = JSON.parse(saved); accountRef.current = active; setAccount(active); await refresh(); }
      } catch { setMessage('Could not restore your session. Please reopen the app.'); }
      finally { setReady(true); }
    })();
  }, [refresh]);
  useEffect(() => {
    if (!account) return;
    let mounted = true;
    void Network.getNetworkStateAsync().then(() => { if (mounted) void sync(); }).catch(() => {});
    const network = Network.addNetworkStateListener((state) => { if (state.isConnected && state.isInternetReachable !== false) void sync(); });
    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') void sync(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void sync(); }, 30000);
    return () => { mounted = false; network.remove(); foreground.remove(); clearInterval(timer); };
  }, [account, sync]);
  async function login(server: string, email: string, password: string) {
    if (lock.current) throw new Error('Wait for the current sync to finish.');
    lock.current = true; setBusy(true);
    try {
      const origin = serverOrigin(server);
      const reply = await request<Omit<Account, 'origin'>>(origin, 'auth', undefined, { email, password });
      const active: Account = { ...reply, origin };
      if (accountRef.current && accountKey(accountRef.current) !== accountKey(active)) {
        await api(active, 'auth', undefined, 'DELETE');
        throw new Error('Sign in to the same account to preserve your offline workouts.');
      }
      await SecureStore.setItemAsync(sessionKey, JSON.stringify(active));
      accountRef.current = active; setAccount(active); setNeedsLogin(false); await refresh();
    } finally { lock.current = false; setBusy(false); }
  }
  async function logout() {
    const active = accountRef.current;
    if (!active || lock.current) throw new Error('Wait for the current sync to finish.');
    lock.current = true; setBusy(true);
    try {
      const data = await readLocal(accountKey(active));
      if (data.pending.length || data.draft?.setEntries.length) throw new Error('Sync your saved workouts and finish or discard your draft before signing out.');
      await api(active, 'auth', undefined, 'DELETE');
      await SecureStore.deleteItemAsync(sessionKey);
      await clearLocal(accountKey(active));
      accountRef.current = null; setAccount(null); setLocal(empty); setMessage(''); setNeedsLogin(false);
    } finally { lock.current = false; setBusy(false); }
  }
  return { account, local, ready, busy, message, needsLogin, refresh, sync, login, logout };
}
const TrackerContext = createContext<ReturnType<typeof useTrackerState> | null>(null);
export function TrackerProvider({ children }: { children: ReactNode }) {
  const state = useTrackerState();
  return <TrackerContext.Provider value={state}>{children}</TrackerContext.Provider>;
}
export function useTracker() {
  const value = useContext(TrackerContext);
  if (!value) throw new Error('Missing TrackerProvider');
  return value;
}
