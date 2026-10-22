import React, {useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useAuthStore} from '../stores/useAuthStore';
import {colors} from '../theme';

export function LoginScreen() {
  const login = useAuthStore(s => s.login);
  const [nik, setNik] = useState('MIX001');
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      await login(nik, pin);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login gagal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.top}>
        <Text style={styles.brand}>RAK MERAH</Text>
        <Text style={styles.sub}>COMPOUND SLOW MOVING</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.kicker}>SHIFT MASUK</Text>
        <Text style={styles.title}>LOGIN NIK</Text>
        <Text style={styles.muted}>Bukan Google. Demo MIX001 / PIN 1234. Data = Supabase yang sama dengan web.</Text>
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <Text style={styles.label}>NIK</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="characters"
          value={nik}
          onChangeText={setNik}
        />
        <Text style={styles.label}>PIN</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          keyboardType="number-pad"
          value={pin}
          onChangeText={setPin}
        />
        <TouchableOpacity style={styles.btn} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#efe6d4" /> : <Text style={styles.btnText}>Masuk</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: colors.ticket},
  top: {backgroundColor: colors.rubber, padding: 20, paddingTop: 48},
  brand: {color: colors.ticket, fontSize: 22, letterSpacing: 3, fontWeight: '700'},
  sub: {color: colors.ticket2, marginTop: 4, fontSize: 12, letterSpacing: 1},
  body: {padding: 20},
  kicker: {letterSpacing: 2, fontSize: 12, color: colors.inkMuted},
  title: {fontSize: 28, fontWeight: '700', marginVertical: 8, color: colors.ink},
  muted: {color: colors.inkMuted, marginBottom: 16, lineHeight: 20},
  label: {fontSize: 12, marginBottom: 4, marginTop: 8, color: colors.ink},
  input: {
    borderWidth: 1,
    borderColor: colors.rubber,
    backgroundColor: colors.paper,
    color: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  btn: {backgroundColor: colors.rubber, padding: 14, marginTop: 20, alignItems: 'center'},
  btnText: {color: colors.ticket, fontWeight: '700', letterSpacing: 1},
  err: {color: colors.rack, marginBottom: 8},
});
