// Demo sign-in. Lets the app be driven end to end without a Google campus
// account — for local testing and for demoing on a project where Google
// sign-in is not configured.
//
// These are REAL Firebase email/password users with emailVerified set true, so
// every security rule applies to them exactly as it would to a student. Nothing
// about auth is bypassed; this only adds a second way in.
//
// Create them first:  node scripts/seed-demo-users.mjs
// Turn the UI on:     VITE_DEMO_AUTH=true in web/.env
//
// Off unless explicitly enabled, so a production build cannot ship with it.
export const DEMO_AUTH_ENABLED = import.meta.env.VITE_DEMO_AUTH === 'true';

export const DEMO_PASSWORD = 'demo-FoundIt-2026';

export const DEMO_ACCOUNTS = [
  { email: 'riya.demo@iiitkottayam.ac.in',  name: 'Riya Singh',   dept: 'CSE', role: 'student',   password: DEMO_PASSWORD },
  { email: 'arjun.demo@iiitkottayam.ac.in', name: 'Arjun Nair',   dept: 'ECE', role: 'student',   password: DEMO_PASSWORD },
  { email: 'meera.demo@iiitkottayam.ac.in', name: 'Meera Das',    dept: 'CSE', role: 'moderator', password: DEMO_PASSWORD },
];
