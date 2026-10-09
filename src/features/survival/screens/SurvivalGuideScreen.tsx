import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SURVIVAL_PROTOCOLS } from '../data/survivalProtocols';
import { AssistantResponse, localLlm } from '../services/localLlmService';
import { Card } from '../../../ui/components/Card';
import { THEME } from '../../../ui/theme';

// AI Persona images from src/assets
const AVATAR_1 = require('../../../assets/persona1.jpg');
const AVATAR_2 = require('../../../assets/persona2.jpg');
const AVATAR_3 = require('../../../assets/persona3.jpg');
const SAFETY_MASCOT = require('../../../assets/7.jpg');
const RADIO_MASCOT = require('../../../assets/6.jpg');

const PERSONAS = [
  {
    id: '1',
    name: 'resQ Medic',
    role: 'Medical Triage',
    img: AVATAR_1,
    badge: 'MEDICAL',
    color: '#10B981',
    chips: ['Severe bleeding', 'Adult CPR', 'Shock treatment', 'Fracture care'],
  },
  {
    id: '2',
    name: 'resQ Engineer',
    role: 'Rescue Tech',
    img: AVATAR_2,
    badge: 'TACTICAL',
    color: '#3B82F6',
    chips: ['Trapped in rubble', 'Check Bluetooth', 'How radar works', 'Signal loss'],
  },
  {
    id: '3',
    name: 'resQ Safety',
    role: 'Safety 101',
    img: SAFETY_MASCOT,
    badge: 'SURVIVAL',
    color: '#F59E0B',
    chips: ['Find clean water', 'Wildfire escape', 'Enable Auto SOS', 'Night shelter'],
  },
  {
    id: '4',
    name: 'resQ Comms',
    role: 'Mesh Radio',
    img: RADIO_MASCOT,
    badge: 'COMMS',
    color: '#8B5CF6',
    chips: ['BLE Mesh signal', 'Off-grid broadcast', 'Siren relay', 'Battery saver'],
  },
];

interface SurvivalGuideScreenProps {
  onBack: () => void;
}

type FilterCategory = 'ALL' | 'MEDICAL' | 'DISASTER' | 'APP_MANUAL';

export const SurvivalGuideScreen: React.FC<SurvivalGuideScreenProps> = ({ onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<AssistantResponse | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [activePersona, setActivePersona] = useState(PERSONAS[0]);

  const handleAskAi = async (customPrompt?: string) => {
    const q = customPrompt || searchQuery;
    if (!q.trim()) return;
    setIsAiThinking(true);
    setAiResponse(null);
    try {
      const resp = await localLlm.query(q);
      setAiResponse(resp);
    } catch {
      // silent fail
    } finally {
      setIsAiThinking(false);
    }
  };

  const filteredProtocols = SURVIVAL_PROTOCOLS.filter((p) => {
    const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchSearch =
      searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Survival & App Guide</Text>
            <Text style={styles.headerSub}>Verified Triage & Offline AI Knowledge Base</Text>
          </View>
          <View style={styles.offlineBadge}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineBadgeText}>100% OFFLINE</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* === SAFETY 101 FIELD GUIDE HERO BANNER === */}
          <View style={styles.safetyHeroBanner}>
            <Image source={SAFETY_MASCOT} style={styles.safetyHeroImg} />
            <View style={styles.safetyHeroContent}>
              <View style={styles.safetyTag}>
                <Text style={styles.safetyTagText}>SAFETY 101 FIELD GUIDE</Text>
              </View>
              <Text style={styles.safetyHeroTitle}>Stay Calm. Be Prepared.</Text>
              <Text style={styles.safetyHeroSub}>
                Verified offline emergency triage protocols, crush injury warnings & safety tips.
              </Text>
            </View>
          </View>

          {/* === AI SPECIALIST PERSONA PICKER === */}
          <Text style={styles.sectionTitle}>AI SPECIALISTS</Text>
          <View style={styles.personaRow}>
            {PERSONAS.map((p) => {
              const active = activePersona.id === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.85}
                  onPress={() => { setActivePersona(p); setAiResponse(null); setSearchQuery(''); }}
                  style={[styles.personaCard, active && { borderColor: p.color, backgroundColor: `${p.color}12` }]}
                >
                  <View style={[styles.personaImgWrap, active && { borderColor: p.color }]}>
                    <Image source={p.img} style={styles.personaImg} />
                    {active && <View style={[styles.activeDot, { backgroundColor: p.color }]} />}
                  </View>
                  <Text style={[styles.personaName, active && { color: p.color }]}>{p.name}</Text>
                  <Text style={styles.personaRole}>{p.role}</Text>
                  <View style={[styles.personaBadge, { backgroundColor: `${p.color}20` }]}>
                    <Text style={[styles.personaBadgeText, { color: p.color }]}>{p.badge}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* === AI CHAT CARD === */}
          <Card style={[styles.aiCard, { borderColor: `${activePersona.color}60` }]}>
            <View style={styles.aiCardHeader}>
              <Image source={activePersona.img} style={[styles.aiAvatar, { borderColor: activePersona.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.aiName}>{activePersona.name}</Text>
                <Text style={styles.aiRole}>{activePersona.role}</Text>
              </View>
              <View style={[styles.aiOnlineDot, { backgroundColor: activePersona.color }]} />
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder={`Ask ${activePersona.name}...`}
                placeholderTextColor={THEME.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => handleAskAi()}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={() => handleAskAi()}
                disabled={isAiThinking}
                style={[styles.askBtn, { backgroundColor: activePersona.color }]}
              >
                {isAiThinking
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.askBtnText}>Ask →</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {activePersona.chips.map((chip) => (
                <TouchableOpacity
                  key={chip}
                  onPress={() => { setSearchQuery(chip); handleAskAi(chip); }}
                  style={[styles.chip, { borderColor: `${activePersona.color}50` }]}
                >
                  <Text style={[styles.chipText, { color: activePersona.color }]}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {isAiThinking && (
              <View style={styles.thinkRow}>
                <ActivityIndicator size="small" color={activePersona.color} />
                <Text style={[styles.thinkText, { color: activePersona.color }]}>{activePersona.name} is thinking...</Text>
              </View>
            )}

            {aiResponse && !isAiThinking && (
              <View style={[styles.responseBox, { borderLeftColor: activePersona.color }]}>
                <View style={styles.responseHeaderRow}>
                  <Text style={[styles.responseBadge, { color: activePersona.color }]}>
                    {aiResponse.source === 'LOCAL_LLM' ? '🤖 ON-DEVICE LLM' : `🛡️ ${activePersona.badge} AI`}
                  </Text>
                  <TouchableOpacity onPress={() => setAiResponse(null)}>
                    <Text style={styles.dismissText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.responseText}>{aiResponse.answer}</Text>
              </View>
            )}
          </Card>

          {/* === CATEGORY FILTER === */}
          <View style={styles.catRow}>
            {(['ALL', 'MEDICAL', 'DISASTER', 'APP_MANUAL'] as FilterCategory[]).map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.catBtn, selectedCategory === cat && styles.catBtnActive]}
              >
                <Text style={[styles.catBtnText, selectedCategory === cat && styles.catBtnTextActive]}>
                  {cat === 'APP_MANUAL' ? 'APP' : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* === SURVIVAL PROTOCOL CARDS === */}
          {filteredProtocols.map((protocol) => {
            const expanded = expandedCardId === protocol.id;
            return (
              <TouchableOpacity key={protocol.id} activeOpacity={0.85} onPress={() => setExpandedCardId(expanded ? null : protocol.id)}>
                <Card style={styles.protocolCard}>
                  <View style={styles.protocolHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.protocolTitle}>{protocol.title}</Text>
                      <Text style={styles.protocolSub}>{protocol.subtitle}</Text>
                    </View>
                    <View style={[
                      styles.severityBadge,
                      protocol.severity === 'CRITICAL' && styles.sevCritical,
                      protocol.severity === 'HIGH' && styles.sevHigh,
                      protocol.severity === 'INFO' && styles.sevInfo,
                    ]}>
                      <Text style={styles.severityText}>{protocol.severity}</Text>
                    </View>
                  </View>
                  <View style={{ gap: 5 }}>
                    {(expanded ? protocol.steps : protocol.steps.slice(0, 2)).map((step, i) => (
                      <View key={i} style={styles.stepRow}>
                        <Text style={styles.stepNum}>{i + 1}.</Text>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                  {protocol.warning && expanded && (
                    <View style={styles.warningBox}>
                      <Text style={styles.warningText}>⚠️ {protocol.warning}</Text>
                    </View>
                  )}
                  <Text style={styles.expandHint}>
                    {expanded ? 'Tap to collapse ▲' : `View all ${protocol.steps.length} steps ▼`}
                  </Text>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorderStrong,
    backgroundColor: THEME.colors.surface,
  },
  backBtn: { padding: 6, marginRight: 10 },
  backBtnText: { fontSize: 22, color: THEME.colors.textTitle, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: THEME.colors.textTitle },
  headerSub: { fontSize: 11, color: THEME.colors.textMuted, marginTop: 1 },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  offlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  offlineBadgeText: { fontSize: 9, fontWeight: '800', color: '#10B981', letterSpacing: 0.5 },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 10, fontWeight: '800', color: THEME.colors.textMuted,
    letterSpacing: 1.5, marginBottom: 12,
  },

  // Persona cards
  personaRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  personaCard: {
    flex: 1, alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: 16, borderWidth: 1.5,
    borderColor: THEME.colors.surfaceBorderStrong,
    paddingVertical: 14, paddingHorizontal: 4, gap: 5,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  personaImgWrap: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: THEME.colors.surfaceBorderStrong, overflow: 'hidden',
  },
  personaImg: { width: '100%', height: '100%' },
  activeDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#fff',
  },
  personaName: { fontSize: 11, fontWeight: '800', color: THEME.colors.textTitle, textAlign: 'center' },
  personaRole: { fontSize: 9, color: THEME.colors.textMuted, textAlign: 'center' },
  personaBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  personaBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },

  // AI Chat
  aiCard: {
    borderWidth: 1.5, marginBottom: 16,
    backgroundColor: THEME.colors.surface,
  },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  aiAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  aiName: { fontSize: 15, fontWeight: '800', color: THEME.colors.textTitle },
  aiRole: { fontSize: 11, color: THEME.colors.textMuted, marginTop: 1 },
  aiOnlineDot: { width: 10, height: 10, borderRadius: 5 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  input: {
    flex: 1, backgroundColor: THEME.colors.surfaceSubtle, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    color: THEME.colors.textTitle, fontSize: 13,
    borderWidth: 1, borderColor: THEME.colors.surfaceBorderStrong,
  },
  askBtn: { paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 12, minWidth: 72 },
  askBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  chip: {
    backgroundColor: THEME.colors.surfaceSubtle, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 14, marginRight: 8, borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  thinkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: THEME.colors.surfaceBorder },
  thinkText: { fontSize: 13, fontWeight: '600' },
  responseBox: {
    marginTop: 12, backgroundColor: THEME.colors.surfaceSubtle,
    padding: 14, borderRadius: 12, borderLeftWidth: 3,
  },
  responseHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  responseBadge: { fontSize: 10, fontWeight: '800' },
  dismissText: { fontSize: 14, color: THEME.colors.textMuted },
  responseText: { fontSize: 13, lineHeight: 20, color: THEME.colors.textTitle },

  // Category
  catRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  catBtn: {
    flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 10,
    backgroundColor: THEME.colors.surfaceSubtle, borderWidth: 1, borderColor: THEME.colors.surfaceBorderStrong,
  },
  catBtnActive: { backgroundColor: THEME.colors.primaryRed, borderColor: THEME.colors.primaryRed },
  catBtnText: { fontSize: 10, fontWeight: '700', color: THEME.colors.textSub },
  catBtnTextActive: { color: '#fff' },

  // Protocol cards
  protocolCard: { marginBottom: 12, backgroundColor: THEME.colors.surface },
  protocolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  protocolTitle: { fontSize: 15, fontWeight: '800', color: THEME.colors.textTitle, marginBottom: 2 },
  protocolSub: { fontSize: 12, color: THEME.colors.textSub },
  severityBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  sevCritical: { backgroundColor: 'rgba(229,57,53,0.1)' },
  sevHigh: { backgroundColor: 'rgba(245,158,11,0.1)' },
  sevInfo: { backgroundColor: 'rgba(59,130,246,0.1)' },
  severityText: { fontSize: 10, fontWeight: '800', color: THEME.colors.textTitle },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepNum: { fontSize: 12, fontWeight: '800', color: THEME.colors.primaryRed, width: 20 },
  stepText: { flex: 1, fontSize: 13, lineHeight: 18, color: THEME.colors.textSub },
  warningBox: {
    marginTop: 8, backgroundColor: 'rgba(239,68,68,0.07)',
    padding: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  warningText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  expandHint: { fontSize: 11, color: THEME.colors.primaryRed, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  safetyHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  safetyHeroImg: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  safetyHeroContent: {
    flex: 1,
  },
  safetyTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 3,
  },
  safetyTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  safetyHeroTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 2,
  },
  safetyHeroSub: {
    fontSize: 11,
    color: '#15803D',
    lineHeight: 15,
  },
});
