import React, {useEffect, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {CodeCamera} from '../components/CodeCamera';
import {useCamera} from '../hooks/useCamera';
import {ScreenShell} from '../components/ScreenShell';
import {recordUse, resolveSm1} from '../services/api';
import {useAuthStore} from '../stores/useAuthStore';
import {colors} from '../theme';
import {TARGET_AREAS} from '../utils/constants';

export function PakaiScreen() {
  const user = useAuthStore(s => s.user);
  const {hasPermission, ensurePermission} = useCamera();
  const [scan, setScan] = useState(true);
  const [skidId, setSkidId] = useState('');
  const [dispId, setDispId] = useState('');
  const [label, setLabel] = useState('');
  const [kg, setKg] = useState('');
  const [area, setArea] = useState(TARGET_AREAS[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensurePermission();
  }, [ensurePermission]);

  async function onCode(raw: string) {
    const res = await resolveSm1(raw);
    if (!res.ok) {
      Alert.alert('Bukan label SM1', res.error);
      return;
    }
    setSkidId(res.disposition.skid_id);
    setDispId(res.disposition.id);
    setLabel(
      `Tag #${res.disposition.tag_no} · ${res.disposition.compound_code} · sisa ${Math.round(Number(res.disposition.qty_sisa))} kg`,
    );
    setScan(false);
  }

  async function save() {
    if (!user || !skidId) {
      Alert.alert('Scan dulu', 'Scan label SM1 sebelum catat kg.');
      return;
    }
    const used = Number(kg);
    if (!used) {
      Alert.alert('Kg', 'Isi kg terpakai.');
      return;
    }
    setBusy(true);
    try {
      const res = await recordUse({
        skidId,
        dispositionId: dispId || undefined,
        machineArea: area,
        kgUsed: used,
        operatorNik: user.nik,
      });
      if (!res.ok) {
        Alert.alert('Gagal', res.error);
        return;
      }
      Alert.alert('Tercatat', 'Pemakaian masuk Supabase.');
      setKg('');
      setSkidId('');
      setDispId('');
      setLabel('');
      setScan(true);
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Simpan gagal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenShell kicker="EKSEKUSI" title="PAKAI SKID">
    <ScrollView style={styles.page}>
      <Text style={styles.muted}>Scan QR/Code128 label SM1. Mixer Ticket ditolak.</Text>
      {hasPermission && scan ? (
        <CodeCamera hint="Arahkan ke label SM1 yang dicetak" onCode={onCode} />
      ) : null}
      {!scan ? (
        <TouchableOpacity style={styles.ghost} onPress={() => setScan(true)}>
          <Text style={styles.ghostText}>Scan ulang</Text>
        </TouchableOpacity>
      ) : null}
      {label ? <Text style={styles.ok}>{label}</Text> : null}
      <Text style={styles.label}>Area mesin</Text>
      <View style={styles.wrap}>
        {TARGET_AREAS.map(a => (
          <TouchableOpacity
            key={a}
            style={[styles.chip, area === a && styles.chipOn]}
            onPress={() => setArea(a)}>
            <Text style={[styles.chipText, area === a && styles.chipTextOn]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>Kg terpakai</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={kg}
        onChangeText={setKg}
        placeholder="10"
        placeholderTextColor="#8a8478"
      />
      <TouchableOpacity style={styles.btn} onPress={save} disabled={busy}>
        <Text style={styles.btnText}>{busy ? 'Menyimpan…' : 'Catat pemakaian'}</Text>
      </TouchableOpacity>
    </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1},
  kicker: {letterSpacing: 2, fontSize: 12, color: colors.inkMuted},
  title: {fontSize: 24, fontWeight: '700', marginBottom: 8, color: colors.ink},
  muted: {color: colors.inkMuted, marginBottom: 12},
  label: {marginTop: 12, marginBottom: 4, fontSize: 12, color: colors.ink},
  input: {borderWidth: 1, borderColor: colors.rubber, backgroundColor: colors.paper, padding: 10, color: colors.ink},
  btn: {backgroundColor: colors.rubber, padding: 14, marginTop: 16, alignItems: 'center'},
  btnText: {color: colors.ticket, fontWeight: '700'},
  ghost: {borderWidth: 1, borderColor: colors.rubber, padding: 10, marginTop: 10, alignItems: 'center'},
  ghostText: {fontWeight: '700', color: colors.ink},
  ok: {marginTop: 12, color: colors.ok, fontWeight: '700'},
  wrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  chip: {borderWidth: 1, borderColor: colors.rubber, paddingHorizontal: 8, paddingVertical: 6},
  chipOn: {backgroundColor: colors.rubber},
  chipText: {fontSize: 12, color: colors.ink},
  chipTextOn: {color: colors.ticket},
});
