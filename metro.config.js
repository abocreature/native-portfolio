const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Direct Metro to resolve empty browser modules for Node hooks
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  fs: require.resolve('path-browserify'), 
  path: require.resolve('path-browserify'),
};

module.exports = config;