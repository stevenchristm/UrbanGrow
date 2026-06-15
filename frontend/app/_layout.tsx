import { useEffect, useState, useRef } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, Animated, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, BorderRadius, Spacing } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';
import wsService from '../services/websocket';
import { Bell, X } from 'lucide-react-native';

import { SettingsProvider } from '../contexts/SettingsContext';

function InitialLayout() {
  const { token, user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (token && inAuthGroup) {
      // Redirect away from auth pages if authenticated
      if (user?.role === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [token, user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Slot />
      <GlobalNotification />
    </View>
  );
}

function GlobalNotification() {
  const [notification, setNotification] = useState<any>(null);
  const translateY = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    const handleNotification = (payload: any) => {
      setNotification(payload);
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(5000),
        Animated.timing(translateY, {
          toValue: -150,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setNotification(null));
    };

    wsService.on('task_notification', handleNotification);

    return () => {
      wsService.off('task_notification', handleNotification);
    };
  }, []);

  if (!notification) return null;

  return (
    <Animated.View style={[styles.notificationContainer, { transform: [{ translateY }] }]}>
      <View style={styles.notificationContent}>
        <View style={styles.iconContainer}>
          <Bell color={Colors.white} size={20} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.notifTitle}>{notification.title}</Text>
          <Text style={styles.notifMessage} numberOfLines={2}>{notification.message}</Text>
        </View>
        <TouchableOpacity onPress={() => Animated.timing(translateY, { toValue: -150, duration: 200, useNativeDriver: true }).start()}>
          <X color={Colors.foregroundMuted} size={20} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SettingsProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <InitialLayout />
      </AuthProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  notificationContainer: {
    position: 'absolute',
    top: 0,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    zIndex: 9999,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  notifTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.foreground,
    marginBottom: 2,
  },
  notifMessage: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.foregroundMuted,
    lineHeight: 18,
  },
});
