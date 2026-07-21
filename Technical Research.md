**Frontend**

- **React** (with Vite) — core UI
- **Framer Motion** — page transitions, card animations, micro-interactions
- **Tailwind CSS** — fast, consistent styling (pairs well with React + Framer)
- **React Router** — navigation between pages

**Backend / Data (Firebase)**

- **Firebase Authentication** — email/password login, campus-email verification, role handling
- **Cloud Firestore** — main database for items, listings, users, chats (real-time, so chat and notifications come almost free)
- **Firebase Storage** — item and profile image uploads
- **Cloud Functions** — the _smart matching_ logic (FR-9) and any server-side rules; keeps that logic off the client
- **Firebase Hosting** — deployment

**Supporting**

- **Firestore Security Rules** — enforces role-based access (Guest/User/Moderator/Admin) at the database level
- **Google Maps / Leaflet** — campus zone + location tagging (FR-8)
- **Git + GitHub** — version control