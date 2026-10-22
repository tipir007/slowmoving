import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CodeCamera} from '../components/CodeCamera';
import {PhotoCamera} from '../components/PhotoCamera';
import {useCamera} from '../hooks/useCamera';
import {decodeBarcode, mergeTicketBarcodes, ticketIdReady} from '../ml/barcode';
import {readTicketImage} from '../ml/readTicket';
import {useScanStore} from '../stores/useScanStore';
import {ScreenShell} from '../components/ScreenShell';
import {colors} from '../theme';
import type {ScanStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<ScanStackParamList, 'ScanHome'>;

export function ScanTicketScreen({navigation}: Props) {
  const {hasPermission, ensurePermission} = useCamera();
  const [mode, setMode] = useState<'barcode' | 'photo' | 'gallery'>('photo');
  const [typed, setTyped] = useState('');
  const hits = useScanStore(s => s.hits);
  const photoUri = useScanStore(s => s.photoUri);
  const reading = useScanStore(s => s.reading);
  const addHit = useScanStore(s => s.addHit);
  const setHits = useScanStore(s => s.setHits);
  const setOcr = useScanStore(s => s.setOcr);
  const setReading = useScanStore(s => s.setReading);
  const beginImage = useScanStore(s => s.beginImage);
  const reset = useScanStore(s => s.reset);

  useEffect(() => {
    if (mode === 'barcode' || mode === 'photo') ensurePermission();
  }, [mode, ensurePermission]);

  function applyCode(raw: string) {
    const decoded = decodeBarcode(raw);
    if (decoded.kind === 'sm1') {
      Alert.alert('Label SM1', 'Ini tag disposisi, bukan Mixer Ticket. Pakai tab Dispo / Pakai.');
      return;
    }
    if (decoded.kind === 'unknown') {
      Alert.alert('Tidak dikenali', decoded.message || raw);
      return;
    }
    addHit(decoded);
  }

  const merged = mergeTicketBarcodes(hits);

  async function processUri(uri: string) {
    beginImage(uri);
    try {
      const res = await readTicketImage(uri);
      const usable = res.barcodes.filter(b => b.kind !== 'unknown' && b.kind !== 'sm1');
      setHits(usable);
      setOcr(res.text);
      if (res.barcodes.some(b => b.kind === 'sm1')) {
        Alert.alert('Label SM1', 'Foto ini label disposisi, bukan Mixer Ticket.');
      }
    } catch (e) {
      Alert.alert('Baca gagal', e instanceof Error ? e.message : 'Gambar tidak terbaca.');
    } finally {
      setReading(false);
    }
  }

  async function pickGallery() {
    const res = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });
    const uri = res.assets?.[0]?.uri;
    if (uri) await processUri(uri);
  }

  function galleryBlock() {
    return (
      <>
        <Text style={styles.muted}>Ambil dari galeri / file. Foto lama dihapus dari bacaan sebelumnya.</Text>
        <TouchableOpacity style={styles.btn} onPress={pickGallery} disabled={reading}>
          <Text style={styles.btnText}>{reading ? 'Membaca…' : 'Pilih dari galeri'}</Text>
        </TouchableOpacity>
        {photoUri ? <Text style={styles.ok}>Foto siap. Cek hasil di konfirmasi.</Text> : null}
      </>
    );
  }

  return (
    <ScreenShell kicker="INPUT TIKET" title="DAFTAR SKID">
      <ScrollView style={styles.page}>
        <View style={styles.tabs}>
          {(['photo', 'gallery', 'barcode'] as const).map(id => (
            <TouchableOpacity
              key={id}
              style={[styles.tab, mode === id && styles.tabOn]}
              onPress={() => setMode(id)}>
              <Text style={[styles.tabText, mode === id && styles.tabTextOn]}>
                {id === 'photo' ? 'Foto' : id === 'gallery' ? 'Galeri' : 'Live'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {reading ? <ActivityIndicator color={colors.rubber} /> : null}

        {mode === 'barcode' ? (
          hasPermission ? (
            <>
              <CodeCamera hint="Atas = compound. Samping = 9 digit run+skid (791280001)." onCode={applyCode} />
              <Text style={styles.label}>Tempel / ketik kode</Text>
              <TextInput
                style={styles.input}
                value={typed}
                autoCapitalize="characters"
                onChangeText={setTyped}
                placeholder="F7894 atau 791280001"
                placeholderTextColor="#8a8478"
              />
              <TouchableOpacity style={styles.ghost} onPress={() => typed.trim() && applyCode(typed)}>
                <Text style={styles.ghostText}>Pakai kode</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.muted}>Live scan butuh kamera. Galeri tetap bisa tanpa kamera.</Text>
              <TouchableOpacity style={styles.btn} onPress={ensurePermission}>
                <Text style={styles.btnText}>Minta izin kamera</Text>
              </TouchableOpacity>
            </View>
          )
        ) : null}

        {mode === 'photo' ? (
          hasPermission ? (
            <>
              <PhotoCamera onCapture={processUri} />
              <Text style={styles.muted}>Satu foto seluruh tiket, termasuk barcode atas dan samping.</Text>
            </>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.muted}>Rana kamera butuh izin. Pakai tab Galeri untuk file di HP.</Text>
              <TouchableOpacity style={styles.btn} onPress={ensurePermission}>
                <Text style={styles.btnText}>Minta izin kamera</Text>
              </TouchableOpacity>
            </View>
          )
        ) : null}

        {mode === 'gallery' ? galleryBlock() : null}

        <Text style={styles.meta}>
          Compound {merged.compound || '—'} · Run {merged.runNo || '—'} · Skid {merged.skidNo || '—'}
          {photoUri ? ' · ada foto' : ''}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Confirm')} disabled={reading}>
          <Text style={styles.btnText}>Lanjut konfirmasi</Text>
        </TouchableOpacity>
        {ticketIdReady(merged) ? null : (
          <Text style={styles.muted}>Foto tiket, pilih galeri, atau scan dua barcode. Kg tetap diketik.</Text>
        )}
        <TouchableOpacity onPress={reset}>
          <Text style={styles.link}>Reset bacaan</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1},
  centered: {padding: 12, alignItems: 'center'},
  tabs: {flexDirection: 'row', marginBottom: 12, gap: 8},
  tab: {flex: 1, borderWidth: 1, borderColor: colors.rubber, padding: 10, alignItems: 'center'},
  tabOn: {backgroundColor: colors.rubber},
  tabText: {fontWeight: '700', color: colors.ink, fontSize: 12},
  tabTextOn: {color: colors.ticket},
  label: {marginTop: 12, marginBottom: 4, fontSize: 12, color: colors.ink},
  input: {borderWidth: 1, borderColor: colors.rubber, backgroundColor: colors.paper, padding: 10, color: colors.ink},
  btn: {backgroundColor: colors.rubber, padding: 14, marginTop: 16, alignItems: 'center'},
  btnText: {color: colors.ticket, fontWeight: '700'},
  ghost: {borderWidth: 1, borderColor: colors.rubber, padding: 12, marginTop: 10, alignItems: 'center'},
  ghostText: {fontWeight: '700', color: colors.ink},
  meta: {marginTop: 14, fontFamily: Platform.select({android: 'monospace', ios: 'Menlo'}), fontSize: 13, color: colors.ink},
  muted: {color: colors.inkMuted, marginTop: 8, lineHeight: 20},
  ok: {color: colors.ok, marginTop: 8},
  link: {textAlign: 'center', marginTop: 16, color: colors.rack},
});
