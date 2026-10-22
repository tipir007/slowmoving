import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {fuseTicket} from '../ml/fusion';
import {joinDateTime, splitDateTime} from '../ml/ticketParser';
import {createSkid, uploadTicketPhoto} from '../services/api';
import {ScreenShell} from '../components/ScreenShell';
import {useAuthStore} from '../stores/useAuthStore';
import {useScanStore} from '../stores/useScanStore';
import {colors} from '../theme';
import {SOURCE_AREAS} from '../utils/constants';
import type {ScanStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<ScanStackParamList, 'Confirm'>;
type FieldKey =
  | 'compound'
  | 'runNo'
  | 'skidNo'
  | 'mixer'
  | 'empId'
  | 'expDate'
  | 'expTime'
  | 'mixDate'
  | 'mixTime';

export function ConfirmScreen({navigation}: Props) {
  const user = useAuthStore(s => s.user);
  const hits = useScanStore(s => s.hits);
  const photoUri = useScanStore(s => s.photoUri);
  const ocrText = useScanStore(s => s.ocrText);
  const setOcr = useScanStore(s => s.setOcr);
  const reset = useScanStore(s => s.reset);
  const fusion = useMemo(() => fuseTicket(hits, ocrText), [hits, ocrText]);
  const touched = useRef(new Set<FieldKey>());

  const [compound, setCompound] = useState('');
  const [runNo, setRunNo] = useState('');
  const [skidNo, setSkidNo] = useState('');
  const [mixer, setMixer] = useState('');
  const [empId, setEmpId] = useState('');
  const [expDate, setExpDate] = useState('');
  const [expTime, setExpTime] = useState('');
  const [mixDate, setMixDate] = useState('');
  const [mixTime, setMixTime] = useState('');
  const [netto, setNetto] = useState('');
  const [areaAsal, setAreaAsal] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    touched.current.clear();
  }, [photoUri]);

  useEffect(() => {
    const exp = splitDateTime(fusion.expAt.value);
    const mix = splitDateTime(fusion.mixAt.value);
    const apply = <T,>(key: FieldKey, value: T, setter: (v: T) => void) => {
      if (!touched.current.has(key)) setter(value);
    };
    apply('compound', fusion.compound.value, setCompound);
    apply('runNo', fusion.runNo.value, setRunNo);
    apply('skidNo', fusion.skidNo.value, setSkidNo);
    apply('mixer', fusion.mixer.value, setMixer);
    apply('empId', fusion.empId.value, setEmpId);
    apply('expDate', exp.date, setExpDate);
    apply('expTime', exp.time, setExpTime);
    apply('mixDate', mix.date, setMixDate);
    apply('mixTime', mix.time, setMixTime);
  }, [fusion]);

  function bind(key: FieldKey, setter: (v: string) => void) {
    return (v: string) => {
      touched.current.add(key);
      setter(v);
    };
  }

  async function save() {
    if (!user) return;
    const kg = Number(netto);
    if (!compound || !runNo || !skidNo || !kg) {
      Alert.alert('Wajib', 'Compound, run, skid, dan netto kg harus diisi.');
      return;
    }
    if (!areaAsal) {
      Alert.alert('Wajib', 'Pilih sumber mesin (BB1–BB4, Ext, Cal, Bead).');
      return;
    }
    if (!mixDate && !expDate) {
      Alert.alert('Wajib', 'Tanggal Mix atau Exp harus terisi. Koreksi teks OCR di atas, atau ketik tanggal.');
      return;
    }
    setBusy(true);
    try {
      let photoPath: string | undefined;
      if (photoUri) {
        photoPath = await uploadTicketPhoto(photoUri, user.nik, compound, runNo, skidNo);
      }
      const res = await createSkid({
        compoundCode: compound,
        runNo,
        skidNo,
        netto: kg,
        mixer: mixer || undefined,
        empId: empId || undefined,
        ticketType: fusion.ticketType.value === 'NON_PRODUCTIVE' ? 'NON_PRODUCTIVE' : 'PRODUCTIVE',
        createdBy: user.nik,
        ticketPhotoPath: photoPath,
        rawBarcode: fusion.rawBarcode || undefined,
        rawOcr: fusion.rawOcr || ocrText || undefined,
        documentType: fusion.documentType,
        mixAt: joinDateTime(mixDate, mixTime) || undefined,
        expAt: joinDateTime(expDate, expTime) || undefined,
        areaAsal,
      });
      if (!res.ok) {
        Alert.alert('Tidak disimpan', res.error);
        return;
      }
      reset();
      Alert.alert('Tersimpan', 'Skid masuk Supabase. Cek tab Stok atau web Stok.', [
        {text: 'OK', onPress: () => navigation.popToTop()},
      ]);
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Simpan gagal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenShell kicker="KONFIRMASI OPERATOR" title="CEK LALU SIMPAN" onBack={() => navigation.goBack()}>
      <ScrollView style={styles.page}>
        <Text style={styles.label}>Teks OCR (boleh dikoreksi)</Text>
        <TextInput
          style={[styles.input, styles.area]}
          multiline
          value={ocrText}
          onChangeText={setOcr}
          placeholder="Run 791280 Skid 1 Exp 2026-09-24 08:10 Mixer 1 Emp AA398822"
          placeholderTextColor="#8a8478"
        />
        <Text style={styles.muted}>
          {fusion.note} Koreksi teks di atas — kotak di bawah terisi otomatis. Tanggal wajib; jam boleh kosong.
        </Text>
        {fusion.rawBarcode ? <Text style={styles.meta}>Barcode: {fusion.rawBarcode}</Text> : null}
        {photoUri ? <Image source={{uri: photoUri}} style={styles.photo} /> : null}
        <Field label="Compound" value={compound} onChange={bind('compound', setCompound)} hint={fusion.compound.source} />
        <Field label="Run" value={runNo} onChange={bind('runNo', setRunNo)} hint={fusion.runNo.source} />
        <Field label="Skid" value={skidNo} onChange={bind('skidNo', setSkidNo)} hint={fusion.skidNo.source} />
        <Field label="Mixer" value={mixer} onChange={bind('mixer', setMixer)} />
        <Field label="Emp" value={empId} onChange={bind('empId', setEmpId)} />
        <Field label="Exp tanggal (YYYY-MM-DD)" value={expDate} onChange={bind('expDate', setExpDate)} />
        <Field label="Exp jam (HH:MM, boleh kosong)" value={expTime} onChange={bind('expTime', setExpTime)} />
        <Field label="Mix tanggal (YYYY-MM-DD)" value={mixDate} onChange={bind('mixDate', setMixDate)} />
        <Field label="Mix jam (HH:MM, boleh kosong)" value={mixTime} onChange={bind('mixTime', setMixTime)} />
        <Field label="Netto kg" value={netto} onChange={setNetto} keyboard="decimal-pad" />
        <Text style={styles.label}>Sumber mesin</Text>
        <View style={styles.wrap}>
          {SOURCE_AREAS.map(a => (
            <TouchableOpacity
              key={a}
              style={[styles.chip, areaAsal === a && styles.chipOn]}
              onPress={() => setAreaAsal(a)}>
              <Text style={[styles.chipText, areaAsal === a && styles.chipTextOn]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.btn} onPress={save} disabled={busy}>
          {busy ? <ActivityIndicator color="#efe6d4" /> : <Text style={styles.btnText}>Simpan ke rak merah</Text>}
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: 'decimal-pad';
  hint?: string;
}) {
  return (
    <View style={{marginBottom: 10}}>
      <Text style={styles.label}>
        {label}
        {hint && hint !== 'empty' ? ` · ${hint}` : ''}
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        autoCapitalize="characters"
        placeholderTextColor="#8a8478"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1},
  muted: {color: colors.inkMuted, marginBottom: 12, marginTop: 8, lineHeight: 20},
  meta: {color: colors.ink, fontSize: 12, marginBottom: 8},
  photo: {width: '100%', height: 140, marginBottom: 12, backgroundColor: '#111'},
  label: {fontSize: 12, marginBottom: 4, color: colors.ink},
  input: {borderWidth: 1, borderColor: colors.rubber, backgroundColor: colors.paper, padding: 10, color: colors.ink},
  area: {minHeight: 140, textAlignVertical: 'top'},
  wrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8},
  chip: {borderWidth: 1, borderColor: colors.rubber, paddingHorizontal: 8, paddingVertical: 6},
  chipOn: {backgroundColor: colors.rubber},
  chipText: {color: colors.ink, fontSize: 12},
  chipTextOn: {color: colors.ticket},
  btn: {backgroundColor: colors.rubber, padding: 14, marginVertical: 16, alignItems: 'center'},
  btnText: {color: colors.ticket, fontWeight: '700'},
});
