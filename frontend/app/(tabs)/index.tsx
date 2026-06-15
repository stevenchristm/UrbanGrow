import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity, Modal, Platform, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { dashboardAPI, lahanAPI, katalogAPI } from '../../services/api';
import { Colors, Fonts, Spacing, BorderRadius } from '../../constants/theme';
import { Cloud, Droplets, Wind, Plus, MapPin, Calendar, Clock, X, ChevronDown, Sprout } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../../constants/config';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal form data
  const [lahanList, setLahanList] = useState<any[]>([]);
  const [katalogList, setKatalogList] = useState<any[]>([]);
  const [selectedLahan, setSelectedLahan] = useState('');
  const [selectedTanaman, setSelectedTanaman] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Dropdown open states
  const [showLahanDropdown, setShowLahanDropdown] = useState(false);
  const [showTanamanDropdown, setShowTanamanDropdown] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoadError(null);
      setLoading(true);
      const response = await dashboardAPI.get();
      setData(response.data);
    } catch (error: any) {
      console.log('Error fetching dashboard:', error);
      const msg = error?.message || 'Tidak dapat terhubung ke server';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().then(() => setRefreshing(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const openTanamModal = async () => {
    try {
      const [lahanRes, katalogRes] = await Promise.all([
        lahanAPI.getAll(),
        katalogAPI.getAll(),
      ]);
      setLahanList(lahanRes.data.data || []);
      setKatalogList(katalogRes.data.data || []);
      setSelectedLahan('');
      setSelectedTanaman('');
      setSelectedDate(new Date());
      setShowModal(true);
    } catch (error) {
      console.log('Error loading modal data:', error);
      Alert.alert('Error', 'Gagal memuat data. Coba lagi.');
    }
  };

  const handleSubmitTanam = async () => {
    if (!selectedLahan || !selectedTanaman) {
      Alert.alert('Error', 'Harap pilih lokasi lahan dan varietas tanaman.');
      return;
    }

    setSubmitting(true);
    try {
      const tanggalStr = `${selectedDate.getMonth() + 1}/${selectedDate.getDate()}/${selectedDate.getFullYear()}`;
      await dashboardAPI.simpanTanam({
        lahan: selectedLahan,
        tanaman: selectedTanaman,
        tanggal: tanggalStr,
      });

      setShowModal(false);
      Alert.alert('Berhasil', 'Blueprint tanam berhasil dibuat! AI sedang membuat jadwal perawatan.');
      fetchDashboardData();
    } catch (error) {
      console.log('Error simpan tanam:', error);
      Alert.alert('Error', 'Gagal membuat blueprint tanam.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDateChange = (_event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) setSelectedDate(date);
  };

  const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading && !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Memuat Dashboard...</Text>
      </View>
    );
  }

  if (loadError && !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text style={[styles.loadingText, { fontSize: 16, textAlign: 'center', marginBottom: 8 }]}>
          Gagal terhubung ke server
        </Text>
        <Text style={[styles.loadingText, { fontSize: 12, textAlign: 'center', marginBottom: 20, paddingHorizontal: 40 }]}>
          {loadError}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          onPress={fetchDashboardData}
        >
          <Text style={{ color: Colors.white, fontFamily: Fonts.semiBold, fontSize: 14 }}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { weather, total_lahan, total_tanaman, jadwal_user, rekomendasi_lahan, rekomendasi_details, saran_waktu } = data;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Halo, {user?.nama} 👋</Text>
          <Text style={styles.subtitle}>{settings.subtitle_dashboard || 'Selamat datang di UrbanGrow'}</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/komunitas')}>
          {user?.logo_path ? (
            <Image source={{ uri: `${API_URL}/uploads/${user.logo_path}`, headers: { 'ngrok-skip-browser-warning': 'true' } }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{user?.nama?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Weather Card */}
        <LinearGradient
          colors={[Colors.surface, Colors.card]}
          style={styles.weatherCard}
        >
          <View style={styles.weatherTop}>
            <View>
              <Text style={styles.weatherCity}>Malang</Text>
              <Text style={styles.weatherDesc}>{weather.desc}</Text>
            </View>
            <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
          </View>
          <View style={styles.weatherDivider} />
          <View style={styles.weatherBottom}>
            <View style={styles.weatherItem}>
              <Droplets color={Colors.info} size={16} />
              <Text style={styles.weatherItemText}>Kel. {weather.humidity}%</Text>
            </View>
            <View style={styles.weatherItem}>
              <Wind color={Colors.foregroundMuted} size={16} />
              <Text style={styles.weatherItemText}>Angin {weather.wind} km/h</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <MapPin color={Colors.primary} size={24} />
            </View>
            <Text style={styles.statValue}>{total_lahan || 0}</Text>
            <Text style={styles.statLabel}>Lahan Aktif</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Calendar color={Colors.info} size={24} />
            </View>
            <Text style={styles.statValue}>{(jadwal_user || []).length}</Text>
            <Text style={styles.statLabel}>Jadwal Tanam</Text>
          </View>
        </View>

        {/* AI Action Reminder */}
        <View style={styles.aiActionCard}>
          <View style={styles.aiActionHeader}>
            <Text style={styles.sectionTitle}>Saran Waktu Perawatan</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>AI</Text>
            </View>
          </View>
          <View style={styles.aiActionBody}>
            <Clock color={Colors.warning} size={24} />
            <View style={{ marginLeft: Spacing.md, flex: 1 }}>
              <Text style={styles.aiActionTitle}>Waktu Terbaik Saat Ini</Text>
              <Text style={styles.aiActionDesc}>Berdasarkan kondisi cuaca dan kelembapan, disarankan: {saran_waktu || 'Tunggu rekomendasi selanjutnya'}</Text>
            </View>
          </View>
        </View>

        {/* Active Cultivation Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Active Cultivation</Text>
            <Text style={styles.sectionSubtitle}>Penjadwalan & Lahan · {(jadwal_user || []).length} aktif</Text>
          </View>
          <TouchableOpacity style={styles.tanamBaruBtn} onPress={openTanamModal}>
            <Plus color={Colors.white} size={16} />
            <Text style={styles.tanamBaruBtnText}>Tanam Baru</Text>
          </TouchableOpacity>
        </View>

        {(jadwal_user || []).length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cultivationScroll}>
            {(jadwal_user || []).map((jadwal: any, index: number) => {
              // Use image directly from the schedule if available
              const fotoPath = jadwal.foto_tanaman;
              const estPanenDays = jadwal.total_hari_panen || 90;
              const hariKe = jadwal.hari_ke || 0;
              const tanggalTanam = jadwal.tanggal_tanam ? new Date(jadwal.tanggal_tanam.includes('/') ? jadwal.tanggal_tanam.split('/').reverse().join('-') : jadwal.tanggal_tanam) : new Date();
              const estPanenDate = new Date(tanggalTanam);
              estPanenDate.setDate(estPanenDate.getDate() + estPanenDays);
              const estPanenStr = estPanenDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

              // Determine phase
              let phase = 'Perkecambahan';
              let phaseColor = '#22c55e';
              if (hariKe > estPanenDays * 0.75) { phase = 'Pemanenan'; phaseColor = '#f59e0b'; }
              else if (hariKe > estPanenDays * 0.5) { phase = 'Pembungaan'; phaseColor = '#3b82f6'; }
              else if (hariKe > estPanenDays * 0.25) { phase = 'Tahap Pertumbuhan'; phaseColor = '#10b981'; }

              // Today's task
              const todayTask = jadwal.daftar_tugas_hari_ini?.[0];

              return (
                <View key={index} style={styles.cultivationCard}>
                  {/* Card Image Header */}
                  <View style={styles.cultivationImageContainer}>
                    {fotoPath ? (
                      <Image
                        source={{ uri: `${API_URL}/uploads/${fotoPath}`, headers: { 'ngrok-skip-browser-warning': 'true' } }}
                        style={styles.cultivationImage}
                      />
                    ) : (
                      <LinearGradient colors={['#1a4731', '#0d3320']} style={styles.cultivationImage} />
                    )}
                    <View style={styles.cultivationOverlay} />
                    
                    {/* Phase Badge */}
                    <View style={[styles.phaseBadge, { backgroundColor: phaseColor }]}>
                      <Text style={styles.phaseBadgeText}>{phase}</Text>
                    </View>

                    {/* Location Badge */}
                    <View style={styles.locationBadge}>
                      <MapPin color={Colors.white} size={10} />
                      <Text style={styles.locationBadgeText}>{jadwal.nama_lahan}</Text>
                    </View>

                    {/* Plant Name */}
                    <Text style={styles.cultivationPlantName}>{jadwal.nama_tanaman}</Text>
                  </View>

                  {/* Card Body */}
                  <View style={styles.cultivationBody}>
                    <View style={styles.cultivationProgress}>
                      <Text style={styles.cultivationDayText}>Hari {hariKe} dari {estPanenDays}</Text>
                      <Text style={styles.cultivationEstText}>Est. Panen: {estPanenStr}</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(100, (hariKe / estPanenDays) * 100)}%`, backgroundColor: phaseColor }]} />
                    </View>

                    {/* Today's Task */}
                    <View style={styles.todayTaskRow}>
                      <View style={styles.todayTaskIcon}>
                        <Sprout color={Colors.primary} size={18} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.todayTaskLabel}>TUGAS HARI INI</Text>
                        <Text style={styles.todayTaskName}>{todayTask?.name || 'Penyiraman Rutin'}</Text>
                      </View>
                      <TouchableOpacity style={styles.todayTaskArrow} onPress={() => router.push('/(tabs)/jadwal')}>
                        <ChevronDown color={Colors.primary} size={20} style={{ transform: [{ rotate: '-90deg' }] }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyCultivation}>
            <Text style={styles.emptyCultivationText}>Belum ada penanaman aktif.</Text>
            <TouchableOpacity style={styles.outlineBtn} onPress={openTanamModal}>
              <Plus color={Colors.primary} size={16} />
              <Text style={styles.outlineBtnText}>Tanam Baru</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Schedule Today */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
          <Text style={styles.sectionTitle}>Tugas Hari Ini</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/jadwal')}>
            <Text style={styles.seeAllText}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        {(jadwal_user || []).length > 0 ? (
          (jadwal_user || []).map((jadwal: any, index: number) => {
            if (jadwal.daftar_tugas_hari_ini?.length > 0) {
              return (
                <View key={index} style={styles.taskGroup}>
                  <Text style={styles.taskGroupTitle}>{jadwal.nama_tanaman} - {jadwal.nama_lahan}</Text>
                  {jadwal.daftar_tugas_hari_ini.map((task: any, tIndex: number) => (
                    <View key={tIndex} style={styles.taskCard}>
                      <View style={[styles.taskTimeIndicator, { backgroundColor: task.category === 'Penyiraman' ? Colors.info : Colors.primary }]} />
                      <View style={styles.taskContent}>
                        <Text style={styles.taskName}>{task.name}</Text>
                        <Text style={styles.taskTime}>{task.time}</Text>
                      </View>
                      <TouchableOpacity style={styles.taskCheckBtn}>
                        <Text style={styles.taskCheckText}>✓</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              );
            }
            return null;
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Belum ada jadwal penanaman aktif.</Text>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push('/(tabs)/lahan')}>
              <Plus color={Colors.primary} size={16} />
              <Text style={styles.outlineBtnText}>Buat Jadwal Baru</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Tanam Baru Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalEmoji}>🌱</Text>
                <Text style={styles.modalTitle}>Inisialisasi Tanam</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X color={Colors.foreground} size={24} />
              </TouchableOpacity>
            </View>

            {/* Lokasi Lahan */}
            <Text style={styles.modalLabel}>LOKASI LAHAN</Text>
            <TouchableOpacity 
              style={styles.dropdownBtn} 
              onPress={() => { setShowLahanDropdown(!showLahanDropdown); setShowTanamanDropdown(false); }}
            >
              <Text style={[styles.dropdownBtnText, !selectedLahan && styles.dropdownPlaceholder]}>
                {selectedLahan || 'Pilih Lahan...'}
              </Text>
              <ChevronDown color={Colors.foregroundMuted} size={20} />
            </TouchableOpacity>
            {showLahanDropdown && (
              <View style={styles.dropdownList}>
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {lahanList.map((item: any) => (
                    <TouchableOpacity 
                      key={item.id_lahan} 
                      style={styles.dropdownItem}
                      onPress={() => { setSelectedLahan(item.nama_lahan); setShowLahanDropdown(false); }}
                    >
                      <Text style={[styles.dropdownItemText, selectedLahan === item.nama_lahan && styles.dropdownItemSelected]}>
                        {item.nama_lahan}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {lahanList.length === 0 && (
                    <Text style={styles.dropdownEmpty}>Belum ada lahan. Buat dulu di menu Lahan.</Text>
                  )}
                </ScrollView>
              </View>
            )}

            {/* Varietas Tanaman */}
            <Text style={[styles.modalLabel, { marginTop: Spacing.lg }]}>VARIETAS TANAMAN</Text>
            <TouchableOpacity 
              style={styles.dropdownBtn} 
              onPress={() => { setShowTanamanDropdown(!showTanamanDropdown); setShowLahanDropdown(false); }}
            >
              <Text style={[styles.dropdownBtnText, !selectedTanaman && styles.dropdownPlaceholder]}>
                {selectedTanaman || 'Pilih Tanaman...'}
              </Text>
              <ChevronDown color={Colors.foregroundMuted} size={20} />
            </TouchableOpacity>
            {showTanamanDropdown && (
              <View style={styles.dropdownList}>
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {katalogList.map((item: any) => (
                    <TouchableOpacity 
                      key={item.id_tanaman} 
                      style={styles.dropdownItem}
                      onPress={() => { setSelectedTanaman(item.nama_tanaman); setShowTanamanDropdown(false); }}
                    >
                      <Text style={[styles.dropdownItemText, selectedTanaman === item.nama_tanaman && styles.dropdownItemSelected]}>
                        {item.nama_tanaman}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Waktu Operasional */}
            <Text style={[styles.modalLabel, { marginTop: Spacing.lg }]}>WAKTU OPERASIONAL</Text>
            <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dropdownBtnText}>{formatDate(selectedDate)}</Text>
              <Calendar color={Colors.foregroundMuted} size={20} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
                themeVariant="dark"
              />
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmitTanam}
              disabled={submitting}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.submitBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Mulai Blueprint Tanam</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Fonts.medium,
    color: Colors.foregroundMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  greeting: {
    fontFamily: Fonts.displayBold,
    fontSize: 24,
    color: Colors.foreground,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foregroundMuted,
    marginTop: 2,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.primary,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  weatherCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  weatherTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherCity: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.foreground,
  },
  weatherDesc: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.foregroundMuted,
    marginTop: 4,
  },
  weatherTemp: {
    fontFamily: Fonts.displayBold,
    fontSize: 36,
    color: Colors.primary,
  },
  weatherDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  weatherBottom: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  weatherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weatherItemText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.foregroundMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statValue: {
    fontFamily: Fonts.displayBold,
    fontSize: 28,
    color: Colors.foreground,
  },
  statLabel: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.foregroundMuted,
  },
  aiActionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)', // Warning color tint
  },
  aiActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: Fonts.displayBold,
    fontSize: 10,
    color: Colors.warning,
  },
  aiActionBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aiActionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.foreground,
    marginBottom: 4,
  },
  aiActionDesc: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.foregroundMuted,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.displaySemiBold,
    fontSize: 18,
    color: Colors.foreground,
  },
  sectionSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.foregroundMuted,
    marginTop: 2,
  },
  seeAllText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.primary,
  },

  // Active Cultivation
  tanamBaruBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  tanamBaruBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.white,
  },
  cultivationScroll: {
    paddingRight: Spacing.lg,
    gap: Spacing.md,
  },
  cultivationCard: {
    width: 280,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cultivationImageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  cultivationImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cultivationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  phaseBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  phaseBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.white,
  },
  locationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  locationBadgeText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.white,
  },
  cultivationPlantName: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    fontFamily: Fonts.displayBold,
    fontSize: 22,
    color: Colors.white,
  },
  cultivationBody: {
    padding: Spacing.md,
  },
  cultivationProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cultivationDayText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.foregroundMuted,
  },
  cultivationEstText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.foregroundMuted,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  todayTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 8,
  },
  todayTaskIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayTaskLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 9,
    color: Colors.foregroundDim,
    letterSpacing: 0.5,
  },
  todayTaskName: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.foreground,
  },
  todayTaskArrow: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCultivation: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  emptyCultivationText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.foregroundMuted,
    marginBottom: Spacing.lg,
  },

  // Task Section
  taskGroup: {
    marginBottom: Spacing.md,
  },
  taskGroupTitle: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.foregroundMuted,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    paddingRight: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  taskTimeIndicator: {
    width: 6,
    height: '100%',
  },
  taskContent: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  taskName: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.foreground,
    marginBottom: 4,
  },
  taskTime: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.foregroundDim,
  },
  taskCheckBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckText: {
    color: Colors.borderLight,
    fontSize: 16,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.foregroundMuted,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.primaryGlow,
    gap: 8,
  },
  outlineBtnText: {
    fontFamily: Fonts.medium,
    color: Colors.primary,
    fontSize: 14,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalEmoji: {
    fontSize: 20,
  },
  modalTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.foreground,
  },
  modalLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.foreground,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  dropdownBtnText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.foreground,
  },
  dropdownPlaceholder: {
    color: Colors.foregroundDim,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    marginTop: 4,
  },
  dropdownItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownItemText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.foreground,
  },
  dropdownItemSelected: {
    color: Colors.primary,
    fontFamily: Fonts.semiBold,
  },
  dropdownEmpty: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.foregroundDim,
    padding: Spacing.md,
    textAlign: 'center',
  },
  submitBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.xl,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  submitBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.white,
  },
});
