import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

export function LocationDisclosureScreen({ onAccept, onDecline }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top || (StatusBar.currentHeight ?? 0) + 8, paddingBottom: insets.bottom || 24 }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.icon}>📍</Text>
        <Text style={styles.title}>Acceso a tu ubicación</Text>
        <Text style={styles.subtitle}>
          RastreoYa necesita acceder a tu ubicación para funcionar correctamente.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Qué datos recopilamos</Text>
          <Text style={styles.cardItem}>• Tu ubicación GPS precisa en tiempo real</Text>
          <Text style={styles.cardItem}>• Tu ubicación en segundo plano mientras el tracking está activo</Text>
          <Text style={styles.cardItem}>• Fotos de entrega con coordenadas GPS (cuando las tomás voluntariamente)</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Para qué los usamos</Text>
          <Text style={styles.cardItem}>• Mostrar tu recorrido en tiempo real al administrador de la campaña</Text>
          <Text style={styles.cardItem}>• Registrar las rutas de entrega realizadas</Text>
          <Text style={styles.cardItem}>• Documentar entregas con fotos geolocalizadas</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quién puede ver tus datos</Text>
          <Text style={styles.cardItem}>• La empresa que administra la campaña</Text>
          <Text style={styles.cardItem}>• Personas con el enlace de seguimiento público</Text>
          <Text style={[styles.cardItem, { color: '#10b981' }]}>• No vendemos tus datos a terceros</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tu control</Text>
          <Text style={styles.cardItem}>• Podés detener el tracking en cualquier momento</Text>
          <Text style={styles.cardItem}>• Podés revocar los permisos desde la configuración del teléfono</Text>
          <Text style={styles.cardItem}>• La ubicación en segundo plano solo se usa mientras el tracking está activo</Text>
        </View>

        <TouchableOpacity onPress={() => Linking.openURL('https://rastreoya.com/privacy')}>
          <Text style={styles.policyLink}>Ver política de privacidad completa</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
          <Text style={styles.acceptText}>Acepto, continuar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
          <Text style={styles.declineText}>No acepto</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  scroll: { padding: 24, paddingBottom: 8 },
  icon: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 8,
  },
  cardItem: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
    lineHeight: 20,
  },
  policyLink: {
    color: '#60a5fa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    textDecorationLine: 'underline',
  },
  actions: { paddingHorizontal: 24, paddingBottom: 8 },
  acceptBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  acceptText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  declineBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineText: { color: '#6b7280', fontSize: 14 },
});
