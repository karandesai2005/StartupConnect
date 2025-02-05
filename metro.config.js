const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Remove or comment out the babelTransformerPath line
// config.transformer.babelTransformerPath = require.resolve('react-native-dotenv');

module.exports = config;

