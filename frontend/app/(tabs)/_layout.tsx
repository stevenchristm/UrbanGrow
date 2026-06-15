import { Tabs } from 'expo-router';
import { LayoutDashboard, Trees, BookOpen, CalendarCheck, Users, MessageSquareText } from 'lucide-react-native';
import { Colors, Fonts } from '../../constants/theme';
import { View, Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.borderLight,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.foregroundDim,
        tabBarLabelStyle: {
          fontFamily: Fonts.medium,
          fontSize: 10,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryGlow,
              padding: 8,
              borderRadius: 12,
            } : { padding: 8 }}>
              <LayoutDashboard color={color} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="lahan"
        options={{
          title: 'Lahan',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryGlow,
              padding: 8,
              borderRadius: 12,
            } : { padding: 8 }}>
              <Trees color={color} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="katalog"
        options={{
          title: 'Katalog',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryGlow,
              padding: 8,
              borderRadius: 12,
            } : { padding: 8 }}>
              <BookOpen color={color} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="jadwal"
        options={{
          title: 'Jadwal',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryGlow,
              padding: 8,
              borderRadius: 12,
            } : { padding: 8 }}>
              <CalendarCheck color={color} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="ai-assistant"
        options={{
          title: 'AI Pakar',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryGlow,
              padding: 8,
              borderRadius: 12,
            } : { padding: 8 }}>
              <MessageSquareText color={color} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="komunitas"
        options={{
          title: 'Komunitas',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryGlow,
              padding: 8,
              borderRadius: 12,
            } : { padding: 8 }}>
              <Users color={color} size={22} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
