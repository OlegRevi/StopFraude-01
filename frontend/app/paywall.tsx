import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ApiClient } from '../services/api';
import { getOrCreateUserId, saveLocalSubscription } from '../services/storage';
import { PlanType } from '../types';
import { Colors } from '../constants/theme';

export default function PaywallScreen() {
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('EARLY_BIRD');
  const [submitting, setSubmitting] = useState(false);

  const handleSelectPlan = async () => {
    setSubmitting(true);
    try {
      const userId = await getOrCreateUserId();
      const res = await ApiClient.createCheckout(userId, selectedPlan);

      if (res.success) {
        await saveLocalSubscription({
          planType: selectedPlan,
          status: 'active',
          expiresAt: res.expiresAt,
        });

        // Navigate to Step 5: Setup Complete & Welcome SMS
        router.push('/setup-complete');
      } else {
        Alert.alert('Subscription', res.message || 'Could not process plan.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Subscription failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Row with Back Button */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backCircle}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Center Star Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.badgeCircle}>
            <Text style={styles.badgeEmoji}>⭐</Text>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Protection</Text>
          <Text style={styles.subtitle}>
            Activate comprehensive 24/7 scam protection with instant SMS alerts for your loved ones.
          </Text>
        </View>

        {/* Promo Banner */}
        <View style={styles.earlyBirdPromo}>
          <Text style={styles.promoEmoji}>🎉</Text>
          <View style={styles.promoTextContainer}>
            <Text style={styles.promoTitle}>Early Bird Special Active</Text>
            <Text style={styles.promoDesc}>
              1 full year of StopFrauda protection completely free!
            </Text>
          </View>
        </View>

        {/* Plan Cards */}
        <View style={styles.plansContainer}>
          {/* Plan 1: Early Bird (Recommended) */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'EARLY_BIRD' && styles.planCardSelected,
            ]}
            activeOpacity={0.8}
            onPress={() => setSelectedPlan('EARLY_BIRD')}
          >
            <View style={styles.planHeader}>
              <View>
                <View style={styles.badgeRow}>
                  <Text style={styles.popularBadge}>RECOMMENDED</Text>
                </View>
                <Text style={styles.planName}>Early Bird Protection</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceCurrency}>$</Text>
                <Text style={styles.priceAmount}>0</Text>
                <Text style={styles.pricePeriod}>/ 1st yr</Text>
              </View>
            </View>

            <Text style={styles.planSummary}>
              Enjoy complete peace of mind with all premium features unlocked for 12 months.
            </Text>

            <View style={styles.perksList}>
              <Text style={styles.perkItem}>✓ Real-time incoming call screening</Text>
              <Text style={styles.perkItem}>✓ Up to 5 Emergency Guardians alerted via Twilio SMS</Text>
              <Text style={styles.perkItem}>✓ Instant unknown caller warning notification</Text>
              <Text style={styles.perkItem}>✓ Detailed scam history and reporting</Text>
              <Text style={styles.perkItem}>✓ 100% private: Zero audio recording</Text>
            </View>
          </TouchableOpacity>

          {/* Plan 2: Annual Standard */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'ANNUAL_STANDARD' && styles.planCardSelected,
            ]}
            activeOpacity={0.8}
            onPress={() => setSelectedPlan('ANNUAL_STANDARD')}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.standardBadge}>STANDARD</Text>
                <Text style={styles.planName}>Standard Annual</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceCurrency}>$</Text>
                <Text style={styles.priceAmount}>10</Text>
                <Text style={styles.pricePeriod}>/ year</Text>
              </View>
            </View>

            <Text style={styles.planSummary}>
              Billed annually. Less than $0.85/month to protect yourself and your family from fraudsters.
            </Text>

            <View style={styles.perksList}>
              <Text style={styles.perkItem}>✓ Full 24/7 background scam screening</Text>
              <Text style={styles.perkItem}>✓ Unlimited emergency SMS dispatches</Text>
              <Text style={styles.perkItem}>✓ Cancel anytime with one tap</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Security / Stripe Trust */}
        <View style={styles.trustRow}>
          <Text style={styles.trustText}>🔒 Encrypted & Secured • No hidden fees</Text>
        </View>

        {/* Submit Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.85}
            onPress={handleSelectPlan}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <>
                <Text style={styles.actionButtonText}>
                  {selectedPlan === 'EARLY_BIRD'
                    ? 'Claim 1 Year Free Protection'
                    : 'Subscribe for $10.00 / year'}
                </Text>
                <Text style={styles.arrowIcon}>→</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  topHeader: {
    paddingTop: 8,
    marginBottom: 4,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backArrow: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  badgeContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  badgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  earlyBirdPromo: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    alignItems: 'center',
    marginBottom: 18,
  },
  promoEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  promoTextContainer: {
    flex: 1,
  },
  promoTitle: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  promoDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  plansContainer: {
    gap: 14,
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F5F7FF',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  badgeRow: {
    marginBottom: 4,
  },
  popularBadge: {
    backgroundColor: Colors.primary,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    letterSpacing: 0.5,
  },
  standardBadge: {
    backgroundColor: Colors.surfaceSecondary,
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.primary,
  },
  pricePeriod: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  planSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  perksList: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
  },
  perkItem: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  trustRow: {
    alignItems: 'center',
    marginVertical: 10,
  },
  trustText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  footerContainer: {
    marginTop: 8,
    paddingBottom: 16,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  actionButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  arrowIcon: {
    color: Colors.textInverse,
    fontSize: 20,
    fontWeight: '700',
  },
});
