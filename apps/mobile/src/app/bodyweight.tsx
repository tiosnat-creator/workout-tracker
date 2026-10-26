import { useState } from 'react';
import { Alert, Text } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useTracker } from '../lib/provider';
import { today, dateInput } from '../lib/training';
import { Button, Card, Field, styles } from '../components/ui';
import { Screen, Progress, useAction } from '../components/Screen';
export default function BodyWeightScreen() {
  const tracker = useTracker(), action = useAction();
  const [weight, setWeight] = useState(''), [date, setDate] = useState(today()), [notes, setNotes] = useState('');
  const entries = [...(tracker.view?.bodyWeights ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  return <Screen><Text style={styles.title}>Body weight</Text>{entries[0] && <Text style={styles.heading}>{entries[0].weight} kg · {new Date(entries[0].date).toLocaleDateString()}</Text>}
    <Progress points={[...entries].reverse()} /><Card><Text style={styles.heading}>Add entry</Text><Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /><Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} /><Field label="Notes (optional)" value={notes} onChangeText={setNotes} maxLength={2000} />
      {action.error}<Button title="Save entry" disabled={action.busy || !weight.trim() || !tracker.view} onPress={() => void action.run(async () => {
        const id = Crypto.randomUUID(); await tracker.save({ kind: 'change', entity: 'bodyWeights', mutationId: id, id, before: null, after: { id, weight: Number(weight.replace(',', '.')), date: dateInput(date), notes: notes.trim() || null } }); setWeight(''); setNotes('');
      })} /></Card>
    <Text style={styles.heading}>History</Text>{entries.map((e) => <Card key={e.id}><Text style={styles.heading}>{e.weight} kg</Text><Text style={styles.muted}>{new Date(e.date).toLocaleDateString()}{e.notes ? ` · ${e.notes}` : ''}</Text><Button secondary title="Delete entry" disabled={action.busy} onPress={() => Alert.alert('Delete body-weight entry?', 'This removal will sync to the website when connected.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void action.run(async () => { await tracker.save({ kind: 'change', entity: 'bodyWeights', mutationId: Crypto.randomUUID(), id: e.id, before: e, after: null }); }) }])} /></Card>)}
  </Screen>;
}
