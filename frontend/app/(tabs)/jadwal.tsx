import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { jadwalAPI } from '../../services/api';
import { useSettings } from '../../contexts/SettingsContext';
import { Colors, Fonts, Spacing, BorderRadius } from '../../constants/theme';
import { CalendarCheck, CheckCircle2, Clock, AlertTriangle, Droplets, Leaf, Sprout, ChevronRight } from 'lucide-react-native';

export default function JadwalScreen() {
  const { settings } = useSettings();
  const [jadwalList, setJadwalList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingTask, setConfirmingTask] = useState<string | null>(null);

  // New states for Attention feature
  const [attentionModalVisible, setAttentionModalVisible] = useState(false);
  const [attentionLoading, setAttentionLoading] = useState(false);
  const [attentionText, setAttentionText] = useState('');

  const fetchJadwal = async () => {
    try {
      const response = await jadwalAPI.getAll();
      setJadwalList(response.data.data || []);
    } catch (error) {
      console.log('Error fetching jadwal:', error);
      setJadwalList([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJadwal().then(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchJadwal();
  }, []);

  const handleKonfirmasi = async (penjadwalanId: number, step: number) => {
    const taskKey = `${penjadwalanId}-${step}`;
    setConfirmingTask(taskKey);
    try {
      await jadwalAPI.tandaiSelesai({ penjadwalan_id: penjadwalanId, step });
      fetchJadwal();
    } catch (error) {
      console.log('Error marking task complete:', error);
      Alert.alert('Error', 'Gagal mengkonfirmasi tugas.');
    } finally {
      setConfirmingTask(null);
    }
  };

  const handleGetAttention = async (jadwalId: number, hariKe: number, missedCount: number) => {
    setAttentionModalVisible(true);
    setAttentionLoading(true);
    setAttentionText('');
    
    try {
      const response = await jadwalAPI.getAttention(jadwalId, hariKe, missedCount);
      setAttentionText(response.data.analysis || 'Gagal memuat peringatan.');
    } catch (error) {
      console.log('Error fetching attention:', error);
      setAttentionText('Terjadi kesalahan saat menghubungkan ke AI Master Agronomist.');
    } finally {
      setAttentionLoading(false);
    }
  };

  // Get the current device time for comparison
  const getCurrentTimeNum = () => {
    const now = new Date();
    return now.getHours() * 100 + now.getMinutes();
  };

  const getTaskIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'penyiraman':
        return <Droplets color={Colors.info} size={22} />;
      case 'pemupukan':
        return <Leaf color={Colors.primary} size={22} />;
      default:
        return <Sprout color={Colors.primary} size={22} />;
    }
  };

  const getTaskIconBg = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'penyiraman':
        return 'rgba(59, 130, 246, 0.12)';
      case 'pemupukan':
        return 'rgba(34, 197, 94, 0.12)';
      default:
        return 'rgba(34, 197, 94, 0.08)';
    }
  };

  // Determine the phase label from progress
  const getPhaseLabel = (hariKe: number, totalHari: number) => {
    const pct = (hariKe / totalHari) * 100;
    if (pct >= 75) return 'PANEN';
    if (pct >= 50) return 'GENERATIF';
    if (pct >= 25) return 'VEGETATIF';
    return 'PENYEMAIAN';
  };

  const getPhaseIndex = (hariKe: number, totalHari: number) => {
    const pct = (hariKe / totalHari) * 100;
    if (pct >= 75) return 3;
    if (pct >= 50) return 2;
    if (pct >= 25) return 1;
    return 0;
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Memuat Jadwal...</Text>
      </View>
    );
  }

  const currentTimeNum = getCurrentTimeNum();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Jadwal Perawatan</Text>
        <Text style={styles.headerSubtitle}>{settings.subtitle_jadwal || 'Pantau jadwal perawatan tanaman Anda'}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {(jadwalList || []).length > 0 ? (
          (jadwalList || []).map((jadwal: any) => {
            const hariKe = jadwal.hari_ke || 0;
            const totalHari = jadwal.total_hari_panen || 90;
            const progressPct = jadwal.progres_persen || 0;
            const currentPhaseIndex = getPhaseIndex(hariKe, totalHari);
            const phases = ['PENYEMAIAN', 'VEGETATIF', 'GENERATIF', 'PANEN'];

            return (
              <View key={jadwal.id} style={styles.jadwalCard}>
                {/* Plant Header */}
                <View style={styles.jadwalHeader}>
                  <View style={styles.jadwalInfo}>
                    <Text style={styles.tanamanName}>{jadwal.nama_tanaman}</Text>
                    <View style={styles.lahanRow}>
                      <View style={styles.lahanDot} />
                      <Text style={styles.lahanName}>{jadwal.nama_lahan}</Text>
                    </View>
                  </View>
                  <View style={styles.hariKeBadge}>
                    <CalendarCheck color={Colors.primary} size={14} />
                    <Text style={styles.hariKeText}>HARI KE {hariKe}</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressSection}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                  </View>
                  <Text style={styles.progressPctText}>{progressPct}% COMPLETE</Text>
                </View>

                {/* Phase Labels */}
                <View style={styles.phaseRow}>
                  {phases.map((label, idx) => (
                    <Text 
                      key={label} 
                      style={[
                        styles.phaseLabel, 
                        idx === currentPhaseIndex && styles.phaseLabelActive
                      ]}
                    >
                      {label}
                    </Text>
                  ))}
                </View>

                {/* Tasks Timeline */}
                <View style={styles.tasksSection}>
                  {jadwal.daftar_tugas_hari_ini?.length > 0 ? (
                    jadwal.daftar_tugas_hari_ini.map((task: any, index: number) => {
                      const isDone = task.is_done;
                      const isExpired = task.end_num > 0 && currentTimeNum > task.end_num && !isDone;
                      const isFuture = task.start_num > 0 && currentTimeNum < task.start_num && !isDone;
                      const taskKey = `${jadwal.id}-${task.step}`;
                      const isConfirming = confirmingTask === taskKey;

                      return (
                        <View key={index} style={styles.taskTimelineItem}>
                          {/* Timeline dot and line */}
                          <View style={styles.timelineDotColumn}>
                            <View style={[
                              styles.timelineDot,
                              isDone && styles.timelineDotDone,
                              isExpired && styles.timelineDotExpired
                            ]} />
                            {index < (jadwal.daftar_tugas_hari_ini.length - 1) && (
                              <View style={styles.timelineLine} />
                            )}
                          </View>

                          {/* Task Card */}
                          <View style={[
                            styles.taskCard,
                            isDone && styles.taskCardDone,
                            isExpired && styles.taskCardExpired
                          ]}>
                            {/* Time + Expired Badge Row */}
                            <View style={styles.taskTimeRow}>
                              <View style={styles.taskTimeTag}>
                                <Clock color={Colors.foregroundDim} size={12} />
                                <Text style={styles.taskTimeText}>{task.time}</Text>
                              </View>
                              {isExpired && (
                                <View style={styles.expiredBadge}>
                                  <AlertTriangle color="#fff" size={10} />
                                  <Text style={styles.expiredBadgeText}>EXPIRED</Text>
                                </View>
                              )}
                              {isDone && (
                                <View style={styles.doneBadge}>
                                  <CheckCircle2 color="#fff" size={10} />
                                  <Text style={styles.doneBadgeText}>Selesai</Text>
                                </View>
                              )}
                            </View>

                            {/* Task Body */}
                            <View style={styles.taskBody}>
                              <View style={[styles.taskIconCircle, { backgroundColor: getTaskIconBg(task.category) }]}>
                                {getTaskIcon(task.category)}
                              </View>
                              <View style={styles.taskContentArea}>
                                <Text style={[styles.taskName, isDone && styles.textStrikethrough]}>{task.name}</Text>
                                <Text style={styles.taskDesc} numberOfLines={2}>
                                  {task.description || 'Parameter sistem sedang mengkalibrasi instruksi perawatan harian.'}
                                </Text>
                              </View>

                              {/* Action Button */}
                              {isDone ? (
                                <View style={styles.completedIcon}>
                                  <CheckCircle2 color={Colors.primary} size={24} />
                                </View>
                              ) : isExpired ? (
                                <TouchableOpacity
                                  style={styles.konfirmasiBtn}
                                  onPress={() => handleKonfirmasi(jadwal.id, task.step)}
                                  disabled={isConfirming}
                                >
                                  {isConfirming ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                  ) : (
                                    <>
                                      <CheckCircle2 color="#fff" size={14} />
                                      <Text style={styles.konfirmasiBtnText}>Konfirmasi</Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              ) : isFuture ? (
                                <View style={styles.belumWaktuBtn}>
                                  <Clock color={Colors.foregroundDim} size={14} />
                                  <Text style={styles.belumWaktuText}>Belum Waktunya</Text>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  style={styles.konfirmasiBtn}
                                  onPress={() => handleKonfirmasi(jadwal.id, task.step)}
                                  disabled={isConfirming}
                                >
                                  {isConfirming ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                  ) : (
                                    <>
                                      <CheckCircle2 color="#fff" size={14} />
                                      <Text style={styles.konfirmasiBtnText}>Konfirmasi</Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.noTaskContainer}>
                      <Text style={styles.noTaskText}>Tidak ada tugas untuk hari ini.</Text>
                    </View>
                  )}

                  {/* Perhatian Button if missed tasks > 0 */}
                  {jadwal.missed_tasks_count > 0 && (
                    <View style={styles.attentionRow}>
                      <TouchableOpacity 
                        style={styles.attentionBtn}
                        onPress={() => handleGetAttention(jadwal.id, hariKe, jadwal.missed_tasks_count)}
                      >
                        <AlertTriangle color={Colors.white} size={16} />
                        <Text style={styles.attentionBtnText}>Perhatian</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <CalendarCheck color={Colors.border} size={64} style={{ marginBottom: Spacing.md }} />
            <Text style={styles.emptyTitle}>Belum Ada Jadwal</Text>
            <Text style={styles.emptyDesc}>
              Jadwal akan muncul secara otomatis ketika Anda membuat jadwal tanam baru dari menu Dashboard atau Lahan.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Attention Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={attentionModalVisible}
        onRequestClose={() => setAttentionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIcon}>
              <AlertTriangle color={Colors.danger} size={28} />
            </View>
            <Text style={styles.modalTitle}>Peringatan Kelalaian</Text>
            <Text style={styles.modalSubtitle}>Analisis dari UrbanGrow AI Master Agronomist</Text>
            
            <View style={styles.modalBody}>
              {attentionLoading ? (
                <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={Colors.danger} />
                  <Text style={{ marginTop: Spacing.md, fontFamily: Fonts.medium, color: Colors.foregroundMuted }}>AI sedang menganalisis...</Text>
                </View>
              ) : (
                <Text style={styles.modalText}>{attentionText}</Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setAttentionModalVisible(false)}
              disabled={attentionLoading}
            >
              <Text style={styles.modalCloseBtnText}>Mengerti</Text>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
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
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  jadwalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  jadwalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  jadwalInfo: {
    flex: 1,
  },
  tanamanName: {
    fontFamily: Fonts.displayBold,
    fontSize: 22,
    color: Colors.foreground,
  },
  lahanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  lahanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  lahanName: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.foregroundMuted,
  },
  hariKeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  hariKeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressPctText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.foregroundMuted,
    textAlign: 'right',
    letterSpacing: 0.5,
  },
  phaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingHorizontal: 2,
  },
  phaseLabel: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.foregroundDim,
    letterSpacing: 0.5,
  },
  phaseLabelActive: {
    color: Colors.primary,
    fontFamily: Fonts.semiBold,
  },
  tasksSection: {
    marginTop: Spacing.sm,
  },

  // Timeline
  taskTimelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineDotColumn: {
    alignItems: 'center',
    width: 20,
    marginRight: Spacing.sm,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginTop: 20,
  },
  timelineDotDone: {
    backgroundColor: Colors.primary,
  },
  timelineDotExpired: {
    backgroundColor: Colors.danger,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.borderLight,
    marginTop: 4,
  },

  // Task Card
  taskCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  taskCardDone: {
    opacity: 0.6,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    backgroundColor: 'rgba(34, 197, 94, 0.03)',
  },
  taskCardExpired: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  taskTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: 8,
  },
  taskTimeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskTimeText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.foregroundDim,
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  expiredBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 9,
    color: '#fff',
    letterSpacing: 0.5,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  doneBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 9,
    color: '#fff',
  },

  // Task body
  taskBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  taskContentArea: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  taskName: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.foreground,
    marginBottom: 2,
  },
  textStrikethrough: {
    textDecorationLine: 'line-through',
    color: Colors.foregroundMuted,
  },
  taskDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.foregroundMuted,
    lineHeight: 17,
  },
  completedIcon: {
    padding: 4,
  },
  konfirmasiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  konfirmasiBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: '#fff',
  },
  belumWaktuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  belumWaktuText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.foregroundDim,
  },
  noTaskContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  noTaskText: {
    fontFamily: Fonts.medium,
    color: Colors.foregroundMuted,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    marginTop: Spacing.xxl,
  },
  emptyTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foregroundMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  attentionRow: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
  },
  attentionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    gap: 8,
  },
  attentionBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeaderIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.foreground,
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.foregroundMuted,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  modalBody: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  modalText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 22,
    textAlign: 'center',
  },
  modalCloseBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  modalCloseBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.white,
  },
});
