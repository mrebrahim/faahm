'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { COUNTRIES, DEFAULT_COUNTRY_ISO, splitE164, findCountry } from '@/lib/countries';

/**
 * Phone field with a country / dial-code picker. Renders two visible controls
 * (select + tel input) and two hidden form fields:
 *
 *   - `country` → ISO-2 code, e.g. 'EG'
 *   - `phone`   → E.164 value, e.g. '+201234567890'
 *
 * So a server action just reads `formData.get('phone')` / `formData.get('country')`.
 * The component is self-contained (no library needed) and keeps the digits in
 * local React state.
 */
export function PhoneInput({
  id = 'phone',
  countryFieldName = 'country',
  phoneFieldName = 'phone',
  defaultCountry = DEFAULT_COUNTRY_ISO,
  defaultPhone = '',
  required = true,
}: {
  id?: string;
  countryFieldName?: string;
  phoneFieldName?: string;
  defaultCountry?: string;
  defaultPhone?: string;
  required?: boolean;
}) {
  const initial = useMemo(
    () => splitE164(defaultPhone, defaultCountry),
    [defaultPhone, defaultCountry]
  );
  const [iso, setIso] = useState(initial.country.iso);
  const [local, setLocal] = useState(initial.local);

  const country = findCountry(iso) ?? initial.country;
  // Drop any leading zero — locals often dial '01...' but E.164 doesn't carry it.
  const cleaned = local.replace(/^0+/, '');
  const e164 = cleaned ? `${country.dialCode}${cleaned}` : '';

  return (
    <div className="flex gap-2 min-w-0" dir="ltr">
      <select
        aria-label="رمز الدولة"
        title={country.name}
        value={iso}
        onChange={(e) => setIso(e.target.value)}
        className="h-11 w-[6.5rem] shrink-0 rounded-lg border border-gray-300 bg-white px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors"
      >
        {COUNTRIES.map((c) => (
          <option key={c.iso} value={c.iso}>
            {c.flag} {c.dialCode} {c.name}
          </option>
        ))}
      </select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="1XXXXXXXXX"
        value={local}
        onChange={(e) => setLocal(e.target.value.replace(/[^\d]/g, ''))}
        required={required}
        className="min-w-0 flex-1 text-left"
      />
      <input type="hidden" name={countryFieldName} value={iso} />
      <input type="hidden" name={phoneFieldName} value={e164} />
    </div>
  );
}
