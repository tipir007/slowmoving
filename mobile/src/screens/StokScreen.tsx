import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenShell} from '../components/ScreenShell';
import type {StokStackParamList} from '../navigation/types';
import {stampTicket} from '../lib/format';
import {listSkids} from '../services/api';
import {colors} from '../theme';
import {LIVE_STATUSES, statusLabel} from '../utils/constants';

type Props = NativeStackScreenProps<StokStackParamList, 'StokHome'>;
type Filter = 'LIVE' | 'ALL' | string;

export function StokScreen({navigation}: Props) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listSkids>>>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('LIVE');

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

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(s => {
      if (filter === 'LIVE' && !LIVE_STATUSES.includes(s.status as (typeof LIVE_STATUSES)[number])) return false;
      if (filter !== 'LIVE' && filter !== 'ALL' && s.status !== filter) return false;
      if (!needle) return true;
      return [s.compound_code, s.run_no, s.skid_no, s.status].join(' ').toLowerCase().includes(needle);
    });
  }, [rows, q, filter]);

  const live = rows.filter(s => LIVE_STATUSES.includes(s.status as (typeof LIVE_STATUSES)[number]));
  const kgLive = live.reduce((a, s) => a + Number(s.qty_sisa || 0), 0);

  const chips: {id: Filter; label: string}[] = [
    {id: 'LIVE', label: 'Hidup'},
    {id: 'ALL', label: 'Semua'},
    {id: 'UNDER_REVIEW', label: 'Review'},
    {id: 'DISPOSED', label: 'Siap'},
    {id: 'IN_EXECUTION', label: 'Mesin'},
    {id: 'GAGAL_TRIAL', label: 'Gagal'},
  ];

  return (
    <ScreenShell kicker="PAPAN STOK" title="SKID DI RAK">
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={busy && rows.length > 0} onRefresh={load} />}>
        <Text style={styles.muted}>Sumber data: Supabase Slowmoving — sama dengan laptop.</Text>
        <View style={styles.tally}>
          <View style={styles.cell}>
            <Text style={styles.n}>{live.filter(s => s.status === 'UNDER_REVIEW').length}</Text>
            <Text style={styles.l}>Review</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.n}>{live.filter(s => s.status === 'DISPOSED').length}</Text>
            <Text style={styles.l}>Siap</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.n}>{live.filter(s => s.status === 'IN_EXECUTION').length}</Text>
            <Text style={styles.l}>Mesin</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.n}>{Math.round(kgLive)}</Text>
            <Text style={styles.l}>Kg hidup</Text>
          </View>
        </View>
        <TextInput
          style={styles.search}
          value={q}
          onChangeText={setQ}
          placeholder="Cari compound / run / skid"
          placeholderTextColor="#8a8478"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {chips.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, filter === c.id && styles.chipOn]}
              onPress={() => setFilter(c.id)}>
              <Text style={[styles.chipText, filter === c.id && styles.chipTextOn]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {busy && rows.length === 0 ? <ActivityIndicator color={colors.rubber} /> : null}
        {shown.length === 0 && !busy ? <Text style={styles.muted}>Tidak ada skid untuk filter ini.</Text> : null}
        {shown.map(s => (
          <TouchableOpacity
            key={s.id}
            style={styles.card}
            onPress={() => navigation.navigate('StokDetail', {id: s.id})}>
            <View style={styles.row}>
              <Text style={styles.code}>{s.compound_code}</Text>
              <Text style={styles.status}>{statusLabel(s.status)}</Text>
            </View>
            <Text style={styles.meta}>
              RUN {s.run_no} · SKID {s.skid_no} · {Math.round(Number(s.qty_sisa))} kg
              {s.exp_at ? `\nExp ${stampTicket(s.exp_at)}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {flex: 1},
  muted: {color: colors.inkMuted, marginBottom: 10, lineHeight: 20},
  tally: {flexDirection: 'row', marginBottom: 10},
  cell: {flex: 1},
  n: {color: colors.ink, fontSize: 20, fontWeight: '700'},
  l: {color: colors.inkMuted, fontSize: 11},
  search: {
    borderWidth: 1,
    borderColor: colors.rubber,
    backgroundColor: colors.paper,
    padding: 10,
    color: colors.ink,
    marginBottom: 8,
  },
  chips: {marginBottom: 10},
  chip: {borderWidth: 1, borderColor: colors.rubber, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6},
  chipOn: {backgroundColor: colors.rubber},
  chipText: {color: colors.ink, fontSize: 12},
  chipTextOn: {color: colors.ticket},
  err: {color: colors.rack, marginBottom: 8},
  card: {
    borderWidth: 1,
    borderColor: colors.rubber,
    backgroundColor: colors.paper,
    padding: 12,
    marginBottom: 8,
  },
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  code: {color: colors.ink, fontSize: 22, fontWeight: '700'},
  status: {color: colors.inkMuted, fontSize: 11},
  meta: {marginTop: 4, color: colors.inkMuted},
});
