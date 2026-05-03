# Mixpanel Analytics Setup

This guide explains how to set up and use Mixpanel analytics in the Bhav Bhakti app.

## 🚀 Quick Setup

1. **Create a Mixpanel Account**: Go to [mixpanel.com](https://mixpanel.com) and create an account.

2. **Get Your Project Tokens**:
   - Create two projects: one for development and one for production
   - Copy the project tokens from each project's settings

3. **Update Configuration**:
   - Open `/src/config/mixpanel.ts`
   - Replace `YOUR_DEVELOPMENT_TOKEN_HERE` with your dev token
   - Replace `YOUR_PRODUCTION_TOKEN_HERE` with your prod token

```typescript
export const MIXPANEL_CONFIG = {
  DEV_TOKEN: 'abc123...your-dev-token',
  PROD_TOKEN: 'xyz789...your-prod-token',
  // ... rest of config
};
```

4. **Verify Setup**: Check your Mixpanel dashboard to see events flowing in.

## 📊 Events Currently Tracked

### Authentication Events
- **User Login** - When user successfully logs in
- **User Logout** - When user logs out
- **User Signup** - When new user signs up

### Content Interaction Events
- **Feed Viewed** - When user views a feed item
- **Feed Liked** - When user likes a feed item
- **Feed Shared** - When user shares a feed item
- **Feed Downloaded** - When user downloads a feed item

### Audio Player Events
- **Audio Started** - When user starts playing audio
- **Audio Paused** - When user pauses audio
- **Audio Completed** - When audio playback completes

### Navigation Events
- **Screen Viewed** - When user navigates to a screen
- **Category Selected** - When user selects a category
- **Search Performed** - When user performs a search

### Horoscope Events
- **Horoscope Viewed** - When user views horoscope
- **Zodiac Calculated** - When zodiac is calculated from birth date

### Profile Events
- **Profile Updated** - When user updates profile
- **Profile Photo Upload** - When user uploads profile photo

### Premium Events
- **Premium Upgrade Started** - When user starts premium upgrade
- **Premium Purchased** - When user completes premium purchase

### App Lifecycle Events
- **App Launched** - When app is launched
- **App Backgrounded** - When app goes to background
- **App Foregrounded** - When app comes to foreground

## 🛠 Adding New Events

### 1. Add Event Name to Config
Add your event name to `MIXPANEL_EVENTS` in `/src/config/mixpanel.ts`:

```typescript
export const MIXPANEL_EVENTS = {
  // ... existing events
  MY_NEW_EVENT: 'My New Event',
} as const;
```

### 2. Add Method to Service
Add a new method to the `MixpanelService` class in `/src/services/mixpanel.ts`:

```typescript
trackMyNewEvent(customProperty: string) {
  this.track(MIXPANEL_EVENTS.MY_NEW_EVENT, {
    custom_property: customProperty,
  });
}
```

### 3. Use in Component
Import and use in your component:

```typescript
import { mixpanel } from '@/services/mixpanel';

// In your component
const handleSomething = () => {
  mixpanel.trackMyNewEvent('some value');
};
```

## 📱 Screen Tracking

Use the `useScreenTracking` hook to automatically track screen views:

```typescript
import { useScreenTracking } from '@/hooks/useScreenTracking';

export default function MyScreen() {
  // This will automatically track "My Screen" view
  useScreenTracking('My Screen');
  
  return (
    // ... your component
  );
}
```

## 👤 User Properties

Set user properties when user data changes:

```typescript
mixpanel.setUserProperties({
  phone_number: user.phoneNumber,
  name: user.name,
  premium_status: user.isPremium ? 'premium' : 'free',
});
```

## 🔍 Event Properties

All events automatically include these properties:
- `app_name`: "Bhav Bhakti"
- `app_version`: "1.0.0" 
- `platform`: "react-native"
- `timestamp`: ISO timestamp

Add custom properties when tracking events:

```typescript
mixpanel.trackSearch('mantra om', 'mantras_page');
// Results in:
// {
//   search_query: 'mantra om',
//   search_category: 'mantras_page',
//   app_name: 'Bhav Bhakti',
//   app_version: '1.0.0',
//   platform: 'react-native',
//   timestamp: '2023-12-01T10:30:00.000Z'
// }
```

## 🚨 Error Tracking

Track errors with context:

```typescript
try {
  // some operation
} catch (error) {
  mixpanel.trackError(error.message, 'ProfileScreen');
}
```

## 🔐 Privacy & GDPR

- Mixpanel SDK respects user privacy settings
- User data is handled according to Mixpanel's privacy policy
- Consider implementing opt-out functionality for users who don't want analytics

## 🐛 Debugging

- Check console logs for Mixpanel initialization and event tracking
- Use Mixpanel's Live View to see events in real-time
- Verify event names and properties match your expectations

## 📈 Dashboard Setup

1. **Create Dashboards**: Set up dashboards in Mixpanel for key metrics
2. **Set Up Funnels**: Track user journey through key flows
3. **Create Cohorts**: Segment users based on behavior
4. **Set Up Alerts**: Get notified of important changes

## 🚀 Next Steps

1. Set up your Mixpanel tokens
2. Test events in development
3. Create dashboards for key metrics
4. Set up retention and funnel analysis
5. Use insights to improve user experience

---

For more information, visit the [Mixpanel React Native Documentation](https://docs.mixpanel.com/docs/tracking/how-tos/javascript#react-native).