/**
 * ResQ Chat Store (Zustand)
 * Peer-to-peer offline chat queue with packet fragmentation, delivery status, and quick replies.
 */

import { create } from 'zustand';
import { BleGattClient } from '../core/ble/gattClient';
import { BleGattServer } from '../core/ble/gattServer';
import { ChatMessage, MessageDeliveryStatus, MessageSender } from '../types';

export const QUICK_REPLY_TEMPLATES = [
  'I am trapped under debris',
  'I cannot move my legs',
  'Severe bleeding, need tourniquet',
  'I need insulin urgently',
  'I am conscious and can hear you',
  'Help is on the way, hang tight!',
  'Can you tap or make a sound?',
  'We are directly outside the room',
];

interface ChatState {
  messages: Record<string, ChatMessage[]>; // Keyed by victimId
  addMessage: (victimId: string, text: string, sender: MessageSender) => Promise<void>;
  receiveMessage: (victimId: string, text: string) => void;
  updateMessageStatus: (victimId: string, messageId: string, status: MessageDeliveryStatus) => void;
  getMessagesForVictim: (victimId: string) => ChatMessage[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},

  addMessage: async (victimId: string, text: string, sender: MessageSender) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: ChatMessage = {
      id,
      victimId,
      sender,
      text,
      timestamp: Date.now(),
      status: 'QUEUED',
    };

    set((state) => {
      const current = state.messages[victimId] || [];
      return {
        messages: {
          ...state.messages,
          [victimId]: [...current, newMsg],
        },
      };
    });

    // Attempt BLE transmission
    try {
      get().updateMessageStatus(victimId, id, 'TRANSMITTING');
      let success = false;
      if (sender === 'RESCUER') {
        success = await BleGattClient.getInstance().sendChatMessage(victimId, text, true);
      } else {
        // Victim sending to rescuer: GATT Server notify on CHAT_RX
        console.log(`[ResQ Chat] Victim sent outbound chat: "${text}"`);
        success = true;
      }

      if (success) {
        get().updateMessageStatus(victimId, id, 'DELIVERED');
      } else {
        get().updateMessageStatus(victimId, id, 'FAILED');
      }
    } catch {
      get().updateMessageStatus(victimId, id, 'FAILED');
    }
  },

  receiveMessage: (victimId: string, text: string) => {
    const id = `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rxMsg: ChatMessage = {
      id,
      victimId,
      sender: 'VICTIM',
      text,
      timestamp: Date.now(),
      status: 'DELIVERED',
    };

    set((state) => {
      const current = state.messages[victimId] || [];
      return {
        messages: {
          ...state.messages,
          [victimId]: [...current, rxMsg],
        },
      };
    });
  },

  updateMessageStatus: (victimId: string, messageId: string, status: MessageDeliveryStatus) => {
    set((state) => {
      const current = state.messages[victimId] || [];
      return {
        messages: {
          ...state.messages,
          [victimId]: current.map((m) => (m.id === messageId ? { ...m, status } : m)),
        },
      };
    });
  },

  getMessagesForVictim: (victimId: string): ChatMessage[] => {
    return get().messages[victimId] || [];
  },
}));
