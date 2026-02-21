export interface SpiritualContent {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  audioUrl: string;
  duration: string; // e.g., "5:30"
  thumbnailUrl: string;
  deity?: string; // e.g., "Lord Ganesha", "Goddess Lakshmi"
  language: Language;
  isPremium: boolean;
  plays: number;
  likes: number;
  lyrics?: string;
  createdAt: string;
}

export type ContentType = 'Aarti' | 'Bhajan' | 'Mantra';

export type Language = 'Hindi' | 'Sanskrit' | 'English' | 'Marathi' | 'Bengali' | 'Tamil';

export interface SpiritualFilter {
  type: ContentType | 'All';
  language: Language | 'All';
  deity: string | 'All';
  searchQuery: string;
  showPremiumOnly: boolean;
}
