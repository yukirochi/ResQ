import React, { useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from '../../../ui/components/Card';
import { THEME } from '../../../ui/theme';
import { SURVIVAL_PROTOCOLS, SurvivalProtocol } from '../data/survivalProtocols';
import { AssistantResponse, localLlm } from '../services/localLlmService';

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

  const handleAskAi = async (customPrompt?: string) => {
    const queryToUse = customPrompt || searchQuery;
    if (!queryToUse.trim()) return;

    setIsAiThinking(true);
    try {
      const resp = await localLlm.query(queryToUse);
      setAiResponse(resp);
    } catch (err) {
      console.warn('AI Query failed:', err);
    } finally {
      setIsAiThinking(false);
    }
  };

  const filteredProtocols = SURVIVAL_PROTOCOLS.filter((p) => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Survival & App Guide</Text>
          <Text style={styles.headerSubtitle}>Offline AI Assistant • Zero Internet Needed</Text>
        </View>
        <View style={styles.offlinePill}>
          <View style={styles.greenDot} />
          <Text style={styles.offlineText}>OFFLINE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Local LLM Assistant Box */}
        <Card style={styles.aiCard}>
          <View style={styles.aiHeaderRow}>
            <Text style={styles.aiTitle}>⚡ Talk to resQ</Text>
            <Text style={styles.aiModelBadge}>QWEN2.5-1.5B</Text>
          </View>
          <Text style={styles.aiSubText}>
            Conversational emergency assistant powered by Qwen2.5-1.5B on-device. Higher reasoning triage & app guidance.
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Talk to resQ (survival advice or app guide)..."
              placeholderTextColor={THEME.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => handleAskAi()}
            />
            <TouchableOpacity
              style={styles.askButton}
              onPress={() => handleAskAi()}
              disabled={isAiThinking}
            >
              {isAiThinking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.askButtonText}>Ask</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Query Suggestions */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickChipsScroll}>
            {[
              'Trapped in rubble',
              'Severe bleeding',
              'Adult CPR steps',
              'How radar works',
              'Acoustic siren',
            ].map((q) => (
              <TouchableOpacity
                key={q}
                style={styles.chip}
                onPress={() => {
                  setSearchQuery(q);
                  handleAskAi(q);
                }}
              >
                <Text style={styles.chipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* AI Response Display */}
          {aiResponse && (
            <View style={styles.responseContainer}>
              <View style={styles.responseHeaderRow}>
                <Text style={styles.responseSourceBadge}>
                  {aiResponse.source === 'LOCAL_LLM' ? '🤖 resQ ON-DEVICE LLM' : '🛡️ resQ OFFLINE PROTOCOL'}
                </Text>
                <TouchableOpacity onPress={() => setAiResponse(null)}>
                  <Text style={styles.clearResponseText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.responseText}>{aiResponse.answer}</Text>
            </View>
          )}
        </Card>

        {/* Category Tabs */}
        <View style={styles.categoryRow}>
          {(['ALL', 'MEDICAL', 'DISASTER', 'APP_MANUAL'] as FilterCategory[]).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryBtn, selectedCategory === cat && styles.categoryBtnActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[styles.categoryBtnText, selectedCategory === cat && styles.categoryBtnTextActive]}
              >
                {cat === 'APP_MANUAL' ? 'RESQ APP' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Survival Protocols List */}
        {filteredProtocols.map((protocol) => {
          const isExpanded = expandedCardId === protocol.id;
          return (
            <TouchableOpacity
              key={protocol.id}
              activeOpacity={0.85}
              onPress={() => setExpandedCardId(isExpanded ? null : protocol.id)}
            >
              <Card style={styles.protocolCard}>
                <View style={styles.protocolTopRow}>
                  <View style={styles.protocolTitleWrap}>
                    <Text style={styles.protocolTitle}>{protocol.title}</Text>
                    <Text style={styles.protocolSub}>{protocol.subtitle}</Text>
                  </View>
                  <View
                    style={[
                      styles.severityBadge,
                      protocol.severity === 'CRITICAL' && styles.severityCritical,
                      protocol.severity === 'HIGH' && styles.severityHigh,
                      protocol.severity === 'INFO' && styles.severityInfo,
                    ]}
                  >
                    <Text style={styles.severityText}>{protocol.severity}</Text>
                  </View>
                </View>

                {/* Steps */}
                <View style={styles.stepsContainer}>
                  {(isExpanded ? protocol.steps : protocol.steps.slice(0, 2)).map((step, idx) => (
                    <View key={idx} style={styles.stepRow}>
                      <Text style={styles.stepNum}>{idx + 1}.</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>

                {protocol.warning && isExpanded && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>⚠️ {protocol.warning}</Text>
                  </View>
                )}

                <Text style={styles.expandHint}>
                  {isExpanded ? 'Tap to collapse ▲' : `View all ${protocol.steps.length} steps ▼`}
                </Text>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  backBtnText: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4CAF50',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  aiCard: {
    backgroundColor: '#1E222A',
    borderColor: 'rgba(229, 57, 53, 0.3)',
    marginBottom: 16,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  aiModelBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiSubText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 12,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#14171D',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  askButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  askButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  quickChipsScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipText: {
    fontSize: 11,
    color: '#D0D4DC',
    fontWeight: '600',
  },
  responseContainer: {
    marginTop: 12,
    backgroundColor: '#14171D',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
  },
  responseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  responseSourceBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60A5FA',
  },
  clearResponseText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  responseText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#E2E8F0',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  categoryBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  categoryBtnActive: {
    backgroundColor: THEME.colors.primary,
  },
  categoryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  categoryBtnTextActive: {
    color: '#FFFFFF',
  },
  protocolCard: {
    marginBottom: 12,
  },
  protocolTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  protocolTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  protocolTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  protocolSub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  severityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityCritical: {
    backgroundColor: 'rgba(229, 57, 53, 0.2)',
  },
  severityHigh: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  severityInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  severityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepsContainer: {
    gap: 6,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
    width: 20,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#D1D5DB',
  },
  warningBox: {
    marginTop: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  warningText: {
    fontSize: 12,
    color: '#FCA5A5',
    fontWeight: '600',
  },
  expandHint: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
});
