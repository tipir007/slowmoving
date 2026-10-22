import React, {useCallback, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {listOpenDispositions} from '../services/api';
import {colors} from '../theme';
import type {LabelStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<LabelStackParamList, 'LabelHome'>;

export function LabelListScreen({navigation}: Props) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listOpenDispositions>>>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setRows(await listOpenDispositions());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal muat tag.');
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
    <ScrollView style={styles.page}>
      <Text style={styles.kicker}>PRINT PREVIEW</Text>
      <Text style={styles.title}>LABEL SM1</Text>
      <Text style={styles.muted}>
        Pratinjau QR di HP. Printer fisik belakangan. Tag dibuat di web Disposisi.
      </Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {busy ? <ActivityIndicator color={colors.rubber} /> : null}
      {rows.length === 0 && !busy ? <Text style={styles.muted}>Belum ada tag OPEN. Buat di web dulu.</Text> : null}
      {rows.map(d => (
        <TouchableOpacity key={d.id} style={styles.card} onPress={() => navigation.navigate('LabelPreview', {id: d.id})}>
          <Text style={styles.code}>TAG {d.tag_no} · {d.compound_code}</Text>
          <Text style={styles.meta}>
            RUN {d.run_no} · SKID {d.skid_no} · {d.action_type}
            {d.verified_at ? ' · verify OK' : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: colors.ticket, padding: 16},
  kicker: {letterSpacing: 2, fontSize: 12, color: colors.inkMuted},
  title: {fontSize: 24, fontWeight: '700', marginBottom: 8, color: colors.ink},
  muted: {color: colors.inkMuted, marginBottom: 12, lineHeight: 20},
  err: {color: colors.rack, marginBottom: 8},
  card: {
    borderWidth: 1,
    borderColor: colors.rubber,
    backgroundColor: colors.paper,
    padding: 12,
    marginBottom: 8,
  },
  code: {fontSize: 18, fontWeight: '700', color: colors.ink},
  meta: {marginTop: 4, color: colors.inkMuted},
});
