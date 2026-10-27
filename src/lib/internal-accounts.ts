/** Owner test accounts excluded from analytics and Command Centre metrics. */
export const INTERNAL_TEST_EMAILS = ["gibsonscott005@gmail.com", "usgibsons2004@gmail.com"];

export function isInternalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return INTERNAL_TEST_EMAILS.includes(e) || /@example\.(com|org|net)$/i.test(e);
}
