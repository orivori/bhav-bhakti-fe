import { ZodiacSign } from './horoscope';

export type ProfileGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

// Deliberately non-exhaustive - only the fields the birthdate-collection flow
// and the Edit Profile screen actually read/write. profile.controller.js's
// GET/PUT /profile response includes more (bio, city, language, etc.) but
// nothing in the app consumes those yet.
export interface UpdateProfileRequest {
  name?: string;
  gender?: ProfileGender;
  dateOfBirth?: string;
  zodiacSign?: ZodiacSign;
  rashi?: string;
}

export interface ProfileData {
  id: string;
  phoneNumber: string;
  name: string | null;
  profile: {
    dateOfBirth: string | null;
    gender: ProfileGender | null;
    zodiacSign: ZodiacSign | null;
    rashi: string | null;
  } | null;
}
