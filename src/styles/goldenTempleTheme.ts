export const goldenTempleTheme = {
  colors: {
    // Core temple theme colors - Traditional Hindu Temple Theme
    background: '#fff6da',         // Warm cream/ivory background
    foreground: '#4A2C2A',         // Deep brown text

    card: '#FFFBF5',              // Lighter cream for cards
    cardForeground: '#4A2C2A',

    popover: '#FFFBF5',
    popoverForeground: '#4A2C2A',

    // Primary saffron colors (Saffron/Deep orange)
    primary: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#FF6B00',  // Saffron/Deep orange
      600: '#EA580C',
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12',
      DEFAULT: '#FF6B00',
      foreground: '#ffffff',
    },

    // Secondary temple red/maroon colors
    secondary: {
      50: '#FDF2F2',
      100: '#FDE8E8',
      200: '#FBD5D5',
      300: '#F8B4B4',
      400: '#F87171',
      500: '#C41E3A',  // Temple red/maroon
      600: '#B91C1C',
      700: '#991B1B',
      800: '#7F1D1D',
      900: '#450A0A',
      DEFAULT: '#C41E3A',
      foreground: '#ffffff',
    },

    // Muted light beige tones
    muted: {
      50: '#FDFCFB',
      100: '#F9F6F1',
      200: '#F5E6D3',  // Light beige
      300: '#E8D5B7',
      400: '#D4C4B0',
      500: '#8B6F47',  // Muted brown
      600: '#6B5B47',
      700: '#4F453A',
      800: '#3D2415',
      900: '#2C1810',
      DEFAULT: '#F5E6D3',
      foreground: '#8B6F47',
    },

    // Accent rich gold
    accent: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#D4AF37',  // Rich gold
      600: '#B7950B',
      700: '#92400E',
      800: '#78350F',
      900: '#451A03',
      DEFAULT: '#D4AF37',
      foreground: '#4A2C2A',
    },

    // Traditional Hindu temple colors from CSS
    saffron: '#FF9933',        // Traditional saffron
    templeGold: '#D4AF37',     // Rich gold (holy gold)
    templeRed: '#C41E3A',      // Temple red/maroon
    warmOrange: '#FF6B00',     // Saffron/Deep orange
    deepMaroon: '#800020',     // Deep maroon
    sacredCream: '#fff6da',    // Sacred cream
    warmCopper: '#B87333',     // Warm copper
    richBronze: '#CD7F32',     // Rich bronze
    peacockBlue: '#4682B4',    // Steel blue (warmer than bright blue)
    emerald: '#228B22',        // Forest green

    // Semantic colors with warm tones
    destructive: {
      DEFAULT: '#D2691E',
      foreground: '#F5E6D3',
    },

    success: '#228B22',
    warning: '#FF8C00',
    error: '#B22222',
    info: '#4682B4',

    // Border and input colors - Hindu temple theme
    border: 'rgba(180, 140, 80, 0.3)', // Golden brown border
    input: 'transparent',
    inputBackground: 'rgba(245, 230, 211, 0.7)', // Warm beige input
    switchBackground: '#D4C5B0',
    ring: '#FF6B00', // Saffron ring

    // Background variations
    backgrounds: {
      primary: '#fff6da',       // Warm cream/ivory background
      secondary: '#FFFBF5',     // Lighter cream for cards
      card: '#FFFBF5',          // Card background - lighter cream
      muted: '#F5E6D3',         // Light beige
      overlay: 'rgba(74, 44, 42, 0.95)', // Dark brown overlay
    },

    // Text colors
    text: {
      primary: '#4A2C2A',       // Deep brown text
      secondary: '#8B6F47',     // Muted brown
      accent: '#D4AF37',        // Rich gold accent text
      inverse: '#FFFFFF',       // White text on dark bg
      muted: '#8B6F47',         // Muted brown text
    }
  },

  // Golden temple gradients
  gradients: {
    temple: ['#DAA520', '#FFD700'] as const,       // Gold to bright gold
    sunrise: ['#FF8C00', '#DAA520'] as const,      // Orange to gold
    royal: ['#B8860B', '#DAA520'] as const,        // Dark gold to gold
    bronze: ['#CD7F32', '#A0522D'] as const,       // Bronze to copper
    antique: ['#8B7355', '#CD7F32'] as const,      // Muted brown to bronze
    divine: ['#DAA520', '#FFF8DC'] as const,       // Gold to cream
    warmth: ['#4A3828', '#8B7355'] as const,       // Card to muted
    luxury: ['#2C1810', '#4A3828'] as const,       // Dark to card
    sacred: ['#A0522D', '#DAA520'] as const,       // Copper to gold
    ornate: ['#CD853F', '#FFD700'] as const,       // Sandy brown to bright gold
    meditation: ['#4A3828', '#8B7355'] as const,   // Deep brown to warm brown
    lotus: ['#D2691E', '#FFD700'] as const,        // Orange red to gold
    fire: ['#B22222', '#FF8C00'] as const,         // Dark red to orange
    peacock: ['#4682B4', '#228B22'] as const,      // Steel blue to forest green
    vibrant: ['#FF8C00', '#4682B4'] as const,      // Orange to blue
    night: ['#2C1810', '#4A3828'] as const,        // Deep backgrounds
  },

  // Chart colors for data visualization - warm theme
  charts: {
    chart1: '#DAA520',  // Primary gold
    chart2: '#A0522D',  // Secondary bronze
    chart3: '#FFD700',  // Bright gold
    chart4: '#CD853F',  // Sandy brown
    chart5: '#B8860B',  // Dark gold
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
    sm: 12,    // Ornate rounded corners
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    full: 9999,
  },

  // Enhanced shadows with warm golden theme colors
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#8B4513',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#A0522D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    temple: {
      shadowColor: '#DAA520',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 12,
    },
    ornate: {
      shadowColor: '#CD7F32',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 16,
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
    border: 0.4,
  }
};

export type GoldenTempleTheme = typeof goldenTempleTheme;