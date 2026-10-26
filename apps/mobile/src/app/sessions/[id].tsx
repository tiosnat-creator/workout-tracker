import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useTracker } from '../../lib/provider';
import type { Workout } from '../../lib/types';
import { Button, Card, Field, styles } from '../../components/ui';
import { Screen, useAction } from '../../components/Screen';
export default function Session() {
  const { id } = useLocalSearchParams<{ id: string }>(); const tracker = useTracker(), action = useAction();
  const [liftId, setLiftId] = useState(''), [weight, setWeight] = useState(''), [reps, setReps] = useState(''), [rpe, setRpe] = useState('');
  const workout = tracker.view?.sessions.find((w) => w.id === id), lifts = tracker.view?.lifts ?? [];
  async function save(after: Workout | null) { if (workout) await tracker.save({ kind: 'change', entity: 'sessions', mutationId: Crypto.randomUUID(), id, before: workout, after }); }
  if (!workout) return <Screen><Text style={styles.text}>This session is no longer in your library.</Text></Screen>;
  if (workout.status && workout.status !== 'COMPLETED') return <Screen><Text style={styles.heading}>Planned workout</Text><Text style={styles.text}>Manage this planned or in-progress session on the website. Completed workouts can be edited here.</Text></Screen>;
  return <Screen><Text style={styles.title}>{new Date(workout.date).toLocaleDateString()}</Text>{!!workout.notes && <Text style={styles.text}>{workout.notes}</Text>}{action.error}
    {workout.setEntries.map((s, i) => <Card key={i}><Text style={styles.heading}>{lifts.find((l) => l.id === s.liftId)?.name ?? 'Lift'}</Text><Text style={styles.text}>{s.weight} kg × {s.reps}{s.rpe ? ` · RPE ${s.rpe}` : ''}</Text><Button secondary title="Remove set" disabled={action.busy} onPress={() => void action.run(() => save({ ...workout, setEntries: workout.setEntries.filter((_, index) => index !== i) }))} /></Card>)}
    <Card><Text style={styles.heading}>Add a set</Text>{lifts.filter((l) => !l.archived).map((l) => <Button key={l.id} secondary={liftId !== l.id} title={l.name} onPress={() => setLiftId(l.id)} />)}<View style={styles.row}><View style={{ flex: 1 }}><Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Field label="Reps" value={reps} onChangeText={setReps} keyboardType="number-pad" /></View></View><Field label="RPE (optional)" value={rpe} onChangeText={setRpe} keyboardType="decimal-pad" />
      <Button title="Save set" disabled={action.busy || !liftId || !weight.trim() || !reps.trim()} onPress={() => void action.run(async () => { await save({ ...workout, setEntries: [...workout.setEntries, { liftId, weight: Number(weight.replace(',', '.')), reps: Number(reps), rpe: rpe.trim() ? Number(rpe.replace(',', '.')) : null, notes: null }] }); setWeight(''); setReps(''); })} /></Card>
    <Button secondary title="Delete workout" disabled={action.busy} onPress={() => Alert.alert('Delete this workout?', 'This removal will sync to the website.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void action.run(async () => { await save(null); router.replace('/'); }) }])} />
  </Screen>;
}
