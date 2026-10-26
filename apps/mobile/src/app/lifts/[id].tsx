import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useTracker } from '../../lib/provider';
import { bestMax, liftProgress, today, dateInput } from '../../lib/training';
import { Button, Card, Field, styles } from '../../components/ui';
import { Screen, Progress, useAction } from '../../components/Screen';
export default function LiftDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const tracker = useTracker(); const action = useAction();
  const [weight, setWeight] = useState(''), [date, setDate] = useState(today()), [notes, setNotes] = useState('');
  const view = tracker.view, lift = view?.lifts.find((l) => l.id === id);
  if (!view || !lift) return <Screen><Text style={styles.text}>Lift unavailable. Sync your library and try again.</Text></Screen>;
  const entries = (view.oneRepMaxes ?? []).filter((e) => e.liftId === id).sort((a, b) => b.date.localeCompare(a.date));
  const sets = view.sessions.flatMap((w) => w.setEntries.filter((s) => s.liftId === id).map((s, i) => ({ ...s, id: `${w.id}-${i}`, date: w.date }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);
  return <Screen><Text style={styles.eyebrow}>{view.categories.find((c) => c.id === lift.categoryId)?.name}{lift.archived ? ' · Archived' : ''}</Text><Text style={styles.title}>{lift.name}</Text>
    <Card><Text style={styles.heading}>{bestMax(view, id) ?? '—'} kg · best 1RM</Text><Text style={styles.muted}>Highest tested or estimated value, matching your website.</Text></Card>
    {!lift.archived && <Button title="Log sets for this lift" onPress={() => router.push({ pathname: '/workout', params: { liftId: id } })} />}
    <Text style={styles.heading}>Progress</Text><Progress points={liftProgress(view, id)} />
    <Card><Text style={styles.heading}>Manual 1RM test</Text><Text style={styles.muted}>Save a tested maximum without creating a workout. Saved tests remain available offline.</Text>
      <Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <Field label="Test date (YYYY-MM-DD)" value={date} onChangeText={setDate} autoCapitalize="none" />
      <Field label="Notes (optional)" value={notes} onChangeText={setNotes} maxLength={2000} multiline />{action.error}
      <Button title={action.busy ? 'Saving…' : 'Save 1RM test'} disabled={action.busy || !weight.trim()} onPress={() => void action.run(async () => {
        const entryId = Crypto.randomUUID();
        await tracker.save({ kind: 'manual-1rm', mutationId: entryId, entry: { id: entryId, liftId: id, weight: Number(weight.replace(',', '.')), date: dateInput(date), notes: notes.trim() || null } });
        setWeight(''); setNotes('');
      })} />
    </Card>
    <Text style={styles.heading}>Manual tests</Text>{!entries.length && <Text style={styles.muted}>No manual tests yet.</Text>}{entries.map((e) => <Card key={e.id}><View style={styles.row}><Text style={styles.text}>{new Date(e.date).toLocaleDateString()}</Text><Text style={styles.heading}>{e.weight} kg</Text></View>{!!e.notes && <Text style={styles.muted}>{e.notes}</Text>}<Text style={styles.muted}>{tracker.local.pending.some((p) => p.mutation.mutationId === e.id) ? 'Saved on phone · awaiting sync' : 'Synced'}</Text></Card>)}
    <Text style={styles.heading}>Recent sets</Text>{!sets.length && <Text style={styles.muted}>No sets logged yet.</Text>}{sets.map((s) => <View key={s.id} style={styles.row}><Text style={styles.muted}>{new Date(s.date).toLocaleDateString()}</Text><Text style={styles.text}>{s.weight} kg × {s.reps}</Text></View>)}
  </Screen>;
}
