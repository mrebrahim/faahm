module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
    plugins: [
      // expo-router needs this to resolve the app/ directory routes.
      'expo-router/babel',
    ],
  };
};
