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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.stepBadge}>STEP 4 OF 5</Text>
          <Text style={styles.title}>Choose Your Shield</Text>
          <Text style={styles.subtitle}>
            Activate comprehensive 24/7 scam protection with instant SMS alerts for your loved ones.
          </Text>
        </View>

        {/* Promo Banner */}
        <View style={styles.earlyBirdPromo}>
          <Text style={styles.promoEmoji}>🎉</Text>
          <View style={styles.promoTextContainer}>
            <Text style={styles.promoTitle}>Early Bird Special Active!</Text>
            <Text style={styles.promoDesc}>
              Sign up today and receive 1 full year of StopFrauda protection completely free (Valid until Nov 1).
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
                <Text style={styles.standardBadge}>REGULAR</Text>
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
              <Text style={styles.perkItem}>✓ Unlimited Twilio emergency SMS dispatches</Text>
              <Text style={styles.perkItem}>✓ Cancel anytime with one tap</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Security / Stripe Trust */}
        <View style={styles.trustRow}>
          <Text style={styles.trustText}>🔒 Encrypted & Secured by Stripe • No hidden fees</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.8}
          onPress={handleSelectPlan}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  stepBadge: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  earlyBirdPromo: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
    marginBottom: 20,
  },
  promoEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  promoTextContainer: {
    flex: 1,
  },
  promoTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
  },
  promoDesc: {
    color: '#E2E8F0',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  plansContainer: {
    gap: 16,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#334155',
  },
  planCardSelected: {
    borderColor: '#38BDF8',
    backgroundColor: '#0F2847',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  badgeRow: {
    marginBottom: 4,
  },
  popularBadge: {
    color: '#0F172A',
    backgroundColor: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  standardBadge: {
    color: '#94A3B8',
    backgroundColor: '#334155',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    fontSize: 16,
    fontWeight: '700',
    color: '#38BDF8',
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  pricePeriod: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 2,
  },
  planSummary: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 12,
  },
  perksList: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  perkItem: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  trustRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  trustText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
