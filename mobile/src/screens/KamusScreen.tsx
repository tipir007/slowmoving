import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {ScreenShell} from '../components/ScreenShell';
import {colors} from '../theme';
import {ACTIONS, LOCATIONS, SOURCE_AREAS, STATUSES, TARGET_AREAS} from '../utils/constants';

export function KamusScreen() {
  return (
    <ScreenShell kicker="PPT SLIDE 2" title="KAMUS LAPANGAN">
      <ScrollView style={styles.scroll}>
        <Text style={styles.muted}>
          Identitas skid resmi: compound + run + skid. Excel lama diimpor sebagai data awal.
        </Text>
        <Text style={styles.h}>STATUS</Text>
        {STATUSES.map(s => (
          <View key={s.id} style={styles.row}>
            <Text style={styles.strong}>{s.label}</Text>
            <Text style={styles.muted}> · {s.zone} · {s.id}</Text>
          </View>
        ))}
        <Text style={styles.h}>TINDAKAN DISPOSISI</Text>
        {ACTIONS.map(a => (
          <View key={a.id} style={styles.block}>
            <Text style={styles.strong}>{a.label}</Text>
            <Text style={styles.muted}>{a.hint}</Text>
          </View>
        ))}
        <Text style={styles.h}>LOKASI</Text>
        {LOCATIONS.map(l => (
          <Text key={l.code} style={styles.muted}>
            {l.name} · {l.zone}
          </Text>
        ))}
        <Text style={styles.h}>ALUR TO-BE (SLIDE 2)</Text>
        <Text style={styles.muted}>1 INPUT — foto tiket, konfirmasi, kg terkunci, Under Review.</Text>
        <Text style={styles.muted}>2 HOLD — Rak Merah, ID compound+run+skid, expiry, gagal trial parkir.</Text>
        <Text style={styles.muted}>3 ACTION — restack/pickle di HP, tanpa print/ttd, antri disposisi.</Text>
        <Text style={styles.muted}>4 PUTUSAN — satu-satunya print. QC/PC/NIK, scan verify. Scrap: SPV.</Text>
        <Text style={styles.muted}>5 EKSEKUSI — scan label, potong kg, sisa hidup. Jangan daftar ulang.</Text>
        <Text style={styles.muted}>6 PAPAN — maju jika stok turun; mundur jika gagal trial/tag OPEN mengendap.</Text>
        <Text style={styles.h}>SUMBER & TUJUAN (SLIDE 2)</Text>
        <Text style={styles.muted}>Sumber leftover: {SOURCE_AREAS.join(', ')}</Text>
        <Text style={styles.muted}>Dipakai ulang / keluar: {TARGET_AREAS.join(', ')}</Text>
        <Text style={styles.muted}>Print hanya langkah 4. Leftover baru ke 1. Gagal trial ke Rak Merah.</Text>
        <Text style={styles.h}>KEPUTUSAN SEMENTARA</Text>
        <Text style={styles.muted}>Input pertama: Mixing / material handler.</Text>
        <Text style={styles.muted}>Scrap & cleaner: Supervisor boleh, PC membuat tag.</Text>
        <Text style={styles.muted}>Fase 1 tidak wajib printer fisik — pratinjau label SM1 di HP cukup.</Text>
        <Text style={styles.h}>BARCODE MIXER TICKET</Text>
        <Text style={styles.muted}>Atas = compound (S6H63, T7131).</Text>
        <Text style={styles.muted}>Samping = run 6 digit + skid 3 digit (785751003 → run 785751, skid 3).</Text>
        <Text style={styles.muted}>Kalau yang discan malah label SM1, form daftar menolak.</Text>
        <Text style={styles.h}>LABEL SM1</Text>
        <Text style={styles.muted}>Payload: SM1|tag|compound|run|skid|disposition_id</Text>
        <Text style={styles.muted}>QR + Code128 + teks. Scan di Pakai / verify menolak Mixer Ticket.</Text>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {flex: 1},
  h: {color: colors.ink, letterSpacing: 1.5, fontSize: 12, marginTop: 16, marginBottom: 6, fontWeight: '700'},
  muted: {color: colors.inkMuted, lineHeight: 20, marginBottom: 4},
  strong: {color: colors.ink, fontWeight: '700'},
  row: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4},
  block: {marginBottom: 8},
});
