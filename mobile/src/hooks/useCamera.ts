import {useCallback} from 'react';
import {Alert, PermissionsAndroid, Platform} from 'react-native';
import {useCameraDevice, useCameraPermission} from 'react-native-vision-camera';

export function useCamera() {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');

  const ensurePermission = useCallback(async () => {
    if (hasPermission) return true;
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Izin kamera', 'Kamera dipakai untuk scan tiket dan label SM1.');
        return false;
      }
    }
    const ok = await requestPermission();
    if (!ok) Alert.alert('Izin kamera', 'Kamera dipakai untuk scan tiket dan label SM1.');
    return ok;
  }, [hasPermission, requestPermission]);

  return {device, hasPermission, ensurePermission};
}
