import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useTracker } from '../lib/provider';
import { Button, Card, styles } from '../components/ui';
import type { MobileMutation } from '../lib/types';
import { SignIn } from '../components/SignIn';
function pendingDescription(m: MobileMutation) {
  if (!('kind' in m)) return `${new Date(m.workout.date).toLocaleDateString()} · ${m.workout.setEntries.length} sets`;
  if (m.kind === 'manual-1rm') return `${new Date(m.entry.date).toLocaleDateString()} · ${m.entry.weight} kg${m.entry.notes ? ` · ${m.entry.notes}` : ''}`;
  const row = m.after ?? m.before;
  if (!row) return '';
  const action = !m.after ? 'Delete' : !m.before ? 'Create' : 'Update';
  if ('name' in row) return `${action}: ${row.name}${'archived' in row && row.archived ? ' (archived)' : ''}`;
  return `${action}: ${new Date(row.date).toLocaleDateString()} · ${'weight' in row ? `${row.weight} kg` : `${row.setEntries.length} sets`}${row.notes ? ` · ${row.notes}` : ''}`;
}
export default function AccountScreen() {
  const tracker = useTracker();
  const [error, setError] = useState('');
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>Your training, connected.</Text>
    <Card><Text style={styles.heading}>{tracker.account?.user.name || 'Your account'}</Text><Text style={styles.text}>{tracker.account?.user.email}</Text><Text style={styles.muted}>{tracker.account?.origin}</Text></Card>
    <Card><Text style={styles.heading}>Sync status</Text><Text style={styles.text}>{tracker.local.pending.length} entries waiting for confirmation</Text><Text style={styles.muted}>{tracker.message}</Text>
      <Button title={tracker.busy ? 'Syncing…' : 'Sync now'} disabled={tracker.busy} onPress={() => void tracker.sync()} />
    </Card>
    {tracker.local.pending.map((p) => <Card key={p.mutation.mutationId}><Text style={styles.heading}>{'kind' in p.mutation ? p.mutation.kind === 'change' ? `Saved change: ${p.mutation.entity}` : 'Manual 1RM test' : 'Saved workout'}</Text><Text style={styles.muted}>{p.accepted ? 'Uploaded; waiting for download confirmation' : 'Saved on this phone; awaiting upload'}</Text>
      <Text selectable style={styles.muted}>{pendingDescription(p.mutation)}</Text>
      {!p.accepted && <Button secondary title="Discard this pending change" disabled={tracker.busy} onPress={() => Alert.alert('Discard this local change?', 'Review or copy its details first. This cannot be undone. Later changes depending on it may also need to be discarded.', [{ text: 'Keep', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => { void tracker.discardPending(p.mutation.mutationId).catch((e) => setError(e.message)); } }])} />}
    </Card>)}
    {tracker.needsLogin && <SignIn />}
    <Text style={styles.muted}>Sync runs when you open the app, reconnect, or tap Sync now. Keep the app open until uploads finish. Signing out removes this account’s downloaded history from the phone.</Text>
    {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    <Button secondary title="Sign out" disabled={tracker.busy} onPress={() => { setError(''); void tracker.logout().then(() => router.replace('/')).catch((e) => setError(e instanceof Error ? e.message : 'Unable to sign out.')); }} />
  </ScrollView>;
}
