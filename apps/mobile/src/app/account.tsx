import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useTracker } from '../lib/provider';
import { Button, Card, styles } from '../components/ui';
import { SignIn } from '../components/SignIn';
export default function AccountScreen() {
  const tracker = useTracker();
  const [error, setError] = useState('');
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>Your training, connected.</Text>
    <Card><Text style={styles.heading}>{tracker.account?.user.name || 'Your account'}</Text><Text style={styles.text}>{tracker.account?.user.email}</Text><Text style={styles.muted}>{tracker.account?.origin}</Text></Card>
    <Card><Text style={styles.heading}>Sync status</Text><Text style={styles.text}>{tracker.local.pending.length} workouts waiting for confirmation</Text><Text style={styles.muted}>{tracker.message}</Text>
      <Button title={tracker.busy ? 'Syncing…' : 'Sync now'} disabled={tracker.busy} onPress={() => void tracker.sync()} />
    </Card>
    {tracker.needsLogin && <SignIn />}
    <Text style={styles.muted}>Sync runs when you open the app, reconnect, or tap Sync now. Keep the app open until uploads finish. Signing out removes this account’s downloaded history from the phone.</Text>
    {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    <Button secondary title="Sign out" disabled={tracker.busy} onPress={() => { setError(''); void tracker.logout().then(() => router.replace('/')).catch((e) => setError(e instanceof Error ? e.message : 'Unable to sign out.')); }} />
  </ScrollView>;
}
