import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Linking } from 'react-native';
import { katalogAPI } from '../../services/api';
import { Colors, Fonts, Spacing, BorderRadius } from '../../constants/theme';
import { Search, Thermometer, Droplets, Sun, ChevronRight, Sparkles, X, Play } from 'lucide-react-native';
import { API_URL } from '../../constants/config';
import { useRouter } from 'expo-router';
import { useSettings } from '../../contexts/SettingsContext';

export default function KatalogScreen() {
  const { settings } = useSettings();
  const [katalog, setKatalog] = useState<any[]>([]);
  const [filteredKatalog, setFilteredKatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // States for AI Lifecycle Modal
  const [lifecycleVisible, setLifecycleVisible] = useState(false);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [lifecycleData, setLifecycleData] = useState<any>(null);
  
  const router = useRouter();

  const fetchKatalog = async () => {
    try {
      const response = await katalogAPI.getAll();
      setKatalog(response.data.data || []);
      setFilteredKatalog(response.data.data || []);
    } catch (error) {
      console.log('Error fetching katalog:', error);
      setKatalog([]);
      setFilteredKatalog([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchKatalog().then(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchKatalog();
  }, []);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text) {
      const filtered = katalog.filter(item => 
        item.nama_tanaman.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredKatalog(filtered);
    } else {
      setFilteredKatalog(katalog);
    }
  };

  const handleGetLifecycle = async (id: number) => {
    setLifecycleVisible(true);
    setLifecycleLoading(true);
    setLifecycleData(null);
    try {
      const response = await katalogAPI.getAiLifecycle(id);
      setLifecycleData(response.data);
    } catch (error) {
      console.log('Error fetching AI lifecycle:', error);
      Alert.alert('Error', 'Gagal memuat analisis siklus AI.');
      setLifecycleVisible(false);
    } finally {
      setLifecycleLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Memuat Katalog...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Katalog Tanaman</Text>
        <Text style={styles.headerSubtitle}>{settings.subtitle_katalog || 'Pilih bibit terbaik untuk lahan Anda'}</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color={Colors.foregroundMuted} size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari tanaman..."
            placeholderTextColor={Colors.foregroundDim}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {(filteredKatalog || []).length > 0 ? (
          (filteredKatalog || []).map((item: any) => (
            <TouchableOpacity key={item.id_tanaman} style={styles.katalogCard}>
              <View style={styles.imageContainer}>
                {item.foto_tanaman ? (
                  <Image source={{ uri: `${API_URL}/uploads/${item.foto_tanaman}`, headers: { 'ngrok-skip-browser-warning': 'true' } }} style={styles.image} />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.imageFallbackText}>{item.nama_tanaman.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{item.estimasi_hari_panen || 90} Hari</Text>
                </View>
              </View>

              <View style={styles.katalogContent}>
                <View style={styles.katalogHeader}>
                  <Text style={styles.katalogName}>{item.nama_tanaman}</Text>
                  <ChevronRight color={Colors.foregroundMuted} size={20} />
                </View>
                
                <View style={styles.specsContainer}>
                  <View style={styles.specItem}>
                    <Thermometer color={Colors.warning} size={14} />
                    <Text style={styles.specText}>{item.suhu_min}-{item.suhu_max}°C</Text>
                  </View>
                  <View style={styles.specItem}>
                    <Sun color={Colors.warning} size={14} />
                    <Text style={styles.specText}>{item.cahaya_jam} Jam</Text>
                  </View>
                  <View style={styles.specItem}>
                    <Droplets color={Colors.info} size={14} />
                    <Text style={styles.specText}>{item.humidity_avg}% RH</Text>
                  </View>
                </View>

                {/* AI Lifecycle Button */}
                <TouchableOpacity 
                  style={styles.aiButton}
                  onPress={() => handleGetLifecycle(item.id_tanaman)}
                >
                  <Sparkles color={Colors.white} size={14} />
                  <Text style={styles.aiButtonText}>Analisis Siklus AI</Text>
                </TouchableOpacity>

                {/* Tonton Tutorial Button */}
                {item.video_id ? (
                  <TouchableOpacity 
                    style={styles.tutorialButton}
                    onPress={() => {
                      const videoId = item.video_id;
                      const url = videoId.startsWith('http') ? videoId : `https://www.youtube.com/watch?v=${videoId}`;
                      Linking.openURL(url).catch(() => {
                        Alert.alert('Error', 'Tidak dapat membuka video tutorial.');
                      });
                    }}
                  >
                    <Play color={Colors.danger} size={14} />
                    <Text style={styles.tutorialButtonText}>Tonton Tutorial</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Tanaman tidak ditemukan</Text>
          </View>
        )}
      </ScrollView>

      {/* AI Lifecycle Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={lifecycleVisible}
        onRequestClose={() => setLifecycleVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Sparkles color={Colors.primary} size={20} />
                <Text style={styles.modalTitle}>
                  AI Lifecycle: <Text style={styles.modalTitleBold}>{lifecycleData?.plant || 'Memuat...'}</Text>
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLifecycleVisible(false)}>
                <X color={Colors.foregroundMuted} size={20} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            {lifecycleLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>AI sedang menganalisis siklus...</Text>
              </View>
            ) : lifecycleData ? (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.totalDaysBadge}>
                  <Text style={styles.totalDaysText}>Total Estimasi Panen: <Text style={styles.totalDaysBold}>{lifecycleData.total_days} Hari</Text></Text>
                </View>

                <View style={styles.timelineContainer}>
                  {lifecycleData.stages?.map((stage: any, index: number) => (
                    <View key={index} style={styles.timelineItem}>
                      <View style={styles.timelineDotColumn}>
                        <View style={styles.timelineDot} />
                        {index < lifecycleData.stages.length - 1 && (
                          <View style={styles.timelineLine} />
                        )}
                      </View>
                      
                      <View style={styles.timelineContent}>
                        <View style={styles.timelineHeader}>
                          <View style={styles.timelinePhaseRow}>
                            <Sparkles color={Colors.primary} size={14} />
                            <Text style={styles.timelinePhaseText}>{stage.phase}</Text>
                          </View>
                          <Text style={styles.timelineDaysText}>{stage.days} Hari</Text>
                        </View>
                        <Text style={styles.timelineActionText}>{stage.action}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.modalLoading}>
                <Text style={styles.loadingText}>Gagal memuat data.</Text>
              </View>
            )}
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
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 24,
    color: Colors.foreground,
  },
  headerSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foregroundMuted,
    marginTop: 4,
  },
  searchContainer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.foreground,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  katalogCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  imageContainer: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFallbackText: {
    fontFamily: Fonts.displayBold,
    fontSize: 32,
    color: Colors.primary,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  durationText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.white,
  },
  katalogContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  katalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  katalogName: {
    fontFamily: Fonts.displaySemiBold,
    fontSize: 16,
    color: Colors.foreground,
  },
  specsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  specText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.foregroundMuted,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  emptyText: {
    fontFamily: Fonts.medium,
    color: Colors.foregroundMuted,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
    gap: 6,
  },
  aiButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.white,
  },
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  tutorialButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontFamily: Fonts.displaySemiBold,
    fontSize: 18,
    color: Colors.foreground,
  },
  modalTitleBold: {
    fontFamily: Fonts.displayBold,
    color: Colors.primary,
  },
  modalLoading: {
    padding: Spacing.xxxl,
    alignItems: 'center',
  },
  modalScroll: {
    padding: Spacing.lg,
  },
  totalDaysBadge: {
    backgroundColor: Colors.primaryGlow,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  totalDaysText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.foreground,
  },
  totalDaysBold: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  timelineContainer: {
    paddingRight: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineDotColumn: {
    alignItems: 'center',
    width: 24,
    marginRight: Spacing.sm,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.borderLight,
    marginTop: 4,
    marginBottom: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timelinePhaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelinePhaseText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.foreground,
  },
  timelineDaysText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  timelineActionText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.foregroundMuted,
    lineHeight: 20,
  },
});
