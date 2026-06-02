const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to add Android Call Detection capabilities
 * This plugin:
 * 1. Adds required permissions to AndroidManifest.xml
 * 2. Adds the PhoneStateReceiver and CallDetectionTaskService
 * 3. Copies the custom Java files into the native Android project during prebuild
 */

function withAndroidCallDetection(config) {
  // Step 1: Add permissions and register receivers in the Manifest
  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;
    
    // Ensure permissions array exists
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = manifest['uses-permission'];

    // Add required permissions if not already present
    const requiredPermissions = [
      'android.permission.READ_PHONE_STATE',
      'android.permission.READ_CALL_LOG',
      'android.permission.RECORD_AUDIO',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_PHONE_CALL',
      'android.permission.WAKE_LOCK',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.READ_PHONE_NUMBERS',
      'android.permission.ANSWER_PHONE_CALLS',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ];

    requiredPermissions.forEach(permission => {
      const exists = permissions.some(
        p => p.$?.['android:name'] === permission
      );
      if (!exists) {
        permissions.push({
          $: { 'android:name': permission },
        });
      }
    });

    // Ensure application node exists
    if (!manifest.application) {
      manifest.application = [{}];
    }

    const application = manifest.application[0];

    // Add boot receiver
    if (!application.receiver) {
      application.receiver = [];
    }

    const bootReceiverExists = application.receiver.some(
      r => r.$?.['android:name'] === '.BootReceiver'
    );

    if (!bootReceiverExists) {
      application.receiver.push({
        $: {
          'android:name': '.BootReceiver',
          'android:enabled': 'true',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
              { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
            ],
          },
        ],
      });
    }

    // Add phone state receiver
    const phoneReceiverExists = application.receiver.some(
      r => r.$?.['android:name'] === '.PhoneStateReceiver'
    );

    if (!phoneReceiverExists) {
      application.receiver.push({
        $: {
          'android:name': '.PhoneStateReceiver',
          'android:enabled': 'true',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.intent.action.PHONE_STATE' } },
            ],
          },
        ],
      });
    }

    // Add foreground service
    if (!application.service) {
      application.service = [];
    }

    const serviceExists = application.service.some(
      s => s.$?.['android:name'] === '.CallDetectionTaskService'
    );

    if (!serviceExists) {
      application.service.push({
        $: {
          'android:name': '.CallDetectionTaskService',
          'android:enabled': 'true',
          'android:exported': 'false',
          'android:foregroundServiceType': 'phoneCall|microphone',
        },
      });
    }

    return config;
  });

  // Step 2: Copy the Java files into the Android project
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      // The source directory where your custom Java files live
      const srcDir = path.join(config.modRequest.projectRoot, 'frontend', 'android-src');
      
      // The destination directory in the generated Android project
      // Matches the package: com.stopfrauda.app
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java', 'com', 'stopfrauda', 'app'
      );

      // Ensure destination directory exists
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copy all Java files from android-src to the native project
      if (fs.existsSync(srcDir)) {
        const files = fs.readdirSync(srcDir);
        files.forEach(file => {
          if (file.endsWith('.java') || file.endsWith('.kt')) {
            const srcFile = path.join(srcDir, file);
            const destFile = path.join(destDir, file);
            fs.copyFileSync(srcFile, destFile);
            console.log(`[StopFrauda Plugin] Successfully copied ${file} to native Android build.`);
          }
        });
      } else {
        console.warn(`[StopFrauda Plugin] Warning: Source directory not found at ${srcDir}`);
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidCallDetection;
