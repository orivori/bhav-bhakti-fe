import { SvgProps } from 'react-native-svg';

import MantraIcon from '../../../../assets/icons/om.svg';
import RashifalIcon from '../../../../assets/icons/sun.svg';
import StatusIcon from '../../../../assets/icons/whatsapp.svg';
// Placeholder until a dedicated single-note ringtone icon is exported.
import RingtoneIcon from '../../../../assets/icons/bell icon.svg';

export interface QuickLinkCategory {
  id: 'mantras' | 'rashifal' | 'status' | 'ringtones';
  titleEn: string;
  titleHi: string;
  Icon: React.FC<SvgProps>;
}

// Single source of truth for the 4 quick-link categories (icon + labels) -
// shared by Home's quick-links section and choose-start.tsx, so a future
// icon swap or label change only happens in one place instead of the
// separate hardcoded copies each screen used to carry.
export const QUICK_LINK_CATEGORIES: QuickLinkCategory[] = [
  {
    id: 'mantras',
    titleEn: 'Mantra',
    titleHi: 'मंत्र',
    Icon: MantraIcon,
  },
  {
    id: 'rashifal',
    titleEn: 'Rashifal',
    titleHi: 'राशिफल',
    Icon: RashifalIcon,
  },
  {
    id: 'status',
    titleEn: 'Status',
    titleHi: 'स्टेटस',
    Icon: StatusIcon,
  },
  {
    id: 'ringtones',
    titleEn: 'Ringtone',
    titleHi: 'रिंगटोन',
    Icon: RingtoneIcon,
  },
];
