import { useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Button, Card, Field, styles } from './ui';
import { useTracker } from '../lib/provider';
import { request, serverOrigin, ApiError } from '../lib/api';
import type { Account } from '../lib/types';
type Challenge = { id: string; verifier: string; origin: string; expiresAt: string };
const challengeKey = 'mobile-email-challenge-v1';
export function SignIn() {
  const tracker = useTracker(), trackerRef = useRef(tracker);
  useEffect(() => { trackerRef.current = tracker; }, [tracker]);
  const [origin, setOrigin] = useState(tracker.account?.origin ?? process.env.EXPO_PUBLIC_API_URL ?? '');
  const [email, setEmail] = useState(tracker.account?.user.email ?? ''), [password, setPassword] = useState('');
  const [error, setError] = useState(''), [working, setWorking] = useState(false), [usePassword, setUsePassword] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  useEffect(() => { void SecureStore.getItemAsync(challengeKey).then((saved) => { if (saved) setChallenge(JSON.parse(saved)); }).catch(() => setError('Unable to restore the pending sign-in.')); }, []);
  useEffect(() => {
    if (!challenge) return;
    let alive = true, polling = false;
    async function poll() {
      if (!challenge || polling || AppState.currentState !== 'active') return;
      polling = true;
      try {
        if (Date.parse(challenge.expiresAt) <= Date.now()) throw new ApiError('Sign-in expired. Request a new email link.', 401);
        const reply = await request<{ pending: true } | Omit<Account, 'origin'>>(challenge.origin, 'magic', undefined, { action: 'claim', id: challenge.id, verifier: challenge.verifier });
        if ('pending' in reply || !alive) return;
        await trackerRef.current.completeEmailLogin({ ...reply, origin: challenge.origin });
        await SecureStore.deleteItemAsync(challengeKey);
        if (alive) { setChallenge(null); setError(''); }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Could not connect. Retrying…');
        if (e instanceof ApiError && e.status === 401) { await SecureStore.deleteItemAsync(challengeKey); if (alive) setChallenge(null); }
      } finally { polling = false; }
    }
    void poll(); const timer = setInterval(() => void poll(), 5000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void poll(); });
    return () => { alive = false; clearInterval(timer); subscription.remove(); };
  }, [challenge]);
  async function submit() {
    if (working) return; setWorking(true); setError('');
    try {
      if (usePassword) { await tracker.login(origin, email, password); setPassword(''); return; }
      const server = serverOrigin(origin), verifier = Crypto.randomUUID() + Crypto.randomUUID();
      const reply = await request<{ id: string; expiresAt: string }>(server, 'magic', undefined, { action: 'request', email, verifier });
      const next = { ...reply, origin: server, verifier };
      await SecureStore.setItemAsync(challengeKey, JSON.stringify(next)); setChallenge(next);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.'); }
    finally { setWorking(false); }
  }
  return <View style={{ gap: 24 }}><Text style={styles.eyebrow}>WORKOUT TRACKER</Text><Text style={styles.title}>{tracker.account ? 'Reconnect your account' : 'Your training.\nAnywhere.'}</Text>
    <Text style={styles.muted}>Use your website account. Once your data is downloaded, you can train offline.</Text>
    <Card><Field label="Website address" value={origin} onChangeText={setOrigin} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://www.as-kr.com" editable={!tracker.account && !challenge} /><Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!tracker.account && !challenge} />
      {usePassword && <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {challenge ? <><Text style={styles.text}>If this email has an active account, a sign-in link is on its way. Open the email, tap Confirm app sign-in, then return here. This phone will sign in automatically.</Text><Text style={styles.muted}>New accounts must finish signing up on the website first.</Text><Button secondary title="Cancel / request another link" onPress={() => { void SecureStore.deleteItemAsync(challengeKey).then(() => setChallenge(null)).catch(() => setError('Could not cancel. Please try again.')); }} /></> : <>
        <Button title={working ? 'Please wait…' : usePassword ? 'Sign in' : 'Email me a sign-in link'} disabled={working || tracker.busy || !origin || !email || (usePassword && !password)} onPress={() => void submit()} />
        <Button secondary title={usePassword ? 'Use email link' : 'Use password instead'} onPress={() => setUsePassword(!usePassword)} />
      </>}
    </Card><Text style={styles.muted}>Initial sign-in needs an internet connection. Password sign-in is only available on servers that enable it.</Text></View>;
}
