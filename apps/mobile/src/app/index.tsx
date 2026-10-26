import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTracker } from '../lib/provider';
import { Button, Card, colors, styles } from '../components/ui';
import { bestMax } from '../lib/training';
import { SignIn } from '../components/SignIn';
export default function Home() {
  const { account, local, ready, busy, message, sync, needsLogin, view } = useTracker();
  if (!ready) return <SafeAreaView style={styles.page}><ActivityIndicator accessibilityLabel="Loading your workouts" color={colors.teal} /></SafeAreaView>;
  const pendingIds = new Set(local.pending.map((p) => 'kind' in p.mutation && p.mutation.kind === 'change' ? p.mutation.id : p.mutation.mutationId));
  const workouts = [...(view?.sessions ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const lifts = new Map(view?.lifts.map((lift) => [lift.id, lift.name]) ?? []);
  return <SafeAreaView style={styles.page}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!account ? <SignIn /> : <>
        <View style={styles.row}><Text style={styles.eyebrow}>WORKOUT TRACKER</Text><Button secondary title="Account" onPress={() => router.push('/account')} /></View>
        <View style={{ gap: 6 }}><Text style={styles.title}>Keep showing up.</Text><Text style={styles.muted}>Your next session starts here, {account.user.name?.split(' ')[0] || 'lifter'}.</Text></View>
        <View style={{ gap: 10 }}><Button secondary title="Calculator" onPress={() => router.push('/calculator')} /><Button secondary title="Body weight" onPress={() => router.push('/bodyweight')} /><Button secondary title="Manage lifts & categories" onPress={() => router.push('/manage')} /></View>
        <Text style={styles.heading}>Your 1RMs</Text><Button secondary title="Arrange dashboard" onPress={() => router.push('/reorder')} />
        {view?.categories.slice().sort((a, b) => (a.dashboardOrder ?? 0) - (b.dashboardOrder ?? 0)).map((c) => {
          const group = view.lifts.filter((l) => l.categoryId === c.id && !l.archived).sort((a, b) => (a.dashboardOrder ?? 0) - (b.dashboardOrder ?? 0));
          return !group.length ? null : <Card key={c.id}><Text style={styles.eyebrow}>{c.name}</Text>{group.map((l) => <Button secondary key={l.id} title={`${l.name} · ${bestMax(view, l.id) ?? '—'} kg`} onPress={() => router.push({ pathname: '/lifts/[id]', params: { id: l.id } })} />)}</Card>;
        })}
        <Button secondary title="My lifts · history & manual 1RM" onPress={() => router.push('/lifts')} />
        <View style={[styles.card, { backgroundColor: colors.ink, borderColor: colors.ink, padding: 24 }]}>
          <Text style={{ color: '#A8D6C6', fontSize: 12, fontWeight: '700', letterSpacing: 2 }}>BUILT FOR YOUR NEXT REP</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 27, fontWeight: '700' }}>{local.draft ? 'Pick up where you left off.' : 'Make today count.'}</Text>
          <Text style={{ color: '#CBDCD5', fontSize: 15, lineHeight: 22 }}>Every added set is saved on your phone. Sync when you’re connected.</Text>
          <Button title={local.draft ? 'Continue workout' : 'Start workout'} disabled={!view?.lifts.some((l) => !l.archived) && !local.draft} onPress={() => router.push('/workout')} />
        </View>
        <Card><View style={styles.row}><Text style={styles.heading}>{local.pending.length ? `${local.pending.length} awaiting sync` : 'Training, in sync'}</Text>{busy && <ActivityIndicator color={colors.teal} />}</View>
          {needsLogin && <Button secondary title="Sign in again to sync" onPress={() => router.push('/account')} />}
          <Text style={styles.muted}>{message || 'Preparing your offline workout library…'}</Text>
          {local.synced && <Text style={styles.muted}>Last synced {new Date(local.synced).toLocaleString()}</Text>}
          <Button secondary title={busy ? 'Syncing…' : 'Sync now'} disabled={busy} onPress={() => void sync()} />
        </Card>
        {!view?.lifts.some((l) => !l.archived) && <Text style={styles.muted}>Add exercises in Manage lifts to start logging workouts.</Text>}
        <View style={styles.row}><Text style={styles.heading}>Workout history</Text><Text style={styles.muted}>{workouts.length} sessions</Text></View>
        {workouts.length === 0 && <Card><Text style={styles.text}>A fresh start.</Text><Text style={styles.muted}>Your saved workouts will appear here and remain available offline.</Text></Card>}
        {workouts.map((workout) => <Card key={workout.id}>
          <View style={styles.row}><Text style={styles.heading}>{new Date(workout.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text><Text style={styles.muted}>{pendingIds.has(workout.id) ? 'Saved on phone' : 'Synced'}</Text></View>
          <Button secondary title="Open & edit workout" onPress={() => router.push({ pathname: '/sessions/[id]', params: { id: workout.id } })} />
          {!!workout.notes && <Text style={styles.text}>{workout.notes}</Text>}
          {workout.setEntries.map((set, i) => <View key={i} style={styles.row}><Text style={[styles.text, { flex: 1 }]}>{lifts.get(set.liftId) ?? 'Lift'}</Text><Text style={styles.muted}>{set.weight} kg × {set.reps}{set.rpe ? ` · RPE ${set.rpe}` : ''}</Text></View>)}
        </Card>)}
      </>}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
