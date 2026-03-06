import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { driverAuth } from '../api/client';
import { useTrackingStore } from '../store/useTrackingStore';

export function LoginScreen() {
  const [campaignCode, setCampaignCode] = useState('');
  const [validationCode, setValidationCode] = useState('');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const setSession = useTrackingStore((s) => s.setSession);
  const pendingJoin = useTrackingStore((s) => s.pendingJoin);
  const setPendingJoin = useTrackingStore((s) => s.setPendingJoin);

  useEffect(() => {
    if (pendingJoin) {
      setCampaignCode(pendingJoin.campaignCode);
      setValidationCode(pendingJoin.validationCode);
      setPendingJoin(null);
    }
  }, [pendingJoin]);

  const handleLogin = async () => {
    if (!campaignCode.trim() || !validationCode.trim() || !alias.trim()) {
      Alert.alert('Campos requeridos', 'Completá todos los campos');
      return;
    }
    setLoading(true);
    try {
      const data = await driverAuth(
        campaignCode.trim().toUpperCase(),
        validationCode.trim().toUpperCase(),
        alias.trim()
      );
      setSession({
        driverId: data.driverId,
        campaignId: data.campaignId,
        campaignTitle: data.campaignTitle,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Error de conexión';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>RastreoYa</Text>
          <Text style={styles.subtitle}>Ingresá a tu campaña</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Código de campaña</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: CAMP-ABC123"
              placeholderTextColor="#6b7280"
              value={campaignCode}
              onChangeText={setCampaignCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Código de validación</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••"
              placeholderTextColor="#6b7280"
              value={validationCode}
              onChangeText={setValidationCode}
              autoCapitalize="characters"
              autoCorrect={false}
              secureTextEntry
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tu nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Juan García"
              placeholderTextColor="#6b7280"
              value={alias}
              onChangeText={setAlias}
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Unirse a la campaña</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#60a5fa',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 13, color: '#9ca3af', marginBottom: 6 },
  input: {
    backgroundColor: '#030712',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
