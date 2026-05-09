module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // No extra plugins needed — Expo SDK 50+ reads EXPO_PUBLIC_ vars
    // from .env.local natively via its own env loader.
  };
};
