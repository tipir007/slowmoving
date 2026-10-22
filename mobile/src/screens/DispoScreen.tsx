import React, {useCallback, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenShell} from '../components/ScreenShell';
import type {DispoStackParamList} from '../navigation/types';
import {listDispositions} from '../services/api';
import {colors} from '../theme';
import {actionLabel} from '../utils/constants';

type Props = NativeStackScreenProps<DispoStackParamList, 'DispoHome'>;

export function DispoScreen({navigation}: Props) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listDispositions>>>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('OPEN');

  const load = useCallback(async () => {
    setError('');
    try {
      const all = await listDispositions();
      setRows(filter === 'ALL' ? all : all.filter(d => d.status === filter));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal muat tag.');
    } finally {
      setBusy(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScreenShell kicker="DISPOSISI" title="TAG SM1">
      <ScrollView style={styles.scroll}>
        <Text style={styles.muted}>Buat tag di HP, lalu pratinjau QR. Printer fisik belakangan.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('DispoBaru', {})}>
          <Text style={styles.btnText}>Tag baru</Text>
        </TouchableOpacity>
        <View style={styles.chips}>
          {['OPEN', 'IN_PROGRESS', 'DONE', 'ALL'].map(id => (
            <TouchableOpacity
              key={id}
              style={[styles.chip, filter === id && styles.chipOn]}
              onPress={() => setFilter(id)}>
              <Text style={[styles.chipText, filter === id && styles.chipTextOn]}>{id}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {busy ? <ActivityIndicator color={colors.rubber} /> : null}
        {rows.length === 0 && !busy ? <Text style={styles.muted}>Belum ada tag untuk filter ini.</Text> : null}
        {rows.map(d => (
          <TouchableOpacity
            key={d.id}
            style={styles.card}
            onPress={() => navigation.navigate('LabelPreview', {id: d.id})}>
            <Text style={styles.code}>
              TAG {d.tag_no} · {d.compound_code}
            </Text>
            <Text style={styles.meta}>
              RUN {d.run_no} · SKID {d.skid_no} · {actionLabel(d.action_type)} · {d.status}
              {d.verified_at ? ' · verify OK' : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {flex: 1},
  muted: {color: colors.inkMuted, marginBottom: 12, lineHeight: 20},
  btn: {backgroundColor: colors.rubber, padding: 14, alignItems: 'center', marginBottom: 12},
  btnText: {color: colors.ticket, fontWeight: '700'},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12},
  chip: {borderWidth: 1, borderColor: colors.rubber, paddingHorizontal: 8, paddingVertical: 6},
  chipOn: {backgroundColor: colors.rubber},
  chipText: {color: colors.ink, fontSize: 12},
  chipTextOn: {color: colors.ticket},
  err: {color: colors.rack, marginBottom: 8},
  card: {borderWidth: 1, borderColor: colors.rubber, backgroundColor: colors.paper, padding: 12, marginBottom: 8},
  code: {fontSize: 18, fontWeight: '700', color: colors.ink},
  meta: {marginTop: 4, color: colors.inkMuted},
});
