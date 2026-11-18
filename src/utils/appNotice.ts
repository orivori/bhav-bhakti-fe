import { Alert } from 'react-native';
import i18n from 'i18next';
import {
  useAppNoticeStore,
  type AppNoticeAnswer,
  type AppNoticeContent,
  type NoticeText,
} from '@/store/appNoticeStore';

const translate = (text: NoticeText | undefined): string =>
  text ? String(i18n.t(text.key, text.params)) : '';

// Shows the centred notice (AppNotice) and resolves with how it was closed.
// If no notice is mounted, or one is already open, the same content is shown
// as a plain Alert instead, so nothing is lost.
export async function showAppNotice(content: AppNoticeContent): Promise<AppNoticeAnswer> {
  const result = await useAppNoticeStore.getState().show(content);
  if (result !== 'no_host' && result !== 'busy') return result;
  return showAsAlert(content);
}

function showAsAlert(content: AppNoticeContent): Promise<AppNoticeAnswer> {
  const parts: string[] = [];
  if (content.body) parts.push(translate(content.body));
  if (content.steps?.length) {
    const lines = content.steps.map((step, index) => `${index + 1}. ${translate(step)}`);
    parts.push([content.stepsTitle ? translate(content.stepsTitle) : null, ...lines].filter(Boolean).join('\n'));
  }
  if (content.hint) parts.push(translate(content.hint));

  return new Promise((resolve) => {
    const buttons: { text: string; onPress: () => void; style?: 'default' | 'cancel' }[] = [];
    if (content.primaryButton) {
      buttons.push({ text: translate(content.primaryButton), onPress: () => resolve('primary') });
    }
    buttons.push({ text: translate(content.closeButton), onPress: () => resolve('close'), style: 'default' });
    Alert.alert(translate(content.title), parts.join('\n\n'), buttons, {
      cancelable: true,
      onDismiss: () => resolve('dismissed'),
    });
  });
}
