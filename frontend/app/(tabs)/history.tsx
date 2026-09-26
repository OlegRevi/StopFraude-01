import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { getLocalCallLogs } from '../../services/storage';
import { CallLogEntry } from '../../types';
import { Colors } from '../../constants/theme';

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
            All ({logs.length})
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
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View
            style={[
              styles.logCard,
              item.isUnknown ? styles.logCardUnknown : styles.logCardSafe,
            ]}
          >
            <View style={styles.logCardHeader}>
              <View style={styles.logHeaderLeft}>
                <View
                  style={[
                    styles.logIconCircle,
                    item.isUnknown ? styles.iconUnknown : styles.iconSafe,
                  ]}
                >
                  <Text style={styles.logEmoji}>
                    {item.isUnknown ? '🚨' : '✅'}
                  </Text>
                </View>
                <View style={styles.logTextContainer}>
                  <Text style={styles.logNumber}>
                    {item.callerName
                      ? `${item.callerName} (${item.incomingNumber})`
                      : item.incomingNumber}
                  </Text>
                  <Text
                    style={[
                      styles.logVerdict,
                      item.isUnknown ? styles.verdictUnknown : styles.verdictSafe,
                    ]}
                  >
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
                    ? '⚡ Emergency SMS alert dispatched to guardians'
                    : 'Alert recorded locally'}
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
    backgroundColor: Colors.background,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryMuted,
  },
  filterTabText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: Colors.primary,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  logCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  logCardUnknown: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFDFD',
  },
  logCardSafe: {
    borderColor: '#BBF7D0',
    backgroundColor: '#FAFCFA',
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconUnknown: {
    backgroundColor: Colors.dangerLight,
  },
  iconSafe: {
    backgroundColor: Colors.successLight,
  },
  logEmoji: {
    fontSize: 18,
  },
  logTextContainer: {
    flex: 1,
  },
  logNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  logVerdict: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  verdictUnknown: {
    color: Colors.dangerDark,
  },
  verdictSafe: {
    color: Colors.successDark,
  },
  logTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  alertDetailBox: {
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  alertDetailText: {
    fontSize: 12,
    color: Colors.dangerDark,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
