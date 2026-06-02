import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallRecord } from '../store/appStore';
import { useAppStore } from '../store/appStore';
import { translations } from '../i18n/translations';

interface CallListItemProps {
  call: CallRecord;
  onPress: () => void;
}

export const CallListItem: React.FC<CallListItemProps> = ({ call, onPress }) => {
  const { language } = useAppStore();
  const t = translations[language];
  
  const isScam = (call.scam_score || 0) > 70;
  const isSafe = call.analyzed && (call.scam_score || 0) <= 30;
  const isAnalyzing = !call.analyzed;
  
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getScamTypeLabel = () => {
    if (!call.scam_type) return '';
    const key = call.scam_type as keyof typeof t.scamTypes;
    return t.scamTypes[key] || call.scam_type.replace(/_/g, ' ');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[
        styles.iconContainer,
        isScam && styles.iconDanger,
        isSafe && styles.iconSafe,
        isAnalyzing && styles.iconAnalyzing,
      ]}>
        <Ionicons 
          name={isScam ? 'warning' : isAnalyzing ? 'hourglass' : 'call'} 
          size={24} 
          color={isScam ? '#dc2626' : isAnalyzing ? '#f59e0b' : '#22c55e'} 
        />
      </View>
      
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.number}>{call.caller_number}</Text>
          <Text style={styles.time}>{formatDate(call.timestamp)}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.duration}>{formatDuration(call.duration_seconds)}</Text>
          {isScam && (
            <View style={styles.scamBadge}>
              <Text style={styles.scamText}>{t.history.scam}</Text>
            </View>
          )}
          {isSafe && (
            <View style={styles.safeBadge}>
              <Text style={styles.safeText}>{t.history.safe}</Text>
            </View>
          )}
          {isAnalyzing && (
            <Text style={styles.analyzingText}>{t.history.analyzing}</Text>
          )}
        </View>
        
        {isScam && call.scam_type && (
          <Text style={styles.scamType}>
            {getScamTypeLabel()} • {call.scam_score}%
          </Text>
        )}
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconDanger: {
    backgroundColor: '#fef2f2',
  },
  iconSafe: {
    backgroundColor: '#f0fdf4',
  },
  iconAnalyzing: {
    backgroundColor: '#fffbeb',
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  number: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  time: {
    fontSize: 13,
    color: '#9ca3af',
  },
  duration: {
    fontSize: 14,
    color: '#6b7280',
  },
  scamBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  scamText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  safeBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  safeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  analyzingText: {
    fontSize: 12,
    color: '#f59e0b',
    fontStyle: 'italic',
  },
  scamType: {
    fontSize: 13,
    color: '#dc2626',
    marginTop: 2,
  },
});

export default CallListItem;
