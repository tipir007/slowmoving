import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {joinDateTime, splitDateTime} from '../ml/ticketParser';
import {getSkid, listExecutionsForSkid, updateSkid} from '../services/api';
import {useAuthStore} from '../stores/useAuthStore';
import {colors} from '../theme';
import {CONDITIONS, SOURCE_AREAS} from '../utils/constants';

type Props = NativeStackScreenProps<StokStackParamList, 'StokEdit'>;

export function StokEditScreen({navigation, route}: Props) {
  const user = useAuthStore(s => s.user);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kgLocked, setKgLocked] = useState(false);
  const [compound, setCompound] = useState('');
  const [runNo, setRunNo] = useState('');
  const [skidNo, setSkidNo] = useState('');
  const [mixer, setMixer] = useState('');
  const [mixDate, setMixDate] = useState('');
  const [mixTime, setMixTime] = useState('');
  const [expDate, setExpDate] = useState('');
  const [expTime, setExpTime] = useState('');
  const [netto, setNetto] = useState('');
  const [rack, setRack] = useState('');
  const [areaAsal, setAreaAsal] = useState('');
  const [kondisi, setKondisi] = useState('');
  const [remarks, setRemarks] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, execs] = await Promise.all([
        getSkid(route.params.id),
        listExecutionsForSkid(route.params.id),
      ]);
      if (!s) return;
      setCompound(s.compound_code || '');
      setRunNo(s.run_no || '');
      setSkidNo(String(s.skid_no || ''));
      setMixer(s.mixer || '');
      const mix = splitDateTime(s.mix_at);
      const exp = splitDateTime(s.exp_at);
      setMixDate(mix.date);
      setMixTime(mix.time);
      setExpDate(exp.date);
      setExpTime(exp.time);
      setNetto(String(s.netto ?? ''));
      setRack(s.rack || '');
      setAreaAsal(s.area_asal || '');
      setKondisi(s.kondisi || '');
      setRemarks(s.remarks || '');
      setKgLocked(execs.length > 0);
    } finally {
      setBusy(false);
    }
  }, [route.params.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function save() {
    setSaving(true);
    try {
      const res = await updateSkid(route.params.id, {
        compoundCode: compound,
        runNo,
        skidNo,
        mixer,
        mixAt: joinDateTime(mixDate, mixTime) || null,
        expAt: joinDateTime(expDate, expTime) || null,
        netto: kgLocked ? undefined : Number(netto),
        areaAsal,
        kondisi,
        remarks,
        rack,
        actorNik: user?.nik,
      });
      if (!res.ok) {
        Alert.alert('Tidak tersimpan', res.error);
        return;
      }
      Alert.alert(
        'Tersimpan',
        res.reprint ? 'ID berubah. Print ulang label SM1 jika tag sudah tempel.' : 'Koreksi masuk database.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Edit gagal.');
    } finally {
      setSaving(false);
    }
  }

  if (busy) {
    return (
      <ScreenShell title="EDIT SKID" onBack={() => navigation.goBack()}>
        <ActivityIndicator color={colors.rubber} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell kicker="KOREKSI DATA" title="EDIT SKID" onBack={() => navigation.goBack()}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.muted}>
          {kgLocked
            ? 'Kg terkunci karena sudah ada potongan di mesin. ID dan catatan masih bisa dikoreksi.'
            : 'Salah ketik compound / run / skid / kg boleh dikoreksi selama belum dipakai.'}
        </Text>
        <Text style={styles.label}>Compound</Text>
        <TextInput style={styles.input} autoCapitalize="characters" value={compound} onChangeText={setCompound} />
        <Text style={styles.label}>Run</Text>
        <TextInput style={styles.input} value={runNo} onChangeText={setRunNo} />
        <Text style={styles.label}>Skid</Text>
        <TextInput style={styles.input} value={skidNo} onChangeText={setSkidNo} />
        <Text style={styles.label}>Mixer</Text>
        <TextInput style={styles.input} value={mixer} onChangeText={setMixer} />
        <Text style={styles.label}>Mix tanggal (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={mixDate} onChangeText={setMixDate} placeholder="2026-09-19" placeholderTextColor="#8a8478" />
        <Text style={styles.label}>Mix jam (HH:MM, boleh kosong)</Text>
        <TextInput style={styles.input} value={mixTime} onChangeText={setMixTime} placeholder="07:26" placeholderTextColor="#8a8478" />
        <Text style={styles.label}>Exp tanggal (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={expDate} onChangeText={setExpDate} placeholder="2026-10-10" placeholderTextColor="#8a8478" />
        <Text style={styles.label}>Exp jam (HH:MM, boleh kosong)</Text>
        <TextInput style={styles.input} value={expTime} onChangeText={setExpTime} placeholder="07:26" placeholderTextColor="#8a8478" />
        <Text style={styles.label}>Netto kg {kgLocked ? '(terkunci)' : ''}</Text>
        <TextInput
          style={[styles.input, kgLocked && styles.locked]}
          keyboardType="decimal-pad"
          value={netto}
          editable={!kgLocked}
          onChangeText={setNetto}
        />
        <Text style={styles.label}>Rak / posisi</Text>
        <TextInput style={styles.input} value={rack} onChangeText={setRack} />
        <Text style={styles.label}>Sumber mesin</Text>
        <View style={styles.wrap}>
          {SOURCE_AREAS.map(a => (
            <TouchableOpacity
              key={a}
              style={[styles.chip, areaAsal === a && styles.chipOn]}
              onPress={() => setAreaAsal(areaAsal === a ? '' : a)}>
              <Text style={[styles.chipText, areaAsal === a && styles.chipTextOn]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Kondisi</Text>
        <View style={styles.wrap}>
          {CONDITIONS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, kondisi === c && styles.chipOn]}
              onPress={() => setKondisi(kondisi === c ? '' : c)}>
              <Text style={[styles.chipText, kondisi === c && styles.chipTextOn]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Catatan</Text>
        <TextInput
          style={[styles.input, styles.area]}
          multiline
          value={remarks}
          onChangeText={setRemarks}
        />
        <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Menyimpan…' : 'Simpan koreksi'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {flex: 1},
  muted: {color: colors.inkMuted, marginBottom: 12, lineHeight: 20},
  label: {color: colors.ink, fontSize: 12, marginBottom: 4, marginTop: 8},
  input: {borderWidth: 1, borderColor: colors.rubber, backgroundColor: colors.paper, padding: 10, color: colors.ink},
  locked: {opacity: 0.55},
  area: {minHeight: 72, textAlignVertical: 'top'},
  wrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4},
  chip: {borderWidth: 1, borderColor: colors.rubber, paddingHorizontal: 8, paddingVertical: 6},
  chipOn: {backgroundColor: colors.rubber},
  chipText: {color: colors.ink, fontSize: 12},
  chipTextOn: {color: colors.ticket},
  btn: {backgroundColor: colors.rubber, padding: 14, alignItems: 'center', marginVertical: 16},
  btnText: {color: colors.ticket, fontWeight: '700'},
});
