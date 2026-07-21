# FoundIt

**Project Synopsis**

_Lost, found, and sold — all on campus._

A Campus Lost & Found and Student Marketplace Platform

Full-Stack Web Application • Team of 4 • One-Semester Project

|Team Member|Role|
|---|---|
|Nidhi Rakesh|Team Lead & Backend|
|Shenza|Frontend & UI/UX|
|Shanid|Auth & Admin|
|Hadi|Marketplace & DevOps|

---

## 1. Introduction

On any college campus, two everyday problems keep repeating. Students lose belongings — ID cards, water bottles, calculators, chargers — and have no reliable way to reconnect with whoever found them. At the same time, used textbooks, cycles, lab coats, and hostel essentials pile up unused, especially when students graduate or move out, with no organised way to pass them on. Today both problems are handled through scattered WhatsApp groups and physical notice boards, where posts get buried, cannot be searched, and offer no way to verify who is on the other side.

FoundIt is a full-stack web application that solves both problems in one place. It gives a single campus community a verified, searchable platform to report lost and found items and to buy, sell, rent, or give away second-hand goods — safely, among people who actually share the same campus.

## 2. Problem Statement

Existing solutions are either too broad, too unstructured, or too narrow:

- **Public marketplaces** (OLX, Facebook Marketplace) are open to strangers, carry safety and trust concerns, and have no lost-and-found feature.
- **WhatsApp and Telegram groups** are unstructured — posts get buried, there is no search, no claim process, and no moderation.
- **Notice boards** are not searchable, easily missed, and limited to lost-and-found only.

There is no single, trusted, campus-only platform that combines lost-and-found recovery with a student marketplace. FoundIt fills that gap.

## 3. Objectives

1. **Lost & found recovery.** Build a campus-only platform where verified students can report lost and found items and get matched to recover them.
2. **Student marketplace.** Provide a structured marketplace for buying, selling, renting, and giving away second-hand student goods.
3. **Trust and safety.** Restrict access to verified campus members and enable safe, accountable in-app communication.
4. **Smart matching.** Automatically suggest likely matches between lost and found reports based on category, keywords, and location.
5. **Moderation and control.** Keep the platform clean and reliable through role-based access, moderation, and an admin dashboard.

## 4. Scope

The project covers a responsive web application accessible on desktop and mobile browsers, serving a single campus community. It includes four modules — lost & found, marketplace, communication/trust, and administration — with four user roles (Guest, Registered User, Moderator, Administrator).

**Out of scope:** real money handling. Transactions use a confirm-and-meet handshake flow (students settle in person via cash or UPI); no payment gateway holds funds. A native mobile app and multi-campus federation are possible future extensions but are not part of this semester's work.

## 5. Proposed Solution

FoundIt is a single web app behind a verified campus login. A user can post a lost or found item with details, an image, and a campus location; the system suggests possible matches and lets owners claim items through an approve/reject flow. In the marketplace, users create listings with images, price, and condition, then browse, search, and filter. Buyer and seller connect through in-app chat and confirm a deal using a handshake flow, after which they rate each other. Moderators review flagged content and administrators oversee the platform through an analytics dashboard.

## 6. Methodology

The team will follow an iterative, module-based approach. Week one is spent finalising the data model and API contract together, so all four modules integrate cleanly. Each member then owns a vertical slice (frontend + data) for their module, with shared components built first. Development uses Git and GitHub for version control, with regular integration and testing throughout the semester rather than a single merge at the end.

## 7. Technology Stack

|Layer|Technology|
|---|---|
|Frontend|React (Vite), Tailwind CSS, Framer Motion, React Router|
|Backend & Data|Firebase — Authentication, Cloud Firestore, Cloud Storage, Cloud Functions|
|Access Control|Firestore Security Rules + role field (Guest / User / Moderator / Admin)|
|Location|Google Maps / Leaflet for campus zone tagging|
|Hosting & Tooling|Firebase Hosting, Git, GitHub|

## 8. Key Modules & Features

- **Authentication & Users** — register/login with campus-email verification, profiles, and role-based access.
- **Lost & Found** — post lost/found items, tag location, get suggested matches, claim and resolve.
- **Marketplace** — create listings, search and filter, and confirm deals via a handshake flow.
- **Communication & Trust** — item-linked chat, ratings, notifications, and content flagging.
- **Administration** — moderation of flagged posts, user management, and an analytics dashboard.

## 9. Expected Outcome

A working, deployed web application where verified students can recover lost items and trade second-hand goods within their campus, backed by search, smart matching, in-app chat, and moderation. The result is a single trusted platform that replaces scattered WhatsApp groups and notice boards, demonstrating a complete full-stack system with authentication, real-time data, role-based access, and a clean, mobile-friendly interface.

## 10. Team & Responsibilities

| Member       | Role                 | Primary Responsibilities                                                             |
| ------------ | -------------------- | ------------------------------------------------------------------------------------ |
| Nidhi Rakesh | Team Lead & Backend  | Data model, API/Cloud Functions, smart matching logic, integration, version control. |
| Shenza       | Frontend & UI/UX     | React frontend, responsive layouts, listing pages, search UI, animations.            |
| Shanid       | Auth & Admin         | Authentication, role-based access, moderation flow, admin analytics dashboard.       |
| Hadi         | Marketplace & DevOps | Marketplace module, in-app chat, notifications, deployment, testing, documentation.  |