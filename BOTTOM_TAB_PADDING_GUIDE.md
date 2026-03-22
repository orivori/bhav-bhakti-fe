# Bottom Tab Bar Padding Guide

This guide helps ensure content isn't hidden by the bottom tab bar in the main app screens.

## Problem
The bottom tab bar in `app/(main)/_layout.tsx` is positioned absolutely with a height of `Math.max(80 + insets.bottom, 88)`. This means screen content can be hidden underneath it if proper padding isn't applied.

## Solution
Use the `useTabBarHeight` hook to get consistent bottom padding across all screens.

### Import and Use the Hook
```typescript
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

export default function MyScreen() {
  const { contentPadding } = useTabBarHeight();

  // Use contentPadding in ScrollView or FlatList
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: contentPadding }}>
      {/* Your content */}
    </ScrollView>
  );
}
```

### For FlatList Components
```typescript
<FlatList
  data={items}
  renderItem={renderItem}
  contentContainerStyle={[
    { paddingBottom: contentPadding },
    otherStyles
  ]}
/>
```

## Screens Already Fixed
- ✅ `app/(main)/profile.tsx` - Uses dynamic contentPadding
- ✅ `app/(main)/ringtones.tsx` - Uses dynamic contentPadding
- ✅ `app/(main)/index.tsx` - Already had correct implementation

## Screens That Don't Need Fixing
- `app/(main)/audio-player.tsx` - Hidden from tabs (modal/full-screen)
- Other screens with `href: null` in _layout.tsx

## What the Hook Provides
- `tabBarHeight`: The exact height of the tab bar
- `contentPadding`: Tab bar height + 20px extra spacing (recommended for most screens)

This ensures content is never hidden by the bottom tab bar across different device sizes and safe area configurations.
