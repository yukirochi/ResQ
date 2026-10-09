/**
 * ResQ Premium Design System & Color Tokens
 * Tailored for high-stress emergency environments: maximum contrast, tactile clarity, and sleek dark aesthetic.
 */

export const THEME = {
  colors: {
    // Backgrounds
    background: '#090D16',
    surface: '#121B2D',
    surfaceHover: '#1A2740',
    surfaceCard: '#152036',
    border: '#1F2E4D',
    borderSubtle: '#19243C',

    // Emergency Crimson (Victim SOS)
    sosRed: '#EF4444',
    sosRedDark: '#DC2626',
    sosGlow: 'rgba(239, 68, 68, 0.4)',

    // Rescuer Radar Blue
    radarBlue: '#3B82F6',
    radarBlueDark: '#2563EB',
    radarGlow: 'rgba(59, 130, 246, 0.35)',

    // Proximity Indicators
    immediateGreen: '#10B981', // < 2m Immediate safe/reach
    nearAmber: '#F59E0B',      // 2m - 5m Near
    farRed: '#EF4444',         // 5m - 15m Far
    lostSlate: '#64748B',

    // Text & Accents
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textDanger: '#FCA5A5',

    // Controls
    cardChip: '#1E293B',
    cardChipActive: '#334155',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radii: {
    sm: 6,
    md: 12,
    lg: 18,
    full: 9999,
  },
  typography: {
    title: {
      fontSize: 28,
      fontWeight: '800' as const,
      letterSpacing: -0.5,
      color: '#F8FAFC',
    },
    heading: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: '#F8FAFC',
    },
    subheading: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: '#94A3B8',
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: '#F8FAFC',
    },
    caption: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: '#64748B',
    },
    badge: {
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
  },
};
