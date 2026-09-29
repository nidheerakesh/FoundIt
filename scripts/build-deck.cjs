/**
 * Builds docs/FoundIt-Presentation.pptx.
 *
 *   npm i pptxgenjs sharp react react-dom react-icons
 *   node scripts/build-deck.cjs [outPath]
 *
 * Poppins is referenced by name, so PowerPoint needs it installed locally
 * (fonts.google.com/specimen/Poppins) to render the deck as designed.
 */
const pptxgen = require("pptxgenjs");
// --- icon renderer -------------------------------------------------------
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const Fi = require("react-icons/fi");
const sharp = require("sharp");
const _iconCache = new Map();
async function icon(name, hex) {
  const key = name + hex;
  if (_iconCache.has(key)) return _iconCache.get(key);
  const Comp = Fi[name];
  if (!Comp) throw new Error("no icon " + name);
  let svg = renderToStaticMarkup(React.createElement(Comp, { size: 256, strokeWidth: 2 }));
  svg = svg.replace(/currentColor/g, "#" + hex);
  const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  const data = "image/png;base64," + buf.toString("base64");
  _iconCache.set(key, data);
  return data;
}
// -------------------------------------------------------------------------

const path = require("path");
const ASSETS = path.join(__dirname, "..", "assets");
const OUT = process.argv[2] || path.join(__dirname, "..", "docs", "FoundIt-Presentation.pptx");

const C = {
  white: "FFFFFF",
  soft: "F7F4FC",
  paper: "FBFAFE",
  ink: "2B2640",
  ink2: "4A4360",
  mute: "76708E",
  primary: "7C5BA6",
  tint: "EDE4F9",
  line: "E9E3F3",
  lav: "E6DBF6", lavD: "6F4F9C",
  mint: "CFEADB", mintD: "35805A",
  peach: "FBDCC6", peachD: "B35F2C",
  sky: "D5E5F8", skyD: "34648F",
  butter: "FAEBC0", butterD: "8A6A14",
  rose: "F8D7E1", roseD: "A34568",
};
const FF = "Poppins";
const W = 13.333, H = 7.5, ML = 0.62, CW = W - 2 * ML, MR = ML + CW;

function sh(over) {
  return Object.assign({ type: "outer", color: "B7A9D2", blur: 12, offset: 2, angle: 90, opacity: 0.18 }, over || {});
}

async function build() {
  const P = new pptxgen();
  P.layout = "LAYOUT_WIDE";
  P.author = "FoundIt Team — IIIT Kottayam";
  P.title = "FoundIt — Campus Lost & Found and Student Marketplace";

  const S = P.shapes;

  const slide = (fill) => { const s = P.addSlide(); s.background = { color: fill || C.white }; return s; };

  const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: FF, isTextBox: true, margin: 0, color: C.ink }, o));

  const card = (s, o) => s.addShape(S.ROUNDED_RECTANGLE, {
    x: o.x, y: o.y, w: o.w, h: o.h, rectRadius: o.r === undefined ? 0.12 : o.r,
    fill: { color: o.fill || C.paper },
    line: o.line === null ? { color: o.fill || C.paper } : { color: o.line || C.line, width: 1 },
    shadow: o.shadow === false ? undefined : sh(o.shadowOver),
  });

  const head = (s, kicker, title, sub) => {
    T(s, kicker, { x: ML, y: 0.34, w: CW, h: 0.26, fontSize: 10, bold: true, color: C.primary, charSpacing: 2.4 });
    T(s, title, { x: ML, y: 0.60, w: CW, h: 0.62, fontSize: 28, bold: true, color: C.ink });
    if (sub) T(s, sub, { x: ML, y: 1.22, w: CW, h: 0.32, fontSize: 12, color: C.mute });
  };

  const chip = async (s, x, y, d, bg, name, fg) => {
    s.addShape(S.OVAL, { x, y, w: d, h: d, fill: { color: bg }, line: { color: bg } });
    const p = d * 0.27;
    s.addImage({ data: await icon(name, fg), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p });
  };

  const pill = (s, x, y, label, bg, fg, size, w) => {
    const ww = w || (0.38 + label.length * (size || 9.5) * 0.0083);
    s.addShape(S.ROUNDED_RECTANGLE, { x, y, w: ww, h: 0.30, rectRadius: 0.15, fill: { color: bg }, line: { color: bg }, shadow: undefined });
    T(s, label, { x, y, w: ww, h: 0.30, fontSize: size || 9.5, bold: true, color: fg, align: "center", valign: "middle" });
    return ww;
  };

  const chipRow = (s, x, y, items, bg, fg, maxW, size) => {
    let cx = x, cy = y, fs = size || 10;
    items.forEach((label) => {
      const ww = 0.36 + label.length * fs * 0.0086;
      if (cx + ww > x + maxW) { cx = x; cy += 0.46; }
      s.addShape(S.ROUNDED_RECTANGLE, { x: cx, y: cy, w: ww, h: 0.38, rectRadius: 0.19, fill: { color: bg }, line: { color: bg } });
      T(s, label, { x: cx, y: cy, w: ww, h: 0.38, fontSize: fs, bold: true, color: fg, align: "center", valign: "middle" });
      cx += ww + 0.15;
    });
    return cy + 0.38;
  };

  const arrowR = (s, x, y, w) => s.addShape(S.RIGHT_ARROW, { x, y, w, h: 0.17, fill: { color: "CFC6E4" }, line: { color: "CFC6E4" } });
  const arrowD = (s, x, y, h) => s.addShape(S.DOWN_ARROW, { x, y, w: 0.17, h, fill: { color: "CFC6E4" }, line: { color: "CFC6E4" } });

  // ─────────────────────────────────────────────── 1 · TITLE
  {
    const s = slide(C.soft);
    s.addShape(S.OVAL, { x: 10.85, y: -1.45, w: 4.7, h: 4.7, fill: { color: C.lav }, line: { color: C.lav } });
    s.addShape(S.OVAL, { x: 12.35, y: 2.55, w: 1.55, h: 1.55, fill: { color: C.mint }, line: { color: C.mint } });
    s.addShape(S.OVAL, { x: -1.05, y: -1.35, w: 2.25, h: 2.25, fill: { color: C.peach }, line: { color: C.peach } });
    s.addShape(S.OVAL, { x: 0.22, y: 6.62, w: 0.62, h: 0.62, fill: { color: C.rose }, line: { color: C.rose } });

    pill(s, 0.96, 0.98, "IIIT KOTTAYAM  ·  SOFTWARE ARCHITECTURE  ·  SEM 4", C.white, C.primary, 9.5, 4.6);
    T(s, "FoundIt", { x: 0.92, y: 1.48, w: 7.6, h: 1.18, fontSize: 60, bold: true, color: C.ink });
    T(s, "Lost, found, and sold — all on campus.", { x: 0.96, y: 2.68, w: 7.6, h: 0.42, fontSize: 19, italic: true, color: C.primary });
    T(s, "A campus-scoped Lost & Found and Student Marketplace web platform — verified access, smart matching, server-side trust and community moderation.",
      { x: 0.96, y: 3.20, w: 8.5, h: 0.82, fontSize: 13.5, color: C.mute, lineSpacingMultiple: 1.25 });

    const team = [
      ["Nidhi Rakesh", "2024BCD0006", "Team Lead & Backend", C.lav, C.lavD],
      ["Shenza P M", "2024BCD0002", "Frontend & UI/UX", C.mint, C.mintD],
      ["Muhammed Shanid", "2024BCD0034", "Auth & Admin", C.peach, C.peachD],
      ["Hadi M", "2024BCD0058", "Marketplace & DevOps", C.sky, C.skyD],
    ];
    for (let i = 0; i < team.length; i++) {
      const [n, r, role, bg, fg] = team[i];
      const x = 0.8 + i * 3.0, w = 2.72;
      card(s, { x, y: 4.42, w, h: 1.12, fill: C.white });
      s.addShape(S.OVAL, { x: x + 0.22, y: 4.63, w: 0.14, h: 0.14, fill: { color: bg }, line: { color: bg } });
      T(s, n, { x: x + 0.46, y: 4.56, w: w - 0.66, h: 0.3, fontSize: 12.5, bold: true, color: C.ink });
      T(s, r, { x: x + 0.46, y: 4.86, w: w - 0.66, h: 0.24, fontSize: 9, color: C.mute });
      T(s, role, { x: x + 0.46, y: 5.10, w: w - 0.66, h: 0.26, fontSize: 9.5, bold: true, color: fg });
    }
    T(s, "Full-Stack Web Application   ·   Team of 4   ·   One-Semester Project   ·   September 2026",
      { x: 0.84, y: 5.92, w: 9.6, h: 0.3, fontSize: 11, color: C.mute });
    s.addNotes("FoundIt is our campus Lost & Found plus student marketplace. Built as a full-stack web app by a team of four over one semester. Today: introduction, requirements, and architecture.");
  }

  // ─────────────────────────────────────────────── 2 · AGENDA
  {
    const s = slide();
    head(s, "AGENDA", "What this deck covers");
    const items = [
      ["01", "Introduction", "The campus problem, why today's options fail, and what FoundIt sets out to do.", C.lav, C.lavD, "FiCompass"],
      ["02", "Requirements", "Four roles, 24 functional requirements across five modules, nine quality attributes.", C.mint, C.mintD, "FiClipboard"],
      ["03", "Architecture", "Event-driven style, the layered system view, and the patterns holding it together.", C.sky, C.skyD, "FiLayers"],
      ["04", "Data & Security", "Firestore collections, denormalisation, role-based access and defence in depth.", C.peach, C.peachD, "FiShield"],
      ["05", "Delivery", "Cloud Functions, scoring algorithms, environments and the deployment pipeline.", C.butter, C.butterD, "FiGitBranch"],
      ["06", "Team & Outcome", "Who owned what, and the working platform this semester delivers.", C.rose, C.roseD, "FiAward"],
    ];
    const cw = (CW - 2 * 0.32) / 3, chh = 2.24;
    for (let i = 0; i < items.length; i++) {
      const [num, title, desc, bg, fg, ic] = items[i];
      const x = ML + (i % 3) * (cw + 0.32), y = 1.72 + Math.floor(i / 3) * (chh + 0.30);
      card(s, { x, y, w: cw, h: chh });
      await chip(s, x + 0.32, y + 0.30, 0.62, bg, ic, fg);
      T(s, num, { x: x + cw - 0.95, y: y + 0.34, w: 0.7, h: 0.4, fontSize: 20, bold: true, color: fg, align: "right" });
      T(s, title, { x: x + 0.32, y: y + 1.08, w: cw - 0.64, h: 0.36, fontSize: 15.5, bold: true, color: C.ink });
      T(s, desc, { x: x + 0.32, y: y + 1.48, w: cw - 0.64, h: 0.64, fontSize: 10.5, color: C.mute, lineSpacingMultiple: 1.2 });
    }
    s.addNotes("Three mandatory sections — introduction, requirements, architecture — with data, security and delivery treated as part of the architecture story.");
  }

  // ─────────────────────────────────────────────── 3 · INTRO: TWO PROBLEMS
  {
    const s = slide();
    head(s, "01 · INTRODUCTION", "Two problems every campus repeats");
    const cw = (CW - 0.36) / 2;
    const cols = [
      [ML, C.peach, C.peachD, "FiSearch", "Things get lost",
        "ID cards, water bottles, calculators and chargers disappear every week. Whoever finds them has no reliable way to reach the owner, and the owner has nowhere to look."],
      [ML + cw + 0.36, C.mint, C.mintD, "FiShoppingBag", "Things go unused",
        "Textbooks, cycles, lab coats and hostel essentials pile up — especially at graduation and move-out — with no organised way to pass them down to juniors."],
    ];
    for (const [x, bg, fg, ic, title, body] of cols) {
      card(s, { x, y: 1.66, w: cw, h: 2.95 });
      await chip(s, x + 0.38, y2(1.66, 0.36), 0.74, bg, ic, fg);
      T(s, title, { x: x + 0.38, y: 1.66 + 1.30, w: cw - 0.76, h: 0.42, fontSize: 18, bold: true, color: C.ink });
      T(s, body, { x: x + 0.38, y: 1.66 + 1.80, w: cw - 0.76, h: 1.0, fontSize: 12, color: C.ink2, lineSpacingMultiple: 1.28 });
    }
    card(s, { x: ML, y: 4.90, w: CW, h: 1.62, fill: C.tint, line: "DFD2F2" });
    T(s, "TODAY'S WORKAROUND", { x: ML + 0.42, y: 5.14, w: 5, h: 0.26, fontSize: 9.5, bold: true, color: C.primary, charSpacing: 1.8 });
    T(s, "Both problems run on scattered WhatsApp groups and physical notice boards. Posts get buried within hours, nothing is searchable, there is no claim process — and no way to verify who is on the other side of the conversation.",
      { x: ML + 0.42, y: 5.46, w: CW - 0.84, h: 0.86, fontSize: 13, color: C.ink2, lineSpacingMultiple: 1.25 });
    s.addNotes("Start with the lived problem. Both halves of FoundIt come from the same failure: no structured, trusted place for campus-local exchange.");
  }
  function y2(a, b) { return a + b; }

  // ─────────────────────────────────────────────── 4 · INTRO: EXISTING OPTIONS
  {
    const s = slide();
    head(s, "01 · INTRODUCTION", "Why the existing options fall short");
    const cw = (CW - 2 * 0.32) / 3;
    const cols = [
      [C.sky, C.skyD, "FiGlobe", "Public marketplaces", "OLX · Facebook Marketplace",
        "City-wide second-hand buying and selling, with a large audience.",
        "Open to strangers, no campus verification, real safety and trust concerns — and no lost-and-found at all."],
      [C.mint, C.mintD, "FiMessageCircle", "Chat groups", "WhatsApp · Telegram",
        "Informal sharing inside batch and hostel groups people already use.",
        "Unstructured — posts get buried, nothing is searchable, no claim workflow and no moderation."],
      [C.peach, C.peachD, "FiClipboard", "Notice boards", "Physical, outside the office",
        "The traditional way to put up a lost-and-found notice on campus.",
        "Not searchable, limited reach, easily missed — and no marketplace side whatsoever."],
    ];
    for (let i = 0; i < 3; i++) {
      const [bg, fg, ic, title, sub, offers, falls] = cols[i];
      const x = ML + i * (cw + 0.32);
      card(s, { x, y: 1.66, w: cw, h: 3.40 });
      await chip(s, x + 0.32, 1.66 + 0.30, 0.60, bg, ic, fg);
      T(s, title, { x: x + 1.04, y: 1.66 + 0.32, w: cw - 1.36, h: 0.3, fontSize: 14.5, bold: true, color: C.ink });
      T(s, sub, { x: x + 1.04, y: 1.66 + 0.62, w: cw - 1.36, h: 0.24, fontSize: 9, color: C.mute });
      T(s, "WHAT IT OFFERS", { x: x + 0.32, y: 1.66 + 1.14, w: cw - 0.64, h: 0.22, fontSize: 8.5, bold: true, color: fg, charSpacing: 1.4 });
      T(s, offers, { x: x + 0.32, y: 1.66 + 1.40, w: cw - 0.64, h: 0.62, fontSize: 10.5, color: C.ink2, lineSpacingMultiple: 1.2 });
      T(s, "WHERE IT FALLS SHORT", { x: x + 0.32, y: 1.66 + 2.12, w: cw - 0.64, h: 0.22, fontSize: 8.5, bold: true, color: C.mute, charSpacing: 1.4 });
      T(s, falls, { x: x + 0.32, y: 1.66 + 2.38, w: cw - 0.64, h: 0.80, fontSize: 10.5, color: C.ink2, lineSpacingMultiple: 1.2 });
    }
    card(s, { x: ML, y: 5.34, w: CW, h: 1.24, fill: C.lav, line: "D9CBEF" });
    T(s, "No single, trusted, campus-only platform combines lost-and-found recovery with a student marketplace.\nThat gap is exactly what FoundIt fills.",
      { x: ML + 0.42, y: 5.58, w: CW - 0.84, h: 0.78, fontSize: 14, bold: true, color: C.ink, lineSpacingMultiple: 1.25 });
    s.addNotes("Competitors are either too broad and untrusted, too unstructured, or too narrow. None does both jobs for one verified community.");
  }

  // ─────────────────────────────────────────────── 5 · INTRO: SOLUTION
  {
    const s = slide();
    head(s, "01 · INTRODUCTION", "One verified platform, two flows");
    T(s, "FoundIt is a single web application behind a verified campus login. A user posts a lost or found item with details, an image and a campus zone; the system suggests likely matches and the owner claims the item through an approve-or-reject flow. In the marketplace, users list goods with price and condition, browse and filter, then confirm a deal through a two-party handshake and rate each other afterwards.",
      { x: ML, y: 1.68, w: 6.5, h: 1.55, fontSize: 12.5, color: C.ink2, lineSpacingMultiple: 1.32 });
    const rows = [
      ["FiMapPin", C.sky, C.skyD, "Campus-scoped", "A verified campus email is the gate, and every post is tagged to a campus zone."],
      ["FiZap", C.butter, C.butterD, "Smart matching", "Five-factor scoring pairs lost reports with found reports automatically."],
      ["FiShield", C.mint, C.mintD, "Accountable by design", "Trust scores, a claim workflow and community moderation replace guesswork."],
    ];
    for (let i = 0; i < rows.length; i++) {
      const [ic, bg, fg, t, d] = rows[i];
      const y = 3.56 + i * 0.94;
      await chip(s, ML, y, 0.50, bg, ic, fg);
      T(s, t, { x: ML + 0.70, y: y - 0.02, w: 5.6, h: 0.28, fontSize: 12.5, bold: true, color: C.ink });
      T(s, d, { x: ML + 0.70, y: y + 0.27, w: 5.7, h: 0.46, fontSize: 10.5, color: C.mute, lineSpacingMultiple: 1.18 });
    }
    const stats = [
      ["4", "Modules", C.lav, C.lavD], ["4", "User roles", C.mint, C.mintD],
      ["24", "Functional requirements", C.peach, C.peachD], ["10", "AI-assisted features", C.sky, C.skyD],
    ];
    for (let i = 0; i < 4; i++) {
      const [n, l, bg, fg] = stats[i];
      const x = 7.50 + (i % 2) * 2.71, y = 1.74 + Math.floor(i / 2) * 2.32;
      card(s, { x, y, w: 2.50, h: 2.10, fill: bg, line: null });
      T(s, n, { x: x + 0.28, y: y + 0.44, w: 1.94, h: 0.78, fontSize: 40, bold: true, color: fg });
      T(s, l, { x: x + 0.28, y: y + 1.30, w: 1.98, h: 0.54, fontSize: 11, bold: true, color: C.ink2, lineSpacingMultiple: 1.1 });
    }
    s.addNotes("One login, two flows. The numbers on the right are the shape of the build: five modules behind four roles, 24 functional requirements, ten AI-assisted features with deterministic fallbacks.");
  }

  // ─────────────────────────────────────────────── 6 · OBJECTIVES
  {
    const s = slide();
    head(s, "01 · INTRODUCTION", "Five objectives for the semester");
    const objs = [
      ["FiSearch", C.lav, C.lavD, "Lost & found recovery", "A campus-only platform where verified students report lost and found items and get matched to recover them."],
      ["FiShoppingBag", C.mint, C.mintD, "Student marketplace", "A structured space to buy, sell, rent or give away second-hand student goods."],
      ["FiShield", C.peach, C.peachD, "Trust and safety", "Access limited to verified campus members, with safe, accountable in-app communication."],
      ["FiZap", C.butter, C.butterD, "Smart matching", "Automatic suggestions pairing lost and found reports on category, keywords and location."],
      ["FiSliders", C.sky, C.skyD, "Moderation and control", "Role-based access, community flagging and an admin dashboard keep the platform clean."],
    ];
    for (let i = 0; i < objs.length; i++) {
      const [ic, bg, fg, t, d] = objs[i];
      const y = 1.68 + i * 1.02;
      card(s, { x: ML, y, w: CW, h: 0.88 });
      await chip(s, ML + 0.26, y + 0.19, 0.50, bg, ic, fg);
      T(s, String(i + 1).padStart(2, "0"), { x: ML + 0.92, y: y + 0.28, w: 0.4, h: 0.3, fontSize: 11, bold: true, color: fg });
      T(s, t, { x: ML + 1.38, y: y + 0.26, w: 3.0, h: 0.34, fontSize: 13.5, bold: true, color: C.ink });
      T(s, d, { x: ML + 4.55, y: y + 0.28, w: CW - 4.85, h: 0.36, fontSize: 11, color: C.ink2 });
    }
    s.addNotes("Five objectives, and each maps onto a module you will see in the requirements section.");
  }

  // ─────────────────────────────────────────────── 7 · SCOPE & USERS
  {
    const s = slide();
    head(s, "01 · INTRODUCTION", "Scope and who it serves");
    const lw = 5.75, rw = 6.00, rx = ML + lw + 0.34;
    card(s, { x: ML, y: 1.66, w: lw, h: 4.96 });
    T(s, "IN SCOPE", { x: ML + 0.36, y: 1.92, w: 3, h: 0.26, fontSize: 9.5, bold: true, color: C.mintD, charSpacing: 1.6 });
    const inScope = [
      "Responsive web app for desktop and mobile browsers",
      "One campus community, one verified login",
      "Four modules and four permission roles",
      "Image upload, campus-zone tagging, chat, notifications",
      "Moderation queue and an admin analytics dashboard",
    ];
    inScope.forEach((t, i) => {
      const y = 2.26 + i * 0.50;
      s.addShape(S.OVAL, { x: ML + 0.38, y: y + 0.09, w: 0.11, h: 0.11, fill: { color: C.mint }, line: { color: C.mint } });
      T(s, t, { x: ML + 0.64, y, w: lw - 1.0, h: 0.42, fontSize: 11, color: C.ink2, lineSpacingMultiple: 1.15 });
    });
    T(s, "OUT OF SCOPE", { x: ML + 0.36, y: 4.94, w: 3, h: 0.26, fontSize: 9.5, bold: true, color: C.peachD, charSpacing: 1.6 });
    const outScope = [
      "Real money handling — deals settle in person",
      "A native mobile application",
      "Multi-campus federation",
    ];
    outScope.forEach((t, i) => {
      const y = 5.28 + i * 0.46;
      s.addShape(S.OVAL, { x: ML + 0.38, y: y + 0.09, w: 0.11, h: 0.11, fill: { color: C.peach }, line: { color: C.peach } });
      T(s, t, { x: ML + 0.64, y, w: lw - 1.0, h: 0.4, fontSize: 11, color: C.ink2 });
    });

    card(s, { x: rx, y: 1.66, w: rw, h: 4.96 });
    T(s, "WHO USES IT", { x: rx + 0.36, y: 1.92, w: 3, h: 0.26, fontSize: 9.5, bold: true, color: C.primary, charSpacing: 1.6 });
    const users = [
      ["FiSearch", C.lav, C.lavD, "Students who lost or found something on campus and need to report or claim it."],
      ["FiShoppingBag", C.mint, C.mintD, "Students buying, selling, renting or giving away used textbooks, cycles and hostel goods."],
      ["FiPackage", C.peach, C.peachD, "Graduating or relocating students clearing out belongings at the end of a semester."],
      ["FiUserCheck", C.sky, C.skyD, "Faculty and lab assistants who recover misplaced items and need somewhere to log them."],
      ["FiSettings", C.butter, C.butterD, "Campus administrators and moderators keeping the platform safe and spam-free."],
    ];
    for (let i = 0; i < users.length; i++) {
      const [ic, bg, fg, t] = users[i];
      const y = 2.32 + i * 0.84;
      await chip(s, rx + 0.36, y, 0.46, bg, ic, fg);
      T(s, t, { x: rx + 1.00, y: y - 0.04, w: rw - 1.36, h: 0.62, fontSize: 11, color: C.ink2, lineSpacingMultiple: 1.18 });
    }
    s.addNotes("Scope is deliberately bounded: no payment gateway, no native app, one campus. Everything else is in.");
  }

  // ─────────────────────────────────────────────── 8 · ROLES
  {
    const s = slide();
    head(s, "02 · REQUIREMENTS", "Four roles, enforced end to end");
    const cw = (CW - 3 * 0.28) / 4;
    const roles = [
      ["FiEye", C.sky, C.skyD, "Guest / Visitor", "Not signed in yet.", ["Browse a limited public view", "Register or log in", "Cannot post, claim or message"]],
      ["FiUser", C.mint, C.mintD, "Registered User", "Verified student or staff — the core user.", ["Post reports and listings", "Search, claim, chat and rate", "Manage own profile and posts"]],
      ["FiFlag", C.butter, C.butterD, "Moderator", "A trusted reviewer of reported content.", ["Approve or remove flagged posts", "Mediate claim disputes", "Issue warnings and strikes"]],
      ["FiSettings", C.lav, C.lavD, "Administrator", "The system owner.", ["Manage users and assign roles", "View the analytics dashboard", "Configure categories and zones"]],
    ];
    for (let i = 0; i < 4; i++) {
      const [ic, bg, fg, name, desc, perms] = roles[i];
      const x = ML + i * (cw + 0.28);
      card(s, { x, y: 1.70, w: cw, h: 4.20 });
      await chip(s, x + 0.30, 1.70 + 0.30, 0.66, bg, ic, fg);
      T(s, name, { x: x + 0.30, y: 1.70 + 1.10, w: cw - 0.60, h: 0.32, fontSize: 14.5, bold: true, color: C.ink });
      T(s, desc, { x: x + 0.30, y: 1.70 + 1.46, w: cw - 0.60, h: 0.56, fontSize: 10.5, color: C.mute, lineSpacingMultiple: 1.18 });
      T(s, "KEY PERMISSIONS", { x: x + 0.30, y: 1.70 + 2.10, w: cw - 0.60, h: 0.24, fontSize: 8.5, bold: true, color: fg, charSpacing: 1.3 });
      perms.forEach((p, j) => {
        const y = 1.70 + 2.42 + j * 0.52;
        s.addShape(S.OVAL, { x: x + 0.32, y: y + 0.08, w: 0.10, h: 0.10, fill: { color: bg }, line: { color: bg } });
        T(s, p, { x: x + 0.56, y, w: cw - 0.86, h: 0.46, fontSize: 10, color: C.ink2, lineSpacingMultiple: 1.15 });
      });
    }
    card(s, { x: ML, y: 6.08, w: CW, h: 0.80, fill: C.tint, line: "DFD2F2" });
    T(s, "Roles live as Firebase custom claims (auth.token.role) and are checked again inside Firestore Security Rules — the client never decides its own permissions.",
      { x: ML + 0.40, y: 6.28, w: CW - 0.80, h: 0.42, fontSize: 11.5, color: C.ink2 });
    s.addNotes("Four roles with distinct permissions. The key point for the viva: the role is a server-set custom claim, not a client-side flag.");
  }

  // ─────────────────────────────────────────────── 9 · FR OVERVIEW
  {
    const s = slide();
    head(s, "02 · REQUIREMENTS", "24 functional requirements, five modules");
    const mods = [
      ["FiKey", C.lav, C.lavD, "Authentication & User Management", "FR-1 → FR-5", "5 requirements", "Campus-email registration, verification, secure sessions, profiles and roles."],
      ["FiSearch", C.mint, C.mintD, "Lost & Found", "FR-6 → FR-11", "6 requirements", "Report lost and found items, tag campus zones, receive suggested matches, claim and resolve."],
      ["FiShoppingBag", C.peach, C.peachD, "Marketplace", "FR-12 → FR-16", "5 requirements", "Create listings, browse and filter, handshake a deal, archive sold items, keep a watchlist."],
      ["FiMessageCircle", C.sky, C.skyD, "Communication & Trust", "FR-17 → FR-20", "4 requirements", "Item-linked chat, post-exchange ratings, content flagging and live notifications."],
      ["FiSettings", C.butter, C.butterD, "Administration & Moderation", "FR-21 → FR-24", "4 requirements", "Review flagged content, manage users and roles, analytics, categories and campus zones."],
    ];
    const w1 = (CW - 2 * 0.32) / 3, w2 = (CW - 0.32) / 2;
    for (let i = 0; i < 5; i++) {
      const [ic, bg, fg, name, range, count, desc] = mods[i];
      const top = i < 3;
      const cwv = top ? w1 : w2;
      const x = top ? ML + i * (w1 + 0.32) : ML + (i - 3) * (w2 + 0.32);
      const y = top ? 1.70 : 4.52, ch = top ? 2.60 : 1.95;
      card(s, { x, y, w: cwv, h: ch });
      await chip(s, x + 0.30, y + 0.28, 0.56, bg, ic, fg);
      pill(s, x + cwv - 1.50, y + 0.34, range, bg, fg, 9.5, 1.20);
      if (top) {
        T(s, name, { x: x + 0.30, y: y + 1.00, w: cwv - 0.60, h: 0.62, fontSize: 14, bold: true, color: C.ink, lineSpacingMultiple: 1.05 });
        T(s, count, { x: x + 0.30, y: y + 1.66, w: cwv - 0.60, h: 0.24, fontSize: 9.5, bold: true, color: fg });
        T(s, desc, { x: x + 0.30, y: y + 1.92, w: cwv - 0.60, h: 0.50, fontSize: 10.5, color: C.mute, lineSpacingMultiple: 1.18 });
      } else {
        T(s, name, { x: x + 1.00, y: y + 0.32, w: cwv - 2.70, h: 0.32, fontSize: 14, bold: true, color: C.ink });
        T(s, count, { x: x + 1.00, y: y + 0.66, w: cwv - 2.70, h: 0.24, fontSize: 9.5, bold: true, color: fg });
        T(s, desc, { x: x + 0.30, y: y + 1.14, w: cwv - 0.60, h: 0.52, fontSize: 10.5, color: C.mute, lineSpacingMultiple: 1.18 });
      }
    }
    s.addNotes("Requirements are labelled FR-1 to FR-24 for traceability, grouped by the module that owns them.");
  }

  // ─────────────────────────────────────────────── 10 · FR 1-11
  const frText = (s, x, y, w, id, text, fg, size) => {
    s.addText([
      { text: id + "   ", options: { bold: true, color: fg } },
      { text, options: { color: C.ink2 } },
    ], { x, y, w, h: 0.6, fontFace: FF, fontSize: size, isTextBox: true, margin: 0, lineSpacingMultiple: 1.18, valign: "top" });
  };
  {
    const s = slide();
    head(s, "02 · REQUIREMENTS · FUNCTIONAL", "Authentication and Lost & Found");
    const lw = 5.75, rw = 6.00, rx = ML + lw + 0.34, cy = 1.62, chh = 5.10;
    card(s, { x: ML, y: cy, w: lw, h: chh });
    await chip(s, ML + 0.34, cy + 0.28, 0.48, C.lav, "FiKey", C.lavD);
    T(s, "Authentication & User Management", { x: ML + 0.96, y: cy + 0.34, w: lw - 1.3, h: 0.34, fontSize: 13.5, bold: true, color: C.ink });
    [
      ["FR-1", "Users shall register with a valid campus email address and verify it before accessing full features."],
      ["FR-2", "Users shall log in and log out securely, with passwords stored in hashed form."],
      ["FR-3", "Users shall reset a forgotten password through an emailed link."],
      ["FR-4", "Each user shall have an editable profile — name, hostel or department, contact preference and photo."],
      ["FR-5", "The system shall assign roles (User, Moderator, Admin) and restrict features accordingly."],
    ].forEach(([id, t], i) => frText(s, ML + 0.36, cy + 1.02 + i * 0.80, lw - 0.72, id, t, C.lavD, 11));

    card(s, { x: rx, y: cy, w: rw, h: chh });
    await chip(s, rx + 0.34, cy + 0.28, 0.48, C.mint, "FiSearch", C.mintD);
    T(s, "Lost & Found", { x: rx + 0.96, y: cy + 0.34, w: rw - 1.3, h: 0.34, fontSize: 13.5, bold: true, color: C.ink });
    [
      ["FR-6", "Users shall post a lost-item report with title, description, category, date, last-seen location and an optional image."],
      ["FR-7", "Users shall post a found-item report with the item's details, its current location and an image."],
      ["FR-8", "The system shall let users tag a location on a map or select from a list of campus zones."],
      ["FR-9", "The system shall suggest possible matches between lost and found reports using category, keywords and location."],
      ["FR-10", "A user shall raise a claim on a found item; the finder shall approve or reject that claim."],
      ["FR-11", "Users shall mark an item 'Returned' or 'Resolved', which closes the report."],
    ].forEach(([id, t], i) => frText(s, rx + 0.36, cy + 1.02 + i * 0.68, rw - 0.72, id, t, C.mintD, 10.5));
    s.addNotes("FR-9 is the interesting one — smart matching. It is implemented server-side as a five-factor score, which we come back to in the architecture section.");
  }

  // ─────────────────────────────────────────────── 11 · FR 12-24
  {
    const s = slide();
    head(s, "02 · REQUIREMENTS · FUNCTIONAL", "Marketplace, trust and administration");
    const cw = (CW - 2 * 0.30) / 3, cy = 1.62, chh = 5.10;
    const groups = [
      ["FiShoppingBag", C.peach, C.peachD, "Marketplace", [
        ["FR-12", "Create a listing with title, description, category, condition, price (or Free / For rent) and images."],
        ["FR-13", "Browse, search and filter listings by category, price range, condition and keyword."],
        ["FR-14", "Mark a listing 'Sold' or delete it; sold items are archived, not shown in active search."],
        ["FR-15", "Simulate a transaction handshake so buyer and seller confirm a deal — no payment gateway."],
        ["FR-16", "Bookmark listings and lost/found posts to a personal watchlist."],
      ]],
      ["FiMessageCircle", C.sky, C.skyD, "Communication & Trust", [
        ["FR-17", "Exchange messages through an in-app chat tied to a specific item or listing."],
        ["FR-18", "Rate and review the other party after a completed exchange."],
        ["FR-19", "Report or flag suspicious posts, spam or inappropriate content."],
        ["FR-20", "Send notifications for new matches, claims, messages and status changes."],
      ]],
      ["FiSettings", C.butter, C.butterD, "Administration & Moderation", [
        ["FR-21", "Moderators shall review flagged content and approve, hide or remove it."],
        ["FR-22", "Administrators shall manage users, assign roles and suspend accounts."],
        ["FR-23", "Administrators shall view an analytics dashboard — active listings, resolved items, user activity."],
        ["FR-24", "Administrators shall manage the list of item categories and campus zones."],
      ]],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, bg, fg, name, items] = groups[i];
      const x = ML + i * (cw + 0.30);
      card(s, { x, y: cy, w: cw, h: chh });
      await chip(s, x + 0.30, cy + 0.28, 0.46, bg, ic, fg);
      T(s, name, { x: x + 0.30, y: cy + 0.86, w: cw - 0.60, h: 0.32, fontSize: 13, bold: true, color: C.ink });
      items.forEach(([id, t], j) => frText(s, x + 0.30, cy + 1.34 + j * 0.74, cw - 0.60, id, t, fg, 9.8));
    }
    s.addNotes("FR-15 is deliberately a handshake, not a payment: both parties confirm, then the listing is marked sold and reviews unlock.");
  }

  // ─────────────────────────────────────────────── 12 · CONTEXT DIAGRAM
  {
    const s = slide();
    head(s, "02 · REQUIREMENTS", "System context — who interacts with FoundIt");
    card(s, { x: ML, y: 1.62, w: 7.90, h: 5.05, fill: C.white });
    s.addImage({ path: ASSETS + "/dfd(l0).png", x: ML + 0.18, y: 1.86, w: 7.54, h: 4.33 });
    const notes = [
      ["FiUser", C.mint, C.mintD, "Student / Staff", "Registers, posts lost and found items, lists goods, searches, claims and chats."],
      ["FiFlag", C.butter, C.butterD, "Moderator", "Receives flagged content, then reviews, approves or removes the post."],
      ["FiSettings", C.lav, C.lavD, "Administrator", "Manages users, roles and categories, and reads the analytics dashboard."],
      ["FiDatabase", C.sky, C.skyD, "Data store", "Every read and write passes through Security Rules before reaching Firestore."],
    ];
    const rx = ML + 8.24, rw = MR - rx;
    for (let i = 0; i < notes.length; i++) {
      const [ic, bg, fg, t, d] = notes[i];
      const y = 1.62 + i * 1.30;
      card(s, { x: rx, y, w: rw, h: 1.20 });
      await chip(s, rx + 0.26, y + 0.24, 0.44, bg, ic, fg);
      T(s, t, { x: rx + 0.84, y: y + 0.22, w: rw - 1.1, h: 0.28, fontSize: 12, bold: true, color: C.ink });
      T(s, d, { x: rx + 0.26, y: y + 0.60, w: rw - 0.52, h: 0.46, fontSize: 9.8, color: C.mute, lineSpacingMultiple: 1.16 });
    }
    s.addNotes("The level-0 context diagram: three human actors plus the data store, and the flows each one exchanges with the platform.");
  }

  // ─────────────────────────────────────────────── 13 · NON-FUNCTIONAL
  {
    const s = slide();
    head(s, "02 · REQUIREMENTS", "Nine quality attributes");
    const nfrs = [
      ["FiSmartphone", C.lav, C.lavD, "Usability", "Responsive and mobile-first. Posting an item or searching takes no more than three clicks."],
      ["FiZap", C.butter, C.butterD, "Performance", "Pages and search return in about two seconds; images are compressed on upload."],
      ["FiTrendingUp", C.mint, C.mintD, "Scalability", "Indexed queries and pagination carry several thousand users without a redesign."],
      ["FiLock", C.rose, C.roseD, "Security", "Hashed passwords, token sessions, role-based access and inputs validated against injection."],
      ["FiEyeOff", C.sky, C.skyD, "Privacy", "Contact details stay private by default; users talk in-app. Campus-verified accounts only."],
      ["FiActivity", C.peach, C.peachD, "Reliability", "A 99% uptime target through the demo period, with graceful and readable error handling."],
      ["FiCode", C.lav, C.lavD, "Maintainability", "Modular, documented code with a clear split between UI, data layer and backend."],
      ["FiMonitor", C.mint, C.mintD, "Compatibility", "Current Chrome, Firefox and Edge, plus Android and iOS mobile browsers."],
      ["FiCheckCircle", C.butter, C.butterD, "Accessibility", "Readable contrast, alt text on images and keyboard-navigable forms throughout."],
    ];
    const cw = (CW - 2 * 0.26) / 3, chh = 1.62;
    for (let i = 0; i < 9; i++) {
      const [ic, bg, fg, name, desc] = nfrs[i];
      const x = ML + (i % 3) * (cw + 0.26), y = 1.68 + Math.floor(i / 3) * (chh + 0.20);
      card(s, { x, y, w: cw, h: chh });
      await chip(s, x + 0.26, y + 0.24, 0.40, bg, ic, fg);
      T(s, name, { x: x + 0.76, y: y + 0.28, w: cw - 1.0, h: 0.30, fontSize: 13, bold: true, color: C.ink });
      T(s, desc, { x: x + 0.26, y: y + 0.74, w: cw - 0.52, h: 0.72, fontSize: 9.8, color: C.ink2, lineSpacingMultiple: 1.18 });
    }
    s.addNotes("Nine non-functional requirements. Security and privacy are the ones the architecture spends the most effort on.");
  }

  // ─────────────────────────────────────────────── 14 · TECH STACK
  {
    const s = slide();
    head(s, "03 · ARCHITECTURE", "Technology stack");
    const bands = [
      ["FiMonitor", C.sky, C.skyD, "Frontend", "Client-rendered SPA", ["React 19", "Vite 7", "CSS Custom Properties", "Lucide Icons", "Real-time listeners", "Dark / light theming"]],
      ["FiDatabase", C.mint, C.mintD, "Backend & Data", "Serverless, event-driven", ["Firebase Auth", "Cloud Firestore", "Cloud Storage", "Cloud Functions v2 (Node 22)", "Security Rules"]],
      ["FiCloud", C.peach, C.peachD, "Delivery & Intelligence", "Hosting, tooling, external APIs", ["Vercel", "Firebase Emulator Suite", "Git + GitHub", "Gemini 1.5 Flash", "OpenMeteo API"]],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, bg, fg, name, sub, chips] = bands[i];
      const y = 1.70 + i * 1.72;
      card(s, { x: ML, y, w: CW, h: 1.52 });
      await chip(s, ML + 0.32, y + 0.40, 0.62, bg, ic, fg);
      T(s, name, { x: ML + 1.08, y: y + 0.40, w: 2.6, h: 0.32, fontSize: 14.5, bold: true, color: C.ink });
      T(s, sub, { x: ML + 1.08, y: y + 0.74, w: 2.7, h: 0.42, fontSize: 9.5, color: C.mute, lineSpacingMultiple: 1.15 });
      chipRow(s, ML + 4.05, y + 0.34, chips, bg, fg, CW - 4.45, 10);
    }
    s.addNotes("Firebase gives real-time listeners, offline caching and serverless scale on a free tier. Vercel hosts the frontend for per-PR preview deploys.");
  }

  // ─────────────────────────────────────────────── 15 · ARCHITECTURAL STYLE
  {
    const s = slide();
    head(s, "03 · ARCHITECTURE", "Event-driven at the core");
    const boxes = [
      ["FiUser", C.lav, C.lavD, "User action", "Post, claim, flag, confirm"],
      ["FiDatabase", C.sky, C.skyD, "Firestore write", "Document created or changed"],
      ["FiZap", C.mint, C.mintD, "Cloud Function trigger", "onDocumentWritten / onCall fires"],
      ["FiBell", C.peach, C.peachD, "Side effects", "Scores, statuses, notifications"],
    ];
    const bw = 2.70, gap = 0.43;
    for (let i = 0; i < 4; i++) {
      const [ic, bg, fg, t, d] = boxes[i];
      const x = ML + i * (bw + gap);
      card(s, { x, y: 1.72, w: bw, h: 1.32, fill: bg, line: null });
      await chip(s, x + 0.26, 1.72 + 0.24, 0.40, C.white, ic, fg);
      T(s, t, { x: x + 0.26, y: 1.72 + 0.70, w: bw - 0.52, h: 0.28, fontSize: 12, bold: true, color: C.ink });
      T(s, d, { x: x + 0.26, y: 1.72 + 0.97, w: bw - 0.52, h: 0.26, fontSize: 9, color: C.ink2 });
      if (i < 3) arrowR(s, x + bw + 0.09, 1.72 + 0.58, 0.26);
    }
    const halves = [
      [ML, C.mintD, "Command path", "The client writes items, claims, listings, reviews and flags straight into Firestore. It never computes anything the system will later trust."],
      [ML + (CW - 0.36) / 2 + 0.36, C.skyD, "Query path", "The client reads denormalised feed documents through onSnapshot listeners, so every connected screen updates the moment the data changes."],
    ];
    for (const [x, fg, t, d] of halves) {
      const w = (CW - 0.36) / 2;
      card(s, { x, y: 3.44, w, h: 1.56 });
      T(s, "CQRS", { x: x + 0.34, y: 3.68, w: 2, h: 0.24, fontSize: 9, bold: true, color: C.primary, charSpacing: 1.6 });
      T(s, t, { x: x + 0.34, y: 3.94, w: w - 0.68, h: 0.30, fontSize: 13.5, bold: true, color: fg });
      T(s, d, { x: x + 0.34, y: 4.28, w: w - 0.68, h: 0.60, fontSize: 10.8, color: C.ink2, lineSpacingMultiple: 1.18 });
    }
    card(s, { x: ML, y: 5.22, w: CW, h: 1.38, fill: C.tint, line: "DFD2F2" });
    T(s, "The client writes data; the server reacts. Trust scores, match scores and item statuses are computed only inside Cloud Functions and written back to the document — Firestore rules reject any client write that tries to change them.",
      { x: ML + 0.42, y: 5.52, w: CW - 0.84, h: 0.82, fontSize: 12.5, color: C.ink2, lineSpacingMultiple: 1.25 });
    s.addNotes("If asked for the architectural style in one sentence: event-driven, with CQRS separating what the client writes from what the server computes.");
  }

  // ─────────────────────────────────────────────── 16 · LAYERED VIEW
  {
    const s = slide();
    head(s, "03 · ARCHITECTURE", "Layered system view");
    const layer = async (y, h, fill, ic, bg, fg, name, rows, hOff, padB) => {
      const ho = hOff || 0.62, pb = padB || 0.18;
      card(s, { x: ML, y, w: CW, h, fill, line: null, shadow: false });
      await chip(s, ML + 0.26, y + 0.20, 0.34, C.white, ic, fg);
      T(s, name, { x: ML + 0.70, y: y + 0.22, w: 6, h: 0.28, fontSize: 11.5, bold: true, color: fg, charSpacing: 0.6 });
      const top = y + ho, avail = h - ho - pb, rh = (avail - (rows.length - 1) * 0.08) / rows.length;
      rows.forEach((r, i) => {
        const ry = top + i * (rh + 0.08);
        s.addShape(S.ROUNDED_RECTANGLE, { x: ML + 0.24, y: ry, w: CW - 0.48, h: rh, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.white } });
        s.addText([
          { text: r[0] + "   ", options: { bold: true, color: fg } },
          { text: r[1], options: { color: C.ink2 } },
        ], { x: ML + 0.44, y: ry, w: CW - 0.88, h: rh, fontFace: FF, fontSize: 10, isTextBox: true, margin: 0, valign: "middle", lineSpacingMultiple: 1.15 });
      });
    };
    await layer(1.54, 1.64, "EAF2FC", "FiMonitor", C.sky, C.skyD, "CLIENT — React 19 single-page app", [
      ["Presentation", "UI components · AuthContext identity facade · hooks (useFeed, useNotifications)"],
      ["Data access", "lib/*.js repositories — feed · claims · deals · chat · flags · notifications · ai"],
      ["Platform SDK", "Firebase JS SDK — firestore · auth · storage"],
    ]);
    arrowD(s, W / 2 - 0.09, 3.24, 0.22);
    T(s, "HTTPS  /  WebSocket", { x: W / 2 + 0.18, y: 3.24, w: 3, h: 0.22, fontSize: 8.5, bold: true, color: C.mute, charSpacing: 1.2 });
    await layer(3.46, 2.18, "E5F3EC", "FiServer", C.mint, C.mintD, "FIREBASE PLATFORM — managed backend", [
      ["Managed services", "Authentication · Cloud Firestore · Cloud Storage"],
      ["Cloud Functions v2", "suggestMatches · onClaimResolved · onReviewCreated · onFlagCreated · confirmTransaction · resolveFlag · recomputeTrustScore · setUserRole"],
      ["Gateway", "Security Rules — firestore.rules · storage.rules screen every read and write"],
    ]);
    arrowD(s, W / 2 - 0.09, 5.70, 0.22);
    T(s, "REST", { x: W / 2 + 0.18, y: 5.70, w: 2, h: 0.22, fontSize: 8.5, bold: true, color: C.mute, charSpacing: 1.2 });
    await layer(5.92, 1.00, "FCEFE5", "FiGlobe", C.peach, C.peachD, "EXTERNAL APIS", [
      ["Google Gemini 1.5 Flash", "text and vision, with a deterministic local fallback     ·     OpenMeteo   weather context for lost-item advice"],
    ], 0.52, 0.14);
    s.addNotes("Three tiers. Note the gateway row: Security Rules are a real architectural layer here, not configuration.");
  }

  // ─────────────────────────────────────────────── 17 · PATTERNS
  {
    const s = slide();
    head(s, "03 · ARCHITECTURE", "Patterns doing the work");
    const pats = [
      ["FiActivity", C.lav, C.lavD, "Event-Driven", "Firestore document writes trigger Cloud Functions, which propagate every side effect."],
      ["FiGitBranch", C.sky, C.skyD, "CQRS", "Clients command by writing data; computed fields are written back only by the server."],
      ["FiDatabase", C.mint, C.mintD, "Repository", "lib/*.js wraps every Firestore call, so components never touch the SDK directly."],
      ["FiBell", C.butter, C.butterD, "Observer", "onSnapshot pushes feed, chat and notification changes to every connected client."],
      ["FiShuffle", C.peach, C.peachD, "Strategy", "Each AI function tries Gemini first, then falls back to a deterministic local path."],
      ["FiRepeat", C.rose, C.roseD, "State Machine", "Items move open → matched → claimed → resolved; listings active → sold."],
      ["FiCheckSquare", C.mint, C.mintD, "Saga", "confirmTransaction needs both buyer and seller before a listing is marked sold."],
      ["FiFlag", C.sky, C.skyD, "Chain of Responsibility", "Flags accumulate, auto-hide the post at threshold, then escalate to a moderator."],
    ];
    const cw = (CW - 3 * 0.28) / 4, chh = 2.16;
    for (let i = 0; i < 8; i++) {
      const [ic, bg, fg, name, desc] = pats[i];
      const x = ML + (i % 4) * (cw + 0.28), y = 1.68 + Math.floor(i / 4) * (chh + 0.24);
      card(s, { x, y, w: cw, h: chh });
      await chip(s, x + 0.28, y + 0.26, 0.50, bg, ic, fg);
      T(s, name, { x: x + 0.28, y: y + 0.90, w: cw - 0.56, h: 0.36, fontSize: 12.5, bold: true, color: C.ink, lineSpacingMultiple: 1.0 });
      T(s, desc, { x: x + 0.28, y: y + (name.length > 18 ? 1.30 : 1.26), w: cw - 0.56, h: 0.78, fontSize: 9.8, color: C.mute, lineSpacingMultiple: 1.18 });
    }
    card(s, { x: ML, y: 6.42, w: CW, h: 0.58, fill: C.tint, line: "DFD2F2" });
    T(s, "Also in play — Gateway (Security Rules screen every read and write) and Facade (AuthContext merges Firebase Auth with the user profile into one identity).",
      { x: ML + 0.40, y: 6.56, w: CW - 0.80, h: 0.32, fontSize: 10.5, color: C.ink2 });
    s.addNotes("Eight patterns, each tied to a concrete file or function — useful if the examiner asks where a pattern actually lives in the code.");
  }

  // ─────────────────────────────────────────────── 18 · DATA MODEL
  {
    const s = slide();
    head(s, "03 · ARCHITECTURE", "Firestore data model");
    const lw = 7.90, cy = 1.62, chh = 5.20;
    card(s, { x: ML, y: cy, w: lw, h: chh });
    T(s, "COLLECTION", { x: ML + 0.34, y: cy + 0.26, w: 2.4, h: 0.24, fontSize: 8.5, bold: true, color: C.mute, charSpacing: 1.4 });
    T(s, "DOCUMENT SHAPE", { x: ML + 2.92, y: cy + 0.26, w: 4, h: 0.24, fontSize: 8.5, bold: true, color: C.mute, charSpacing: 1.4 });
    const cols = [
      ["users/{uid}", C.lavD, "name · email · hostelOrDept · trustScore · trustTier · role · ratingAvg · ratingCount · resolvedCount · strikes · verified"],
      ["lostFoundItems/{id}", C.mintD, "type · title · description · category · keywords · location · imageURLs · status · postedBy · matchedWith · matchScore"],
      ["…/claims/{cid}", C.mintD, "claimantUid · message · status · proofURLs"],
      ["listings/{id}", C.peachD, "title · description · price · priceType · condition · category · sellerUid · status · imageURLs · trustScore"],
      ["reviews/{id}", C.skyD, "raterUid · rateeUid · rating · comment · contextRef"],
      ["notifications/{id}", C.butterD, "userId · type · message · contextRef · read · createdAt"],
      ["flags/{id}", C.roseD, "targetRef · reporterUid · reason · status"],
    ];
    cols.forEach(([name, fg, shape], i) => {
      const y = cy + 0.62 + i * 0.66;
      s.addShape(S.ROUNDED_RECTANGLE, { x: ML + 0.22, y, w: lw - 0.44, h: 0.58, rectRadius: 0.08, fill: { color: i % 2 ? C.white : "F6F3FC" }, line: { color: i % 2 ? C.white : "F6F3FC" } });
      T(s, name, { x: ML + 0.34, y, w: 2.5, h: 0.58, fontSize: 10, bold: true, color: fg, valign: "middle" });
      T(s, shape, { x: ML + 2.92, y, w: lw - 3.26, h: 0.58, fontSize: 9.2, color: C.ink2, valign: "middle", lineSpacingMultiple: 1.12 });
    });
    const rx = ML + lw + 0.34, rw = MR - rx;
    card(s, { x: rx, y: cy, w: rw, h: 2.85 });
    await chip(s, rx + 0.28, cy + 0.26, 0.44, C.mint, "FiCopy", C.mintD);
    T(s, "Denormalisation", { x: rx + 0.28, y: cy + 0.84, w: rw - 0.56, h: 0.30, fontSize: 13, bold: true, color: C.ink });
    T(s, "Feed documents carry the poster's name, department, trust score and verified flag, so a 50-item feed needs no extra user reads. Firestore has no joins — the authoritative trust value still lives on users/{uid} and is recomputed server-side.",
      { x: rx + 0.28, y: cy + 1.20, w: rw - 0.56, h: 1.45, fontSize: 10.2, color: C.ink2, lineSpacingMultiple: 1.2 });
    card(s, { x: rx, y: cy + 3.07, w: rw, h: 2.13 });
    await chip(s, rx + 0.28, cy + 3.33, 0.44, C.sky, "FiFilter", C.skyD);
    T(s, "Indexing", { x: rx + 0.28, y: cy + 3.91, w: rw - 0.56, h: 0.30, fontSize: 13, bold: true, color: C.ink });
    T(s, "Single fields are auto-indexed. Composite indexes in firestore.indexes.json cover notifications by userId + createdAt (desc) and reviews by rateeUid + createdAt.",
      { x: rx + 0.28, y: cy + 4.27, w: rw - 0.56, h: 0.84, fontSize: 10.2, color: C.ink2, lineSpacingMultiple: 1.2 });
    s.addNotes("Seven collections. The trade-off for losing joins is denormalisation, and the cost of denormalisation is staleness — handled by recompute triggers.");
  }

  // ─────────────────────────────────────────────── 19 · DFD L1
  {
    const s = slide();
    head(s, "03 · ARCHITECTURE", "Data flow — level 1");
    card(s, { x: ML, y: 1.62, w: 6.30, h: 5.20, fill: C.white });
    s.addImage({ path: ASSETS + "/dfd(l1).png", x: ML + 0.42, y: 1.82, w: 5.46, h: 4.87 });
    const procs = [
      ["1", C.lav, C.lavD, "Authentication & User Management", "Register and log in, store and retrieve the user record, return the auth result."],
      ["2", C.mint, C.mintD, "Lost & Found Management", "Take lost and found reports in, save item records, return matching results and claim status."],
      ["3", C.peach, C.peachD, "Marketplace Management", "Create listings, save them, serve browse and search results back to the user."],
      ["4", C.sky, C.skyD, "Messaging & Notifications", "Store and retrieve messages, push notifications on matches, claims and status changes."],
      ["5", C.butter, C.butterD, "Admin Management", "Review reports, manage users, roles and categories, and feed the analytics dashboard."],
    ];
    const rx = ML + 6.64, rw = MR - rx;
    for (let i = 0; i < 5; i++) {
      const [n, bg, fg, t, d] = procs[i];
      const y = 1.62 + i * 1.06;
      card(s, { x: rx, y, w: rw, h: 0.94 });
      s.addShape(S.OVAL, { x: rx + 0.24, y: y + 0.24, w: 0.46, h: 0.46, fill: { color: bg }, line: { color: bg } });
      T(s, n, { x: rx + 0.24, y: y + 0.24, w: 0.46, h: 0.46, fontSize: 13, bold: true, color: fg, align: "center", valign: "middle" });
      T(s, t, { x: rx + 0.84, y: y + 0.17, w: rw - 1.1, h: 0.28, fontSize: 11.5, bold: true, color: C.ink });
      T(s, d, { x: rx + 0.84, y: y + 0.46, w: rw - 1.1, h: 0.42, fontSize: 9.5, color: C.mute, lineSpacingMultiple: 1.14 });
    }
    s.addNotes("Level 1 decomposes the platform into five processes and four data stores. Each process maps onto one requirements module.");
  }

  // ─────────────────────────────────────────────── 20 · SECURITY
  {
    const s = slide();
    head(s, "03 · ARCHITECTURE", "Defence in depth");
    const layers = [
      ["signedIn()", "The request must carry an authenticated Firebase session.", "F2ECFA", C.lavD],
      ["isVerified()", "The campus email address must be verified before any write.", "EDE4F8", C.lavD],
      ["Ownership", "The caller's uid must match the document's owner field.", "E7DBF5", C.lavD],
      ["keeps(field)", "Server-only fields cannot change in a client write.", "E0D2F2", C.lavD],
      ["Business rules", "A review is allowed only after a resolved exchange.", "D9C9EF", C.lavD],
    ];
    const lw = 6.30;
    layers.forEach(([name, desc, fill, fg], i) => {
      const y = 1.70 + i * 0.94;
      card(s, { x: ML, y, w: lw, h: 0.80, fill, line: null });
      s.addShape(S.OVAL, { x: ML + 0.24, y: y + 0.19, w: 0.42, h: 0.42, fill: { color: C.white }, line: { color: C.white } });
      T(s, String(i + 1), { x: ML + 0.24, y: y + 0.19, w: 0.42, h: 0.42, fontSize: 12, bold: true, color: fg, align: "center", valign: "middle" });
      T(s, name, { x: ML + 0.82, y: y + 0.13, w: 1.85, h: 0.28, fontSize: 12, bold: true, color: C.ink });
      T(s, desc, { x: ML + 0.82, y: y + 0.41, w: lw - 1.1, h: 0.28, fontSize: 9.8, color: C.ink2 });
    });
    const rx = ML + lw + 0.34, rw = MR - rx;
    card(s, { x: rx, y: 1.70, w: rw, h: 2.32 });
    await chip(s, rx + 0.28, 1.96, 0.44, C.mint, "FiUsers", C.mintD);
    T(s, "Role-based access", { x: rx + 0.84, y: 2.02, w: rw - 1.1, h: 0.30, fontSize: 13, bold: true, color: C.ink });
    [["Student", "CRUD own items, submit claims and reviews, flag content."],
     ["Moderator", "Resolve flags, apply strikes, view every flag in the queue."],
     ["Admin", "Set user roles, plus all moderator powers."]].forEach(([r, d], i) => {
      const y = 2.56 + i * 0.46;
      s.addText([{ text: r + "   ", options: { bold: true, color: C.mintD } }, { text: d, options: { color: C.ink2 } }],
        { x: rx + 0.28, y, w: rw - 0.56, h: 0.42, fontFace: FF, fontSize: 10, isTextBox: true, margin: 0, lineSpacingMultiple: 1.15 });
    });
    card(s, { x: rx, y: 4.24, w: rw, h: 2.16 });
    await chip(s, rx + 0.28, 4.50, 0.44, C.rose, "FiLock", C.roseD);
    T(s, "Why a client cannot fake trust", { x: rx + 0.84, y: 4.56, w: rw - 1.1, h: 0.30, fontSize: 13, bold: true, color: C.ink });
    s.addShape(S.ROUNDED_RECTANGLE, { x: rx + 0.28, y: 5.08, w: rw - 0.56, h: 0.36, rectRadius: 0.07, fill: { color: "F3EEFB" }, line: { color: "E7DEF6" } });
    T(s, "keeps('trustScore')   →   request == resource", { x: rx + 0.44, y: 5.08, w: rw - 0.88, h: 0.36, fontSize: 10, bold: true, color: C.primary, valign: "middle" });
    T(s, "Rules reject any write where trustScore differs from the stored value. Only Cloud Functions, running on the Admin SDK, bypass rules — so trust, status and match scores can only ever come from the server.",
      { x: rx + 0.28, y: 5.52, w: rw - 0.56, h: 0.78, fontSize: 10, color: C.ink2, lineSpacingMultiple: 1.2 });
    s.addNotes("Five rule layers, applied in order. The keeps() helper is the single most important line of defence for server-computed fields.");
  }

  // ─────────────────────────────────────────────── 21 · CLOUD FUNCTIONS
  {
    const s = slide();
    head(s, "03 · ARCHITECTURE", "Cloud Functions — the API surface");
    const fns = [
      ["suggestMatches", "onDocumentWritten", C.mint, C.mintD, "Scores every lost / found pair and writes matchedWith, matchScore and notifications."],
      ["onClaimResolved", "onDocumentWritten", C.mint, C.mintD, "Updates item status and user stats, recomputes trust, notifies the claimant."],
      ["onReviewCreated", "onDocumentCreated", C.mint, C.mintD, "Aggregates the rating average and recomputes the ratee's trust score."],
      ["onFlagCreated", "onDocumentCreated", C.mint, C.mintD, "Increments flagCount and auto-hides the target once the threshold is hit."],
      ["confirmTransaction", "onCall · HTTPS", C.sky, C.skyD, "Two-party handshake — marks the listing sold once both sides have confirmed."],
      ["resolveFlag", "onCall · HTTPS", C.sky, C.skyD, "Closes a flag and optionally applies a strike to the offending user."],
      ["recomputeTrustScore", "onCall · HTTPS", C.sky, C.skyD, "Recalculates trust from ratings, activity, verification, tenure and strikes."],
      ["setUserRole", "onCall · HTTPS", C.sky, C.skyD, "Admin only — sets the Firebase custom claim and the user document role."],
    ];
    const cw = (CW - 3 * 0.28) / 4, chh = 2.12;
    for (let i = 0; i < 8; i++) {
      const [name, trig, bg, fg, desc] = fns[i];
      const x = ML + (i % 4) * (cw + 0.28), y = 1.70 + Math.floor(i / 4) * (chh + 0.22);
      card(s, { x, y, w: cw, h: chh });
      pill(s, x + 0.26, y + 0.26, trig, bg, fg, 8.5, trig.length * 0.072 + 0.30);
      T(s, name, { x: x + 0.26, y: y + 0.74, w: cw - 0.52, h: 0.34, fontSize: 12, bold: true, color: C.ink });
      T(s, desc, { x: x + 0.26, y: y + 1.14, w: cw - 0.52, h: 0.80, fontSize: 9.6, color: C.mute, lineSpacingMultiple: 1.18 });
    }
    card(s, { x: ML, y: 6.38, w: CW, h: 0.60, fill: C.tint, line: "DFD2F2" });
    T(s, "Cloud Functions v2 on Node 22. Trigger functions react to document lifecycle events; onCall functions are invoked directly from the client over HTTPS.",
      { x: ML + 0.40, y: 6.53, w: CW - 0.80, h: 0.32, fontSize: 10.5, color: C.ink2 });
    s.addNotes("Eight functions, split between document triggers and callable RPCs. Everything security-critical lives here rather than in the client.");
  }

  // ─────────────────────────────────────────────── 22 · SCORING
  {
    const s = slide();
    head(s, "03 · ARCHITECTURE", "How matching and trust are scored");
    const lw = 6.30, cy = 1.62, chh = 5.20;
    card(s, { x: ML, y: cy, w: lw, h: chh });
    await chip(s, ML + 0.30, cy + 0.26, 0.44, C.butter, "FiZap", C.butterD);
    T(s, "Match score  (0 – 100)", { x: ML + 0.86, y: cy + 0.32, w: lw - 1.2, h: 0.30, fontSize: 13.5, bold: true, color: C.ink });
    T(s, "functions/src/scoring.js  ·  weight contributed by each factor", { x: ML + 0.30, y: cy + 0.80, w: lw - 0.60, h: 0.26, fontSize: 9.5, color: C.mute });
    s.addChart(P.charts.BAR, [{
      name: "Weight (%)",
      labels: ["Complementarity", "Recency decay", "Zone adjacency", "Keyword overlap", "Category match"],
      values: [10, 10, 20, 30, 30],
    }], {
      x: ML + 0.22, y: cy + 1.14, w: lw - 0.50, h: 2.55,
      barDir: "bar", barGapWidthPct: 55,
      chartColors: ["B9A0DC", "A6D4BC", "F3C09B", "AACDE8", "EBD693"],
      chartColorsOpacity: 100, varyColors: true,
      showLegend: false, showTitle: false,
      showValue: true, dataLabelPosition: "outEnd", dataLabelColor: "4A4360",
      dataLabelFontFace: FF, dataLabelFontSize: 10, dataLabelFormatCode: '0"%"',
      catAxisLabelColor: C.ink2, catAxisLabelFontFace: FF, catAxisLabelFontSize: 10,
      valAxisHidden: true, valAxisMaxVal: 36,
      valGridLine: { style: "none" }, catGridLine: { style: "none" },
      catAxisLineShow: false, valAxisLineShow: false,
      plotArea: { fill: { color: C.paper } }, chartArea: { fill: { color: C.paper } },
    });
    s.addShape(S.ROUNDED_RECTANGLE, { x: ML + 0.30, y: cy + 3.90, w: lw - 0.60, h: 0.42, rectRadius: 0.08, fill: { color: "F3EEFB" }, line: { color: "E7DEF6" } });
    T(s, "matchScore = category + keywords + zone + recency + complementarity", { x: ML + 0.44, y: cy + 3.90, w: lw - 0.88, h: 0.42, fontSize: 10, bold: true, color: C.primary, valign: "middle" });
    T(s, "Keyword overlap is a Jaccard coefficient over the tokenised title and description; zone uses an adjacency matrix; recency decays exponentially over seven days; complementarity checks that one report is lost and the other found.",
      { x: ML + 0.30, y: cy + 4.44, w: lw - 0.60, h: 0.66, fontSize: 9.8, color: C.ink2, lineSpacingMultiple: 1.2 });

    const rx = ML + lw + 0.34, rw = MR - rx;
    card(s, { x: rx, y: cy, w: rw, h: chh });
    await chip(s, rx + 0.30, cy + 0.26, 0.44, C.mint, "FiAward", C.mintD);
    T(s, "Trust score  (0 – 100)", { x: rx + 0.86, y: cy + 0.32, w: rw - 1.2, h: 0.30, fontSize: 13.5, bold: true, color: C.ink });
    T(s, "Bayesian-damped, computed only in Cloud Functions", { x: rx + 0.30, y: cy + 0.80, w: rw - 0.60, h: 0.26, fontSize: 9.5, color: C.mute });
    const comps = [
      ["Baseline", "50", "Every new account starts here.", C.lav, C.lavD],
      ["Ratings", "±40", "(avg − 3) × count / (count + 5) × 40", C.mint, C.mintD],
      ["Activity", "+25", "log₂(resolved + 1) × 5, capped", C.sky, C.skyD],
      ["Verification", "+10", "A verified campus email address", C.butter, C.butterD],
      ["Responsiveness", "+10", "Derived from the chat response rate", C.peach, C.peachD],
      ["Tenure", "+5", "Log of days since joining", C.lav, C.lavD],
      ["Strikes", "−15", "Subtracted for each moderator strike", C.rose, C.roseD],
    ];
    comps.forEach(([n, v, d, bg, fg], i) => {
      const y = cy + 1.18 + i * 0.48;
      s.addShape(S.ROUNDED_RECTANGLE, { x: rx + 0.26, y, w: rw - 0.52, h: 0.46, rectRadius: 0.08, fill: { color: i % 2 ? C.white : "F8F5FD" }, line: { color: i % 2 ? C.white : "F8F5FD" } });
      pill(s, rx + 0.38, y + 0.08, v, bg, fg, 9, 0.62);
      T(s, n, { x: rx + 1.10, y, w: 1.40, h: 0.46, fontSize: 10.2, bold: true, color: C.ink, valign: "middle" });
      T(s, d, { x: rx + 2.52, y, w: rw - 2.80, h: 0.46, fontSize: 9.4, color: C.ink2, valign: "middle" });
    });
    T(s, "Damping is the point: one five-star review cannot outweigh a long record, and the client can never write the result.",
      { x: rx + 0.30, y: cy + 4.68, w: rw - 0.60, h: 0.46, fontSize: 9.8, italic: true, color: C.mute, lineSpacingMultiple: 1.2 });
    s.addNotes("Two scoring algorithms, both server-side. Match score is a weighted sum; trust is Bayesian-damped so a small number of ratings cannot swing it.");
  }

  // ─────────────────────────────────────────────── 23 · DEPLOYMENT
  {
    const s = slide();
    head(s, "03 · ARCHITECTURE", "Environments and delivery");
    const envs = [
      ["FiCpu", C.lav, C.lavD, "Local development", "Firebase Emulator Suite", "auth 9099 · firestore 8080 · functions 5001 · storage 9199. A production build never connects to an emulator."],
      ["FiGitBranch", C.mint, C.mintD, "Preview", "Vercel preview per pull request", "Every PR gets its own URL against a Firebase staging project, so reviewers click before merging."],
      ["FiCloud", C.peach, C.peachD, "Production", "Vercel CDN + Firebase backend", "web/dist served globally as an SPA with rewrites; Firebase carries auth, data, storage and functions."],
    ];
    const cw = (CW - 2 * 0.28) / 3;
    for (let i = 0; i < 3; i++) {
      const [ic, bg, fg, name, sub, desc] = envs[i];
      const x = ML + i * (cw + 0.28);
      card(s, { x, y: 1.68, w: cw, h: 1.98 });
      await chip(s, x + 0.28, 1.68 + 0.24, 0.46, bg, ic, fg);
      T(s, name, { x: x + 0.86, y: 1.68 + 0.26, w: cw - 1.14, h: 0.28, fontSize: 12.5, bold: true, color: C.ink });
      T(s, sub, { x: x + 0.86, y: 1.68 + 0.54, w: cw - 1.14, h: 0.24, fontSize: 9.2, bold: true, color: fg });
      T(s, desc, { x: x + 0.28, y: 1.68 + 0.96, w: cw - 0.56, h: 0.86, fontSize: 9.8, color: C.ink2, lineSpacingMultiple: 1.2 });
    }
    card(s, { x: ML, y: 3.88, w: CW, h: 1.60 });
    T(s, "PIPELINE", { x: ML + 0.34, y: 4.10, w: 2, h: 0.24, fontSize: 9, bold: true, color: C.primary, charSpacing: 1.6 });
    const steps = ["git push", "Vercel build — npm run build", "web/dist SPA with rewrites", "Preview on PR, production on merge"];
    let sx = ML + 0.34;
    steps.forEach((st, i) => {
      const w = 0.40 + st.length * 0.082;
      s.addShape(S.ROUNDED_RECTANGLE, { x: sx, y: 4.46, w, h: 0.44, rectRadius: 0.22, fill: { color: C.sky }, line: { color: C.sky } });
      T(s, st, { x: sx, y: 4.46, w, h: 0.44, fontSize: 10, bold: true, color: C.skyD, align: "center", valign: "middle" });
      sx += w;
      if (i < steps.length - 1) { arrowR(s, sx + 0.08, 4.60, 0.24); sx += 0.40; }
    });
    T(s, "Firebase backend ships separately:   firebase deploy --only firestore:rules,functions,storage",
      { x: ML + 0.34, y: 5.02, w: CW - 0.68, h: 0.30, fontSize: 10, color: C.mute });
    card(s, { x: ML, y: 5.68, w: CW, h: 1.20 });
    const infra = [
      ["FiMonitor", C.sky, C.skyD, "Vercel", "CDN · web/dist"],
      ["FiServer", C.mint, C.mintD, "Firebase", "Auth · Firestore · Storage · Functions"],
      ["FiGlobe", C.peach, C.peachD, "External", "Gemini 1.5 Flash · OpenMeteo"],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, bg, fg, n, d] = infra[i];
      const w = (CW - 0.68 - 2 * 0.70) / 3;
      const x = ML + 0.34 + i * (w + 0.70);
      s.addShape(S.ROUNDED_RECTANGLE, { x, y: 5.92, w, h: 0.72, rectRadius: 0.10, fill: { color: bg }, line: { color: bg } });
      await chip(s, x + 0.18, 6.06, 0.44, C.white, ic, fg);
      T(s, n, { x: x + 0.74, y: 6.02, w: w - 0.9, h: 0.26, fontSize: 11.5, bold: true, color: C.ink });
      T(s, d, { x: x + 0.74, y: 6.28, w: w - 0.9, h: 0.24, fontSize: 9, color: C.ink2 });
      if (i < 2) arrowR(s, x + w + 0.22, 6.20, 0.26);
    }
    s.addNotes("Two deployment targets — Vercel for the frontend, Firebase for everything server-side. The trade-off we accepted for per-PR previews.");
  }

  // ─────────────────────────────────────────────── 24 · TEAM
  {
    const s = slide();
    head(s, "04 · TEAM", "Who built what");
    const team = [
      ["NR", C.lav, C.lavD, "Nidhi Rakesh", "2024BCD0006", "Team Lead & Backend", "Data model, Cloud Functions, the smart-matching logic, integration and version control."],
      ["SP", C.mint, C.mintD, "Shenza P M", "2024BCD0002", "Frontend & UI/UX", "React frontend, responsive layouts, listing pages, the search UI and animation."],
      ["MS", C.peach, C.peachD, "Muhammed Shanid", "2024BCD0034", "Auth & Admin", "Authentication, role-based access, the moderation flow and the admin dashboard."],
      ["HM", C.sky, C.skyD, "Hadi M", "2024BCD0058", "Marketplace & DevOps", "Marketplace module, in-app chat, notifications, deployment, testing and documentation."],
    ];
    const cw = (CW - 3 * 0.28) / 4;
    for (let i = 0; i < 4; i++) {
      const [ini, bg, fg, name, roll, role, resp] = team[i];
      const x = ML + i * (cw + 0.28);
      card(s, { x, y: 1.72, w: cw, h: 3.52 });
      s.addShape(S.OVAL, { x: x + 0.30, y: 1.72 + 0.32, w: 0.86, h: 0.86, fill: { color: bg }, line: { color: bg } });
      T(s, ini, { x: x + 0.30, y: 1.72 + 0.32, w: 0.86, h: 0.86, fontSize: 21, bold: true, color: fg, align: "center", valign: "middle" });
      T(s, name, { x: x + 0.30, y: 1.72 + 1.34, w: cw - 0.60, h: 0.34, fontSize: 13.5, bold: true, color: C.ink });
      T(s, roll, { x: x + 0.30, y: 1.72 + 1.68, w: cw - 0.60, h: 0.24, fontSize: 9.5, color: C.mute });
      pill(s, x + 0.30, 1.72 + 2.00, role, bg, fg, 9, Math.min(cw - 0.60, 0.34 + role.length * 0.078));
      T(s, resp, { x: x + 0.30, y: 1.72 + 2.48, w: cw - 0.60, h: 0.84, fontSize: 10, color: C.ink2, lineSpacingMultiple: 1.2 });
    }
    card(s, { x: ML, y: 5.46, w: CW, h: 1.22, fill: C.tint, line: "DFD2F2" });
    T(s, "METHODOLOGY", { x: ML + 0.40, y: 5.68, w: 3, h: 0.24, fontSize: 9, bold: true, color: C.primary, charSpacing: 1.6 });
    T(s, "Iterative and module-based. Week one fixed the data model and the function contract together; after that each member owned a vertical slice — frontend plus data — with shared components built first. Git and GitHub throughout, integrating continuously rather than merging once at the end.",
      { x: ML + 0.40, y: 5.96, w: CW - 0.80, h: 0.60, fontSize: 11, color: C.ink2, lineSpacingMultiple: 1.2 });
    s.addNotes("Four members, four vertical slices, one shared contract agreed in week one — which is why integration was continuous rather than a final merge.");
  }

  // ─────────────────────────────────────────────── 25 · OUTCOME
  {
    const s = slide(C.soft);
    s.addShape(S.OVAL, { x: 10.55, y: -1.7, w: 4.6, h: 4.6, fill: { color: C.lav }, line: { color: C.lav } });
    s.addShape(S.OVAL, { x: 12.25, y: 5.6, w: 2.1, h: 2.1, fill: { color: C.mint }, line: { color: C.mint } });
    s.addShape(S.OVAL, { x: -1.55, y: 6.05, w: 2.1, h: 2.1, fill: { color: C.peach }, line: { color: C.peach } });
    T(s, "05 · OUTCOME", { x: ML, y: 1.02, w: CW, h: 0.26, fontSize: 10, bold: true, color: C.primary, charSpacing: 2.4 });
    T(s, "A working platform, not a prototype", { x: ML, y: 1.32, w: 9.4, h: 0.68, fontSize: 32, bold: true, color: C.ink });
    T(s, "Verified students can recover lost items and trade second-hand goods inside their own campus — backed by search, smart matching, in-app chat, server-side trust scoring and community moderation. One trusted platform replaces the scattered WhatsApp groups and notice boards, and it demonstrates a complete full-stack system: authentication, real-time data, role-based access and a clean, mobile-friendly interface.",
      { x: ML, y: 2.20, w: 8.9, h: 1.55, fontSize: 13.5, color: C.ink2, lineSpacingMultiple: 1.35 });
    const wins = [
      ["FiRefreshCw", C.lav, C.lavD, "Real-time feed"],
      ["FiShield", C.mint, C.mintD, "Server-side trust"],
      ["FiCheckSquare", C.peach, C.peachD, "Two-party handshake"],
      ["FiFlag", C.sky, C.skyD, "Community flagging"],
    ];
    for (let i = 0; i < 4; i++) {
      const [ic, bg, fg, label] = wins[i];
      const w = 2.86, x = ML + i * (w + 0.22);
      card(s, { x, y: 4.06, w, h: 0.92, fill: C.white });
      await chip(s, x + 0.24, 4.30, 0.44, bg, ic, fg);
      T(s, label, { x: x + 0.82, y: 4.06, w: w - 1.0, h: 0.92, fontSize: 11.5, bold: true, color: C.ink, valign: "middle" });
    }
    T(s, "Lost, found, and sold — all on campus.", { x: ML, y: 5.42, w: 9, h: 0.5, fontSize: 24, italic: true, bold: true, color: C.primary });
    T(s, "Thank you", { x: ML, y: 6.08, w: 5, h: 0.44, fontSize: 17, bold: true, color: C.ink });
    T(s, "Nidhi Rakesh  ·  Shenza P M  ·  Muhammed Shanid  ·  Hadi M      |      IIIT Kottayam  ·  September 2026",
      { x: ML, y: 6.56, w: 10.6, h: 0.3, fontSize: 10.5, color: C.mute });
    s.addNotes("Close on the outcome, then open the floor. Be ready for questions on CQRS, the keeps() rule helper and the two scoring algorithms.");
  }

  await P.writeFile({ fileName: OUT });
  console.log("wrote", OUT);
}

build().catch((e) => { console.error(e); process.exit(1); });
