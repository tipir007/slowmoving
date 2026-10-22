import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CodeCamera} from '../components/CodeCamera';
import {useCamera} from '../hooks/useCamera';
import {ScreenShell} from '../components/ScreenShell';
import {getDisposition, verifySm1} from '../services/api';
import {colors} from '../theme';
import type {DispoStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<DispoStackParamList, 'LabelPreview'>;

export function LabelPreviewScreen({navigation, route}: Props) {
  const {hasPermission, ensurePermission} = useCamera();
  const [row, setRow] = useState<Awaited<ReturnType<typeof getDisposition>>>(null);
  const [busy, setBusy] = useState(true);
  const [scan, setScan] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setRow(await getDisposition(route.params.id));
    } finally {
      setBusy(false);
    }
  }, [route.params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCode(raw: string) {
    try {
      const res = await verifySm1(raw, route.params.id);
      if (!res.ok) {
        Alert.alert('Verify gagal', res.error);
        return;
      }
      Alert.alert('Tempel OK', `Tag #${res.disposition.tag_no}`);
      setScan(false);
      load();
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Verify gagal.');
    }
  }

  if (busy || !row) {
    return (
      <ScreenShell title="LABEL SM1" onBack={() => navigation.goBack()}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.rubber} />
          {!busy ? <Text style={styles.muted}>Tag tidak ditemukan.</Text> : null}
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell kicker={`TAG ${row.tag_no}`} title="LABEL SM1" onBack={() => navigation.goBack()}>
    <ScrollView style={styles.page}>
      <View style={[styles.sheet, row.tag_color === 'YELLOW' && styles.yellow]}>
        <View style={styles.head}>
          <Text style={styles.headText}>RAK MERAH</Text>
          <Text style={styles.headText}>TAG {row.tag_no}</Text>
        </View>
        <View style={styles.grid}>
          <QRCode value={row.label_payload || row.tag_no} size={140} />
          <View style={{flex: 1, paddingLeft: 12}}>
            <Text style={styles.code}>{row.compound_code}</Text>
            <Text style={styles.meta}>
              RUN {row.run_no} · SKID {row.skid_no}
            </Text>
            <Text style={styles.action}>{row.action_type}</Text>
            <Text style={styles.meta}>{row.target_area || row.action_rule || '—'}</Text>
          </View>
        </View>
        <Text style={styles.payload}>{row.label_payload}</Text>
      </View>
      {row.verified_at ? <Text style={styles.ok}>Verify tempel sudah tercatat.</Text> : null}
      {scan && hasPermission ? (
        <CodeCamera hint="Scan QR / Code128 label SM1" onCode={onCode} />
      ) : (
        <TouchableOpacity
          style={styles.btn}
          onPress={async () => {
            const ok = await ensurePermission();
            if (ok) setScan(true);
          }}>
          <Text style={styles.btnText}>Scan verify tempel</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ticket},
  sheet: {borderWidth: 2, borderColor: colors.rubber, backgroundColor: '#fff', padding: 12, marginBottom: 16},
  yellow: {backgroundColor: '#f6e27a'},
  head: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12},
  headText: {letterSpacing: 1, fontSize: 12, fontWeight: '700', color: colors.ink},
  grid: {flexDirection: 'row', alignItems: 'center'},
  code: {fontSize: 28, fontWeight: '700', color: colors.ink},
  meta: {marginTop: 4, fontSize: 13, color: colors.ink},
  action: {marginTop: 8, fontWeight: '700', color: colors.ink},
  payload: {marginTop: 12, fontSize: 11, color: colors.inkMuted},
  btn: {backgroundColor: colors.rubber, padding: 14, alignItems: 'center'},
  btnText: {color: colors.ticket, fontWeight: '700'},
  ok: {color: colors.ok, marginBottom: 12},
  muted: {marginTop: 8, color: colors.inkMuted},
});
