import React, {useCallback, useState} from 'react';
import {ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {listSkids} from '../services/api';
import {useAuthStore} from '../stores/useAuthStore';
import {colors} from '../theme';

export function RakScreen() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listSkids>>>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setRows(await listSkids());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal muat stok.');
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScrollView
      style={styles.page}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}>
      <View style={styles.row}>
        <Text style={styles.kicker}>{user?.nik} · {user?.role}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.link}>Keluar</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>RAK MERAH</Text>
      <Text style={styles.muted}>Stok dari Supabase Slowmoving — sama dengan laptop.</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {busy && rows.length === 0 ? <ActivityIndicator color={colors.rubber} /> : null}
      {rows.map(s => (
        <View key={s.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.code}>{s.compound_code}</Text>
            <Text style={styles.status}>{s.status}</Text>
          </View>
          <Text style={styles.meta}>
            RUN {s.run_no} · SKID {s.skid_no} · {Math.round(Number(s.qty_sisa))} kg
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: colors.ticket, padding: 16},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  kicker: {color: colors.inkMuted, fontSize: 12},
  link: {color: colors.rack, fontWeight: '700'},
  title: {color: colors.ink, fontSize: 28, fontWeight: '700', marginVertical: 8},
  muted: {color: colors.inkMuted, marginBottom: 12},
  err: {color: colors.rack, marginBottom: 8},
  card: {
    borderWidth: 1,
    borderColor: colors.rubber,
    backgroundColor: colors.paper,
    padding: 12,
    marginBottom: 8,
  },
  code: {color: colors.ink, fontSize: 22, fontWeight: '700'},
  status: {color: colors.inkMuted, fontSize: 11, letterSpacing: 0.5},
  meta: {marginTop: 4, color: colors.inkMuted},
});
