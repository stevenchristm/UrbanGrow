import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '../../contexts/SettingsContext';
import { lahanAPI } from '../../services/api';
import { Colors, Fonts, Spacing, BorderRadius } from '../../constants/theme';
import { Trees, Plus, MapPin, Thermometer, Sun, Edit2, Trash2, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LahanScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const [lahan, setLahan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Delete Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchLahan = async () => {
    try {
      const response = await lahanAPI.getAll();
      setLahan(response.data.data || []);
    } catch (error) {
      console.log('Error fetching lahan:', error);
      setLahan([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLahan().then(() => setRefreshing(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLahan();
    }, [])
  );

  const openDeleteModal = (id: number) => {
    setSelectedDeleteId(id);
    setDeletePassword('');
    setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!deletePassword) {
      Alert.alert('Error', 'Password konfirmasi wajib diisi.');
      return;
    }
    setDeleting(true);
    try {
      await lahanAPI.delete(selectedDeleteId!, { password_konfirmasi: deletePassword });
      setDeleteModalVisible(false);
      fetchLahan();
    } catch (error: any) {
      console.log('Error deleting lahan:', error);
      Alert.alert('Error', error.response?.data?.error || 'Gagal menghapus lahan.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Memuat Data Lahan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Manajemen Lahan</Text>
          <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.foregroundMuted, marginTop: 4 }}>
            {settings.subtitle_lahan || 'Halaman manajemen lahan'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/lahan/create')}>
          <Plus color={Colors.white} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {(lahan || []).length > 0 ? (
          (lahan || []).map((item: any) => (
            <View key={item.id_lahan} style={styles.lahanCard}>
              <View style={styles.lahanHeader}>
                <View style={styles.lahanIconWrapper}>
                  <Trees color={Colors.primary} size={24} />
                </View>
                <View style={styles.lahanTitleContainer}>
                  <Text style={styles.lahanName}>{item.nama_lahan}</Text>
                  <View style={styles.locationBadge}>
                    <MapPin color={Colors.foregroundMuted} size={12} />
                    <Text style={styles.locationText}>{item.lokasi_lahan || 'Belum diatur'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.lahanStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Luas Area</Text>
                  <Text style={styles.statValue}>{item.luas_lahan} m²</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Suhu Rata-rata</Text>
                  <View style={styles.statValueWrapper}>
                    <Thermometer color={Colors.warning} size={14} style={{ marginRight: 4 }} />
                    <Text style={styles.statValue}>{item.suhu_lahan}°C</Text>
                  </View>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Intensitas Cahaya</Text>
                  <View style={styles.statValueWrapper}>
                    <Sun color={Colors.warning} size={14} style={{ marginRight: 4 }} />
                    <Text style={styles.statValue}>{item.cahaya_lahan} lx</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardActionsRow}>
                <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={() => router.push(`/lahan/rekomendasi/${item.id_lahan}`)}>
                  <Text style={styles.actionBtnText}>Lihat Rekomendasi AI</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconActionBtn} onPress={() => router.push(`/lahan/edit/${item.id_lahan}`)}>
                  <Edit2 color={Colors.foregroundMuted} size={20} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconActionBtn, styles.deleteActionBtn]} onPress={() => openDeleteModal(item.id_lahan)}>
                  <Trash2 color={Colors.danger} size={20} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Trees color={Colors.border} size={64} style={{ marginBottom: Spacing.md }} />
            <Text style={styles.emptyTitle}>Belum Ada Lahan</Text>
            <Text style={styles.emptyDesc}>Tambahkan data lahan pertanian Anda untuk mendapatkan rekomendasi tanaman dan jadwal AI.</Text>
            <TouchableOpacity style={styles.addPrimaryBtn} onPress={() => router.push('/lahan/create')}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.addPrimaryBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Plus color={Colors.white} size={20} style={{ marginRight: 8 }} />
                <Text style={styles.addPrimaryBtnText}>Tambah Lahan Baru</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>Hapus Lahan</Text>
              </View>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <X color={Colors.foreground} size={24} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDesc}>
              Tindakan ini tidak dapat dibatalkan. Semua data penanaman di lahan ini akan ikut terhapus.
            </Text>

            <Text style={styles.modalLabel}>KONFIRMASI PASSWORD</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Masukkan password Anda"
              placeholderTextColor={Colors.foregroundDim}
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalDeleteBtn, deleting && { opacity: 0.7 }]} 
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.modalDeleteText}>Hapus Permanen</Text>
                )}
              </TouchableOpacity>
            </View>
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
  headerTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 24,
    color: Colors.foreground,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  lahanCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  lahanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lahanIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  lahanTitleContainer: {
    flex: 1,
  },
  lahanName: {
    fontFamily: Fonts.displaySemiBold,
    fontSize: 18,
    color: Colors.foreground,
    marginBottom: 4,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.foregroundMuted,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  lahanStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.foregroundDim,
    marginBottom: 4,
  },
  statValueWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.foreground,
  },
  actionBtn: {
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
    paddingHorizontal: Spacing.lg,
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
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  addPrimaryBtn: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  addPrimaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  addPrimaryBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.white,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconActionBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  deleteActionBtn: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 18,
    color: Colors.danger,
  },
  modalDesc: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foregroundMuted,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  modalLabel: {
    fontFamily: Fonts.displayBold,
    fontSize: 12,
    color: Colors.foreground,
    marginBottom: 8,
    letterSpacing: 1,
  },
  modalInput: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.foreground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    marginBottom: Spacing.xl,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: Colors.foreground,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    backgroundColor: Colors.danger,
  },
  modalDeleteText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.white,
  },
});
