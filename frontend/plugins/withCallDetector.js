const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for StopFrauda
 * Injects required Android permissions and CallScreeningService declarations
 */
module.exports = function withCallDetector(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // 1. Ensure permissions exist
    const requiredPermissions = [
      'android.permission.READ_CONTACTS',
      'android.permission.READ_PHONE_STATE',
      'android.permission.READ_CALL_LOG',
      'android.permission.ANSWER_PHONE_CALLS',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_PHONE_CALL',
      'android.permission.WAKE_LOCK',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      'android.permission.INTERNET',
      'android.permission.VIBRATE',
    ];

    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    const existingPermissions = new Set(
      androidManifest['uses-permission'].map((p) => p.$['android:name'])
    );

    for (const permission of requiredPermissions) {
      if (!existingPermissions.has(permission)) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    }

    // 2. Add services and receivers to <application>
    const application = androidManifest.application[0];
    if (!application.service) {
      application.service = [];
    }
    if (!application.receiver) {
      application.receiver = [];
    }

    const existingServices = new Set(
      application.service.map((s) => s.$['android:name'])
    );
    const existingReceivers = new Set(
      application.receiver.map((r) => r.$['android:name'])
    );

    // CallScreeningService declaration
    const screeningServiceClass = 'ro.stopfrauda.calldetector.CallScreeningServiceImpl';
    if (!existingServices.has(screeningServiceClass)) {
      application.service.push({
        $: {
          'android:name': screeningServiceClass,
          'android:permission': 'android.permission.BIND_SCREEN_CALL_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.telecom.CallScreeningService',
                },
              },
            ],
          },
        ],
      });
    }

    // Foreground service declaration
    const foregroundServiceClass = 'ro.stopfrauda.calldetector.CallDetectorForegroundService';
    if (!existingServices.has(foregroundServiceClass)) {
      application.service.push({
        $: {
          'android:name': foregroundServiceClass,
          'android:foregroundServiceType': 'phoneCall',
          'android:exported': 'false',
        },
      });
    }

    // Boot Receiver declaration (auto-restart protection upon phone reboot)
    const bootReceiverClass = 'ro.stopfrauda.calldetector.BootReceiver';
    if (!existingReceivers.has(bootReceiverClass)) {
      application.receiver.push({
        $: {
          'android:name': bootReceiverClass,
          'android:enabled': 'true',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.intent.action.BOOT_COMPLETED',
                },
              },
              {
                $: {
                  'android:name': 'android.intent.action.MY_PACKAGE_REPLACED',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};
