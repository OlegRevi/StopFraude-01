import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ScamScoreBadgeProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
}

export const ScamScoreBadge: React.FC<ScamScoreBadgeProps> = ({ score, size = 'medium' }) => {
  const isScam = score > 70;
  const isSuspicious = score > 30 && score <= 70;
  const isSafe = score <= 30;
  
  const getColor = () => {
    if (isScam) return '#dc2626';
    if (isSuspicious) return '#f59e0b';
    return '#22c55e';
  };
  
  const getIcon = () => {
    if (isScam) return 'warning';
    if (isSuspicious) return 'help-circle';
    return 'checkmark-circle';
  };
  
  const getLabel = () => {
    if (isScam) return 'SCAM DETECTED';
    if (isSuspicious) return 'SUSPICIOUS';
    return 'LIKELY SAFE';
  };
  
  const sizeStyles = {
    small: { container: 100, icon: 40, text: 12, score: 14 },
    medium: { container: 140, icon: 60, text: 14, score: 24 },
    large: { container: 180, icon: 80, text: 16, score: 32 },
  };
  
  const s = sizeStyles[size];
  const color = getColor();

  return (
    <View style={[styles.container, { width: s.container }]}>
      <View style={[
        styles.circle,
        { 
          width: s.icon,
          height: s.icon,
          borderRadius: s.icon / 2,
          backgroundColor: `${color}15`,
          borderColor: color,
        }
      ]}>
        <Ionicons name={getIcon() as any} size={s.icon * 0.5} color={color} />
      </View>
      <Text style={[styles.score, { fontSize: s.score, color }]}>
        {score}%
      </Text>
      <Text style={[styles.label, { fontSize: s.text, color }]}>
        {getLabel()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    marginBottom: 12,
  },
  score: {
    fontWeight: '800',
    marginBottom: 4,
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ScamScoreBadge;
