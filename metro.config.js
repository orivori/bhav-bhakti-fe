const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configure path aliases
config.resolver = {
  ...config.resolver,
  alias: {
    '@': path.resolve(__dirname, 'src'),
    '@/components': path.resolve(__dirname, 'src/components'),
    '@/features': path.resolve(__dirname, 'src/features'),
    '@/shared': path.resolve(__dirname, 'src/shared'),
    '@/styles': path.resolve(__dirname, 'src/styles'),
    '@/hooks': path.resolve(__dirname, 'src/hooks'),
  },
};

// Enable minification and optimize for production
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_classnames: false,
    keep_fnames: false,
    mangle: {
      keep_classnames: false,
      keep_fnames: false,
    },
    output: {
      ascii_only: true,
      quote_style: 3,
      wrap_iife: true,
    },
    sourceMap: {
      includeSources: false,
    },
    toplevel: false,
    compress: {
      reduce_funcs: false,
      drop_console: true, // Remove console logs
      drop_debugger: true, // Remove debugger statements
      unused: true, // Remove unused code
    },
  },
};

// Enable bundle splitting for better optimization
config.resolver.platforms = ['native', 'android', 'ios'];

// Optimize asset resolution
config.resolver.assetExts.push('lottie');
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;