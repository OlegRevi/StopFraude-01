import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, CallRecord } from '../../src/store/appStore';
import { translations } from '../../src/i18n/translations';
import apiService from '../../src/services/api';
import CallListItem from '../../src/components/CallListItem';

export default function HistoryScreen() {
  const router = useRouter();
  const { user, language, calls, setCalls } = useAppStore();
  const t = translations[language];
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadCalls();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadCalls = async () => {
    if (!user?.id) return;
    try {
      const callsData = await apiService.getUserCalls(user.id);
      setCalls(callsData);
    } catch (error) {
      console.error('Error loading calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCalls();
    setRefreshing(false);
  }, [user?.id]);

  const handleCallPress = (call: CallRecord) => {
    router.push({
      pathname: '/call-details',
      params: { callId: call.id },
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="call-outline" size={64} color="#d1d5db" />
      </View>
      <Text style={styles.emptyTitle}>{t.history.empty}</Text>
      <Text style={styles.emptySubtitle}>{t.history.emptySubtitle}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.history.title}</Text>
        <Text style={styles.headerSubtitle}>{calls.length} calls recorded</Text>
      </View>

      <FlatList
        data={calls}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CallListItem call={item} onPress={() => handleCallPress(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={calls.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6b7280',
  },
  list: {
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
});
