import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Fonts, Spacing, BorderRadius } from '../../constants/theme';
import { ArrowLeft, Users, Settings, LogOut } from 'lucide-react-native';
import { API_URL } from '../../constants/config';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 2 - Spacing.lg * 1.5;

export default function UserListScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAll();
      setUsers(response.data.data);
    } catch (error) {
      console.log('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderUserCard = ({ item }: { item: any }) => {
    const isMe = item.id_user === user?.id_user;

    return (
      <View style={styles.card}>
        <View style={styles.avatarContainer}>
          {item.logo_path ? (
            <Image source={{ uri: `${API_URL}/uploads/${item.logo_path}`, headers: { 'ngrok-skip-browser-warning': 'true' } }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{item.nama.charAt(0).toUpperCase()}</Text>
          )}
          {isMe && (
            <View style={styles.meBadge}>
              <Text style={styles.meBadgeText}>SAYA</Text>
            </View>
          )}
        </View>

        <Text style={styles.userName} numberOfLines={1}>{item.nama}</Text>
        <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>PETANI AKTIF</Text>
        </View>

        {isMe && (
          <TouchableOpacity 
            style={styles.editBtn} 
            onPress={() => router.push('/users/edit')}
          >
            <Settings size={14} color={Colors.foregroundMuted} />
            <Text style={styles.editBtnText}>Pengaturan Akun</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#e6f7ef', Colors.background]} style={styles.headerGradient}>
        <View style={styles.header}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ArrowLeft color={Colors.foreground} size={24} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Users color={Colors.primary} size={24} />
              <Text style={styles.headerTitle}>Komunitas Petani Digital</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <LogOut color={Colors.danger} size={20} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.subtitle}>
          Terhubung, belajar, dan berkolaborasi dengan jaringan agronomis modern yang menggunakan ekosistem UrbanGrow.
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id_user.toString()}
          renderItem={renderUserCard}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.row}
        />
      )}
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
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backBtn: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
    marginRight: Spacing.sm,
  },
  logoutBtn: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.md,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.foreground,
    marginLeft: 8,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foregroundMuted,
    lineHeight: 22,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  avatarText: {
    fontFamily: Fonts.displayBold,
    fontSize: 28,
    color: Colors.white,
  },
  meBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  meBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 8,
    color: Colors.white,
  },
  userName: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.foreground,
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.foregroundMuted,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  roleBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  roleText: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: Colors.primary,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    width: '100%',
    justifyContent: 'center',
  },
  editBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.foregroundMuted,
    marginLeft: 6,
  },
});
