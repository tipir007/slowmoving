import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuthStore} from '../stores/useAuthStore';
import {colors} from '../theme';

export function ScreenShell({
  kicker,
  title,
  onBack,
  children,
}: {
  kicker?: string;
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.top}>
        <View>
          <Text style={styles.brand}>RAK MERAH</Text>
          <Text style={styles.sub}>
            {user?.nik} · {user?.role}
          </Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.out}>Keluar</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>‹ Kembali</Text>
          </TouchableOpacity>
        ) : null}
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.rubber},
  top: {
    backgroundColor: colors.rubber,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {color: colors.ticket, fontSize: 16, letterSpacing: 2, fontWeight: '700'},
  sub: {color: colors.ticket2, fontSize: 12, marginTop: 2},
  out: {color: colors.ticket, fontWeight: '700'},
  body: {flex: 1, backgroundColor: colors.ticket, paddingHorizontal: 16, paddingTop: 12},
  kicker: {color: colors.inkMuted, letterSpacing: 2, fontSize: 11},
  title: {color: colors.ink, fontSize: 26, fontWeight: '700', marginBottom: 8},
  back: {marginBottom: 4},
  backText: {color: colors.rack, fontWeight: '700'},
});
