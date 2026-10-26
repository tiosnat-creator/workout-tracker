import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useTracker } from '../lib/provider';
import { accountKey, parseMutation, type Workout } from '../lib/types';
import { discardDraft, finishDraft, readLocal, saveDraft } from '../lib/store';
import { dateInput, today } from '../lib/training';
import { Button, Card, colors, Field, styles } from '../components/ui';
export default function WorkoutScreen() {
  const tracker = useTracker();
  const params = useLocalSearchParams<{ liftId?: string }>();
  const [draft, setDraft] = useState<Workout | null>(null);
  const [liftId, setLiftId] = useState(typeof params.liftId === 'string' ? params.liftId : '');
  const [date, setDate] = useState(today()), [notes, setNotes] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const key = tracker.account ? accountKey(tracker.account) : null;
  const refresh = tracker.refresh;
  const lifts = tracker.view?.lifts ?? [];
  useEffect(() => {
    if (!key) { router.replace('/'); return; }
    let alive = true;
    (async () => {
      const stored = await readLocal(key);
      const workout = stored.draft ?? { id: Crypto.randomUUID(), date: new Date().toISOString(), notes: null, setEntries: [] };
      await saveDraft(key, workout);
      if (alive) { setDraft(workout); setDate(workout.date.slice(0, 10)); setNotes(workout.notes ?? ''); }
      await refresh();
    })().catch(() => setError('Unable to open your saved workout. Please try again.'));
    return () => { alive = false; };
  }, [key, refresh]);
  async function perform(action: () => Promise<void>) {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save. Please retry.'); }
    finally { saving.current = false; setBusy(false); }
  }
  async function addSet() {
    if (!draft || !key) return;
    await perform(async () => {
      if (!liftId || !weight.trim() || !reps.trim()) throw new Error('Choose a lift and enter weight and reps.');
      const next = { ...draft, date: dateInput(date), notes: notes.trim() || null, setEntries: [...draft.setEntries, { liftId, weight: Number(weight.replace(',', '.')), reps: Number(reps), rpe: rpe.trim() ? Number(rpe.replace(',', '.')) : null, notes: null }] };
      parseMutation({ mutationId: next.id, workout: next });
      await saveDraft(key, next); setDraft(next); await refresh();
    });
  }
  async function finish() {
    if (!draft || !key) return;
    await perform(async () => {
      await finishDraft(key, parseMutation({ mutationId: draft.id, workout: { ...draft, date: dateInput(date), notes: notes.trim() || null } }));
      await refresh(); router.replace('/'); void tracker.sync();
    });
  }
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>ONE SET AT A TIME</Text><Text style={styles.title}>Let’s get stronger.</Text>
    <Text style={styles.muted}>Tap “Add set” to save it on this phone immediately, even offline.</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {draft && <Card><Field label="Workout date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <Field label="Workout notes (optional)" value={notes} onChangeText={setNotes} maxLength={2000} /></Card>}
    <Card><Text style={styles.heading}>Choose your lift</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {lifts.filter((l) => !l.archived).map((lift) => <Pressable key={lift.id} accessibilityRole="button" accessibilityState={{ selected: liftId === lift.id }} onPress={() => setLiftId(lift.id)} style={{ padding: 14, borderRadius: 12, backgroundColor: lift.id === liftId ? colors.teal : colors.pale }}><Text style={{ color: lift.id === liftId ? '#FFFFFF' : colors.teal, fontWeight: '600' }}>{lift.name}</Text></Pressable>)}
    </View><View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="60" /></View><View style={{ flex: 1 }}><Field label="Reps" value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="5" /></View></View>
    <Field label="RPE (optional, 1–10)" value={rpe} onChangeText={setRpe} keyboardType="decimal-pad" placeholder="8" />
    <Button title="Add set" disabled={busy || !draft} onPress={() => void addSet()} /></Card>
    <Text style={styles.heading}>Saved sets · {draft?.setEntries.length ?? 0}</Text>
    {draft?.setEntries.map((set, i) => <Card key={i}><Text style={styles.heading}>{lifts.find((l) => l.id === set.liftId)?.name ?? 'Lift'}</Text><Text style={styles.text}>{set.weight} kg × {set.reps}{set.rpe ? ` · RPE ${set.rpe}` : ''}</Text>
      <Button secondary title="Remove set" disabled={busy} onPress={() => void perform(async () => { if (!key) return; const next = { ...draft, setEntries: draft.setEntries.filter((_, index) => i !== index) }; await saveDraft(key, next); setDraft(next); await refresh(); })} /></Card>)}
    <Button title="Finish & save workout" disabled={busy || !draft?.setEntries.length} onPress={() => void finish()} />
    <Button secondary title="Discard draft" disabled={busy || !draft} onPress={() => Alert.alert('Discard this draft?', 'The sets in this unfinished workout will be removed from this phone.', [{ text: 'Keep training', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => void perform(async () => { if (key) await discardDraft(key); await refresh(); router.replace('/'); }) }])} />
  </ScrollView>;
}
