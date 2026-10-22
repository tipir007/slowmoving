import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenShell} from '../components/ScreenShell';
import type {StokStackParamList} from '../navigation/types';
import {stampSystem, stampTicket} from '../lib/format';
import {deleteSkid, getSkid, listDispositions, listExecutionsForSkid, listSkidEvents, updateSkidStatus} from '../services/api';
import {useAuthStore} from '../stores/useAuthStore';
import {colors} from '../theme';
import {actionLabel, eventLabel, statusLabel} from '../utils/constants';

type Props = NativeStackScreenProps<StokStackParamList, 'StokDetail'>;

export function StokDetailScreen({navigation, route}: Props) {
  const user = useAuthStore(s => s.user);
  const [skid, setSkid] = useState<Awaited<ReturnType<typeof getSkid>>>(null);
  const [tags, setTags] = useState<Awaited<ReturnType<typeof listDispositions>>>([]);
  const [execs, setExecs] = useState<Awaited<ReturnType<typeof listExecutionsForSkid>>>([]);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof listSkidEvents>>>([]);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, all, ex, ev] = await Promise.all([
        getSkid(route.params.id),
        listDispositions(),
        listExecutionsForSkid(route.params.id),
        listSkidEvents(route.params.id),
      ]);
      setSkid(s);
      setTags(all.filter(d => d.skid_id === route.params.id));
      setExecs(ex);
      setEvents(ev);
    } finally {
      setBusy(false);
    }
  }, [route.params.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function remove() {
    Alert.alert(
      'Hapus dari rak?',
      `${skid?.compound_code} run ${skid?.run_no} skid ${skid?.skid_no}. Tag OPEN ikut dihapus. Skid yang sudah dipakai di mesin tidak bisa dihapus.`,
      [
        {text: 'Batal', style: 'cancel'},
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteSkid(route.params.id);
            if (!res.ok) {
              Alert.alert('Tidak terhapus', res.error);
              return;
            }
            navigation.popToTop();
          },
        },
      ],
    );
  }

  async function setStatus(status: string) {
    try {
      await updateSkidStatus(route.params.id, status, user?.nik);
      load();
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Status tidak berubah.');
    }
  }

  if (busy || !skid) {
    return (
      <ScreenShell title="SKID" onBack={() => navigation.goBack()}>
        <ActivityIndicator color={colors.rubber} />
        {!busy ? <Text style={styles.muted}>Skid tidak ditemukan.</Text> : null}
      </ScreenShell>
    );
  }

  const tabs = navigation.getParent()?.getParent() as {navigate: (a: string, b?: object) => void} | undefined;
  const canRestack = ['UNDER_REVIEW', 'RESTACKING', 'PICKLE_OUT', 'GAGAL_TRIAL'].includes(skid.status);

  return (
    <ScreenShell kicker={skid.ticket_type || 'SKID'} title={skid.compound_code} onBack={() => navigation.goBack()}>
      <ScrollView style={styles.scroll}>
        <View style={styles.row}>
          <Text style={styles.meta}>
            RUN {skid.run_no} · SKID {skid.skid_no}
          </Text>
          <Text style={styles.status}>{statusLabel(skid.status)}</Text>
        </View>
        <View style={styles.tally}>
          <View style={styles.cell}>
            <Text style={styles.n}>{Math.round(Number(skid.qty_sisa || 0))}</Text>
            <Text style={styles.l}>Sisa kg</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.n}>{Math.round(Number(skid.netto || 0))}</Text>
            <Text style={styles.l}>Netto</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.n}>{skid.mixer || '—'}</Text>
            <Text style={styles.l}>Mixer</Text>
          </View>
        </View>
        <Text style={styles.muted}>
          Mix {stampTicket(skid.mix_at)} · Exp {stampTicket(skid.exp_at)}
          {'\n'}Dibuat {stampSystem(skid.created_at)} · Diubah {stampSystem(skid.updated_at)}
          {'\n'}Asal {skid.area_asal || '—'}
          {skid.kondisi ? ` · Kondisi ${skid.kondisi}` : ''}
          {skid.remarks ? `\n${skid.remarks}` : ''}
        </Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.btn}
            onPress={() =>
              tabs?.navigate('Dispo', {
                screen: 'DispoBaru',
                params: {skidId: skid.id},
              })
            }>
            <Text style={styles.btnText}>Disposisi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghost} onPress={() => tabs?.navigate('Pakai')}>
            <Text style={styles.ghostText}>Pakai</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TouchableOpacity style={styles.ghost} onPress={() => navigation.navigate('StokEdit', {id: skid.id})}>
            <Text style={styles.ghostText}>Edit / koreksi</Text>
          </TouchableOpacity>
          {execs.length === 0 && tags.length === 0 && !['CONSUMED', 'SCRAP', 'CLEANER', 'DISPOSED', 'IN_EXECUTION', 'GAGAL_TRIAL'].includes(skid.status) ? (
            <TouchableOpacity style={styles.danger} onPress={remove}>
              <Text style={styles.btnText}>Hapus</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.muted, {flex: 1}]}>Sudah punya kisah — tidak bisa hapus.</Text>
          )}
        </View>
        {canRestack ? (
          <View style={styles.row}>
            <TouchableOpacity style={styles.ghost} onPress={() => setStatus('RESTACKING')}>
              <Text style={styles.ghostText}>Restacking</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghost} onPress={() => setStatus('PICKLE_OUT')}>
              <Text style={styles.ghostText}>Pickle out</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <Text style={styles.h}>TIMELINE</Text>
        {events.length === 0 ? <Text style={styles.muted}>Belum ada jejak (jalankan SQL 004 di Supabase).</Text> : null}
        {events.map(e => (
          <View key={e.id} style={styles.card}>
            <Text style={styles.code}>{eventLabel(e.action)}{e.nik ? ` · ${e.nik}` : ''}</Text>
            <Text style={styles.meta}>{stampSystem(e.at)}</Text>
          </View>
        ))}
        <Text style={styles.h}>TAG DISPOSISI</Text>
        {tags.length === 0 ? <Text style={styles.muted}>Belum ada tag.</Text> : null}
        {tags.map(d => (
          <TouchableOpacity
            key={d.id}
            style={styles.card}
            onPress={() => tabs?.navigate('Dispo', {screen: 'LabelPreview', params: {id: d.id}})}>
            <Text style={styles.code}>
              #{d.tag_no} · {actionLabel(d.action_type)}
            </Text>
            <Text style={styles.meta}>
              {d.status}
              {d.created_at ? ` · ${stampSystem(d.created_at)}` : ''}
              {d.verified_at ? ` · verify ${stampSystem(d.verified_at)}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.h}>EKSEKUSI</Text>
        {execs.length === 0 ? <Text style={styles.muted}>Belum ada potongan kg.</Text> : null}
        {execs.map(e => (
          <View key={e.id} style={styles.card}>
            <Text style={styles.code}>{Math.round(Number(e.kg_used))} kg · {e.machine_area}</Text>
            <Text style={styles.meta}>
              {e.result} · {e.operator_nik} · {stampSystem(e.exec_at)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {flex: 1},
  row: {flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 10},
  meta: {color: colors.inkMuted, flex: 1},
  status: {color: colors.ink, fontWeight: '700'},
  tally: {flexDirection: 'row', marginBottom: 10},
  cell: {flex: 1},
  n: {color: colors.ink, fontSize: 20, fontWeight: '700'},
  l: {color: colors.inkMuted, fontSize: 11},
  muted: {color: colors.inkMuted, marginBottom: 12, lineHeight: 20},
  btn: {flex: 1, backgroundColor: colors.rubber, padding: 12, alignItems: 'center'},
  btnText: {color: colors.ticket, fontWeight: '700'},
  ghost: {flex: 1, borderWidth: 1, borderColor: colors.rubber, padding: 12, alignItems: 'center'},
  ghostText: {color: colors.ink, fontWeight: '700'},
  danger: {flex: 1, backgroundColor: colors.rack, padding: 12, alignItems: 'center'},
  h: {color: colors.inkMuted, letterSpacing: 1.5, fontSize: 12, marginTop: 8, marginBottom: 6},
  card: {borderWidth: 1, borderColor: colors.rubber, backgroundColor: colors.paper, padding: 10, marginBottom: 8},
  code: {color: colors.ink, fontWeight: '700'},
});
