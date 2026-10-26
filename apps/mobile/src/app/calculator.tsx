import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTracker } from '../lib/provider';
import { bestMax, estimate } from '../lib/training';
import { Button, Card, Field, styles } from '../components/ui';
import { Screen } from '../components/Screen';
export default function Calculator() {
  const { view } = useTracker(); const [base, setBase] = useState(''), [weight, setWeight] = useState(''), [reps, setReps] = useState('');
  const max = Number(base.replace(',', '.')), w = Number(weight.replace(',', '.')), r = Number(reps);
  return <Screen><Text style={styles.title}>Training calculator</Text><Text style={styles.muted}>Works offline using your downloaded lift records.</Text>
    <Card><Text style={styles.heading}>Percentages of 1RM</Text>{view?.lifts.filter((l) => !l.archived).map((l) => { const best = bestMax(view, l.id); return <Button key={l.id} secondary title={`${l.name} · ${best ?? '—'} kg`} disabled={best === null} onPress={() => setBase(String(best))} />; })}
      <Field label="1RM or custom weight (kg)" value={base} onChangeText={setBase} keyboardType="decimal-pad" />
      {Number.isFinite(max) && max > 0 && max <= 2000 && Array.from({ length: 11 }, (_, i) => 50 + i * 5).map((percent) => <View key={percent} style={styles.row}><Text style={styles.text}>{percent}%</Text><Text style={styles.heading}>{Math.round(max * percent / 100)} kg</Text></View>)}
    </Card><Card><Text style={styles.heading}>Estimate 1RM from a set</Text><Field label="Weight lifted (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /><Field label="Repetitions" value={reps} onChangeText={setReps} keyboardType="number-pad" />
      {Number.isFinite(w) && w > 0 && w <= 2000 && Number.isInteger(r) && r > 0 && r <= 1000 && <Text style={styles.heading}>{estimate(w, r)} kg estimated 1RM</Text>}
    </Card></Screen>;
}
