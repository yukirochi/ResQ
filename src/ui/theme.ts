/**
 * ResQ Design System & Color Tokens
 * Premium, clean emergency design inspired by high-visibility medical dispatch systems:
 * - Vivid scarlet & crimson SOS accents (#E53935)
 * - Concentric soft blush ripple glows
 * - Crisp, accessible light surfaces with elevated floating cards
 * - High-contrast typography and clear tactile targets
 */

export const THEME = {
  colors: {
    // Primary Emergency Crimson & Brand
    primaryRed: '#E53935',
    primaryRedHover: '#D32F2F',
    primaryRedDark: '#B71C1C',
    primaryGradientStart: '#FF5B4D',
    primaryGradientEnd: '#E53935',

    // Concentric SOS Ripple Glows
    rippleOuter: 'rgba(229, 57, 53, 0.08)',
    rippleMid: 'rgba(229, 57, 53, 0.16)',
    rippleInner: 'rgba(229, 57, 53, 0.26)',
    glowShadow: 'rgba(229, 57, 53, 0.38)',

    // Surfaces & Backgrounds
    background: '#FBFBFC',
    surface: '#FFFFFF',
    surfaceSubtle: '#F4F6F8',
    surfaceBorder: '#F0F2F5',
    surfaceBorderStrong: '#E2E6EA',

    // Dispatch Immersive Red
    dispatchGradientStart: '#DE352B',
    dispatchGradientMid: '#E63946',
    dispatchGradientEnd: '#FF5A5F',

    // Text & Hierarchy
    textTitle: '#191C21',
    textSub: '#7A828E',
    textMuted: '#9EABB8',
    textWhite: '#FFFFFF',

    // Proximity Indicators
    immediateGreen: '#10B981', // < 2m Immediate safe/reach
    nearAmber: '#F59E0B',      // 2m - 5m Near
    farRed: '#E53935',         // 5m - 15m Far
    lostSlate: '#64748B',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    xxl: 40,
  },
  radii: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.07,
      shadowRadius: 18,
      elevation: 4,
    },
    sos: {
      shadowColor: '#E53935',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 28,
      elevation: 8,
    },
  },
  typography: {
    hero: {
      fontSize: 26,
      fontWeight: '900' as const,
      letterSpacing: -0.5,
      color: '#191C21',
    },
    title: {
      fontSize: 20,
      fontWeight: '800' as const,
      letterSpacing: -0.3,
      color: '#191C21',
    },
    heading: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: '#191C21',
    },
    subheading: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: '#7A828E',
    },
    body: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: '#191C21',
    },
    caption: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: '#9EABB8',
    },
    badge: {
      fontSize: 10,
      fontWeight: '800' as const,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
  },
};
