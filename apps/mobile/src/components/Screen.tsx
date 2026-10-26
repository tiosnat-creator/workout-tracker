import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useTracker } from '../lib/provider';
import { colors, styles } from './ui';
export function Screen({ children }: { children: ReactNode }) {
  const { ready, account } = useTracker();
  if (!ready) return <ActivityIndicator />;
  if (!account) return <Redirect href="/" />;
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView></KeyboardAvoidingView>;
}
export function useAction() {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Please try again.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return { busy, run, error: error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null };
}
export function Progress({ points }: { points: { id: string; date: string; weight: number; source?: string }[] }) {
  if (!points.length) return <Text style={styles.muted}>Log an entry to see your progress.</Text>;
  const recent = points.slice(-20), max = Math.max(...recent.map((p) => p.weight), 1);
  return <View style={{ gap: 12 }}><Text style={styles.muted}>Last {recent.length} entries · oldest to newest</Text>{recent.map((p) => <View key={p.id} accessible accessibilityLabel={`${new Date(p.date).toLocaleDateString()}, ${p.weight} kilograms, ${p.source ?? ''}`} style={{ gap: 4 }}>
    <View style={styles.row}><Text style={styles.muted}>{new Date(p.date).toLocaleDateString()}</Text><Text style={styles.text}>{p.weight} kg {p.source ?? ''}</Text></View>
    <View style={{ backgroundColor: colors.pale, borderRadius: 6, height: 10 }}><View style={{ width: `${Math.max(1, p.weight / max * 100)}%`, backgroundColor: colors.teal, borderRadius: 6, height: 10 }} /></View>
  </View>)}</View>;
}
