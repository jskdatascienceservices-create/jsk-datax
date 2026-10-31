export const FOUNDER_EMAILS = [
  "jskdatascienceservices@gmail.com", 
];

export function isFounder(email: string | null | undefined): boolean {
  if (!email) return false;
  return FOUNDER_EMAILS.map((e) => e.toLowerCase()).includes(
    email.toLowerCase()
  );
}