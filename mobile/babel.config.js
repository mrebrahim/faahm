module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo already includes the expo-router plugin as of
    // SDK 50. Listing 'expo-router/babel' here as well doesn't just warn
    // — that module throws on load, so the bundler dies before it
    // compiles a single file.
    presets: ['babel-preset-expo'],
  };
};
