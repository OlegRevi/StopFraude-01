import { AppRegistry } from 'react-native';
import 'expo-router/entry';

// Register headless task for background call detection (Android only)
AppRegistry.registerHeadlessTask('CallDetection', () =>
  require('./src/tasks/callDetectionTask')
);
