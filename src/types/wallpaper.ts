export interface Wallpaper {
  id: string;
  title: string;
  description: Record<string, string> | string;
  imageUrl: string;
  thumbnailUrl: string;
  category: WallpaperCategory;
  tags: string[];
  isPremium: boolean;
  downloads: number;
  likes: number;
  createdAt: string;
  aspectRatio: number;
}

export type WallpaperCategory =
  | 'Gods'
  | 'Goddesses'
  | 'Temples'
  | 'Nature'
  | 'Festivals'
  | 'Quotes'
  | 'Abstract'
  | 'All';

export interface WallpaperFilter {
  category: WallpaperCategory;
  searchQuery: string;
  showPremiumOnly: boolean;
}
