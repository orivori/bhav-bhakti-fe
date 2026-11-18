import { showAppNotice } from './appNotice';

// The three messages after a wallpaper/media save to the gallery, shown in
// the centred notice (AppNotice) instead of a plain Alert. Fire-and-forget:
// callers don't wait for the notice to close, exactly as with Alert.alert.

export function showSavedToGalleryNotice(): void {
  void showAppNotice({
    title: { key: 'common.savedToGalleryTitle' },
    body: { key: 'common.savedToGalleryMessage' },
    closeButton: { key: 'feedCard.ok' },
  });
}

export function showAlreadySavedNotice(): void {
  void showAppNotice({
    title: { key: 'common.alreadySavedTitle' },
    body: { key: 'common.alreadySavedMessage' },
    closeButton: { key: 'feedCard.ok' },
  });
}

export function showSaveFailedNotice(): void {
  void showAppNotice({
    title: { key: 'common.error' },
    body: { key: 'common.saveFailedMessage' },
    closeButton: { key: 'feedCard.ok' },
  });
}
