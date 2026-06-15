import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Fonts, Spacing, BorderRadius } from '../../constants/theme';
import { ArrowLeft } from 'lucide-react-native';
import { API_URL } from '../../constants/config';
import { LinearGradient } from 'expo-linear-gradient';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth(); 

  const [nama, setNama] = useState(user?.nama || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [image, setImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!nama || !email || !password) {
      Alert.alert('Gagal', 'Nama, email, dan password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('nama', nama);
      formData.append('email', email);
      formData.append('password_konfirmasi', password);

      if (image) {
        formData.append('logo', {
          uri: image.uri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        } as any);
      }

      const response = await userAPI.update(user.id_user, formData);
      if (response.data.success) {
        if (response.data.user) {
          updateUser(response.data.user);
        }
        Alert.alert('Berhasil', response.data.message, [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      console.log('Error updating profile:', error.response?.data || error);
      Alert.alert('Error', error.response?.data?.error || 'Gagal memperbarui profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#e6f7ef', Colors.background]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft color={Colors.foreground} size={24} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.pageTitle}>Edit Profil Petani</Text>
            <Text style={styles.pageSubtitle}>Perbarui informasi identitas petani kota Anda.</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Foto Profil Anda:</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {image ? (
                  <Image source={{ uri: image.uri }} style={styles.previewImage} />
                ) : user?.logo_path ? (
                  <Image source={{ uri: `${API_URL}/uploads/${user.logo_path}`, headers: { 'ngrok-skip-browser-warning': 'true' } }} style={styles.previewImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.avatarText}>{user?.nama?.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.imagePickerOverlay}>
                  <Text style={styles.imagePickerText}>Klik untuk ganti foto profil (PNG/JPG)</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nama Lengkap:</Text>
              <TextInput
                style={styles.input}
                value={nama}
                onChangeText={setNama}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor={Colors.foregroundMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Alamat Email:</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Masukkan alamat email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={Colors.foregroundMuted}
              />
            </View>

            <View style={styles.securityBox}>
              <Text style={styles.securityTitle}>Konfirmasi Keamanan:</Text>
              <Text style={styles.securityDesc}>Wajib masukkan password akun Anda untuk menyimpan perubahan.</Text>
              <TextInput
                style={[styles.input, styles.inputWhite]}
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan password Anda"
                secureTextEntry
                placeholderTextColor={Colors.foregroundMuted}
              />
            </View>

            <TouchableOpacity 
              style={[styles.btnSave, loading && styles.btnDisabled]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.btnSaveText}>Simpan Perubahan</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancel} onPress={() => router.back()}>
              <Text style={styles.btnCancelText}>Batal dan Kembali</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  scrollContent: {
    padding: Spacing.lg,
    alignItems: 'center',
    paddingBottom: 60,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  pageTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 24,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  pageSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foregroundMuted,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  formGroup: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.foreground,
    backgroundColor: Colors.surface,
  },
  inputWhite: {
    backgroundColor: Colors.white,
    marginTop: Spacing.sm,
  },
  imagePicker: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  avatarText: {
    fontFamily: Fonts.displayBold,
    fontSize: 24,
    color: Colors.white,
  },
  imagePickerOverlay: {
    alignItems: 'center',
  },
  imagePickerText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.foregroundMuted,
  },
  securityBox: {
    width: '100%',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  securityTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: '#b45309',
    marginBottom: 4,
  },
  securityDesc: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#d97706',
  },
  btnSave: {
    width: '100%',
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnSaveText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.white,
  },
  btnCancel: {
    paddingVertical: Spacing.sm,
  },
  btnCancelText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.foregroundMuted,
  },
});
