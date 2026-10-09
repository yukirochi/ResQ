import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { ChatScreen } from '../features/chat/screens/ChatScreen';
import { ModePickerScreen } from '../features/onboarding/ModePickerScreen';
import { ProfileEditorScreen } from '../features/profile/screens/ProfileEditorScreen';
import { RadarScreen } from '../features/rescue/screens/RadarScreen';
import { VictimDetailScreen } from '../features/rescue/screens/VictimDetailScreen';
import { SosHomeScreen } from '../features/victim/screens/SosHomeScreen';
import { useModeStore } from '../store/modeStore';
import { useProfileStore } from '../store/profileStore';
import { useVictimsStore } from '../store/victimsStore';
import { DiscoveredVictim } from '../types';
import { THEME } from '../ui/theme';

type ActiveView = 'MAIN' | 'PROFILE_EDITOR' | 'VICTIM_DETAIL' | 'CHAT';

export default function App() {
  const { mode, init: initMode } = useModeStore();
  const { init: initProfile } = useProfileStore();
  const { victims, selectedVictimId } = useVictimsStore();

  const [activeView, setActiveView] = useState<ActiveView>('MAIN');
  const [activeChatVictimId, setActiveChatVictimId] = useState<string>('LOCAL_VICTIM');

  useEffect(() => {
    initMode();
    initProfile();
  }, [initMode, initProfile]);

  const selectedVictim: DiscoveredVictim | undefined = selectedVictimId
    ? victims[selectedVictimId]
    : undefined;

  const handleOpenChat = (victim: DiscoveredVictim) => {
    setActiveChatVictimId(victim.id);
    setActiveView('CHAT');
  };

  // Render Root Screen based on Mode & Navigation State
  const renderScreen = () => {
    if (mode === 'NONE') {
      return <ModePickerScreen />;
    }

    // Victim Mode Flow
    if (mode === 'VICTIM') {
      if (activeView === 'PROFILE_EDITOR') {
        return <ProfileEditorScreen onBack={() => setActiveView('MAIN')} />;
      }
      if (activeView === 'CHAT') {
        return <ChatScreen victimId={activeChatVictimId} onBack={() => setActiveView('MAIN')} />;
      }
      return (
        <SosHomeScreen
          onOpenProfile={() => setActiveView('PROFILE_EDITOR')}
          onOpenChat={() => {
            setActiveChatVictimId('RESCUER_CHANNEL');
            setActiveView('CHAT');
          }}
        />
      );
    }

    // Rescue Mode Flow
    if (mode === 'RESCUE') {
      if (activeView === 'VICTIM_DETAIL' && selectedVictim) {
        return (
          <VictimDetailScreen
            victim={selectedVictim}
            onBack={() => setActiveView('MAIN')}
            onOpenChat={handleOpenChat}
          />
        );
      }
      if (activeView === 'CHAT') {
        return <ChatScreen victimId={activeChatVictimId} onBack={() => setActiveView('MAIN')} />;
      }
      return (
        <RadarScreen
          onInspectVictim={(victim) => {
            setActiveView('VICTIM_DETAIL');
          }}
          onOpenChat={handleOpenChat}
        />
      );
    }

    return <ModePickerScreen />;
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
});
