export type ZodiacSign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export interface ZodiacInfo {
  sign: ZodiacSign;
  name: string;
  hindi: string;
  icon: string;
  dateRange: string;
  element: 'Fire' | 'Earth' | 'Air' | 'Water';
}

export interface DailyHoroscope {
  sign: ZodiacSign;
  date: string;
  overall: string;
  love: string;
  career: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
  luckyTime: string;
}
