# FoundIt — A Campus Lost & Found and Student Marketplace Platform

**Software Requirements Specification**

Full-Stack Web Application • Team of 4 • One-Semester Project

Prepared by: [Nidhi Rakesh], [Shenza PM], [Muhammed Shanid], [Hadi M]


- **Nidhi Rakesh** (2024BCD0006) — Team Lead & Backend
- **Shenza** (2024BCD0002) — Frontend & UI/UX
- **Shanid** (2024BCD0034)— Auth & Admin
- **Hadi** (2024BCD0058)— Marketplace & DevOps


---

## Table of Contents

1. [Product Overview](https://claude.ai/chat/4860083d-52f6-4177-b401-24269a155c11#1-product-overview)
2. [End Users](https://claude.ai/chat/4860083d-52f6-4177-b401-24269a155c11#2-end-users)
3. [User Roles](https://claude.ai/chat/4860083d-52f6-4177-b401-24269a155c11#3-user-roles)
4. [Functional Requirements](https://claude.ai/chat/4860083d-52f6-4177-b401-24269a155c11#4-functional-requirements)
5. [Non-Functional Requirements](https://claude.ai/chat/4860083d-52f6-4177-b401-24269a155c11#5-non-functional-requirements)
6. [Competitors / Existing Products](https://claude.ai/chat/4860083d-52f6-4177-b401-24269a155c11#6-competitors--existing-products)
7. [How Loop Differs from Existing Products](https://claude.ai/chat/4860083d-52f6-4177-b401-24269a155c11#7-how-loop-differs-from-existing-products)

---

## 1. Product Overview

FoundIt is a full-stack web platform that combines two everyday campus needs into one place: recovering lost belongings and buying, selling, or giving away second-hand items among students. On any campus, lost items scatter across notice boards and WhatsApp groups, while used textbooks, cycles, and hostel essentials are hard to trade when a student graduates or moves out. FoundIt centralises both flows behind a single verified student login, with search, image uploads, location tags, and in-app messaging so owners and items find their way back to each other.

The name reflects the core idea: things circle back into use, whether they are lost and returned or resold and reused.

---

## 2. End Users

The primary users are members of a single campus community. Access is restricted to verified members so that trust, accountability, and safe local exchange are preserved.

- **Students** who have lost or found an item on campus and want to report or claim it.
- **Students** who want to sell, buy, rent, or give away used goods such as textbooks, calculators, cycles, and hostel supplies.
- **Graduating or relocating students** moving out at the end of a semester who need a quick way to pass belongings to juniors.
- **Faculty** and lab assistants who occasionally recover misplaced items and need a channel to log them.
- **Campus administrators / moderators** who oversee reported items and marketplace activity to keep the platform safe and spam-free.

---

## 3. User Roles

The system defines four roles with distinct permissions, enforced through role-based access control.

| Role                | Description                                                              | Key Permissions                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Guest / Visitor** | An unauthenticated user who has not yet signed in with a campus account. | Browse a limited public view; register or log in. Cannot post, claim, or message.                                                                            |
| **Registered User** | A verified student or staff member — the core user of the platform.      | Post lost/found reports and marketplace listings; search and filter; claim items; chat with other users; rate transactions; manage own profile and listings. |
| **Moderator**       | A trusted user who reviews reported content and resolves disputes.       | Approve or remove flagged posts; verify high-value listings; mediate claim disputes; issue warnings; all Registered User permissions.                        |
| **Administrator**   | The system owner responsible for overall operation.                      | Manage users and roles; view analytics dashboard; configure categories and policies; suspend or ban accounts; full access to all data.                       |

---

## 4. Functional Requirements

Functional requirements describe what the system must do. They are grouped by module and labelled FR-x for traceability.

### 4.1 Authentication & User Management

|ID|Requirement|
|---|---|
|FR-1|Users shall register using a valid campus email address and verify it before accessing full features.|
|FR-2|Users shall log in and log out securely, with passwords stored in hashed form.|
|FR-3|Users shall reset a forgotten password via an email link.|
|FR-4|Each user shall have an editable profile with name, hostel/department, contact preference, and photo.|
|FR-5|The system shall assign roles (User, Moderator, Admin) and restrict features accordingly.|

### 4.2 Lost & Found Module

|ID|Requirement|
|---|---|
|FR-6|Users shall post a lost-item report with title, description, category, date, last-seen location, and optional image.|
|FR-7|Users shall post a found-item report with the item's details, current location, and image.|
|FR-8|The system shall let users tag a location on a map or select from a list of campus zones.|
|FR-9|The system shall suggest possible matches between lost and found reports based on category, keywords, and location.|
|FR-10|A user shall raise a claim on a found item; the finder shall approve or reject the claim.|
|FR-11|Users shall mark an item as 'Returned' / 'Resolved', which closes the report.|

### 4.3 Marketplace Module

|ID|Requirement|
|---|---|
|FR-12|Users shall create a listing with title, description, category, condition, price (or 'Free' / 'For rent'), and images.|
|FR-13|Users shall browse, search, and filter listings by category, price range, condition, and keyword.|
|FR-14|Users shall mark a listing as 'Sold' or delete it; sold items are archived, not shown in active search.|
|FR-15|The system shall simulate a transaction/handshake flow so buyer and seller can confirm a deal (no real payment gateway).|
|FR-16|Users shall bookmark or save listings and lost/found posts to a personal watchlist.|

### 4.4 Communication & Trust

|ID|Requirement|
|---|---|
|FR-17|Users shall exchange messages through an in-app chat tied to a specific item or listing.|
|FR-18|Users shall rate and review the other party after a completed exchange.|
|FR-19|Users shall report or flag suspicious posts, spam, or inappropriate content.|
|FR-20|The system shall send notifications for new matches, claims, messages, and status changes.|

### 4.5 Administration & Moderation

|ID|Requirement|
|---|---|
|FR-21|Moderators shall review flagged content and approve, hide, or remove it.|
|FR-22|Administrators shall manage users, assign roles, and suspend accounts.|
|FR-23|Administrators shall view an analytics dashboard (active listings, resolved items, user activity).|
|FR-24|Administrators shall manage the list of item categories and campus zones.|

---

## 5. Non-Functional Requirements

Non-functional requirements describe how the system should behave — its quality attributes and constraints.

|Category|Requirement|
|---|---|
|**Usability**|The interface shall be responsive and mobile-friendly, since most students browse on phones. Common actions (post an item, search) shall take no more than three clicks.|
|**Performance**|Search results and page loads shall return within about two seconds under normal load; images shall be compressed on upload.|
|**Scalability**|The architecture shall support growth to several thousand users and listings without redesign, using indexed queries and pagination.|
|**Security**|Passwords shall be hashed; sessions shall use secure tokens (e.g., JWT); access shall be role-based; inputs shall be validated to prevent injection and XSS.|
|**Privacy**|Personal contact details shall not be public by default; users communicate through in-app chat. Only campus-verified accounts may access the platform.|
|**Reliability**|The system shall target 99% uptime during the demonstration period and handle errors gracefully with clear messages.|
|**Maintainability**|Code shall be modular and documented, with a clear separation between frontend, backend API, and database layers.|
|**Compatibility**|The application shall work on current versions of Chrome, Firefox, and Edge, and on Android/iOS mobile browsers.|
|**Accessibility**|The UI shall follow basic accessibility practices — readable contrast, alt text on images, and keyboard-navigable forms.|

---

## 6. Competitors / Existing Products

Several categories of existing products partly address what Loop does. None combines both features within a trusted, campus-only community.

|Product / Category|What it offers|Limitation for campus use|
|---|---|---|
|**OLX / Facebook Marketplace**|General second-hand buying and selling in a city or region.|Open to the public, no campus verification, safety and trust concerns, no lost-and-found feature.|
|**WhatsApp / Telegram groups**|Informal sharing of lost items and sale posts within batches or hostels.|Unstructured, no search, posts get buried, no claim workflow, no moderation.|
|**College notice boards (physical)**|Traditional way to post lost-and-found notices.|Not searchable, limited reach, easily missed, no marketplace.|
|**Tile / Bluetooth trackers**|Hardware to locate personal tagged items.|Requires buying a device per item; useless for untagged items and for reselling.|
|**Nextdoor / community apps**|Neighbourhood-level lost-and-found and classifieds.|Not campus-specific; large, unfocused audience; not tailored to student needs or cycles.|
|**Standalone college marketplace apps**|Some campuses have a buy/sell portal.|Usually marketplace only; lost-and-found handled separately or not at all.|

---

## 7. How Loop Differs from Existing Products

Loop's value comes from unifying two related needs inside one trusted, campus-scoped platform. Its main differentiators are:

- **Two problems, one platform.** Existing tools do one or the other — Loop handles both recovering lost items and trading used goods in a single app with shared login, search, and messaging.
- **Campus-only trust.** Access is limited to verified campus members, creating a smaller, accountable community that is far safer than open marketplaces like OLX.
- **Location-aware to the campus.** Reports and listings are tagged to campus zones and, for lost items, to a last-seen location — something generic city-wide apps cannot do meaningfully.
- **Smart matching.** The system suggests likely matches between lost and found posts instead of relying on users to scroll endlessly, which no notice board or WhatsApp group can do.
- **Structured workflow.** A claim-and-approve flow, ratings, and moderation replace the chaos of group chats with an auditable, trustworthy process.
- **Student-first design.** Built around the academic calendar — end-of-semester move-outs, textbook cycles per course code, and junior-senior handovers — rather than a generic commerce model.

In short, competitors are either too broad and untrusted (public marketplaces), too unstructured (chat groups and notice boards), or too narrow (single-purpose apps). Loop targets one community, solves two of its most common frustrations together, and adds the search, matching, and moderation those informal channels lack.