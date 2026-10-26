import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useTracker } from '../lib/provider';
import type { Lift, Category, ChangeMutation } from '../lib/types';
import { Button, Card, Field, styles } from '../components/ui';
import { Screen, useAction } from '../components/Screen';
export default function Manage() {
  const tracker = useTracker(), action = useAction(); const view = tracker.view;
  const [lift, setLift] = useState<Lift | null>(null), [name, setName] = useState(''), [categoryId, setCategoryId] = useState('');
  const [category, setCategory] = useState<Category | null>(null), [categoryName, setCategoryName] = useState('');
  const categories = [...(view?.categories ?? [])].sort((a, b) => (a.dashboardOrder ?? 0) - (b.dashboardOrder ?? 0) || a.name.localeCompare(b.name));
  async function saveLift(archived?: boolean) {
    const id = lift?.id ?? Crypto.randomUUID();
    await tracker.save({ kind: 'change', entity: 'lifts', mutationId: lift ? Crypto.randomUUID() : id, id, before: lift, after: { id, name: name.trim(), categoryId, archived: archived ?? lift?.archived ?? false, dashboardOrder: lift?.dashboardOrder ?? 0 } });
    setLift(null); setName('');
  }
  async function move(entity: 'lifts' | 'categories', rows: (Lift | Category)[], index: number, direction: number) {
    const next = [...rows]; [next[index], next[index + direction]] = [next[index + direction], next[index]];
    // Normalize the group; old web records may all share order zero.
    for (const [order, row] of next.entries()) {
      if ((row.dashboardOrder ?? 0) === order) continue;
      await tracker.save({ kind: 'change', entity, mutationId: Crypto.randomUUID(), id: row.id, before: row, after: { ...row, dashboardOrder: order } } as ChangeMutation);
    }
  }
  return <Screen><Text style={styles.title}>Your library</Text><Text style={styles.muted}>Changes are saved on this phone and sync to the website. Use Move up/down to arrange dashboard categories and lifts.</Text>{action.error}
    <Card><Text style={styles.heading}>{lift ? `Edit ${lift.name}` : 'Add a lift'}</Text><Field label="Lift name" value={name} onChangeText={setName} maxLength={200} /><Text style={styles.muted}>Category</Text>
      {categories.map((c) => <Button key={c.id} secondary={categoryId !== c.id} title={c.name} disabled={action.busy} onPress={() => setCategoryId(c.id)} />)}
      <Button title="Save lift" disabled={action.busy || !name.trim() || !categoryId || !view} onPress={() => void action.run(() => saveLift())} />
      {lift && <><Button secondary title={lift.archived ? 'Unarchive lift' : 'Archive lift'} disabled={action.busy} onPress={() => void action.run(() => saveLift(!lift.archived))} /><Button secondary title="Cancel edit" onPress={() => { setLift(null); setName(''); }} /></>}
    </Card>
    <Card><Text style={styles.heading}>{category ? `Rename ${category.name}` : 'Add a category'}</Text><Field label="Category name" value={categoryName} onChangeText={setCategoryName} maxLength={200} /><Button title="Save category" disabled={action.busy || !categoryName.trim() || !view} onPress={() => void action.run(async () => {
      const id = category?.id ?? Crypto.randomUUID(); await tracker.save({ kind: 'change', entity: 'categories', mutationId: category ? Crypto.randomUUID() : id, id, before: category, after: { id, name: categoryName.trim(), isUncategorized: category?.isUncategorized ?? false, dashboardOrder: category?.dashboardOrder ?? categories.length } }); setCategory(null); setCategoryName('');
    })} />{category && <Button secondary title="Cancel rename" onPress={() => { setCategory(null); setCategoryName(''); }} />}</Card>
    {categories.map((c, index) => { const lifts = (view?.lifts ?? []).filter((l) => l.categoryId === c.id).sort((a, b) => (a.dashboardOrder ?? 0) - (b.dashboardOrder ?? 0) || a.name.localeCompare(b.name));
      return <Card key={c.id}><Text style={styles.heading}>{c.name}</Text>
        <View style={styles.row}><Button secondary title="Move up" disabled={action.busy || index === 0} onPress={() => void action.run(() => move('categories', categories, index, -1))} /><Button secondary title="Move down" disabled={action.busy || index === categories.length - 1} onPress={() => void action.run(() => move('categories', categories, index, 1))} /></View>
        {!c.isUncategorized && <><Button secondary title="Rename category" onPress={() => { setCategory(c); setCategoryName(c.name); }} /><Button secondary title="Delete category" disabled={action.busy} onPress={() => Alert.alert(`Delete ${c.name}?`, 'Its lifts will move to Uncategorized.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void action.run(async () => { await tracker.save({ kind: 'change', entity: 'categories', mutationId: Crypto.randomUUID(), id: c.id, before: c, after: null }); }) }])} /></>}
        {lifts.map((l, i) => <View key={l.id} style={{ gap: 8, paddingTop: 16 }}><Text style={styles.text}>{l.name}{l.archived ? ' · Archived' : ''}</Text><Button secondary title={`Edit ${l.name}`} onPress={() => { setLift(l); setName(l.name); setCategoryId(l.categoryId); }} /><View style={styles.row}><Button secondary title="Move up" disabled={action.busy || i === 0} onPress={() => void action.run(() => move('lifts', lifts, i, -1))} /><Button secondary title="Move down" disabled={action.busy || i === lifts.length - 1} onPress={() => void action.run(() => move('lifts', lifts, i, 1))} /></View></View>)}
      </Card>;
    })}
  </Screen>;
}
