import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  AppState,
  AppStateStatus,
  Linking,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import BackgroundService from 'react-native-background-actions';
import { launchCamera, CameraOptions } from 'react-native-image-picker';
import { sendLocations, uploadPhoto, CampaignInactiveError } from '../api/client';
import { useTrackingStore } from '../store/useTrackingStore';

// --------------- Permission helpers ---------------

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Permiso de ubicación',
        message:
          'RastreoYa necesita acceder a tu ubicación para rastrear las entregas en tiempo real.',
        buttonPositive: 'Permitir',
        buttonNegative: 'Denegar',
      },
    );
    if (result === 'never_ask_again') {
      Alert.alert(
        'Ubicación bloqueada',
        'El permiso de ubicación fue denegado permanentemente.\n\nActivalo manualmente:\nConfiguración → Permisos → Ubicación → Permitir',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Configuración', onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }
    return true;
  } catch {
    return true; // Samsung workaround: proceed anyway
  }
}

async function requestBackgroundLocation(): Promise<void> {
  if (Platform.OS !== 'android' || (Platform.Version as number) < 29) return;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      {
        title: 'Ubicación en segundo plano',
        message:
          'Para seguir rastreando cuando minimices la app, seleccioná "Permitir todo el tiempo" en la siguiente pantalla.',
        buttonPositive: 'Continuar',
        buttonNegative: 'Ahora no',
      },
    );
    if (result !== 'granted') {
      Alert.alert(
        'Tracking limitado',
        'Sin el permiso de ubicación "todo el tiempo", el tracking se pausará al minimizar la app.\n\nPodés cambiarlo después en:\nConfiguración → Permisos → Ubicación → Permitir todo el tiempo',
      );
    }
  } catch {
    // Samsung workaround: ignore check failures
  }
}

async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Permiso de cámara',
        message: 'RastreoYa necesita la cámara para tomar fotos de las entregas.',
        buttonPositive: 'Permitir',
        buttonNegative: 'Denegar',
      },
    );
    if (result === 'never_ask_again') {
      Alert.alert(
        'Cámara bloqueada',
        'El permiso de cámara fue denegado permanentemente.\n\nActivalo manualmente:\nConfiguración → Permisos → Cámara → Permitir',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Configuración', onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }
    if (result === 'denied') {
      Alert.alert(
        'Permiso de cámara necesario',
        'Para tomar fotos de entrega necesitás permitir el acceso a la cámara. Intentá de nuevo y tocá "Permitir".',
      );
      return false;
    }
    // 'granted' or Samsung workaround — proceed
    return true;
  } catch {
    return true; // Samsung workaround: proceed and let launchCamera handle it
  }
}

function promptBatteryOptimization(): void {
  Alert.alert(
    'Optimización de batería',
    'Para que el tracking no se interrumpa en segundo plano, desactivá las restricciones de batería para RastreoYa.\n\n' +
      'Pasos:\n' +
      '1. Tocá "Configurar"\n' +
      '2. Buscá "RastreoYa" en la lista\n' +
      '3. Seleccioná "Sin restricciones"\n\n' +
      'En Samsung: Configuración → Batería → Límites de uso en segundo plano → desactivar para RastreoYa',
    [
      { text: 'Después', style: 'cancel' },
      {
        text: 'Configurar',
        onPress: () => {
          Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() => {
            Linking.openSettings().catch(() => {});
          });
        },
      },
    ],
  );
}

// Background task options
const bgOptions = {
  taskName: 'RastreoYaTracking',
  taskTitle: 'RastreoYa - Tracking activo',
  taskDesc: 'Enviando ubicación en tiempo real',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#16a34a',
  linkingURI: 'rastreoya://join',
  progressBar: {
    max: 100,
    value: 0,
    indeterminate: true,
  },
  parameters: {
    delay: 10000,
  },
};

// Shared state between component and background task
let backgroundWatchId: number | null = null;
let currentDriverId: string | null = null;
let offlineBuffer: Array<{
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}> = [];
let locationCount = 0;
let campaignInactive = false;

async function flushOfflineBuffer() {
  if (offlineBuffer.length === 0 || !currentDriverId) return;
  const batch = [...offlineBuffer];
  offlineBuffer = [];
  try {
    await sendLocations(currentDriverId, batch);
    console.log('[RastreoYa] Flushed', batch.length, 'offline points');
  } catch {
    offlineBuffer = [...batch, ...offlineBuffer];
  }
}

// The background task - this runs inside the foreground service
const backgroundLocationTask = async (taskData?: { delay?: number }) => {
  const delay = taskData?.delay ?? 10000;
  console.log('[RastreoYa] Background task started, delay:', delay);

  await new Promise<void>((resolve) => {
    backgroundWatchId = Geolocation.watchPosition(
      (pos) => {
        if (!currentDriverId) return;
        locationCount++;
        const point = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? undefined,
          timestamp: new Date().toISOString(),
        };

        console.log('[RastreoYa] BG location #' + locationCount + ':', point.latitude.toFixed(5), point.longitude.toFixed(5));

        // Update store
        try {
          useTrackingStore.getState().setCurrentLocation(point);
        } catch {}

        // Send to server
        sendLocations(currentDriverId!, [point]).catch((err) => {
          if (err instanceof CampaignInactiveError) {
            campaignInactive = true;
            console.log('[RastreoYa] Campaign inactive, will stop tracking');
            return;
          }
          offlineBuffer.push(point);
          if (offlineBuffer.length > 500) {
            offlineBuffer = offlineBuffer.slice(-500);
          }
        });
      },
      (err) => {
        console.warn('[RastreoYa] BG watchPosition error:', err.code, err.message);
      },
      {
        enableHighAccuracy: true,
        forceLocationManager: true,
        forceRequestLocation: true,
        distanceFilter: 5,
        interval: delay,
        fastestInterval: 5000,
        showLocationDialog: false,
      },
    );

    console.log('[RastreoYa] watchPosition started, id:', backgroundWatchId);

    const flushInterval = setInterval(flushOfflineBuffer, 30000);

    // Keep alive loop
    const keepAlive = setInterval(async () => {
      if (campaignInactive) {
        console.log('[RastreoYa] Campaign inactive, stopping background service');
        clearInterval(keepAlive);
        clearInterval(flushInterval);
        if (backgroundWatchId !== null) {
          Geolocation.clearWatch(backgroundWatchId);
          backgroundWatchId = null;
        }
        try { await BackgroundService.stop(); } catch {}
        useTrackingStore.getState().setTracking(false);
        resolve();
        return;
      }
      if (!BackgroundService.isRunning()) {
        console.log('[RastreoYa] Background service stopped, cleaning up');
        clearInterval(keepAlive);
        clearInterval(flushInterval);
        if (backgroundWatchId !== null) {
          Geolocation.clearWatch(backgroundWatchId);
          backgroundWatchId = null;
        }
        resolve();
      }
    }, 2000);
  });
};

export function TrackingScreen() {
  const { session, isTracking, currentLocation, offlineQueue, setTracking, setCurrentLocation, addToQueue, clearQueue, logout } =
    useTrackingStore();
  const [uploading, setUploading] = useState(false);
  const [bgServiceRunning, setBgServiceRunning] = useState(false);
  const [batteryPromptShown, setBatteryPromptShown] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  // Sync offline queue on mount
  useEffect(() => {
    if (offlineQueue.length > 0 && session) {
      sendLocations(session.driverId, offlineQueue)
        .then(() => clearQueue())
        .catch(() => {});
    }
    // Check if background service is already running (app was reopened)
    setBgServiceRunning(BackgroundService.isRunning());
  }, []);

  // Monitor campaign inactive flag from background task
  useEffect(() => {
    const check = setInterval(() => {
      if (campaignInactive && isTracking) {
        campaignInactive = false;
        setBgServiceRunning(false);
        setTracking(false);
        Alert.alert(
          'Campaña finalizada',
          'Esta campaña fue desactivada o eliminada. El tracking se detuvo automáticamente.',
        );
      }
    }, 3000);
    return () => clearInterval(check);
  }, [isTracking]);

  // Monitor app state
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        flushOfflineBuffer();
        setBgServiceRunning(BackgroundService.isRunning());
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
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
    } catch (err) {
      if (err instanceof CampaignInactiveError) {
        Alert.alert(
          'Campaña finalizada',
          'Esta campaña fue desactivada. El tracking se detendrá.',
          [{ text: 'OK', onPress: () => stopTracking() }],
        );
        return;
      }
      addToQueue(point);
    }
  };

  const startTracking = async () => {
    if (!session) return;

    // 1. Request fine location with rationale
    const locationOk = await requestLocationPermission();
    if (!locationOk) return;

    // 2. Request background location (Android 10+)
    await requestBackgroundLocation();

    // 3. Set shared state
    currentDriverId = session.driverId;
    offlineBuffer = [];
    locationCount = 0;
    campaignInactive = false;

    // 4. Start background service
    try {
      await BackgroundService.start(backgroundLocationTask, bgOptions);
      setTracking(true);
      setBgServiceRunning(true);

      // 5. Prompt battery optimization once per session
      if (!batteryPromptShown) {
        setBatteryPromptShown(true);
        setTimeout(() => promptBatteryOptimization(), 1500);
      }
    } catch (err: any) {
      // Fallback: foreground-only tracking
      backgroundWatchId = Geolocation.watchPosition(
        (pos) => handleLocation(pos.coords),
        () => {},
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
      promptBatteryOptimization();
    }
  };

  const stopTracking = async () => {
    console.log('[RastreoYa] Stopping tracking');
    try {
      if (backgroundWatchId !== null) {
        Geolocation.clearWatch(backgroundWatchId);
        backgroundWatchId = null;
      }
      if (BackgroundService.isRunning()) {
        await BackgroundService.stop();
      }
    } catch (err) {
      console.warn('[RastreoYa] Error stopping:', err);
    }
    currentDriverId = null;
    setBgServiceRunning(false);
    if (offlineBuffer.length > 0 && session) {
      const remaining = [...offlineBuffer];
      offlineBuffer = [];
      sendLocations(session.driverId, remaining).catch(() => {
        remaining.forEach((p) => addToQueue(p));
      });
    }
    setTracking(false);
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const handleTakePhoto = async () => {
    if (!session || !currentLocation) {
      Alert.alert('Sin ubicación', 'Esperá a tener señal GPS antes de tomar una foto.');
      return;
    }

    // No CAMERA permission in manifest — launchCamera uses ACTION_IMAGE_CAPTURE
    // intent which opens the system camera app without needing the permission.
    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 0.7,
      saveToPhotos: false,
      maxWidth: 1920,
      maxHeight: 1920,
    };

    launchCamera(options, async (response) => {
      if (response.didCancel) return;

      if (response.errorCode) {
        Alert.alert('Error', `No se pudo abrir la cámara: ${response.errorMessage || response.errorCode}`);
        return;
      }

      const uri = response.assets?.[0]?.uri;
      if (!uri) {
        Alert.alert('Error', 'No se obtuvo la imagen. Intentá de nuevo.');
        return;
      }

      setUploading(true);
      try {
        await uploadPhoto(
          session.driverId,
          currentLocation.latitude,
          currentLocation.longitude,
          currentLocation.accuracy ?? null,
          uri,
        );
        Alert.alert('Foto enviada', 'La foto fue guardada con tu ubicación actual.');
      } catch (err: any) {
        const detail = err?.response?.data ? JSON.stringify(err.response.data) : err?.message || 'Error desconocido';
        console.log('[RastreoYa] Photo upload error:', detail);
        Alert.alert('Error al enviar', detail);
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
          await stopTracking();
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
          <Text style={styles.campaignName}>{session?.campaignTitle} <Text style={{ fontSize: 10, color: '#6b7280' }}>v6</Text></Text>
          <Text style={styles.statusText}>
            {isTracking
              ? bgServiceRunning
                ? '🟢 Tracking activo (segundo plano)'
                : '🟡 Tracking activo (solo primer plano)'
              : '⚫ Tracking pausado'}
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
            {currentLocation.accuracy != null && currentLocation.accuracy > 0 && (
              <Text style={styles.subText}>Precisión: ±{Math.round(currentLocation.accuracy)}m</Text>
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
        {isTracking && bgServiceRunning && (
          <Text style={styles.bgText}>
            📡 La ubicación se envía aunque minimices la app
          </Text>
        )}
        {isTracking && !bgServiceRunning && (
          <TouchableOpacity onPress={promptBatteryOptimization}>
            <Text style={styles.warnText}>
              ⚠️ Tracking solo en primer plano. Tocá acá para configurar la batería y que funcione en segundo plano.
            </Text>
          </TouchableOpacity>
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

        <Pressable
          style={({ pressed }) => [styles.photoBtn, uploading && styles.btnDisabled, pressed && { opacity: 0.7 }]}
          onPress={handleTakePhoto}
          disabled={uploading}
        >
          <Text style={styles.photoBtnText}>
            {uploading ? 'Enviando foto...' : '📷 Tomar foto de entrega'}
          </Text>
        </Pressable>
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
  bgText: { color: '#10b981', fontSize: 12, marginTop: 8 },
  warnText: { color: '#f59e0b', fontSize: 12, marginTop: 8, textDecorationLine: 'underline' },
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
