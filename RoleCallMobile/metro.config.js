// Metro config for handling database files
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .db extension to asset extensions
config.resolver.assetExts.push('db');

module.exports = config;
