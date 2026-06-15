import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '../../constants/theme';
import { Leaf, LogOut, Save, ChevronDown, ChevronUp, LayoutDashboard, Map, BookOpen, Calendar, Bot, Users, Bell } from 'lucide-react-native';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../../constants/config';

export default function AdminDashboardScreen() {
  const { logout, user, token } = useAuth();
  const { refreshSettings } = useSettings();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [expandedSection, setExpandedSection] = useState<string | null>('dashboard');

  const SECTIONS = [
    { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, key: 'subtitle_dashboard', defaultText: 'Selamat datang di UrbanGrow' },
    { id: 'lahan', title: 'Area Lahan', icon: Map, key: 'subtitle_lahan', defaultText: 'Halaman manajemen lahan' },
    { id: 'katalog', title: 'Katalog Tanaman', icon: BookOpen, key: 'subtitle_katalog', defaultText: 'Pilih bibit terbaik untuk lahan Anda' },
    { id: 'jadwal', title: 'Jadwal Perawatan', icon: Calendar, key: 'subtitle_jadwal', defaultText: 'Pantau jadwal perawatan tanaman Anda' },
    { id: 'ai', title: 'AI Pakar Pertanian', icon: Bot, key: 'subtitle_ai', defaultText: 'Tanya masalah tanaman Anda' },
    { id: 'komunitas', title: 'Komunitas', icon: Users, key: 'subtitle_komunitas', defaultText: 'Terhubung, belajar, dan berkolaborasi dengan komunitas' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await adminAPI.getDashboard();
      if (response.data && response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.log('Error fetching admin data:', error);
      Alert.alert('Error', 'Gagal memuat data admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Create payload only with non-empty settings or fallback to current
      const payload: Record<string, string> = {};
      SECTIONS.forEach(sec => {
        if (settings[sec.key] !== undefined) {
          payload[sec.key] = settings[sec.key];
        }
      });
      
      await adminAPI.updateSettings(payload);
      await refreshSettings();
      Alert.alert('Sukses', 'Pengaturan teks berhasil disimpan! ✅');
    } catch (error: any) {
      console.log('Error saving settings:', error);
      Alert.alert('Error', error.response?.data?.error || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar dari Panel Admin?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Keluar', style: 'destructive', onPress: logout },
      ]
    );
  };

  const toggleSection = (id: string) => {
    if (expandedSection === id) {
      setExpandedSection(null);
    } else {
      setExpandedSection(id);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={[Colors.surface, Colors.background]} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              <Leaf color={Colors.primary} size={24} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Panel Administrasi</Text>
              <Text style={styles.headerSubtitle}>{user?.email}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <TouchableOpacity 
              style={[styles.logoutBtn, { backgroundColor: Colors.surface }]} 
              onPress={async () => {
                try {
                  await fetch(`${API_URL}/api/test-notification`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                } catch(e) { console.log(e) }
              }}
            >
              <Bell color={Colors.primary} size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut color={Colors.danger} size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Manajemen Tata Halaman</Text>
        <Text style={styles.sectionDesc}>Sesuaikan subjudul atau teks pengantar pada setiap halaman aplikasi.</Text>

        <View style={styles.accordionContainer}>
          {SECTIONS.map((section) => {
            const isExpanded = expandedSection === section.id;
            const Icon = section.icon;

            return (
              <View key={section.id} style={[styles.accordionItem, isExpanded && styles.accordionItemExpanded]}>
                <TouchableOpacity 
                  style={styles.accordionHeader} 
                  onPress={() => toggleSection(section.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.accordionHeaderLeft}>
                    <View style={styles.iconBox}>
                      <Icon color={Colors.primary} size={20} />
                    </View>
                    <Text style={styles.accordionTitle}>{section.title}</Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp color={Colors.foregroundMuted} size={20} />
                  ) : (
                    <ChevronDown color={Colors.foregroundMuted} size={20} />
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.accordionContent}>
                    <Text style={styles.inputLabel}>Teks Subjudul ({section.title})</Text>
                    <TextInput
                      style={styles.input}
                      value={settings[section.key] !== undefined ? settings[section.key] : section.defaultText}
                      onChangeText={(text) => setSettings({ ...settings, [section.key]: text })}
                      placeholder={section.defaultText}
                      placeholderTextColor={Colors.foregroundDim}
                      multiline
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity 
          style={styles.saveBtn} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Save color={Colors.white} size={20} />
              <Text style={styles.saveBtnText}>Simpan Pengaturan</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 44,
    height: 44,
    backgroundColor: Colors.primaryGlow,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.foreground,
  },
  headerSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.foregroundMuted,
  },
  logoutBtn: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.md,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontFamily: Fonts.displaySemiBold,
    fontSize: 18,
    color: Colors.foreground,
    marginBottom: 4,
  },
  sectionDesc: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foregroundMuted,
    marginBottom: Spacing.xl,
  },
  accordionContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  accordionItem: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  accordionItemExpanded: {
    borderColor: Colors.primaryLight,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    backgroundColor: Colors.primaryGlow,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accordionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.foreground,
  },
  accordionContent: {
    padding: Spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: 4,
  },
  inputLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.foregroundMuted,
    marginBottom: 8,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.foreground,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.white,
  },
});
