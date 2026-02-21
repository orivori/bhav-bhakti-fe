export const spiritualTheme = {
  colors: {
    // Core temple theme colors (from CSS)
    background: '#0a0612',      // Deep purple-black
    foreground: '#f5f5f5',      // Light text

    card: '#1a0f2e',           // Deep purple for cards
    cardForeground: '#f5f5f5',

    popover: '#1a0f2e',
    popoverForeground: '#f5f5f5',

    // Primary vibrant orange (temple/marigold)
    primary: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#FF6B35',  // Main temple orange
      600: '#EA580C',
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12',
      DEFAULT: '#FF6B35',
      foreground: '#ffffff',
    },

    // Secondary bright magenta/purple
    secondary: {
      50: '#FDF4FF',
      100: '#FAE8FF',
      200: '#F5D0FE',
      300: '#F0ABFC',
      400: '#E879F9',
      500: '#D946EF',  // Bright magenta/purple
      600: '#C026D3',
      700: '#A21CAF',
      800: '#86198F',
      900: '#701A75',
      DEFAULT: '#D946EF',
      foreground: '#ffffff',
    },

    // Muted purple tones
    muted: {
      50: '#F8F5FC',
      100: '#F1EBF8',
      200: '#E4D5EF',
      300: '#D1BAE0',
      400: '#B593CD',
      500: '#2a1f3d',  // Muted purple from CSS
      600: '#7C5295',
      700: '#634085',
      800: '#4F2E6B',
      900: '#3D2252',
      DEFAULT: '#2a1f3d',
      foreground: '#a0a5b8',
    },

    // Golden amber accent
    accent: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',  // Golden amber
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
      DEFAULT: '#F59E0B',
      foreground: '#ffffff',
    },

    // Traditional Indian vibrant colors
    saffron: '#FF9933',        // Traditional saffron
    templeRed: '#DC2626',      // Temple red
    peacockBlue: '#0EA5E9',    // Peacock blue
    emerald: '#10B981',        // Emerald green
    royalPurple: '#9333EA',    // Royal purple

    // Semantic colors
    destructive: {
      DEFAULT: '#d4183d',
      foreground: '#ffffff',
    },

    success: '#10B981',
    warning: '#F59E0B',
    error: '#d4183d',
    info: '#0EA5E9',

    // Border and input colors
    border: 'rgba(249, 115, 22, 0.3)', // Orange border with transparency
    input: 'transparent',
    inputBackground: 'rgba(42, 31, 61, 0.7)', // Semi-transparent purple
    switchBackground: '#cbced4',
    ring: '#FF6B35', // Orange ring

    // Background variations
    backgrounds: {
      primary: '#0a0612',       // Deep purple-black
      secondary: '#1a0f2e',     // Deep purple
      card: '#1a0f2e',          // Card background
      muted: '#2a1f3d',         // Muted background
      overlay: 'rgba(10, 6, 18, 0.9)', // Dark overlay
    },

    // Text colors
    text: {
      primary: '#f5f5f5',       // Light text
      secondary: '#a0a5b8',     // Muted foreground
      accent: '#FF6B35',        // Orange accent text
      inverse: '#0a0612',       // Dark text on light bg
      muted: '#a0a5b8',         // Muted text
    }
  },

  // Vibrant temple gradients
  gradients: {
    temple: ['#FF6B35', '#D946EF'] as const,       // Orange to magenta
    sunrise: ['#FF6B35', '#F59E0B'] as const,      // Orange to amber
    royal: ['#9333EA', '#D946EF'] as const,        // Royal purple to magenta
    fire: ['#DC2626', '#FF6B35'] as const,         // Temple red to orange
    peacock: ['#0EA5E9', '#10B981'] as const,      // Peacock blue to emerald
    divine: ['#F59E0B', '#FF9933'] as const,       // Amber to saffron
    meditation: ['#2a1f3d', '#9333EA'] as const,   // Muted purple to royal
    lotus: ['#D946EF', '#EC4899'] as const,        // Magenta to pink
    night: ['#0a0612', '#1a0f2e'] as const,        // Deep backgrounds
    vibrant: ['#FF6B35', '#0EA5E9'] as const,      // Orange to blue
  },

  // Chart colors for data visualization
  charts: {
    chart1: '#FF6B35',  // Primary orange
    chart2: '#D946EF',  // Secondary magenta
    chart3: '#F59E0B',  // Amber
    chart4: '#0EA5E9',  // Peacock blue
    chart5: '#10B981',  // Emerald
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  borderRadius: {
    sm: 12,    // Increased for more modern look
    md: 16,    // 1rem from CSS
    lg: 20,
    xl: 24,
    '2xl': 32,
    full: 9999,
  },

  // Enhanced shadows with temple theme colors
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#FF6B35',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#D946EF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    temple: {
      shadowColor: '#9333EA',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 12,
    },
  },

  // Font weights
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Opacity levels
  opacity: {
    disabled: 0.5,
    muted: 0.7,
    subtle: 0.3,
    border: 0.3,
  }
};

export type SpiritualTheme = typeof spiritualTheme;