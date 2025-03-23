const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withFirebaseNotificationColorFix(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application[0];

    // Find or create the meta-data element for com.google.firebase.messaging.default_notification_color
    let metaData = application['meta-data'].find(
      (item) => item.$['android:name'] === 'com.google.firebase.messaging.default_notification_color'
    );

    if (!metaData) {
      // If it doesn't exist, create it
      metaData = {
        $: {
          'android:name': 'com.google.firebase.messaging.default_notification_color',
          'android:resource': '@color/notification_icon_color',
        },
      };
      application['meta-data'].push(metaData);
    }

    // Add tools:replace to override the conflicting value
    metaData.$['tools:replace'] = 'android:resource';

    // Ensure the tools namespace is defined in the manifest
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    return config;
  });
};