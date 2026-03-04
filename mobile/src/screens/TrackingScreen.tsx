import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import BackgroundGeolocation, {
  Location,
} from 'react-native-background-geolocation';
import { launchCamera, CameraOptions } from 'react-native-image-picker';
import { sendLocations, uploadPhoto } from '../api/client';
import { useTrackingStore } from '../store/useTrackingStore';

export function TrackingScreen() {
  const { session, isTracking, currentLocation, offlineQueue, setTracking, setCurrentLocation, addToQueue, clearQueue, logout } =
    useTrackingStore();
  const [uploading, setUploading] = useState(false);

  // Configure background geolocation on mount
  useEffect(() => {
    BackgroundGeolocation.ready({
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 20, // meters
      stopOnTerminate: false,
      startOnBoot: true,
      debug: __DEV__,
      logLevel: BackgroundGeolocation.LOG_LEVEL_WARNING,
      notification: {
        title: 'RastreoYa activo',
        text: 'Tu ubicación se está compartiendo',
      },
    }).then(() => {
      if (isTracking) {
        BackgroundGeolocation.start();
      }
    });

    const subscriber = BackgroundGeolocation.onLocation(handleLocation, handleLocationError);

    return () => {
      subscriber.remove();
    };
  }, []);

  // Sync offline queue whenever we have connection
  useEffect(() => {
    if (offlineQueue.length > 0 && session) {
      sendLocations(session.driverId, offlineQueue)
        .then(() => clearQueue())
        .catch(() => {/* stay queued */});
    }
  }, []);

  const handleLocation = async (location: Location) => {
    if (!session) return;
    const point = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      batteryLevel: location.battery.level,
      timestamp: new Date(location.timestamp).toISOString(),
    };
    setCurrentLocation(point);
    try {
      await sendLocations(session.driverId, [point]);
    } catch {
      addToQueue(point);
    }
  };

  const handleLocationError = (error: any) => {
    console.warn('Location error:', error);
  };

  const toggleTracking = async () => {
    if (isTracking) {
      await BackgroundGeolocation.stop();
      setTracking(false);
    } else {
      await BackgroundGeolocation.start();
      setTracking(true);
    }
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
        onPress: async () => {
          await BackgroundGeolocation.stop();
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
