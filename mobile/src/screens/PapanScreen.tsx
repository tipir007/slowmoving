import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {ScreenShell} from '../components/ScreenShell';
import {buildBoard, jakartaToday} from '../lib/board';
import {getYesterdaySnapshot, listDispositions, listSkids, saveTodaySnapshot} from '../services/api';
import {colors} from '../theme';

const LAMP: Record<string, string> = {
  green: colors.ok,
  yellow: colors.sulfur,
  red: colors.rack,
  grey: colors.inkMuted,
};

export function PapanScreen() {
  const navigation = useNavigation<any>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [board, setBoard] = useState<ReturnType<typeof buildBoard> | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [skids, dispositions, yesterday] = await Promise.all([
        listSkids(),
        listDispositions(),
        getYesterdaySnapshot(),
      ]);
      setBoard(buildBoard({skids, dispositions, yesterday, today: jakartaToday()}));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal muat papan.');
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function snap() {
    try {
      await saveTodaySnapshot();
      Alert.alert('Tersimpan', 'Snapshot hari ini tercatat.');
      load();
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Snapshot gagal.');
    }
  }

  return (
    <ScreenShell kicker="DASHBOARD" title="PAPAN LAPANGAN">
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={busy && !!board} onRefresh={load} />}>
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {busy && !board ? <ActivityIndicator color={colors.rubber} /> : null}
        {board ? (
          <>
            <View style={styles.verdict}>
              <Text style={styles.verdictText}>{board.verdict}</Text>
              <Text style={styles.muted}>{board.sentence}</Text>
            </View>
            {board.signals.map(s => (
              <View key={s.id} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.h}>{s.title}</Text>
                  <View style={[styles.dot, {backgroundColor: LAMP[s.lamp]}]} />
                </View>
                <Text style={styles.value}>{s.value}</Text>
                <Text style={styles.muted}>{s.hint}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.btn} onPress={snap}>
              <Text style={styles.btnText}>Simpan snapshot hari ini</Text>
            </TouchableOpacity>
            <Text style={styles.sec}>KERJA HARI INI</Text>
            {board.work.length === 0 ? <Text style={styles.muted}>Tidak ada antrian mendesak.</Text> : null}
            {board.work.map((w, i) => (
              <TouchableOpacity
                key={`${w.skidId}-${i}`}
                style={styles.card}
                onPress={() => navigation.navigate('Stok', {screen: 'StokDetail', params: {id: w.skidId}})}>
                <Text style={styles.value}>{w.title}</Text>
                <Text style={styles.muted}>{w.why}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {flex: 1},
  verdict: {borderWidth: 2, borderColor: colors.rubber, backgroundColor: colors.paper, padding: 12, marginBottom: 10},
  verdictText: {color: colors.ink, fontSize: 28, fontWeight: '700'},
  muted: {color: colors.inkMuted, marginTop: 4, lineHeight: 20},
  err: {color: colors.rack, marginBottom: 8},
  card: {borderWidth: 1, borderColor: colors.rubber, backgroundColor: colors.paper, padding: 12, marginBottom: 8},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  h: {color: colors.inkMuted, fontSize: 12, letterSpacing: 0.5},
  value: {color: colors.ink, fontSize: 18, fontWeight: '700', marginTop: 4},
  dot: {width: 12, height: 12, borderRadius: 6},
  btn: {backgroundColor: colors.rubber, padding: 14, alignItems: 'center', marginVertical: 8},
  btnText: {color: colors.ticket, fontWeight: '700'},
  sec: {color: colors.inkMuted, letterSpacing: 1.5, fontSize: 12, marginTop: 8, marginBottom: 6},
});
