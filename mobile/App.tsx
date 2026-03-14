import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginScreen } from './src/screens/LoginScreen';
import { TrackingScreen } from './src/screens/TrackingScreen';
import { LocationDisclosureScreen } from './src/screens/LocationDisclosureScreen';
import { useTrackingStore } from './src/store/useTrackingStore';

const Stack = createStackNavigator();
const DISCLOSURE_KEY = 'rastreoya-disclosure-accepted';

function parseJoinUrl(url: string): { campaignCode: string; validationCode: string } | null {
  const match = url.match(/[?&]code=([^&]+).*[?&]pin=([^&]+)/);
  if (match) {
    return { campaignCode: decodeURIComponent(match[1]), validationCode: decodeURIComponent(match[2]) };
  }
  return null;
}

export default function App() {
  const session = useTrackingStore((s) => s.session);
  const setPendingJoin = useTrackingStore((s) => s.setPendingJoin);
  const [disclosureAccepted, setDisclosureAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISCLOSURE_KEY).then((val) => {
      setDisclosureAccepted(val === 'true');
    });
  }, []);

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      if (url.includes('join')) {
        const params = parseJoinUrl(url);
        if (params) setPendingJoin(params);
      }
    };
    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => { if (url) handleUrl({ url }); });
    return () => sub.remove();
  }, []);

  const handleAcceptDisclosure = async () => {
    await AsyncStorage.setItem(DISCLOSURE_KEY, 'true');
    setDisclosureAccepted(true);
  };

  const handleDeclineDisclosure = () => {
    // If declined, show login anyway but without location tracking
    setDisclosureAccepted(true);
  };

  // Loading state
  if (disclosureAccepted === null) return null;

  // Show disclosure before anything else
  if (!disclosureAccepted) {
    return (
      <SafeAreaProvider>
        <LocationDisclosureScreen
          onAccept={handleAcceptDisclosure}
          onDecline={handleDeclineDisclosure}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session ? (
            <Stack.Screen name="Tracking" component={TrackingScreen} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
