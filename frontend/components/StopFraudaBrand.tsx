import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { Colors } from '../constants/theme';

interface StopFraudaBrandProps {
  style?: StyleProp<TextStyle>;
  fontSize?: number;
  suffix?: string;
  suffixStyle?: StyleProp<TextStyle>;
  fontWeight?: TextStyle['fontWeight'];
}

export function StopFraudaBrand({
  style,
  fontSize,
  suffix,
  suffixStyle,
  fontWeight = '800',
}: StopFraudaBrandProps) {
  return (
    <Text style={[{ fontWeight }, fontSize ? { fontSize } : null, style]}>
      <Text style={{ color: Colors.brandStop }}>Stop</Text>
      <Text style={{ color: Colors.brandFrauda }}>Frauda</Text>
      {suffix ? <Text style={suffixStyle}>{suffix.startsWith(' ') ? suffix : ` ${suffix}`}</Text> : null}
    </Text>
  );
}

export default StopFraudaBrand;
