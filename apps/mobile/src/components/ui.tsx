import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
export const colors = { ink: '#182C34', muted: '#64777E', paper: '#F5F7F5', teal: '#126B5D', line: '#DCE5E0', pale: '#E2F0E9' };
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 24, paddingBottom: 48, gap: 20 },
  eyebrow: { color: colors.teal, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { fontSize: 34, fontWeight: '800', color: colors.ink, letterSpacing: -1 },
  heading: { fontSize: 21, fontWeight: '700', color: colors.ink },
  text: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.line, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  field: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, backgroundColor: '#FFFFFF', color: colors.ink, fontSize: 16, minHeight: 52 },
  error: { color: '#A2352B', fontSize: 14, lineHeight: 21 },
});
export function Button({ title, onPress, disabled, secondary = false }: { title: string; onPress(): void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ padding: 16, borderRadius: 14, minHeight: 52, alignItems: 'center', opacity: disabled ? 0.45 : pressed ? 0.75 : 1, backgroundColor: secondary ? colors.pale : colors.teal })}>
    <Text style={{ color: secondary ? colors.teal : '#FFFFFF', fontWeight: '700', fontSize: 16 }}>{title}</Text>
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 7 }}><Text style={styles.muted}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#86958F" {...props} style={[styles.field, props.style]} /></View>;
}
export function Card({ children }: { children: ReactNode }) { return <View style={styles.card}>{children}</View>; }
