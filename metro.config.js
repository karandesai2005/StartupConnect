const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  return {
    ...config,
    resolver: {
      ...config.resolver,
      extraNodeModules: {
        'ws/lib/websocket-server.js': __dirname + '/stubs/empty.js',
      },
    },
  };
})();