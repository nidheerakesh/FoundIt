// Demo sign-in. Lets the app be driven end to end without a Google campus
// account — for local testing and for demoing on a project where Google
// sign-in is not configured.
//
// These are REAL Firebase email/password users with emailVerified set true, so
// every security rule applies to them exactly as it would to a student. Nothing
// about auth is bypassed; this only adds a second way in.
//
// Create them first:  DEMO_PASSWORD=… node scripts/seed-demo-users.mjs
// Turn the UI on:     VITE_DEMO_AUTH=true and VITE_DEMO_PASSWORD=<same value>
//                     in web/.env.local (gitignored)
//
// The password is never committed. Off unless both variables are set, so a
// normal production build cannot ship with it. Note that any VITE_ variable is
// baked into the built JavaScript, so a build made WITH these set exposes the
// password to anyone who opens it — demo builds only, never a real deployment.
const PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || '';
export const DEMO_AUTH_ENABLED = import.meta.env.VITE_DEMO_AUTH === 'true' && PASSWORD.length > 0;

export const DEMO_ACCOUNTS = [
  { email: 'riya.demo@iiitkottayam.ac.in',  name: 'Riya Singh',   dept: 'CSE', role: 'student',   password: PASSWORD },
  { email: 'arjun.demo@iiitkottayam.ac.in', name: 'Arjun Nair',   dept: 'ECE', role: 'student',   password: PASSWORD },
  { email: 'meera.demo@iiitkottayam.ac.in', name: 'Meera Das',    dept: 'CSE', role: 'moderator', password: PASSWORD },
];
