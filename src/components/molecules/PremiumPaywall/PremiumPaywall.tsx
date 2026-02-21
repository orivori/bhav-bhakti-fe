import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms';
import { usePremiumStore } from '@/store/premiumStore';

const { width } = Dimensions.get('window');

interface PlanOption {
  id: string;
  title: string;
  price: string;
  period: string;
  savings?: string;
  popular?: boolean;
}

export function PremiumPaywall() {
  const { showPaywall, setShowPaywall } = usePremiumStore();
  const [selectedPlan, setSelectedPlan] = useState('yearly');

  const plans: PlanOption[] = [
    {
      id: 'monthly',
      title: 'Monthly',
      price: '$4.99',
      period: 'per month',
    },
    {
      id: 'yearly',
      title: 'Yearly',
      price: '$29.99',
      period: 'per year',
      savings: 'Save 50%',
      popular: true,
    },
    {
      id: 'lifetime',
      title: 'Lifetime',
      price: '$99.99',
      period: 'one-time',
      savings: 'Best Value',
    },
  ];

  const features = [
    'Unlimited access to all premium wallpapers',
    'Exclusive spiritual content library',
    'Ad-free experience',
    'HD quality downloads',
    'Early access to new content',
    'Custom watermark options',
    'Priority customer support',
  ];

  const handlePurchase = () => {
    const plan = plans.find((p) => p.id === selectedPlan);
    Alert.alert(
      'Purchase Premium',
      `You are about to purchase the ${plan?.title} plan for ${plan?.price}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert('Success!', 'Welcome to Premium! 🎉');
            setShowPaywall(false);
          },
        },
      ]
    );
  };

  const handleRestore = () => {
    Alert.alert('Restore Purchase', 'Checking for previous purchases...');
  };

  return (
    <Modal
      visible={showPaywall}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowPaywall(false)}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowPaywall(false)}
          >
            <Ionicons name="close" size={28} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="star" size={48} color="#fbbf24" />
            </View>
            <Text variant="h2" weight="bold" align="center" style={styles.heroTitle}>
              Unlock Premium
            </Text>
            <Text variant="body" color="secondary" align="center" style={styles.heroSubtitle}>
              Get unlimited access to exclusive spiritual content and features
            </Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </View>
                <Text variant="body" style={styles.featureText}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* Plans */}
          <View style={styles.plansContainer}>
            <Text variant="h4" weight="semibold" align="center" style={styles.plansTitle}>
              Choose Your Plan
            </Text>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.planCardSelected,
                  plan.popular && styles.planCardPopular,
                ]}
                onPress={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text variant="caption" weight="bold" style={styles.popularText}>
                      MOST POPULAR
                    </Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <View style={styles.radioButton}>
                    {selectedPlan === plan.id && <View style={styles.radioButtonInner} />}
                  </View>
                  <View style={styles.planInfo}>
                    <View style={styles.planTitleRow}>
                      <Text variant="h4" weight="bold">
                        {plan.title}
                      </Text>
                      {plan.savings && (
                        <View style={styles.savingsBadge}>
                          <Text variant="caption" style={styles.savingsText}>
                            {plan.savings}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text variant="caption" color="secondary">
                      {plan.period}
                    </Text>
                  </View>
                  <Text variant="h3" weight="bold" color="primary">
                    {plan.price}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Trust Badges */}
          <View style={styles.trustContainer}>
            <View style={styles.trustItem}>
              <Ionicons name="shield-checkmark" size={24} color="#10b981" />
              <Text variant="caption" color="secondary" align="center" style={styles.trustText}>
                Secure Payment
              </Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="refresh" size={24} color="#10b981" />
              <Text variant="caption" color="secondary" align="center" style={styles.trustText}>
                Cancel Anytime
              </Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="lock-closed" size={24} color="#10b981" />
              <Text variant="caption" color="secondary" align="center" style={styles.trustText}>
                100% Safe
              </Text>
            </View>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.purchaseButton} onPress={handlePurchase}>
            <Text variant="h4" weight="bold" style={styles.purchaseButtonText}>
              Continue
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
            <Text variant="body" color="secondary">
              Restore Purchase
            </Text>
          </TouchableOpacity>
          <Text variant="caption" color="secondary" align="center" style={styles.terms}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    marginBottom: 12,
  },
  heroSubtitle: {
    maxWidth: 300,
  },
  featuresContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  plansContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  plansTitle: {
    marginBottom: 20,
  },
  planCard: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  planCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f9ff',
  },
  planCardPopular: {
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  planInfo: {
    flex: 1,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingsBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsText: {
    color: '#15803d',
    fontWeight: '600',
  },
  trustContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  trustItem: {
    alignItems: 'center',
    gap: 8,
  },
  trustText: {
    marginTop: 4,
  },
  bottomBar: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  purchaseButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  purchaseButtonText: {
    color: '#fff',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  terms: {
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  bottomSpacing: {
    height: 24,
  },
});
