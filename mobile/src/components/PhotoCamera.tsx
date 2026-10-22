import React, {useRef} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';

type Props = {
  onCapture: (uri: string) => void;
};

export function PhotoCamera({onCapture}: Props) {
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');

  async function capture() {
    if (!camera.current) return;
    const photo = await camera.current.takePhoto();
    onCapture(`file://${photo.path}`);
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>Kamera belakang tidak ada.</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Camera ref={camera} style={StyleSheet.absoluteFill} device={device} isActive photo />
      <TouchableOpacity style={styles.shutter} onPress={capture}>
        <View style={styles.inner} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {height: 320, backgroundColor: '#111', overflow: 'hidden'},
  centered: {height: 180, alignItems: 'center', justifyContent: 'center'},
  err: {color: '#fff'},
  shutter: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff'},
});
