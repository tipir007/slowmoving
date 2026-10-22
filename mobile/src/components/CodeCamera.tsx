import React, {useRef} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Camera, useCameraDevice, useCodeScanner} from 'react-native-vision-camera';

type Props = {
  onCode: (value: string) => void;
  hint?: string;
};

export function CodeCamera({onCode, hint}: Props) {
  const last = useRef('');
  const device = useCameraDevice('back');
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'code-128', 'code-39', 'code-93', 'ean-13', 'codabar'],
    onCodeScanned: codes => {
      for (const code of codes) {
        const value = code.value?.trim();
        if (!value || value === last.current) continue;
        last.current = value;
        onCode(value);
      }
    },
  });

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>Kamera belakang tidak ada.</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        codeScanner={codeScanner}
      />
      <View style={styles.banner}>
        <Text style={styles.bannerText}>{hint || 'Arahkan ke barcode / QR'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {height: 280, backgroundColor: '#111', overflow: 'hidden'},
  centered: {height: 180, alignItems: 'center', justifyContent: 'center'},
  err: {color: '#fff'},
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26,23,20,0.75)',
    padding: 8,
  },
  bannerText: {color: '#efe6d4', textAlign: 'center', fontSize: 13},
});
