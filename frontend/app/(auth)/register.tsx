import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Mail, Lock, ArrowLeft } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

export default function RegisterScreen() {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!nama || !email || !password) {
      setErrorMsg('Semua kolom harus diisi');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Kata sandi minimal 8 karakter');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const result = await register(nama, email, password);
    
    if (result.success) {
      router.replace('/login');
    } else {
      setErrorMsg(result.error || 'Pendaftaran gagal');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        <LinearGradient
          colors={[Colors.background, Colors.surface]}
          style={styles.background}
        />
        
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.foreground} size={24} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Daftar Akun Baru</Text>
          <Text style={styles.subtitle}>Bergabung dengan komunitas UrbanGrow</Text>
        </View>

        <View style={styles.formContainer}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Lengkap</Text>
            <View style={styles.inputWrapper}>
              <User color={Colors.foregroundMuted} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Petani Modern"
                placeholderTextColor={Colors.foregroundDim}
                value={nama}
                onChangeText={setNama}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Mail color={Colors.foregroundMuted} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="petani@example.com"
                placeholderTextColor={Colors.foregroundDim}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kata Sandi</Text>
            <View style={styles.inputWrapper}>
              <Lock color={Colors.foregroundMuted} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Minimal 8 karakter"
                placeholderTextColor={Colors.foregroundDim}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Konfirmasi Kata Sandi</Text>
            <View style={styles.inputWrapper}>
              <Lock color={Colors.foregroundMuted} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ulangi kata sandi"
                placeholderTextColor={Colors.foregroundDim}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>Daftar Sekarang</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Sudah punya akun? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Masuk di sini</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: Spacing.xxl,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    marginBottom: Spacing.xxxl,
    marginTop: 40,
  },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 32,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.foregroundMuted,
  },
  formContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.xxl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: Colors.danger,
    fontFamily: Fonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    height: 50,
  },
  inputIcon: {
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.foreground,
    fontFamily: Fonts.regular,
    fontSize: 15,
    height: '100%',
  },
  button: {
    marginTop: Spacing.md,
    height: 50,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: Fonts.semiBold,
    color: Colors.white,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
  },
  footerText: {
    fontFamily: Fonts.regular,
    color: Colors.foregroundMuted,
  },
  footerLink: {
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
});
