import AsyncStorage from '@react-native-async-storage/async-storage';

module.exports = async (taskData: { state: string; number?: string }) => {
  const { state, number } = taskData;
  
  console.log(`[HeadlessTask] Call state: ${state}, number: ${number}`);

  try {
    // Store latest call state so the app can read it when foregrounded
    await AsyncStorage.setItem('latest_call_state', JSON.stringify({
      state,
      number: number || '',
      timestamp: Date.now(),
    }));

    // If call answered (OFFHOOK) and number is unknown — trigger backend
    if (state === 'OFFHOOK' && number) {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://call-screen-test.emergent.host';
      
      // Get stored userId
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) return;

      // Check if number is known
      const checkRes = await fetch(
        `${backendUrl}/api/users/${userId}/check-number/${encodeURIComponent(number)}`
      );
      const checkData = await checkRes.json();

      if (!checkData.is_known) {
        // Log the call — recording happens in foreground via callRecordingService
        await AsyncStorage.setItem('pending_unknown_call', JSON.stringify({
          number,
          startTime: Date.now(),
        }));
      }
    }
  } catch (e) {
    console.error('[HeadlessTask] Error:', e);
  }
};