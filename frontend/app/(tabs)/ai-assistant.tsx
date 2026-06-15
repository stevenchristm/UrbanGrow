import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Alert } from 'react-native';
import { aiAPI } from '../../services/api';
import { useSettings } from '../../contexts/SettingsContext';
import { Colors, Fonts, Spacing, BorderRadius } from '../../constants/theme';
import { Send, Image as ImageIcon, Trash2, Bot, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../../constants/config';
import { LinearGradient } from 'expo-linear-gradient';

interface Message {
  id: number | string;
  role: 'user' | 'ai';
  content: string;
  image?: string | null;
}

export default function AiAssistantScreen() {
  const { settings } = useSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await aiAPI.getHistory();
      const historyData = response.data.data;
      
      const formattedMessages: Message[] = [];
      
      // The API returns an array of chat interactions (message + response)
      historyData.forEach((item: any) => {
        // Add user message
        if (item.message || item.image) {
          formattedMessages.push({
            id: `user-${item.id}`,
            role: 'user',
            content: item.message || '',
            image: item.image,
          });
        }
        // Add AI response
        if (item.response) {
          formattedMessages.push({
            id: `ai-${item.id}`,
            role: 'ai',
            content: item.response,
          });
        }
      });
      
      setMessages(formattedMessages);
      scrollToBottom();
    } catch (error) {
      console.log('Error fetching AI history:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;

    const currentText = inputText;
    const currentImage = selectedImage;
    
    // Add temp message to UI
    const tempId = Date.now();
    const newUserMsg: Message = {
      id: `temp-${tempId}`,
      role: 'user',
      content: currentText,
      image: currentImage,
    };
    
    setMessages((prev) => [...prev, newUserMsg]);
    setInputText('');
    setSelectedImage(null);
    setLoading(true);
    scrollToBottom();

    try {
      const formData = new FormData();
      formData.append('message', currentText);
      formData.append('lat', '-7.9839'); // Dummy coordinates for Malang
      formData.append('lon', '112.6214');

      if (currentImage) {
        // Determine file type
        const filename = currentImage.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('image', {
          uri: Platform.OS === 'ios' ? currentImage.replace('file://', '') : currentImage,
          name: filename,
          type,
        } as any);
      }

      const response = await aiAPI.chat(formData);
      
      const aiResponseMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: response.data.response,
      };
      
      setMessages((prev) => [...prev, aiResponseMsg]);
    } catch (error) {
      console.log('Error sending AI message:', error);
      Alert.alert('Error', 'Gagal mengirim pesan ke AI');
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const clearChat = () => {
    Alert.alert(
      'Hapus Riwayat',
      'Apakah Anda yakin ingin menghapus semua riwayat percakapan dengan AI?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            try {
              await aiAPI.clear();
              setMessages([]);
            } catch (error) {
              console.log('Error clearing chat:', error);
            }
          }
        }
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperAi]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Bot color={Colors.white} size={20} />
          </View>
        )}
        
        <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleAi]}>
          {item.image && (
            <Image 
              source={{ uri: item.image.startsWith('file://') ? item.image : `${API_URL}/uploads/${item.image}`, headers: { 'ngrok-skip-browser-warning': 'true' } }} 
              style={styles.messageImage} 
            />
          )}
          {item.content ? (
            <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAi]}>
              {item.content}
            </Text>
          ) : null}
        </View>

        {isUser && (
          <View style={styles.userAvatar}>
            <User color={Colors.white} size={18} />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Bot color={Colors.primary} size={28} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.headerTitle}>AI Pakar Pertanian</Text>
            <Text style={styles.headerSubtitle}>{settings.subtitle_ai || 'Tanya masalah tanaman Anda'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={clearChat}>
          <Trash2 color={Colors.foregroundMuted} size={20} />
        </TouchableOpacity>
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
            <View style={styles.emptyIconWrapper}>
              <Bot color={Colors.primary} size={48} />
            </View>
            <Text style={styles.emptyTitle}>Halo! Saya Pakar AI UrbanGrow.</Text>
            <Text style={styles.emptyDesc}>
              Silakan tanyakan pertanyaan seputar pertanian, hama, nutrisi tanaman, atau kirim foto daun untuk dianalisa.
            </Text>
          </View>
        }
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputArea}>
          {selectedImage && (
            <View style={styles.selectedImageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
                <Text style={styles.removeImageText}>×</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
              <ImageIcon color={Colors.foregroundMuted} size={24} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.textInput}
              placeholder="Tulis pertanyaan..."
              placeholderTextColor={Colors.foregroundDim}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            
            <TouchableOpacity 
              style={[styles.sendBtn, (!inputText.trim() && !selectedImage) && styles.sendBtnDisabled]} 
              onPress={sendMessage}
              disabled={loading || (!inputText.trim() && !selectedImage)}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <LinearGradient
                  colors={(!inputText.trim() && !selectedImage) ? [Colors.border, Colors.border] : [Colors.primary, Colors.primaryDark]}
                  style={styles.sendBtnGradient}
                >
                  <Send color={Colors.white} size={18} />
                </LinearGradient>
              )}
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
  headerSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.foregroundMuted,
  },
  clearBtn: {
    padding: Spacing.sm,
  },
  chatList: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 18,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.foregroundMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.xl,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    alignItems: 'flex-end',
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
  },
  messageWrapperAi: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  messageBubbleUser: {
    backgroundColor: Colors.surfaceLight,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  messageBubbleAi: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  messageText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextUser: {
    color: Colors.foreground,
  },
  messageTextAi: {
    color: Colors.foreground,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
  },
  inputArea: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    padding: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.md,
  },
  selectedImageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    marginBottom: Spacing.md,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    backgroundColor: Colors.danger,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: Colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 18,
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
  attachBtn: {
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
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
    paddingHorizontal: Spacing.sm,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: 4,
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
