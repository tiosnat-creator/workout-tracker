import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTracker } from '../../lib/provider';
import { bestMax } from '../../lib/training';
import { Button, Card, Field, styles } from '../../components/ui';
import { Screen } from '../../components/Screen';
export default function Lifts() {
  const { view } = useTracker(); const [search, setSearch] = useState('');
  return <Screen><Text style={styles.title}>Your lifts</Text><Button secondary title="Manage lifts & categories" onPress={() => router.push('/manage')} />
    <Field label="Find a lift" value={search} onChangeText={setSearch} placeholder="Search exercises" />
    {!view && <Text style={styles.muted}>Sync once to download your lift library.</Text>}
    {view?.categories.slice().sort((a, b) => (a.dashboardOrder ?? 0) - (b.dashboardOrder ?? 0)).map((c) => {
      const lifts = view.lifts.filter((l) => !l.archived && l.categoryId === c.id && l.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (a.dashboardOrder ?? 0) - (b.dashboardOrder ?? 0) || a.name.localeCompare(b.name));
      return !lifts.length ? null : <View key={c.id} style={{ gap: 12 }}><Text style={styles.eyebrow}>{c.name}</Text>{lifts.map((l) => <Card key={l.id}><Text style={styles.heading}>{l.name}</Text><Text style={styles.muted}>{bestMax(view, l.id) === null ? 'No 1RM recorded yet' : `${bestMax(view, l.id)} kg · best 1RM`}</Text><Button secondary title="History & log 1RM" onPress={() => router.push({ pathname: '/lifts/[id]', params: { id: l.id } })} /></Card>)}</View>;
    })}
    {view && !view.lifts.some((l) => !l.archived && l.name.toLowerCase().includes(search.toLowerCase())) && <Text style={styles.muted}>No matching lifts. Add an exercise in Manage lifts.</Text>}
  </Screen>;
}
