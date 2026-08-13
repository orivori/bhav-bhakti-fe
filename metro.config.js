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

// Local SVG-as-component support (react-native-svg-transformer) - lets
// `import Icon from '../assets/icons/foo.svg'` render Icon as a real
// component (fill/stroke props work), instead of Metro treating it as a
// static asset. Unrelated to react-native-svg's SvgUri (remote-URL SVG
// loading), which keeps working as before.
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;