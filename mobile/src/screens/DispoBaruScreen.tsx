import React, {useCallback, useEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenShell} from '../components/ScreenShell';
import type {DispoStackParamList} from '../navigation/types';
import {createDisposition, listSkids} from '../services/api';
import {useAuthStore} from '../stores/useAuthStore';
import {colors} from '../theme';
import {ACTIONS, LIVE_STATUSES, TARGET_AREAS} from '../utils/constants';

type Props = NativeStackScreenProps<DispoStackParamList, 'DispoBaru'>;

export function DispoBaruScreen({navigation, route}: Props) {
  const user = useAuthStore(s => s.user);
  const [skids, setSkids] = useState<Awaited<ReturnType<typeof listSkids>>>([]);
  const [skidId, setSkidId] = useState(route.params?.skidId || '');
  const [actionType, setActionType] = useState('USE_AS_IS');
  const [targetArea, setTargetArea] = useState(TARGET_AREAS[0]);
  const [actionRule, setActionRule] = useState('');
  const [tagColor, setTagColor] = useState('WHITE');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const rows = await listSkids();
    setSkids(rows.filter(s => LIVE_STATUSES.includes(s.status as (typeof LIVE_STATUSES)[number])));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!user) return;
    if (!skidId) {
      Alert.alert('Skid', 'Pilih material dulu.');
      return;
    }
    setBusy(true);
    try {
      const res = await createDisposition({
        skidId,
        actionType,
        actionRule,
        targetArea,
        tagColor,
        originator: user.name,
        originatorNik: user.nik,
      });
      if (!res.ok) {
        Alert.alert('Gagal', res.error);
        return;
      }
      navigation.replace('LabelPreview', {id: res.id});
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Tag tidak terbit.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenShell kicker="GANTI KERTAS TAG" title="TAG BARU" onBack={() => navigation.goBack()}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.label}>1. Material apa?</Text>
        {skids.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[styles.card, skidId === s.id && styles.cardOn]}
            onPress={() => setSkidId(s.id)}>
            <Text style={styles.code}>
              {s.compound_code} · RUN {s.run_no} · SKID {s.skid_no}
            </Text>
            <Text style={styles.muted}>
              {Math.round(Number(s.qty_sisa))} kg · {s.status}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.label}>4. Mau diapakan?</Text>
        <View style={styles.wrap}>
          {ACTIONS.map(a => (
            <TouchableOpacity
              key={a.id}
              style={[styles.chip, actionType === a.id && styles.chipOn]}
              onPress={() => setActionType(a.id)}>
              <Text style={[styles.chipText, actionType === a.id && styles.chipTextOn]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>5. Ke mana?</Text>
        <View style={styles.wrap}>
          {TARGET_AREAS.map(a => (
            <TouchableOpacity
              key={a}
              style={[styles.chip, targetArea === a && styles.chipOn]}
              onPress={() => setTargetArea(a)}>
              <Text style={[styles.chipText, targetArea === a && styles.chipTextOn]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>6. Aturan pakai</Text>
        <TextInput
          style={styles.input}
          value={actionRule}
          onChangeText={setActionRule}
          placeholder="Blend 50% / max 10 kg per batch"
          placeholderTextColor="#8a8478"
        />
        <Text style={styles.label}>Warna tag</Text>
        <View style={styles.wrap}>
          {[
            {id: 'WHITE', label: 'Putih'},
            {id: 'YELLOW', label: 'Kuning'},
          ].map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, tagColor === c.id && styles.chipOn]}
              onPress={() => setTagColor(c.id)}>
              <Text style={[styles.chipText, tagColor === c.id && styles.chipTextOn]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.muted}>Originator: {user?.name}. Nomor tag otomatis.</Text>
        <TouchableOpacity style={styles.btn} onPress={save} disabled={busy}>
          <Text style={styles.btnText}>{busy ? 'Menerbitkan…' : 'Terbitkan tag'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {flex: 1},
  label: {marginTop: 12, marginBottom: 6, color: colors.ink, fontWeight: '700'},
  card: {borderWidth: 1, borderColor: colors.rubber, backgroundColor: colors.paper, padding: 10, marginBottom: 6},
  cardOn: {backgroundColor: colors.ticket2, borderWidth: 2},
  code: {color: colors.ink, fontWeight: '700'},
  muted: {color: colors.inkMuted, marginTop: 4, marginBottom: 8},
  wrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  chip: {borderWidth: 1, borderColor: colors.rubber, paddingHorizontal: 8, paddingVertical: 6},
  chipOn: {backgroundColor: colors.rubber},
  chipText: {color: colors.ink, fontSize: 12},
  chipTextOn: {color: colors.ticket},
  input: {borderWidth: 1, borderColor: colors.rubber, backgroundColor: colors.paper, padding: 10, color: colors.ink},
  btn: {backgroundColor: colors.rubber, padding: 14, alignItems: 'center', marginVertical: 16},
  btnText: {color: colors.ticket, fontWeight: '700'},
});
