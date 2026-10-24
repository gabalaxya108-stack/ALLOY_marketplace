// src/data/connectionsData.js
// Centralized state definitions for brand-creator invitations, opportunities, connections, and clean messaging

export const INITIAL_CONNECTIONS = [
  {
    id: "conn-maya-skincare",
    creatorId: "maya-chen",
    creatorName: "Maya Sharma",
    creatorRole: "Cinematic AI Director & Visual Worldbuilder",
    creatorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    creatorVisual: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=85",
    campaignId: "camp-summer-skincare",
    campaignTitle: "Summer Skincare & Radiant Hydration Launch",
    brandName: "Veda Botanics",
    status: "connected", // 'invited' | 'connected' | 'passed'
    createdAt: "2 days ago",
    connectedAt: "Yesterday",
    messages: [
      {
        id: "msg-1",
        sender: "brand",
        senderName: "Veda Botanics",
        text: "Hi Maya, we loved your cinematic product work. We'd love to explore this direction for our summer launch.",
        timestamp: "Yesterday, 3:45 PM"
      },
      {
        id: "msg-2",
        sender: "creator",
        senderName: "Maya Sharma",
        text: "Thanks! I'd love to work on it. I'm especially interested in the visual storytelling direction and warm Ayurvedic botanical lighting.",
        timestamp: "Today, 10:15 AM"
      }
    ]
  },
  {
    id: "conn-elena-skincare",
    creatorId: "elena-rostova",
    creatorName: "Ananya Roy",
    creatorRole: "AI Fashion Director & Haute Couture Stylist",
    creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    creatorVisual: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
    campaignId: "camp-summer-skincare",
    campaignTitle: "Summer Skincare & Radiant Hydration Launch",
    brandName: "Veda Botanics",
    status: "connected",
    createdAt: "1 day ago",
    connectedAt: "Today",
    messages: [
      {
        id: "msg-elena-1",
        sender: "brand",
        senderName: "Veda Botanics",
        text: "Ananya, your neoclassical silk and light work is breathtaking. We want that exact organic fluid elegance for our hydration serum key art.",
        timestamp: "Yesterday, 5:20 PM"
      },
      {
        id: "msg-elena-2",
        sender: "creator",
        senderName: "Ananya Roy",
        text: "Thank you! I envision translucent raw organza caustics floating through sunlit water droplets. Let's make it extraordinary.",
        timestamp: "Today, 11:30 AM"
      }
    ]
  }
];

export const INITIAL_CREATOR_OPPORTUNITIES = [
  {
    id: "opp-summer-skincare",
    campaignId: "camp-summer-skincare",
    brand: "Veda Botanics",
    title: "Summer Skincare & Radiant Hydration Launch",
    budget: "₹50,000 – ₹1,00,000",
    timeline: "2–3 Weeks",
    creativeDirection: "Warm, human product storytelling with clean sunlit morning tones, radiant skin micro-textures, and macro water droplets.",
    requirements: [
      "4K Hero Key Campaign Stills for digital & OOH",
      "Short-form 9:16 vertical motion loops for Instagram",
      "Organic fluid viscosity and hydration surface tests"
    ],
    whyItFits: "Strong creative fit — Your cinematic product work aligns closely with this campaign.",
    status: "new" // 'new' | 'interested' | 'connected' | 'passed'
  },
  {
    id: "opp-vanguard-horology",
    campaignId: "camp-vanguard-chrono",
    brand: "Kailash Horology",
    title: "Titanium Kinetic Chrono Motion Series",
    budget: "₹1,00,000 – ₹1,50,000",
    timeline: "3 Weeks",
    creativeDirection: "Micro-machining exploded views, suspended titanium escapements, and minimal studio lighting.",
    requirements: [
      "Macro 3D motion passes of internal gear mechanisms",
      "Zero-gravity levitation teaser loop (15s)",
      "High-contrast monochromatic key visuals"
    ],
    whyItFits: "Strong match because your capabilities include commercial CGI simulation and precision product aesthetics.",
    status: "new"
  },
  {
    id: "opp-solis-botanicals",
    campaignId: "camp-solis-fragrance",
    brand: "Solis Atelier",
    title: "Solar Amber Eau de Parfum Stills",
    budget: "₹65,000 – ₹90,000",
    timeline: "2 Weeks",
    creativeDirection: "Luminous amber flacon resting on warm stone, catching golden hour solar flares and dry botanical wisps.",
    requirements: [
      "Refractive flacon glass caustics under sunset backlight",
      "Editorial print spread compositions",
      "Ethereal slow-motion mist reveal"
    ],
    whyItFits: "High aesthetic resonance with your tactile materials, warm solar palette, and luxury editorial direction.",
    status: "new"
  }
];

export const INITIAL_CREATOR_INVITATIONS = [
  {
    id: "inv-lumina-01",
    campaignId: "camp-summer-skincare",
    campaignTitle: "Summer Skincare & Radiant Hydration Launch",
    brand: "Veda Botanics",
    brandName: "Veda Botanics",
    brandAvatar: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=120&q=80",
    title: "Summer Skincare & Radiant Hydration Launch",
    budget: "₹75,000",
    timeline: "3 Weeks (Starts Nov 1)",
    deliverables: "3x 4K Hero Key Visuals + 2x 9:16 Vertical Kinetic Loops",
    summary: "Direct invitation from Veda Creative Director: We loved your cinematic lighting and macro fluid experiments. We'd love to commission key art for our upcoming barrier serum launch.",
    status: "pending", // 'pending' | 'accepted' | 'declined'
    createdAt: "Yesterday"
  },
  {
    id: "inv-vanguard-02",
    campaignId: "camp-vanguard-chrono",
    campaignTitle: "Titanium Kinetic Chrono Motion Series",
    brand: "Kailash Horology",
    brandName: "Kailash Horology",
    brandAvatar: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=120&q=80",
    title: "Titanium Kinetic Chrono Motion Series",
    budget: "₹1,20,000",
    timeline: "4 Weeks (Starts Nov 15)",
    deliverables: "1x 45s Anamorphic Teaser + 6x High-Contrast 3D Stills",
    summary: "Direct brief: Suspended titanium escapement passes and exploded mechanical views for global digital campaign.",
    status: "pending",
    createdAt: "3 days ago"
  }
];

export const INITIAL_CREATOR_PROJECTS = [
  {
    id: "proj-lumina-active",
    campaignId: "camp-summer-skincare",
    campaignTitle: "Summer Skincare & Radiant Hydration Launch",
    brandName: "Veda Botanics",
    brandContact: "Sunita Rao (Creative Director)",
    status: "in-progress", // 'invited' | 'accepted' | 'in-progress' | 'submitted' | 'revision-requested' | 'approved' | 'completed'
    progressPercent: 65,
    milestone: "Milestone 2 of 3: Refined 4K Color Grading",
    deadline: "Nov 12, 2026",
    agreedBudget: "₹75,000",
    deliverablesScope: "Key Campaign Stills (4K) & Kinetic Loops",
    latestFeedback: "“The droplet caustics in render 3 are breathtaking. Can we warm the ambient lighting slightly towards 3200K?”",
    submissionUrl: "",
    submissionNotes: ""
  },
  {
    id: "proj-nomad-completed",
    campaignId: "camp-aether-nomad",
    campaignTitle: "AETHER Nomad 28L Campus Series",
    brandName: "Aether Carry Goods",
    brandContact: "Manish Verma (Brand Lead)",
    status: "approved",
    progressPercent: 100,
    milestone: "Final Milestone: All Master Assets Approved",
    deadline: "Completed",
    agreedBudget: "₹90,000",
    deliverablesScope: "60s Brand Film + 8 Narrative Stills",
    latestFeedback: "“Outstanding work. Approved and released final milestone payout. Thank you Maya!”",
    submissionUrl: "https://creasync.storage/aether-nomad-final-masters.zip",
    submissionNotes: "Delivered 4K ProRes 422 HQ + uncompressed 16-bit TIFF stills."
  }
];
