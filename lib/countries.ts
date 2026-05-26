/**
 * Country list for the signup phone-with-dial-code picker.
 *
 * Curated rather than exhaustive — MENA + the most common non-MENA origins
 * for the audience. `dialCode` is the E.164 prefix (with leading +).
 * `iso` is the 2-letter country code stored in `profiles.country`.
 *
 * Ordering: Egypt first (primary market), then the rest of the GCC and
 * Arabic-speaking countries in roughly population order, then a small tail
 * of other common locales.
 */

export type Country = {
  iso: string;
  name: string; // Arabic name shown in the picker
  dialCode: string; // E.164 prefix, e.g. '+20'
  flag: string; // emoji
};

export const COUNTRIES: readonly Country[] = [
  { iso: 'EG', name: 'مصر', dialCode: '+20', flag: '🇪🇬' },
  { iso: 'SA', name: 'السعودية', dialCode: '+966', flag: '🇸🇦' },
  { iso: 'AE', name: 'الإمارات', dialCode: '+971', flag: '🇦🇪' },
  { iso: 'KW', name: 'الكويت', dialCode: '+965', flag: '🇰🇼' },
  { iso: 'QA', name: 'قطر', dialCode: '+974', flag: '🇶🇦' },
  { iso: 'BH', name: 'البحرين', dialCode: '+973', flag: '🇧🇭' },
  { iso: 'OM', name: 'عُمان', dialCode: '+968', flag: '🇴🇲' },
  { iso: 'JO', name: 'الأردن', dialCode: '+962', flag: '🇯🇴' },
  { iso: 'LB', name: 'لبنان', dialCode: '+961', flag: '🇱🇧' },
  { iso: 'PS', name: 'فلسطين', dialCode: '+970', flag: '🇵🇸' },
  { iso: 'SY', name: 'سوريا', dialCode: '+963', flag: '🇸🇾' },
  { iso: 'IQ', name: 'العراق', dialCode: '+964', flag: '🇮🇶' },
  { iso: 'YE', name: 'اليمن', dialCode: '+967', flag: '🇾🇪' },
  { iso: 'SD', name: 'السودان', dialCode: '+249', flag: '🇸🇩' },
  { iso: 'LY', name: 'ليبيا', dialCode: '+218', flag: '🇱🇾' },
  { iso: 'TN', name: 'تونس', dialCode: '+216', flag: '🇹🇳' },
  { iso: 'DZ', name: 'الجزائر', dialCode: '+213', flag: '🇩🇿' },
  { iso: 'MA', name: 'المغرب', dialCode: '+212', flag: '🇲🇦' },
  { iso: 'MR', name: 'موريتانيا', dialCode: '+222', flag: '🇲🇷' },
  { iso: 'SO', name: 'الصومال', dialCode: '+252', flag: '🇸🇴' },
  { iso: 'DJ', name: 'جيبوتي', dialCode: '+253', flag: '🇩🇯' },
  { iso: 'KM', name: 'جزر القمر', dialCode: '+269', flag: '🇰🇲' },
  { iso: 'TR', name: 'تركيا', dialCode: '+90', flag: '🇹🇷' },
  { iso: 'US', name: 'الولايات المتحدة', dialCode: '+1', flag: '🇺🇸' },
  { iso: 'CA', name: 'كندا', dialCode: '+1', flag: '🇨🇦' },
  { iso: 'GB', name: 'بريطانيا', dialCode: '+44', flag: '🇬🇧' },
  { iso: 'DE', name: 'ألمانيا', dialCode: '+49', flag: '🇩🇪' },
  { iso: 'FR', name: 'فرنسا', dialCode: '+33', flag: '🇫🇷' },
  { iso: 'IT', name: 'إيطاليا', dialCode: '+39', flag: '🇮🇹' },
  { iso: 'ES', name: 'إسبانيا', dialCode: '+34', flag: '🇪🇸' },
  { iso: 'NL', name: 'هولندا', dialCode: '+31', flag: '🇳🇱' },
  { iso: 'SE', name: 'السويد', dialCode: '+46', flag: '🇸🇪' },
  { iso: 'AU', name: 'أستراليا', dialCode: '+61', flag: '🇦🇺' },
];

export const DEFAULT_COUNTRY_ISO = 'EG';

/** E.164: leading '+', 1-15 digits, first digit not zero. */
export const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export function findCountry(iso: string | null | undefined): Country | undefined {
  if (!iso) return undefined;
  return COUNTRIES.find((c) => c.iso === iso);
}

/**
 * Splits a stored E.164 value (e.g. '+201234567890') back into a country +
 * local-digits pair so the picker can be pre-filled. Falls back to the
 * default country if no dial-code prefix matches.
 */
export function splitE164(
  value: string | null | undefined,
  defaultIso: string = DEFAULT_COUNTRY_ISO
): { country: Country; local: string } {
  const fallback = findCountry(defaultIso) ?? COUNTRIES[0];
  if (!value) return { country: fallback, local: '' };
  if (value.startsWith('+')) {
    // Longest dial code first so '+1xxx' doesn't accidentally win over '+20'.
    const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    const match = sorted.find((c) => value.startsWith(c.dialCode));
    if (match) return { country: match, local: value.slice(match.dialCode.length) };
  }
  return { country: fallback, local: value.replace(/^\+/, '') };
}
