import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { lahanAPI } from '../../../services/api';
import { API_URL } from '../../../constants/config';
import { Colors, Fonts, Spacing, BorderRadius } from '../../../constants/theme';
import { ArrowLeft, Sparkles, MapPin, Thermometer, Sun, Trees } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LahanRekomendasiScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [lahan, setLahan] = useState<any>(null);
  const [rekomendasi, setRekomendasi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRekomendasi = async () => {
      try {
        const response = await lahanAPI.getRekomendasi(Number(id));
        setLahan(response.data.lahan);
        setRekomendasi(response.data.rekomendasi || []);
      } catch (error) {
        console.log('Error fetching rekomendasi:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRekomendasi();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: Spacing.md }} />
        <Text style={styles.loadingText}>AI sedang menganalisis kecocokan lahan Anda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={Colors.foreground} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rekomendasi AI</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.introContainer}>
          <Sparkles color={Colors.primary} size={28} style={{ marginBottom: Spacing.sm }} />
          <Text style={styles.introTitle}>Analitik Kecocokan AI</Text>
          <Text style={styles.introDesc}>Parameter sistem telah dipetakan terhadap basis data botani UrbanFarm.</Text>
        </View>

        {lahan && (
          <View style={styles.activeLahanCard}>
            <Text style={styles.activeLahanLabel}>Lahan Aktif:</Text>
            <View style={styles.activeLahanRow}>
              <Text style={styles.activeLahanName}>{lahan.nama_lahan}</Text>
              <View style={styles.activeLahanStats}>
                <Thermometer color={Colors.warning} size={14} style={{ marginRight: 4 }} />
                <Text style={styles.activeLahanStatText}>{lahan.suhu_lahan}°C</Text>
                <Text style={styles.activeLahanStatDivider}> / </Text>
                <Sun color={Colors.warning} size={14} style={{ marginRight: 4 }} />
                <Text style={styles.activeLahanStatText}>{lahan.cahaya_lahan}h</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.cardsContainer}>
          {rekomendasi.map((item, index) => {
            const isHighMatch = item.skor_kecocokan >= 80;
            const matchColor = isHighMatch ? Colors.primary : Colors.warning;
            
            return (
              <View key={index} style={styles.rekCard}>
                <View style={styles.imageContainer}>
                  {item.foto_tanaman ? (
                    <Image 
                      source={{ uri: `${API_URL}/uploads/${item.foto_tanaman}`, headers: { 'ngrok-skip-browser-warning': 'true' } }} 
                      style={styles.cardImage} 
                    />
                  ) : (
                    <View style={styles.imageFallback}>
                      <Trees color={Colors.border} size={32} />
                    </View>
                  )}
                  <View style={[styles.matchBadge, { backgroundColor: matchColor }]}>
                    <Text style={styles.matchBadgeText}>MATCH {item.skor_kecocokan}%</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.plantName}>{item.nama_tanaman}</Text>
                  <Text style={styles.plantReason}>{item.alasan_ai || `Tanaman ${item.nama_tanaman} memiliki kecocokan yang baik.`}</Text>

                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>SUHU IDEAL</Text>
                      <Text style={styles.statValue}>{item.suhu_min.toFixed(2)}-{item.suhu_max.toFixed(2)}°C</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>KEBUTUHAN CAHAYA</Text>
                      <Text style={styles.statValue}>{item.cahaya_jam ? `${item.cahaya_jam} Jam` : 'Optimal'}</Text>
                    </View>
                  </View>

                  {item.video_id ? (
                    <TouchableOpacity 
                      style={styles.guideBtn}
                      onPress={() => {
                        const videoId = item.video_id;
                        const url = videoId.startsWith('http') ? videoId : `https://www.youtube.com/watch?v=${videoId}`;
                        Linking.openURL(url).catch(() => {
                          Alert.alert('Error', 'Tidak dapat membuka video tutorial.');
                        });
                      }}
                    >
                      <Text style={styles.guideBtnText}>Panduan Tanam</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.guideBtn, { opacity: 0.5 }]} 
                      onPress={() => Alert.alert('Info', 'Video tutorial belum tersedia untuk tanaman ini.')}
                    >
                      <Text style={styles.guideBtnText}>Panduan Tanam</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
          
          {rekomendasi.length === 0 && (
            <Text style={{ textAlign: 'center', fontFamily: Fonts.medium, color: Colors.foregroundMuted, marginTop: Spacing.xl }}>
              Tidak ada rekomendasi yang ditemukan.
            </Text>
          )}
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
    marginBottom: Spacing.lg,
  },
  introTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.foreground,
    marginBottom: 4,
  },
  introDesc: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foregroundMuted,
    lineHeight: 22,
  },
  activeLahanCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  activeLahanLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.foregroundDim,
    marginBottom: 4,
  },
  activeLahanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeLahanName: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.primaryDark,
  },
  activeLahanStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeLahanStatText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.foreground,
  },
  activeLahanStatDivider: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.border,
    marginHorizontal: 4,
  },
  cardsContainer: {
    gap: Spacing.lg,
  },
  rekCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: Colors.background,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  matchBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.white,
  },
  cardBody: {
    padding: Spacing.lg,
  },
  plantName: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.foreground,
    marginBottom: 6,
  },
  plantReason: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foregroundMuted,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: Colors.foregroundDim,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.foreground,
  },
  guideBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  guideBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.white,
  },
});
