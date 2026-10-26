const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// The app has its own dependencies; only platform-neutral contracts live outside it.
config.watchFolders = [path.resolve(__dirname, '../../packages')];
module.exports = config;
