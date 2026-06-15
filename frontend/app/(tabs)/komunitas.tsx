import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { chatAPI, userAPI } from '../../services/api';
import wsService from '../../services/websocket';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Fonts, Spacing, BorderRadius } from '../../constants/theme';
import { Send, Users, LogOut, Info, Trash2 } from 'lucide-react-native';
import { API_URL } from '../../constants/config';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSettings } from '../../contexts/SettingsContext';

export default function KomunitasScreen() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [onlineCount, setOnlineCount] = useState(1);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();

    // Listen for new WebSocket messages
    const handleNewMessage = (payload: any) => {
      setMessages((prev) => [...prev, payload]);
      scrollToBottom();
    };

    wsService.on('new_message', handleNewMessage);

    return () => {
      wsService.off('new_message', handleNewMessage);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await chatAPI.getMessages();
      setMessages(response.data);
      scrollToBottom();
    } catch (error) {
      console.log('Error fetching chat:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messages.length > 0) {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    }, 200);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const msg = inputText;
    setInputText('');

    try {
      await chatAPI.send(msg);
      // The message will come back via WebSocket, no need to add locally here
      // to avoid duplicates if broadcast works fast enough.
    } catch (error) {
      console.log('Error sending message:', error);
      // Optionally add it locally if it failed or show error
    }
  };

  const handleClearChat = () => {
    Alert.alert(
      "Hapus Riwayat",
      "Yakin ingin menghapus seluruh riwayat chat komunitas dari tampilan Anda?",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Hapus", 
          style: "destructive",
          onPress: async () => {
            try {
              await chatAPI.clear();
              setMessages([]);
            } catch (error) {
              console.log('Error clearing chat:', error);
              Alert.alert('Error', 'Gagal menghapus riwayat chat.');
            }
          }
        }
      ]
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.user_id === user?.id_user;

    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
        {!isMe && (
          <View style={styles.avatar}>
            {item.user.logo_path ? (
              <Image source={{ uri: `${API_URL}/uploads/${item.user.logo_path}`, headers: { 'ngrok-skip-browser-warning': 'true' } }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{item.user.nama.charAt(0)}</Text>
            )}
          </View>
        )}
        
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
          {isMe ? (
            <Text style={[styles.senderName, { color: 'rgba(255, 255, 255, 0.9)' }]}>Anda</Text>
          ) : (
            <Text style={styles.senderName}>{item.user.nama}</Text>
          )}
          <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
            {item.message}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerTitleContainer} onPress={() => router.push('/users')}>
          <Users color={Colors.primary} size={28} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Komunitas</Text>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>
                {wsService.getIsConnected() ? 'Terhubung' : 'Menghubungkan...'}
              </Text>
            </View>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 11, color: Colors.foregroundMuted, marginTop: 4 }}>
              {settings.subtitle_komunitas || 'Terhubung, belajar, dan berkolaborasi dengan komunitas'}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]} onPress={handleClearChat}>
            <Trash2 color={Colors.danger} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Info color={Colors.foregroundMuted} size={48} style={{ marginBottom: Spacing.md }} />
            <Text style={styles.emptyTitle}>Belum ada pesan</Text>
            <Text style={styles.emptyDesc}>
              Jadilah yang pertama menyapa komunitas UrbanGrow!
            </Text>
          </View>
        }
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Tulis pesan ke komunitas..."
              placeholderTextColor={Colors.foregroundDim}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <LinearGradient
                colors={!inputText.trim() ? [Colors.border, Colors.border] : [Colors.primary, Colors.primaryDark]}
                style={styles.sendBtnGradient}
              >
                <Send color={Colors.white} size={18} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.foreground,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 6,
  },
  onlineText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.foregroundMuted,
  },
  logoutBtn: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.md,
  },
  chatList: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 18,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foregroundMuted,
    textAlign: 'center',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'flex-end',
  },
  messageWrapperMe: {
    justifyContent: 'flex-end',
  },
  messageWrapperOther: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontFamily: Fonts.semiBold,
    color: Colors.foregroundMuted,
    fontSize: 14,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
  },
  messageBubbleMe: {
    backgroundColor: Colors.primaryDark,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: Colors.surfaceLight,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  senderName: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primaryLight,
    marginBottom: 4,
  },
  messageText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextMe: {
    color: Colors.white,
  },
  messageTextOther: {
    color: Colors.foreground,
  },
  timeText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  timeTextOther: {
    color: Colors.foregroundDim,
  },
  inputArea: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    padding: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    color: Colors.foreground,
    fontFamily: Fonts.regular,
    fontSize: 15,
    minHeight: 40,
    maxHeight: 100,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: Spacing.md,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: 4,
    marginLeft: 4,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
