export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  authProvider: 'phone' | 'google' | 'email';
  createdAt: string;
  isPremium: boolean;
  subscriptionEndDate?: string;
}

export interface PremiumSubscription {
  id: string;
  userId: string;
  planType: 'monthly' | 'yearly' | 'lifetime';
  startDate: string;
  endDate?: string;
  isActive: boolean;
  autoRenew: boolean;
}
