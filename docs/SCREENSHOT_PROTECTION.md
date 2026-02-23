# Global Screenshot Protection System

This document explains how to use the global screenshot protection system implemented in the BhavBhakti app.

## Overview

The screenshot protection system provides a global toggle that can be enabled/disabled throughout the entire application. When enabled, it prevents users from taking screenshots or screen recordings on iOS and Android devices.

## Components

### 1. Screenshot Protection Store (`src/store/screenshotProtectionStore.ts`)
- Global state management using Zustand
- Persists settings using AsyncStorage
- Default: enabled for security

### 2. Screenshot Protection Hook (`src/hooks/useScreenshotProtection.ts`)
- Updated to respect global setting
- Automatically activates/deactivates based on global state
- Handles cleanup properly

### 3. Utility Functions (`src/utils/screenshotProtection.ts`)
- Easy-to-use functions for controlling screenshot protection
- React hooks for components

### 4. Settings Component (`src/components/molecules/ScreenshotProtectionSettings.tsx`)
- Ready-to-use UI component for toggling protection
- Can be used in settings screens or profile pages

## Usage Examples

### 1. Basic Usage - Toggle Screenshot Protection

```javascript
import { toggleScreenshotProtection, isScreenshotProtectionEnabled } from '@/utils/screenshotProtection';

// Toggle protection on/off
toggleScreenshotProtection();

// Check current status
const isEnabled = isScreenshotProtectionEnabled();
console.log('Protection enabled:', isEnabled);
```

### 2. Enable/Disable Programmatically

```javascript
import { enableScreenshotProtection, disableScreenshotProtection } from '@/utils/screenshotProtection';

// Enable protection
enableScreenshotProtection();

// Disable protection
disableScreenshotProtection();

// Set specific state
import { setScreenshotProtection } from '@/utils/screenshotProtection';
setScreenshotProtection(true); // enable
setScreenshotProtection(false); // disable
```

### 3. Using in React Components

```javascript
import { useScreenshotProtectionSettings } from '@/utils/screenshotProtection';

function SettingsScreen() {
  const { isEnabled, enable, disable, toggle } = useScreenshotProtectionSettings();

  return (
    <View>
      <Text>Screenshot Protection: {isEnabled ? 'ON' : 'OFF'}</Text>
      <Button onPress={toggle} title="Toggle Protection" />
    </View>
  );
}
```

### 4. Using the Settings Component

```javascript
import ScreenshotProtectionSettings from '@/components/molecules/ScreenshotProtectionSettings';

function ProfileScreen() {
  return (
    <View>
      {/* Other profile settings */}

      <ScreenshotProtectionSettings
        showAsCard={true}
        showDescription={true}
      />
    </View>
  );
}
```

### 5. Global Hook Integration (Already implemented in _layout.tsx)

The `useScreenshotProtection()` hook is already called in `app/_layout.tsx`, so it will automatically:
- Apply the global setting when the app starts
- React to changes in the global setting
- Handle proper cleanup

## Key Features

### ✅ Global Control
- Single source of truth for screenshot protection state
- Can be toggled from anywhere in the app
- Changes apply immediately to all screens

### ✅ Persistent Settings
- Settings are saved to device storage
- Survives app restarts
- Default: enabled for security

### ✅ React Native Compatible
- Works on iOS and Android
- Web support (protection disabled gracefully)
- Proper cleanup and memory management

### ✅ Developer Friendly
- Simple utility functions
- TypeScript support
- Console logging for debugging

## API Reference

### Utility Functions

```javascript
// Enable/Disable
enableScreenshotProtection()      // Enable globally
disableScreenshotProtection()     // Disable globally
toggleScreenshotProtection()      // Toggle current state
setScreenshotProtection(boolean)  // Set specific state

// Check Status
isScreenshotProtectionEnabled()   // Returns boolean

// Debug
debugScreenshotProtection()       // Log current status
```

### Hook API

```javascript
const {
  isEnabled,  // boolean - current state
  enable,     // function - enable protection
  disable,    // function - disable protection
  toggle,     // function - toggle protection
  set,        // function - set specific state
} = useScreenshotProtectionSettings();
```

## Integration Points

### Where to Add Settings UI

1. **Profile Screen** - Most common location
2. **Settings Screen** - Dedicated settings page
3. **Privacy/Security Section** - Part of privacy controls
4. **Developer Menu** - For debugging (dev builds only)

### Example Integration

```javascript
// In your profile or settings screen
import ScreenshotProtectionSettings from '@/components/molecules/ScreenshotProtectionSettings';

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container}>
      {/* Other profile content */}

      <Text style={styles.sectionTitle}>Privacy & Security</Text>
      <ScreenshotProtectionSettings />

      {/* Other settings */}
    </ScrollView>
  );
}
```

## Notes

- Screenshot protection only works on physical devices (iOS/Android)
- On web platforms, the protection is disabled gracefully
- Changes take effect immediately across the entire app
- The system includes proper error handling and logging
- Default state is "enabled" for maximum security

## Debugging

Use the debug function to check the current status:

```javascript
import { debugScreenshotProtection } from '@/utils/screenshotProtection';

// This will log the current status to console
debugScreenshotProtection();
```

Console output will show:
```
📱 Screenshot Protection Status: {
  enabled: true,
  timestamp: "2024-01-15T10:30:00.000Z"
}
```