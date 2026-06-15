import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Leaf, Mail, Lock } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Email dan password harus diisi');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const result = await login(email, password);
    
    if (result.success) {
      if ((result as any).role === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(tabs)');
      }
    } else {
      setErrorMsg(result.error || 'Login gagal');
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
        
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Leaf color={Colors.primary} size={40} strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>UrbanGrow</Text>
          <Text style={styles.subtitle}>Masuk ke akun pertanian Anda</Text>
        </View>

        <View style={styles.formContainer}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

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
                placeholder="••••••••"
                placeholderTextColor={Colors.foregroundDim}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
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
                <Text style={styles.buttonText}>Masuk</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Belum punya akun? </Text>
            <Link href="/register" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Daftar Sekarang</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
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
