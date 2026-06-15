import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { lahanAPI } from '../../../services/api';
import { Colors, Fonts, Spacing, BorderRadius } from '../../../constants/theme';
import { ArrowLeft, Save, Trees } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LahanEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nama_lahan: '',
    lokasi_lahan: '',
    luas_lahan: '',
    suhu_lahan: '',
    cahaya_lahan: '',
    password_konfirmasi: ''
  });

  useEffect(() => {
    const fetchLahan = async () => {
      try {
        const response = await lahanAPI.get(Number(id));
        const data = response.data.data;
        setForm({
          nama_lahan: data.nama_lahan || '',
          lokasi_lahan: data.lokasi_lahan || '',
          luas_lahan: data.luas_lahan?.toString() || '',
          suhu_lahan: data.suhu_lahan?.toString() || '',
          cahaya_lahan: data.cahaya_lahan?.toString() || '',
          password_konfirmasi: ''
        });
      } catch (error) {
        console.log('Error fetching lahan details:', error);
        Alert.alert('Error', 'Gagal memuat data lahan.');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchLahan();
  }, [id]);

  const handleChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.nama_lahan || !form.lokasi_lahan || !form.luas_lahan || !form.suhu_lahan || !form.cahaya_lahan) {
      Alert.alert('Error', 'Harap isi semua field parameter lahan.');
      return;
    }
    if (!form.password_konfirmasi) {
      Alert.alert('Error', 'Password konfirmasi wajib diisi untuk memvalidasi perubahan.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nama_lahan: form.nama_lahan,
        lokasi_lahan: form.lokasi_lahan,
        luas_lahan: parseFloat(form.luas_lahan),
        suhu_lahan: parseFloat(form.suhu_lahan),
        cahaya_lahan: parseFloat(form.cahaya_lahan),
        password_konfirmasi: form.password_konfirmasi
      };

      await lahanAPI.update(Number(id), payload);
      Alert.alert('Sukses', 'Data lahan berhasil diperbarui!');
      router.back();
    } catch (error: any) {
      console.log('Error updating lahan:', error);
      const errorMsg = error.response?.data?.error || 'Gagal menyimpan perubahan.';
      Alert.alert('Error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Memuat Data Lahan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={Colors.foreground} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Data Lahan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.introContainer}>
          <Trees color={Colors.primary} size={32} style={{ marginBottom: Spacing.sm }} />
          <Text style={styles.introTitle}>Penyesuaian Parameter Lahan</Text>
          <Text style={styles.introDesc}>Perbarui kondisi lingkungan atau lokasi untuk kalibrasi ulang sistem AI.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Lahan / Area</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Balkon Depan / Atap Rumah"
              placeholderTextColor={Colors.foregroundDim}
              value={form.nama_lahan}
              onChangeText={(text) => handleChange('nama_lahan', text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lokasi Geografis (Kota)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Malang / Jakarta Selatan"
              placeholderTextColor={Colors.foregroundDim}
              value={form.lokasi_lahan}
              onChangeText={(text) => handleChange('lokasi_lahan', text)}
            />
            <Text style={styles.helpText}>Mempengaruhi data cuaca real-time pada penjadwalan.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Luas Lahan (m²)</Text>
            <TextInput
              style={styles.input}
              placeholder="Misal: 5"
              placeholderTextColor={Colors.foregroundDim}
              keyboardType="numeric"
              value={form.luas_lahan}
              onChangeText={(text) => handleChange('luas_lahan', text)}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
              <Text style={styles.label}>Suhu Rata-rata (°C)</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: 28"
                placeholderTextColor={Colors.foregroundDim}
                keyboardType="numeric"
                value={form.suhu_lahan}
                onChangeText={(text) => handleChange('suhu_lahan', text)}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: Spacing.sm }]}>
              <Text style={styles.label}>Sinar Matahari (Jam)</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: 6"
                placeholderTextColor={Colors.foregroundDim}
                keyboardType="numeric"
                value={form.cahaya_lahan}
                onChangeText={(text) => handleChange('cahaya_lahan', text)}
              />
            </View>
          </View>

          <View style={styles.securityBox}>
            <Text style={styles.securityLabel}>KONFIRMASI KEAMANAN</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.background }]}
              placeholder="Masukkan password Anda"
              placeholderTextColor={Colors.foregroundDim}
              secureTextEntry
              value={form.password_konfirmasi}
              onChangeText={(text) => handleChange('password_konfirmasi', text)}
            />
            <Text style={styles.securityHelpText}>Wajib diisi untuk memvalidasi perubahan kritis pada lahan.</Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={submitting}>
            <Text style={styles.cancelBtnText}>Batal dan Kembali</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.saveBtn, submitting && styles.saveBtnDisabled]} 
            onPress={handleSave} 
            disabled={submitting}
          >
            <LinearGradient
              colors={[Colors.warning, '#f97316']}
              style={styles.saveBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Perbarui Parameter</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginTop: 12,
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
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.displaySemiBold,
    fontSize: 18,
    color: Colors.foreground,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  introContainer: {
    marginBottom: Spacing.xl,
  },
  introTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 22,
    color: Colors.foreground,
    marginBottom: 4,
  },
  introDesc: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foregroundMuted,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.foreground,
    marginBottom: 8,
  },
  input: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.foreground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  helpText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.foregroundDim,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
  },
  securityBox: {
    marginTop: Spacing.md,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopStyle: 'dashed',
    borderTopColor: Colors.warning,
  },
  securityLabel: {
    fontFamily: Fonts.displayBold,
    fontSize: 12,
    color: Colors.warning,
    marginBottom: 8,
    letterSpacing: 1,
  },
  securityHelpText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.warning,
    marginTop: 6,
  },
  actionContainer: {
    marginTop: Spacing.md,
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  cancelBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: Colors.foreground,
  },
  saveBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.white,
  },
});
