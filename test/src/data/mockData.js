export const INITIAL_ITEMS = [
  {
    id: "item-1",
    type: "lost", // lost | found | marketplace
    title: "Blue Stainless Hydro Flask (32oz)",
    category: "Accessories",
    location: "Main Central Library - 2nd Floor",
    date: "2 hours ago",
    description: "Dark blue Hydro Flask water bottle with stickers (GitHub, React, and NIT logo). Left near study desk #14.",
    image: "/images/bottle.png",
    reporter: "Nidhi Rakesh (CS Dept)",
    contact: "nidhi@campus.edu",
    status: "Active",
    matchCandidateId: "item-2",
    matchScore: 94,
    tags: ["Water Bottle", "HydroFlask", "Library"]
  },
  {
    id: "item-2",
    type: "found",
    title: "Blue Metal Water Bottle with Stickers",
    category: "Accessories",
    location: "Library Front Desk / Security",
    date: "30 mins ago",
    description: "Found blue insulated water bottle with tech stickers on the 2nd floor desk. Handed over to security desk.",
    image: "/images/bottle.png",
    reporter: "Shenza K. (EC Dept)",
    contact: "shenza@campus.edu",
    status: "Active",
    matchCandidateId: "item-1",
    matchScore: 94,
    tags: ["Water Bottle", "Library", "Stickers"]
  },
  {
    id: "item-3",
    type: "found",
    title: "Casio fx-991EX Scientific Calculator",
    category: "Electronics",
    location: "LH-102 Lecture Hall",
    date: "Yesterday",
    description: "Black and silver Casio scientific calculator with name 'Rohan' written on back cover in marker.",
    image: "/images/calculator.png",
    reporter: "Shanid P. (Mech Dept)",
    contact: "shanid@campus.edu",
    status: "Active",
    matchCandidateId: null,
    matchScore: null,
    tags: ["Calculator", "Casio", "LH-102"]
  },
  {
    id: "item-4",
    type: "marketplace",
    title: "Trek FX 2 Hybrid Campus Bicycle",
    category: "Vehicles & Cycles",
    price: 3200,
    listingType: "Sell", // Sell | Rent | Giveaway
    condition: "Good Condition",
    location: "PG Hostel 3 Bike Stand",
    date: "1 day ago",
    description: "21-speed hybrid bicycle, smooth gear shifting, fitted with LED headlight and heavy lock. Perfect for campus commuting.",
    image: "/images/bicycle.png",
    reporter: "Hadi M. (Civil Dept)",
    contact: "hadi@campus.edu",
    status: "Available",
    rating: 4.9,
    tags: ["Bicycle", "Hostel 3", "Commute"]
  },
  {
    id: "item-5",
    type: "marketplace",
    title: "Engineering Mathematics IV Textbook (Erwin Kreyszig)",
    category: "Books & Notes",
    price: 350,
    listingType: "Sell",
    condition: "Like New",
    location: "Academic Hub Canteen",
    date: "3 hours ago",
    description: "10th edition, no highlighted marks inside, includes formulas quick reference chart.",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
    reporter: "Ananya V. (EEE Dept)",
    contact: "ananya@campus.edu",
    status: "Available",
    rating: 4.8,
    tags: ["Books", "Math", "Kreyszig"]
  },
  {
    id: "item-6",
    type: "lost",
    title: "Campus RFID Identity Card (Nidhi R.)",
    category: "ID & Cards",
    location: "Central Mess Annex",
    date: "4 hours ago",
    description: "Student ID card in transparent lanyard badge. Crucial for library & mess entry!",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
    reporter: "Nidhi Rakesh",
    contact: "nidhi@campus.edu",
    status: "Active",
    matchCandidateId: null,
    matchScore: null,
    tags: ["ID Card", "Lanyard", "Mess"]
  }
];

export const CAMPUS_LOCATIONS = [
  "All Campus Locations",
  "Main Central Library",
  "LH Lecture Halls (101-205)",
  "Central Mess & Canteen",
  "Hostel Complex (A-F & PG)",
  "Sports Complex & Field",
  "Innovation & Computer Lab"
];

export const CATEGORIES = [
  "All Categories",
  "Electronics",
  "ID & Cards",
  "Accessories",
  "Books & Notes",
  "Vehicles & Cycles",
  "Clothing & Gear"
];

export const MOCK_CHATS = [
  {
    id: "chat-1",
    itemId: "item-1",
    itemTitle: "Blue Stainless Hydro Flask (32oz)",
    withUser: "Shenza K.",
    userAvatar: "S",
    unread: true,
    messages: [
      { id: 1, sender: "them", text: "Hey! I think I found your Hydro Flask at the library 2nd floor desk!", time: "11:30 AM" },
      { id: 2, sender: "me", text: "Oh wow, amazing! Does it have the GitHub & React stickers on it?", time: "11:32 AM" },
      { id: 3, sender: "them", text: "Yes it does! I handed it over to the Library Security Desk. You can collect it anytime with your ID.", time: "11:34 AM" }
    ]
  },
  {
    id: "chat-2",
    itemId: "item-4",
    itemTitle: "Trek FX 2 Hybrid Campus Bicycle",
    withUser: "Hadi M.",
    userAvatar: "H",
    unread: false,
    messages: [
      { id: 1, sender: "me", text: "Hi Hadi, is the Trek FX 2 bicycle still available for buy?", time: "Yesterday" },
      { id: 2, sender: "them", text: "Yes it is! Can meet at PG Hostel 3 after 5 PM for a test ride.", time: "Yesterday" }
    ]
  }
];

export const ADMIN_FLAGS = [
  {
    id: "flag-1",
    itemTitle: "Suspicious Electronics Listing",
    reason: "Unverified price & duplicate image post",
    reportedBy: "Alex (Student Mod)",
    date: "10 mins ago",
    status: "Pending Review"
  },
  {
    id: "flag-2",
    itemTitle: "Hostel Key Found",
    reason: "Room number visible in photo (Privacy Concern)",
    reportedBy: "System Auto-Mod",
    date: "1 hour ago",
    status: "Blurred Automatically"
  }
];
