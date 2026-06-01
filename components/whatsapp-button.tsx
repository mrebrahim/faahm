/**
 * Floating WhatsApp button — opens wa.me with a pre-filled inquiry message.
 * Phone is stored in international format (E.164 without the +) so wa.me
 * routes correctly regardless of the user's region.
 */
const WHATSAPP_PHONE = '201027555789';
const WHATSAPP_MESSAGE = 'اريد الاستفسار عن كورسات الذكاء الاصطناعي';

export function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    WHATSAPP_MESSAGE
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      className="fixed bottom-5 left-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:scale-110 hover:bg-[#1ebe5b] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-7 w-7"
        aria-hidden
      >
        <path d="M20.52 3.48A11.93 11.93 0 0 0 12.02 0C5.4 0 .03 5.37.03 11.99c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.62a11.96 11.96 0 0 0 5.82 1.48h.01c6.62 0 11.99-5.37 11.99-11.99 0-3.2-1.25-6.21-3.5-8.39ZM12.03 21.8h-.01a9.79 9.79 0 0 1-4.99-1.37l-.36-.21-3.68.96.98-3.59-.23-.37a9.83 9.83 0 0 1-1.51-5.23c0-5.43 4.42-9.85 9.85-9.85 2.63 0 5.1 1.03 6.96 2.88a9.79 9.79 0 0 1 2.88 6.97c0 5.43-4.42 9.81-9.89 9.81Zm5.4-7.36c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.15-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.91-2.18-.24-.58-.49-.5-.66-.51l-.56-.01a1.08 1.08 0 0 0-.79.37c-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.21 5.08 4.5.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35Z" />
      </svg>
    </a>
  );
}
