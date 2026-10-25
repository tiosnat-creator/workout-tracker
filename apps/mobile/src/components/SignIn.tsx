import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Field, styles } from './ui';
import { useTracker } from '../lib/provider';
export function SignIn() {
  const tracker = useTracker();
  const [origin, setOrigin] = useState(tracker.account?.origin ?? process.env.EXPO_PUBLIC_API_URL ?? '');
  const [email, setEmail] = useState(tracker.account?.user.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  async function submit() {
    if (working) return;
    setWorking(true); setError('');
    try { await tracker.login(origin, email, password); setPassword(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.'); }
    finally { setWorking(false); }
  }
  return <View style={{ gap: 24 }}>
    <View style={{ gap: 8 }}><Text style={styles.eyebrow}>WORKOUT TRACKER</Text><Text style={styles.title}>{tracker.account ? 'Reconnect your account' : 'Your training.\nAnywhere.'}</Text>
      <Text style={styles.muted}>Sign in with your website account. Once your lifts are downloaded, you can train without a connection.</Text></View>
    <Card>
      <Field label="Website address" value={origin} onChangeText={setOrigin} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://your-workout-site.com" editable={!tracker.account} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" editable={!tracker.account} />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={() => void submit()} />
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button title={working ? 'Signing in…' : 'Sign in'} disabled={working || tracker.busy || !origin || !email || !password} onPress={() => void submit()} />
    </Card>
    <Text style={styles.muted}>Your password is never saved on this phone. Initial sign-in needs an internet connection.</Text>
  </View>;
}
