import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { QUICK_REPLY_TEMPLATES, useChatStore } from '../../../store/chatStore';
import { useModeStore } from '../../../store/modeStore';
import { ChatMessage } from '../../../types';
import { THEME } from '../../../ui/theme';

interface ChatScreenProps {
  victimId: string;
  onBack: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ victimId, onBack }) => {
  const { mode } = useModeStore();
  const { getMessagesForVictim, addMessage, receiveMessage } = useChatStore();
  const [inputText, setInputText] = useState('');

  const messages = getMessagesForVictim(victimId);
  const senderRole = mode === 'RESCUE' ? 'RESCUER' : 'VICTIM';

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    setInputText('');
    await addMessage(victimId, text, senderRole);

    // If simulating, trigger automated victim reply after 1.5s
    if (senderRole === 'RESCUER') {
      setTimeout(() => {
        const simulatedReplies = [
          'I can hear you! I am trapped beneath a fallen bookshelf.',
          'Please hurry, my oxygen is running low.',
          'I am tapping on the metal pipe three times.',
          'Understood, remaining still as instructed.',
        ];
        const randomReply = simulatedReplies[Math.floor(Math.random() * simulatedReplies.length)];
        receiveMessage(victimId, randomReply);
      }, 1500);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender === senderRole;

    return (
      <View style={[styles.bubbleWrapper, isMe ? styles.myBubbleWrapper : styles.theirBubbleWrapper]}>
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={styles.bubbleText}>{item.text}</Text>
          <View style={styles.bubbleFooter}>
            <Text style={styles.timestampText}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
              <Text
                style={[
                  styles.statusText,
                  item.status === 'DELIVERED' && styles.statusDelivered,
                  item.status === 'FAILED' && styles.statusFailed,
                ]}
              >
                {item.status === 'DELIVERED' ? '✓✓ DELIVERED' : item.status === 'TRANSMITTING' ? '⏳ SENDING' : item.status}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.navTitleCenter}>
          <Text style={styles.navTitle}>Offline P2P Chat</Text>
          <Text style={styles.navSubtitle}>Target: #{victimId.slice(-6)} • Direct BLE Link</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Messages List */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📡</Text>
              <Text style={styles.emptyTitle}>Direct Peer-to-Peer BLE Chat</Text>
              <Text style={styles.emptyDesc}>
                Packets are transmitted directly via BLE ATT MTU characteristics. No internet, cell tower, or Wi-Fi required.
              </Text>
            </View>
          }
        />

        {/* Quick Reply Chips */}
        <View style={styles.quickRepliesContainer}>
          <Text style={styles.quickReplyLabel}>QUICK STATUS RESPONSES:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
            {QUICK_REPLY_TEMPLATES.map((tpl, i) => (
              <TouchableOpacity key={i} onPress={() => handleSend(tpl)} style={styles.quickChip}>
                <Text style={styles.quickChipText}>{tpl}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type short message..."
            placeholderTextColor={THEME.colors.textMuted}
            onSubmitEditing={() => handleSend(inputText)}
          />
          <TouchableOpacity onPress={() => handleSend(inputText)} style={styles.sendBtn}>
            <Text style={styles.sendBtnText}>SEND</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.radarBlue,
  },
  navTitleCenter: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  navSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  keyboardContainer: {
    flex: 1,
  },
  listContent: {
    padding: THEME.spacing.md,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  bubbleWrapper: {
    marginVertical: 4,
    maxWidth: '82%',
  },
  myBubbleWrapper: {
    alignSelf: 'flex-end',
  },
  theirBubbleWrapper: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: THEME.radii.md,
  },
  myBubble: {
    backgroundColor: THEME.colors.radarBlue,
    borderBottomRightRadius: 2,
  },
  theirBubble: {
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderBottomLeftRadius: 2,
  },
  bubbleText: {
    fontSize: 14,
    color: '#FFF',
    lineHeight: 20,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 4,
  },
  timestampText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusDelivered: {
    color: '#6EE7B7',
  },
  statusFailed: {
    color: THEME.colors.textDanger,
  },
  quickRepliesContainer: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    backgroundColor: THEME.colors.surface,
  },
  quickReplyLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quickScroll: {
    flexDirection: 'row',
  },
  quickChip: {
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radii.full,
    marginRight: 8,
  },
  quickChipText: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  input: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceHover,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: THEME.colors.textPrimary,
  },
  sendBtn: {
    backgroundColor: THEME.colors.radarBlue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radii.full,
  },
  sendBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
});
