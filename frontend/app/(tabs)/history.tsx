import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
} from 'react-native';
import { getLocalCallLogs } from '../../services/storage';
import { CallLogEntry } from '../../types';

type FilterType = 'ALL' | 'UNKNOWN' | 'SAFE';

export default function HistoryScreen() {
  const [logs, setLogs] = useState<CallLogEntry[]>([]);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setRefreshing(true);
    const data = await getLocalCallLogs();
    setLogs(data);
    setRefreshing(false);
  };

  const filteredLogs = logs.filter((item) => {
    if (filter === 'UNKNOWN') return item.isUnknown;
    if (filter === 'SAFE') return !item.isUnknown;
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'ALL' && styles.filterTabTextActive,
            ]}
          >
            All Calls ({logs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'UNKNOWN' && styles.filterTabActive,
          ]}
          onPress={() => setFilter('UNKNOWN')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'UNKNOWN' && styles.filterTabTextActive,
            ]}
          >
            🚨 Unknown ({logs.filter((l) => l.isUnknown).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'SAFE' && styles.filterTabActive]}
          onPress={() => setFilter('SAFE')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'SAFE' && styles.filterTabTextActive,
            ]}
          >
            ✅ Contacts ({logs.filter((l) => !l.isUnknown).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Logs List */}
      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={loadLogs}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.logCard,
              item.isUnknown ? styles.logCardUnknown : styles.logCardSafe,
            ]}
          >
            <View style={styles.logCardHeader}>
              <View style={styles.logHeaderLeft}>
                <Text style={styles.logEmoji}>
                  {item.isUnknown ? '🚨' : '✅'}
                </Text>
                <View>
                  <Text style={styles.logNumber}>
                    {item.callerName
                      ? `${item.callerName} (${item.incomingNumber})`
                      : item.incomingNumber}
                  </Text>
                  <Text style={styles.logVerdict}>
                    {item.isUnknown
                      ? 'UNKNOWN CALLER • NOT IN CONTACTS'
                      : 'VERIFIED CONTACT'}
                  </Text>
                </View>
              </View>

              <Text style={styles.logTime}>
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            {item.isUnknown && (
              <View style={styles.alertDetailBox}>
                <Text style={styles.alertDetailText}>
                  {item.alertDispatched
                    ? '⚡ Twilio SMS emergency alert dispatched to guardians'
                    : 'Alert generated locally'}
                </Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No call logs recorded yet</Text>
            <Text style={styles.emptySubtitle}>
              Incoming calls will be screened and logged here in real-time.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  filterTabActive: {
    backgroundColor: '#0284C7',
  },
  filterTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  logCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  logCardUnknown: {
    borderColor: '#EF444450',
    backgroundColor: '#1E1B2E',
  },
  logCardSafe: {
    borderColor: '#10B98140',
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  logNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  logVerdict: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
  },
  logTime: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  alertDetailBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  alertDetailText: {
    fontSize: 12,
    color: '#F87171',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
