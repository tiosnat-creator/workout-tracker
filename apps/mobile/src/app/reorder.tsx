import { useMemo, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useTracker } from '../lib/provider';
import type { Category, Lift, ChangeMutation } from '../lib/types';
import { Button, Card, colors, styles } from '../components/ui';
import { Screen, useAction } from '../components/Screen';
function DragRow({ children, index, count, disabled, onDrop }: { children: ReactNode; index: number; count: number; disabled: boolean; onDrop(target: number): void }) {
  const [offset] = useState(() => new Animated.Value(0));
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderMove: (_, gesture) => offset.setValue(gesture.dy),
    onPanResponderRelease: (_, gesture) => {
      offset.setValue(0);
      const target = Math.max(0, Math.min(count - 1, index + Math.round(gesture.dy / 72)));
      if (target !== index) onDrop(target);
    },
    onPanResponderTerminate: () => offset.setValue(0),
    onPanResponderTerminationRequest: () => false,
  }), [count, disabled, index, offset, onDrop]);
  return <Animated.View style={{ minHeight: 64, marginBottom: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', transform: [{ translateY: offset }] }}>
    <View {...responder.panHandlers} accessible accessibilityLabel="Drag to reorder. Use move buttons below as an alternative." style={{ padding: 18 }}><Text style={styles.heading}>↕</Text></View><View style={{ flex: 1, paddingRight: 12 }}>{children}</View>
  </Animated.View>;
}
export default function Reorder() {
  const tracker = useTracker(), action = useAction(); const [categoryId, setCategoryId] = useState('');
  const categories = [...(tracker.view?.categories ?? [])].sort((a, b) => (a.dashboardOrder ?? 0) - (b.dashboardOrder ?? 0) || a.name.localeCompare(b.name));
  const lifts = (tracker.view?.lifts ?? []).filter((l) => l.categoryId === categoryId).sort((a, b) => (a.dashboardOrder ?? 0) - (b.dashboardOrder ?? 0) || a.name.localeCompare(b.name));
  async function reorder(entity: 'lifts' | 'categories', rows: (Lift | Category)[], from: number, to: number) {
    const next = [...rows], [row] = next.splice(from, 1); next.splice(to, 0, row);
    for (const [order, item] of next.entries()) {
      if ((item.dashboardOrder ?? 0) === order) continue;
      await tracker.save({ kind: 'change', entity, id: item.id, mutationId: Crypto.randomUUID(), before: item, after: { ...item, dashboardOrder: order } } as ChangeMutation);
    }
  }
  return <Screen><Text style={styles.title}>Arrange your dashboard</Text><Text style={styles.muted}>Drag the ↕ handles up or down. Changes save offline and sync to the website. Move buttons are also available in Manage library.</Text>{action.error}
    <Text style={styles.heading}>Categories</Text><View>{categories.map((c, index) => <DragRow key={c.id} index={index} count={categories.length} disabled={action.busy} onDrop={(to) => void action.run(() => reorder('categories', categories, index, to))}><Text numberOfLines={1} style={styles.text}>{c.name}</Text></DragRow>)}</View>
    <Card><Text style={styles.heading}>Arrange lifts in a category</Text>{categories.map((c) => <Button key={c.id} secondary={categoryId !== c.id} title={c.name} onPress={() => setCategoryId(c.id)} />)}</Card>
    <View>{lifts.map((l, index) => <DragRow key={l.id} index={index} count={lifts.length} disabled={action.busy} onDrop={(to) => void action.run(() => reorder('lifts', lifts, index, to))}><Text numberOfLines={1} style={styles.text}>{l.name}</Text></DragRow>)}</View>
  </Screen>;
}
