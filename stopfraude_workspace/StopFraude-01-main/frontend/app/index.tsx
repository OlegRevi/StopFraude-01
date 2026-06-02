import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/appStore';

export default function Index() {
  const router = useRouter();
  const { user } = useAppStore();

  useEffect(() => {
    // Short delay to ensure state is loaded
    const timer = setTimeout(() => {
      if (user?.onboarding_completed) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding/welcome');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
