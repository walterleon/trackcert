import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { launchCamera, CameraOptions } from 'react-native-image-picker';
import { sendLocations, uploadPhoto } from '../api/client';
import { useTrackingStore } from '../store/useTrackingStore';

// On Samsung + Android 12+/16, PermissionsAndroid.check() can return false even after
// the user grants the permission. We just show the dialog and let the native location
// API decide if the permission is truly available.
async function ensureLocationPermissionRequested(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  } catch {}
}

export function TrackingScreen() {
  const { session, isTracking, currentLocation, offlineQueue, setTracking, setCurrentLocation, addToQueue, clearQueue, logout } =
    useTrackingStore();
  const [uploading, setUploading] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Sync offline queue on mount
  useEffect(() => {
    if (offlineQueue.length > 0 && session) {
      sendLocations(session.driverId, offlineQueue)
        .then(() => clearQueue())
        .catch(() => {});
    }
  }, []);

  const handleLocation = async (coords: { latitude: number; longitude: number; accuracy: number | null }) => {
    if (!session) return;
    const point = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy ?? undefined,
      timestamp: new Date().toISOString(),
    };
    setCurrentLocation(point);
    try {
      await sendLocations(session.driverId, [point]);
    } catch {
      addToQueue(point);
    }
  };

  const toggleTracking = async () => {
    if (isTracking) {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setTracking(false);
      return;
    }

    // Show permission dialog (result is unreliable on Samsung/Android 16, so we ignore it)
    await ensureLocationPermissionRequested();

    // Use forceLocationManager to bypass Google Play Services FusedLocationProviderClient,
    // which silently drops location requests on Samsung dual-app profiles.
    // The native LocationManagerProvider now uses Activity context (patched).
    Geolocation.getCurrentPosition(
      (pos) => handleLocation(pos.coords),
      (err) => console.warn('getCurrentPosition error:', err.code, err.message),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 300000, forceLocationManager: true, forceRequestLocation: true },
    );

    watchIdRef.current = Geolocation.watchPosition(
      (pos) => handleLocation(pos.coords),
      (err) => {
        if (err.code === 1) {
          Alert.alert(
            'Permiso requerido',
            'Necesitás permitir el acceso a la ubicación.\nAndá a Configuración > Aplicaciones > RastreoYa > Permisos > Ubicación.',
          );
        } else if (err.code === 2) {
          Alert.alert('GPS desactivado', 'Activá la ubicación en Configuración > Ubicación.');
        } else {
          Alert.alert('Error GPS', `code=${err.code}\n${err.message}`);
        }
        if (watchIdRef.current !== null) {
          Geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setTracking(false);
      },
      {
        enableHighAccuracy: true,
        forceLocationManager: true,
        forceRequestLocation: true,
        distanceFilter: 0,
        interval: 10000,
        fastestInterval: 5000,
      },
    );
    setTracking(true);
  };

  const handleTakePhoto = async () => {
    if (!session || !currentLocation) {
      Alert.alert('Sin ubicación', 'Esperá a tener señal GPS antes de tomar una foto');
      return;
    }
    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 0.7,
      saveToPhotos: false,
    };
    launchCamera(options, async (response) => {
      if (response.didCancel || response.errorCode || !response.assets?.[0]?.uri) return;
      setUploading(true);
      try {
        await uploadPhoto(
          session.driverId,
          currentLocation.latitude,
          currentLocation.longitude,
          currentLocation.accuracy ?? null,
          response.assets[0].uri
        );
        Alert.alert('✓ Foto enviada', 'La foto fue guardada con tu ubicación actual');
      } catch (err: any) {
        Alert.alert('Error', 'No se pudo enviar la foto. Intentá de nuevo.');
      } finally {
        setUploading(false);
      }
    });
  };

  const handleLogout = () => {
    Alert.alert('Salir', '¿Querés salir de la campaña?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => {
          if (watchIdRef.current !== null) {
            Geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          logout();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.campaignName}>{session?.campaignTitle}</Text>
          <Text style={styles.statusText}>
            {isTracking ? '🟢 Tracking activo' : '⚫ Tracking pausado'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Current location */}
      <View style={styles.locationCard}>
        {currentLocation ? (
          <>
            <Text style={styles.coordText}>
              📍 {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
            </Text>
            {currentLocation.accuracy && (
              <Text style={styles.subText}>Precisión: ±{Math.round(currentLocation.accuracy)}m</Text>
            )}
            {currentLocation.batteryLevel != null && (
              <Text style={styles.subText}>
                Batería: {Math.round(currentLocation.batteryLevel * 100)}%
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.subText}>Obteniendo ubicación GPS...</Text>
        )}
        {offlineQueue.length > 0 && (
          <Text style={styles.queueText}>
            📦 {offlineQueue.length} punto(s) en cola offline
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.trackBtn, isTracking ? styles.trackBtnStop : styles.trackBtnStart]}
          onPress={toggleTracking}
        >
          <Text style={styles.trackBtnText}>
            {isTracking ? '⏹ Pausar tracking' : '▶ Iniciar tracking'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.photoBtn, (uploading || !currentLocation) && styles.btnDisabled]}
          onPress={handleTakePhoto}
          disabled={uploading || !currentLocation}
        >
          <Text style={styles.photoBtnText}>
            {uploading ? 'Enviando foto...' : '📷 Tomar foto de entrega'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712', paddingTop: Platform.OS === 'android' ? 32 : 52 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  campaignName: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  statusText: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  logoutBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  logoutText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  locationCard: {
    margin: 20,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  coordText: { color: '#e5e7eb', fontSize: 14, fontFamily: 'monospace' },
  subText: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  queueText: { color: '#f59e0b', fontSize: 12, marginTop: 8 },
  actions: { paddingHorizontal: 20, gap: 12 },
  trackBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  trackBtnStart: { backgroundColor: '#16a34a' },
  trackBtnStop: { backgroundColor: '#dc2626' },
  trackBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  photoBtn: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  photoBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
