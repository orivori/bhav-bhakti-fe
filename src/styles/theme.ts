export const theme = {
  colors: {
    // Primary spiritual saffron
    primary: {
      50: '#FFF7ED',   // Light saffron
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#FF6B35',  // Main saffron
      600: '#EA580C',
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12',
    },

    // Sacred colors (replacing gray with warm neutrals)
    gray: {
      50: '#FAFAF9',   // Pure white
      100: '#F5F5F4',  // Cream
      200: '#E7E5E4',
      300: '#D6D3D1',
      400: '#A8A29E',
      500: '#78716C',
      600: '#57534E',
      700: '#44403C',
      800: '#292524',
      900: '#1C1917',
    },

    // Keep red for error states
    red: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },

    // Update green to more natural/spiritual green
    green: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#10B981',  // More natural green
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },

    // Add spiritual purple
    purple: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#A855F7',  // Main sacred purple
      600: '#9333EA',
      700: '#7C3AED',
      800: '#6B46C1',
      900: '#581C87',
    },

    // Add divine gold
    gold: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',  // Main gold
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
  },

  // Spiritual backgrounds
  background: {
    primary: '#FFFBEB',    // Light cream
    secondary: '#FFF7ED',  // Light saffron
    card: '#FFFFFF',       // Pure white
  },

  // Spiritual text colors
  text: {
    primary: '#1C1917',    // Dark brown
    secondary: '#57534E',  // Medium brown
    accent: '#FF6B35',     // Saffron
    inverse: '#FFFFFF',    // White
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
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
} as const;