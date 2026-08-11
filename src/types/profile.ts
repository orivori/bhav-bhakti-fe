import { ZodiacSign } from './horoscope';

// Deliberately non-exhaustive - only the fields the birthdate-collection flow
// actually reads/writes. profile.controller.js's GET/PUT /profile response
// includes more (bio, city, language, etc.) but nothing in the app consumes
// those yet.
export interface UpdateProfileRequest {
  dateOfBirth?: string;
  zodiacSign?: ZodiacSign;
  rashi?: string;
}

export interface ProfileData {
  id: string;
  phoneNumber: string;
  profile: {
    dateOfBirth: string | null;
    zodiacSign: ZodiacSign | null;
    rashi: string | null;
  } | null;
}
