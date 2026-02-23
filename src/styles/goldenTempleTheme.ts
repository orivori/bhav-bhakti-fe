export const goldenTempleTheme = {
  colors: {
    // Core temple theme colors - Warm Golden Temple Theme
    background: 'transparent',         // Transparent to show global background image
    foreground: '#F5E6D3',         // Warm light text like old parchment

    card: '#3D2415',              // Darker brown for cards
    cardForeground: '#F5E6D3',

    popover: '#3D2415',
    popoverForeground: '#F5E6D3',

    // Primary golden colors (main temple gold)
    primary: {
      50: '#FFF8E7',
      100: '#FFEED4',
      200: '#FFD98E',
      300: '#FFC947',
      400: '#FFB800',
      500: '#DAA520',  // Main temple gold
      600: '#B8860B',
      700: '#996F00',
      800: '#7D5800',
      900: '#664600',
      DEFAULT: '#DAA520',
      foreground: '#2C1810',
    },

    // Secondary bronze/copper colors
    secondary: {
      50: '#FAF0E6',
      100: '#F5DEB3',
      200: '#DEB887',
      300: '#CD853F',
      400: '#BC7A3C',
      500: '#A0522D',  // Rich bronze/copper
      600: '#8B4513',
      700: '#654321',
      800: '#4A2C17',
      900: '#3D2415',
      DEFAULT: '#A0522D',
      foreground: '#F5E6D3',
    },

    // Muted warm tones
    muted: {
      50: '#F9F7F4',
      100: '#F0EAE2',
      200: '#E3D5C7',
      300: '#D4C4B0',
      400: '#C4AD93',
      500: '#8B7355',  // Muted warm brown
      600: '#6B5B47',
      700: '#4F453A',
      800: '#3D2415',
      900: '#2C1810',
      DEFAULT: '#8B7355',
      foreground: '#F5E6D3',
    },

    // Accent bright gold
    accent: {
      50: '#FFFACD',
      100: '#FFF8DC',
      200: '#FFE135',
      300: '#FFD700',
      400: '#FFC107',
      500: '#FFD700',  // Bright gold accent
      600: '#F57C00',
      700: '#E65100',
      800: '#BF360C',
      900: '#8D2F00',
      DEFAULT: '#FFD700',
      foreground: '#2C1810',
    },

    // Traditional warm temple colors
    saffron: '#FF9933',        // Traditional saffron
    templeGold: '#DAA520',     // Temple gold
    templeRed: '#B22222',      // Temple red (warmer than original)
    warmCopper: '#B87333',     // Warm copper
    richBronze: '#CD7F32',     // Rich bronze
    antiqueBrass: '#CD7F32',   // Antique brass
    peacockBlue: '#4682B4',    // Steel blue (warmer than bright blue)
    emerald: '#228B22',        // Forest green
    royalPurple: '#8B008B',    // Dark magenta

    // Semantic colors with warm tones
    destructive: {
      DEFAULT: '#D2691E',
      foreground: '#F5E6D3',
    },

    success: '#228B22',
    warning: '#FF8C00',
    error: '#B22222',
    info: '#4682B4',

    // Border and input colors - warm golden theme
    border: 'rgba(218, 165, 32, 0.4)', // Golden border with transparency
    input: 'transparent',
    inputBackground: 'rgba(139, 115, 85, 0.3)', // Semi-transparent warm brown
    switchBackground: '#D4C4B0',
    ring: '#DAA520', // Golden ring

    // Background variations
    backgrounds: {
      primary: 'transparent',       // Transparent to show global background image
      secondary: '#3D2415',     // Medium brown
      card: '#4A3828',          // Card background - lighter brown
      muted: '#8B7355',         // Muted warm brown
      overlay: 'rgba(44, 24, 16, 0.95)', // Dark warm overlay
    },

    // Text colors
    text: {
      primary: '#F5E6D3',       // Warm light text
      secondary: '#D4C4B0',     // Muted warm text
      accent: '#DAA520',        // Golden accent text
      inverse: '#2C1810',       // Dark text on light bg
      muted: '#C4AD93',         // Muted text
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