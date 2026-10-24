// src/data/creatorsData.js
// Complete Curated & Community AI Creator Roster for Alloy
// 43 Creators across 9 specialties with 100% unique, non-repeating portfolio pieces

export const CATEGORIES = [
  {
    "id": "all",
    "name": "All",
    "count": 43
  },
  {
    "id": "fashion",
    "name": "Fashion",
    "count": 17
  },
  {
    "id": "product-visuals",
    "name": "Product Visuals",
    "count": 13
  },
  {
    "id": "ai-video",
    "name": "AI Video",
    "count": 19
  },
  {
    "id": "3d",
    "name": "3D",
    "count": 14
  },
  {
    "id": "ai-photography",
    "name": "AI Photography",
    "count": 18
  },
  {
    "id": "advertising",
    "name": "Advertising",
    "count": 29
  },
  {
    "id": "characters",
    "name": "Characters",
    "count": 5
  },
  {
    "id": "social-content",
    "name": "Social Content",
    "count": 8
  },
  {
    "id": "creative-direction",
    "name": "Creative Direction",
    "count": 26
  }
];

export const FILTER_OPTIONS = {
  types: [
    "All Types",
    "AI Video",
    "AI Photography",
    "Motion & Animation",
    "Spatial & 3D Renders",
    "Brand Key Art"
  ],
  industries: [
    "All Industries",
    "Luxury & High Fashion",
    "Beauty & Skincare",
    "Consumer Tech & Hardware",
    "Beverage & Spirits",
    "Architecture & Hospitality",
    "Food & Beverage",
    "Entertainment & Music"
  ],
  styles: [
    "All Styles",
    "Cinematic",
    "Editorial",
    "Minimal",
    "Surreal",
    "Luxury",
    "Photorealistic",
    "Playful"
  ],
  availability: [
    "All Availability",
    "Available for projects",
    "Booking for Q4",
    "Open to opportunities"
  ]
};

export const CREATORS = [
  {
    "id": "maya-chen",
    "userId": null,
    "name": "Maya Chen",
    "handle": "@mayachen.ai",
    "creativeIdentity": "Cinematic AI Director & Visual Worldbuilder",
    "specialty": "AI Video",
    "categoryTags": [
      "ai-video",
      "creative-direction",
      "advertising",
      "fashion"
    ],
    "location": "London / Tokyo (GMT/JST)",
    "availability": "Available for projects",
    "statusBadge": "Top Rated",
    "heroWork": "/portfolios/maya-chen-portfolio.jpg",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Directing high-concept generative cinematic universes, atmospheric luxury commercials, and speculative architectural visions. Seamlessly blending Sora, Kling, and Runway Gen-3 with editorial color grading.",
    "styles": [
      "Cinematic",
      "Editorial",
      "Story-driven",
      "Luxury"
    ],
    "industries": [
      "Luxury & High Fashion",
      "Consumer Tech & Hardware",
      "Entertainment & Music"
    ],
    "capabilities": [
      "AI Video",
      "Visual Storytelling",
      "Product Campaigns",
      "Atmospheric Advertising",
      "Creative Direction"
    ],
    "tools": [
      "Sora",
      "Kling 1.5",
      "Runway Gen-3",
      "Midjourney v6.1",
      "DaVinci Resolve"
    ],
    "platforms": [
      "Vimeo",
      "YouTube",
      "Instagram"
    ],
    "experience": "4+ years generative AI",
    "turnaround": "4-7 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "maya-proj-1",
        "title": "Echoes of the Solarium — Mid-Century Brand Odyssey",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "/portfolios/maya-chen-portfolio.jpg",
        "video": null,
        "description": "A 60-second speculative luxury commercial featuring mid-century brutalist conservatories and kinetic light-play.",
        "creativeDirection": "Volumetric sunlight shafts, dusty particulate caustics, and slow anamorphic panning shots.",
        "capabilities": [
          "Anamorphic Stills",
          "Prompt Architecture",
          "Commercial Campaign"
        ],
        "clientType": "Luxury Watch Maison",
        "creativeStyle": "Cinematic / Minimal",
        "tools": [
          "Kling 1.5",
          "Midjourney v6.1",
          "DaVinci Resolve"
        ],
        "featured": true
      },
      {
        "id": "maya-proj-2",
        "title": "Neon Monsoon — Neo-Tokyo Nocturne",
        "category": "AI Video",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Atmospheric street cinematography and fluid motion stills capturing rain-drenched neon reflections in an evocative cyber-noir setting.",
        "creativeDirection": "Reflective asphalt caustics, soft sodium vapor glow, and melancholic anamorphic flares.",
        "capabilities": [
          "Short-Form Video",
          "Color Grading",
          "Atmospheric Stills"
        ],
        "clientType": "Global Streaming Teaser",
        "creativeStyle": "Cinematic / Surreal",
        "tools": [
          "Runway Gen-3",
          "Midjourney v6"
        ],
        "featured": false
      },
      {
        "id": "maya-proj-3",
        "title": "Kyoto Dawn Mist — Botanical Tea Ceremony",
        "category": "Advertising",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Sensory slow-motion tea leaves unraveling in hot spring water within a mist-shrouded cedar pavilion in Arashiyama.",
        "creativeDirection": "Subtle micro-steam turbulence, natural dawn sunlight, and organic stone textures.",
        "capabilities": [
          "Sensory Macro",
          "Fluid Motion",
          "Commercial Key Art"
        ],
        "clientType": "Artisanal Beverage Brand",
        "creativeStyle": "Editorial / Minimal",
        "tools": [
          "Midjourney v6.1",
          "Topaz Video AI"
        ],
        "featured": false
      },
      {
        "id": "maya-proj-4",
        "title": "Orbital Solitude — Deep Space Key Art",
        "category": "AI Video",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Key art teaser exploring zero-gravity orbital stations bathed in earth-rise corona light.",
        "creativeDirection": "Photorealistic earth horizon curvature and cold reflective solar panel gold foils.",
        "capabilities": [
          "CGI Simulation",
          "Key Art",
          "Worldbuilding"
        ],
        "clientType": "Sci-Fi Game Franchise",
        "creativeStyle": "Cinematic / Surreal",
        "tools": [
          "Kling 1.5",
          "Sora"
        ],
        "featured": false
      },
      {
        "id": "maya-proj-5",
        "title": "Terra Lumina — Tactile Ceramic Sculpture",
        "category": "Product Visuals",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Handcrafted earthenware vases highlighted by raking Mediterranean afternoon sunlight, revealing clay grain and mineral glaze.",
        "creativeDirection": "High-contrast golden raking light and organic surface imperfections.",
        "capabilities": [
          "Material Texturing",
          "Editorial Stills"
        ],
        "clientType": "Contemporary Design Studio",
        "creativeStyle": "Minimal / Editorial",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      },
      {
        "id": "maya-proj-6",
        "title": "Mirage 35mm — Desert Highway Luxury Drive",
        "category": "Advertising",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "A sun-bleached editorial campaign capturing a vintage coupe cruising through golden canyon mirages.",
        "creativeDirection": "Heat shimmer refraction, saturated Kodak Portra film palette, and retro luxury styling.",
        "capabilities": [
          "Automotive Editorial",
          "Cinematic Stills"
        ],
        "clientType": "Luxury Travel Goods",
        "creativeStyle": "Cinematic / Story-driven",
        "tools": [
          "Flux.1 Pro",
          "Premiere Pro"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "alex-rivera",
    "userId": null,
    "name": "Alex Rivera",
    "handle": "@alexrivera.3d",
    "creativeIdentity": "AI Product Advertiser & 3D Spatial Technologist",
    "specialty": "Product Visuals",
    "categoryTags": [
      "product-visuals",
      "3d",
      "advertising",
      "ai-video"
    ],
    "location": "Stockholm / San Francisco (CET/PST)",
    "availability": "Available for projects",
    "statusBadge": "Available now",
    "heroWork": "/portfolios/alex-rivera-portfolio.jpg",
    "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    "bio": "Pioneering product advertising for next-generation hardware, precision horology, and consumer tech. Sculpting crisp, hyper-real 3D worlds, impossible micro-mechanics, and pristine studio lighting with generative workflows.",
    "styles": [
      "Product-focused",
      "3D",
      "Minimal",
      "Commercial",
      "Technology"
    ],
    "industries": [
      "Consumer Tech & Hardware",
      "Beverage & Spirits",
      "Automotive"
    ],
    "capabilities": [
      "3D Product Visualization",
      "Micro-Machining Animation",
      "Industrial Design",
      "Fluid Dynamics",
      "Commercial CGI"
    ],
    "tools": [
      "Cinema 4D",
      "Kling 1.5",
      "Runway Gen-3",
      "Midjourney v6.1",
      "Octane Render"
    ],
    "platforms": [
      "YouTube Shorts",
      "Vimeo",
      "Instagram"
    ],
    "experience": "3.5 years 3D & AI",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "alex-proj-1",
        "title": "Chronos Titanium — Kinetic Micro-Machining",
        "category": "Product Visuals",
        "aspect": "landscape",
        "image": "/portfolios/alex-rivera-portfolio.jpg",
        "video": null,
        "description": "Exploded view visualization of a conceptual titanium tourbillon mechanism showing gear interlock and sapphire crystal caustics.",
        "creativeDirection": "High-key studio contrast, hairline titanium brushing, and precise micro-depth of field.",
        "capabilities": [
          "3D CAD Translation",
          "Macro Animation",
          "Raytraced Caustics"
        ],
        "clientType": "Independent Watchmaker",
        "creativeStyle": "Product-focused / Minimal",
        "tools": [
          "Cinema 4D",
          "Octane Render",
          "Midjourney v6"
        ],
        "featured": true
      },
      {
        "id": "alex-proj-2",
        "title": "Aura Polaroid 600 — Analog Revival",
        "category": "Product Visuals",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "A tactile industrial design showcase celebrating matte molded plastics, tactile rubber switches, and pastel optical viewfinders.",
        "creativeDirection": "Soft diffuse studio skylight, pastel surface hues, and crisp edge highlights.",
        "capabilities": [
          "Industrial Design",
          "Texture Mapping"
        ],
        "clientType": "Consumer Electronics Brand",
        "creativeStyle": "Minimal / Product-focused",
        "tools": [
          "Cinema 4D",
          "Kling 1.5"
        ],
        "featured": false
      },
      {
        "id": "alex-proj-3",
        "title": "Apex Horizon — Smartwatch Sensor Core",
        "category": "Product Visuals",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Dynamic product rendering highlighting optical biosensor diodes and ceramic bezel finishes under moving LED ring illumination.",
        "creativeDirection": "Circular optical caustics, pitch-black infinity backdrop, and razor-sharp OLED graphics.",
        "capabilities": [
          "Sensor Visualization",
          "High-Precision Lighting"
        ],
        "clientType": "Wearable Tech Startup",
        "creativeStyle": "Technology / Commercial",
        "tools": [
          "Octane",
          "Midjourney v6.1"
        ],
        "featured": false
      },
      {
        "id": "alex-proj-4",
        "title": "Symphony Wireless — Acoustic Chamber Acoustics",
        "category": "Product Visuals",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Floating acoustic diaphragm visualization showing gold-plated contacts and anodized aluminum earcups suspended in zero gravity.",
        "creativeDirection": "Zero-G levitation choreography, subtle gold reflections, and clean studio cyclorama.",
        "capabilities": [
          "Audio Tech Stills",
          "Exploded View"
        ],
        "clientType": "Audiophile Hardware Brand",
        "creativeStyle": "Minimal / 3D",
        "tools": [
          "Cinema 4D",
          "Runway Gen-3"
        ],
        "featured": false
      },
      {
        "id": "alex-proj-5",
        "title": "Minimal Quartz — Ceramic Pure Edition",
        "category": "Product Visuals",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Sculptural timepiece photoshoot capturing white matte zirconia ceramic surfaces on limestone podiums.",
        "creativeDirection": "Architectural shadows, limestone textures, and ultra-crisp dial typography.",
        "capabilities": [
          "Minimalist Lighting",
          "Horology CGI"
        ],
        "clientType": "Scandinavian Watch Studio",
        "creativeStyle": "Minimal / Luxury",
        "tools": [
          "Cinema 4D",
          "Octane Render"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "elena-rostova",
    "userId": null,
    "name": "Elena Rostova",
    "handle": "@elena.atelier",
    "creativeIdentity": "Haute Couture AI Visualist & Digital Textile Sculptor",
    "specialty": "Fashion",
    "categoryTags": [
      "fashion",
      "ai-photography",
      "creative-direction",
      "advertising"
    ],
    "location": "Paris / Milan (CET)",
    "availability": "Booking for Q4",
    "statusBadge": "Featured",
    "heroWork": "/portfolios/elena-rostova-portfolio.jpg",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Bridging neoclassical atelier craftsmanship with avant-garde algorithmic textiles. Creating synthetic runway shows, haute couture lookbooks, and impossible material draping for heritage luxury fashion houses.",
    "styles": [
      "Editorial",
      "Luxury",
      "Cinematic",
      "Minimal"
    ],
    "industries": [
      "Luxury & High Fashion",
      "Beauty & Skincare"
    ],
    "capabilities": [
      "AI Fashion",
      "AI Video",
      "AI Photography",
      "Virtual Runways",
      "Creative Direction",
      "Textile Synthesis"
    ],
    "tools": [
      "Midjourney v6.1",
      "Flux.1 Pro",
      "Magnific AI",
      "ComfyUI",
      "Clo3D"
    ],
    "platforms": [
      "Instagram",
      "Vogue Runway Virtual",
      "Behance"
    ],
    "experience": "5 years fashion & AI",
    "turnaround": "5-8 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "elena-proj-1",
        "title": "Aura Privée — Neoclassical Silk & Light",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "/portfolios/elena-rostova-portfolio.jpg",
        "video": null,
        "description": "An haute couture editorial capturing fluid silk organza billowing through sun-drenched neoclassical marble colonnades.",
        "creativeDirection": "Weightless textile physics, raking afternoon sunlight, and soft focus film grain.",
        "capabilities": [
          "Virtual Couture",
          "Textile Draping",
          "Editorial Lighting"
        ],
        "clientType": "Parisian Fashion House",
        "creativeStyle": "Editorial / Luxury",
        "tools": [
          "Midjourney v6.1",
          "Magnific AI"
        ],
        "featured": true
      },
      {
        "id": "elena-proj-2",
        "title": "L'Ombre Solaire — High Desert Couture",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Avant-garde mustard yellow pleated silk silhouettes standing atop windswept ochre dunes under an incandescent midday sun.",
        "creativeDirection": "Saturated primary hues against neutral earth tones, crisp geometric folds, and high-fashion model posture.",
        "capabilities": [
          "Location Synthesis",
          "Color Block Styling"
        ],
        "clientType": "Milan Luxury Ready-to-Wear",
        "creativeStyle": "Editorial / Cinematic",
        "tools": [
          "Flux.1 Pro",
          "ComfyUI"
        ],
        "featured": false
      },
      {
        "id": "elena-proj-3",
        "title": "Obsidian Bloom — Noir Atelier",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Monochrome studio lookbook exploring structured wool tailoring, sharp lapels, and high-contrast Rembrandt key lighting.",
        "creativeDirection": "Deep velvet blacks, razor-sharp edge contrast, and refined European atelier tailoring.",
        "capabilities": [
          "Studio Tailoring",
          "Black & White Mastery"
        ],
        "clientType": "Contemporary Tailoring Label",
        "creativeStyle": "Minimal / Luxury",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      },
      {
        "id": "elena-proj-4",
        "title": "Céleste Organza — Weightless Drape",
        "category": "Fashion",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Pastel tulle gowns captured suspended in air, creating soft translucent ripples against warm travertine architectural backdrops.",
        "creativeDirection": "Airborne fabric turbulence, pastel color grading, and architectural shadow framing.",
        "capabilities": [
          "Volumetric Textiles",
          "Campaign Spread"
        ],
        "clientType": "Resort Collection Lookbook",
        "creativeStyle": "Editorial / Dreamlike",
        "tools": [
          "Flux.1 Pro"
        ],
        "featured": false
      },
      {
        "id": "elena-proj-5",
        "title": "Vermeil Monolith — Architectural Jewelry",
        "category": "Fashion",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Close-up macro editorial capturing hammered gold earrings against porcelain skin in low-raking gallery light.",
        "creativeDirection": "Metallic sheen reflection, skin micro-texture, and sculptural framing.",
        "capabilities": [
          "Macro Accessory Styling",
          "Skin Texture Preservation"
        ],
        "clientType": "Fine Jewelry Atelier",
        "creativeStyle": "Luxury / Minimal",
        "tools": [
          "Midjourney v6.1",
          "Magnific AI"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "zora-vance",
    "userId": null,
    "name": "Zora Vance",
    "handle": "@zora.beauty",
    "creativeIdentity": "Sensory Beauty & Botanical Macro Specialist",
    "specialty": "Product Visuals",
    "categoryTags": [
      "product-visuals",
      "advertising",
      "ai-photography",
      "fashion"
    ],
    "location": "Los Angeles / Zurich (PST/CET)",
    "availability": "Available for projects",
    "statusBadge": "Top Rated",
    "heroWork": "/portfolios/zora-vance-portfolio.jpg",
    "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    "bio": "Pioneering sensory AI photography for clean beauty, active dermatological skincare, and prestige cosmetics. Specializing in micro-emulsion physics, dewdrop refractions, and translucent glass caustics.",
    "styles": [
      "Minimal",
      "Photorealistic",
      "Editorial",
      "Luxury"
    ],
    "industries": [
      "Beauty & Skincare",
      "Beverage & Spirits"
    ],
    "capabilities": [
      "Liquid Macro Photography",
      "Skincare Texture Synthesis",
      "Glass Caustic Simulation",
      "Clean Beauty Editorial"
    ],
    "tools": [
      "Midjourney v6.1",
      "Flux.1 Pro",
      "Photoshop",
      "Topaz Photo AI"
    ],
    "platforms": [
      "Instagram",
      "Pinterest",
      "TikTok"
    ],
    "experience": "3 years clean beauty AI",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "zora-proj-1",
        "title": "Hydro-Luminescent Serum — The Dewdrop Study",
        "category": "Product Visuals",
        "aspect": "square",
        "image": "/portfolios/zora-vance-portfolio.jpg",
        "video": null,
        "description": "Macro study of botanical squalane droplets suspended on ribbed borosilicate glass, capturing internal light refraction and golden hour illumination.",
        "creativeDirection": "Zero-chromatic dispersion, micro-surface tension bubbles, and warm amber light leaks.",
        "capabilities": [
          "Fluid Droplet Macro",
          "Surface Tension Simulation",
          "Glass Caustics"
        ],
        "clientType": "Clinical Skincare Brand",
        "creativeStyle": "Minimal / Photorealistic",
        "tools": [
          "Midjourney v6.1",
          "Topaz Photo AI"
        ],
        "featured": true
      },
      {
        "id": "zora-proj-2",
        "title": "Botanique Épure — Golden Oil Dispenser",
        "category": "Product Visuals",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Amber glass pipette dispensing a golden active botanical droplet onto ribbed stone tile in a luxury spa environment.",
        "creativeDirection": "Internal liquid meniscus reflection, matte ceramic textures, and clean morning sunlight.",
        "capabilities": [
          "Dispenser Simulation",
          "Clean Beauty Stills"
        ],
        "clientType": "Clean Beauty Brand",
        "creativeStyle": "Editorial / Minimal",
        "tools": [
          "Flux.1 Pro"
        ],
        "featured": false
      },
      {
        "id": "zora-proj-3",
        "title": "Verdant Emulsion — Botanical Extract Jars",
        "category": "Product Visuals",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Cosmetic jars displayed with fresh green botanical leaves on raw travertine stone, capturing clean organic purity.",
        "creativeDirection": "Natural organic green gradients, dewy leaf surfaces, and soft travertine stone textures.",
        "capabilities": [
          "Organic Styling",
          "Eco-Luxury Packaging"
        ],
        "clientType": "Organic Skincare Line",
        "creativeStyle": "Photorealistic / Clean",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      },
      {
        "id": "zora-proj-4",
        "title": "Cristal Pur — Frost Glass Cream Jar",
        "category": "Product Visuals",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1608248597359-009941198f1d?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Heavy frosted glass moisturizer jar resting on damp slate with delicate water condensation droplets.",
        "creativeDirection": "Tactile micro-condensation, heavy frosted glass subsurface scattering, and minimalist studio grading.",
        "capabilities": [
          "Condensation Texturing",
          "Glass Packaging"
        ],
        "clientType": "Prestige Dermatology Brand",
        "creativeStyle": "Luxury / Minimal",
        "tools": [
          "Flux.1 Pro",
          "Photoshop"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "tariq-al-mansoor",
    "userId": null,
    "name": "Tariq Al-Mansoor",
    "handle": "@tariq.surreal3d",
    "creativeIdentity": "3D Spatial Architect & Monumental Surrealist",
    "specialty": "3D",
    "categoryTags": [
      "3d",
      "advertising",
      "creative-direction",
      "product-visuals"
    ],
    "location": "Dubai / Berlin (GST/CET)",
    "availability": "Available for projects",
    "statusBadge": "Verified Master",
    "heroWork": "/portfolios/tariq-al-mansoor-portfolio.jpg",
    "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    "bio": "Sculpting monumental brutalist architecture, floating pavilions, and spatial 3D environments. Merging parametric architecture with synthetic reality to create grand-scale commercial key visuals.",
    "styles": [
      "Surreal",
      "3D",
      "Cinematic",
      "Minimal",
      "Luxury"
    ],
    "industries": [
      "Architecture & Hospitality",
      "Consumer Tech & Hardware",
      "Automotive"
    ],
    "capabilities": [
      "3D Architecture",
      "Brutalist Worldbuilding",
      "Raytraced Spatial Stills",
      "Parametric Forms",
      "Monumental Key Art"
    ],
    "tools": [
      "Blender",
      "Unreal Engine 5",
      "Midjourney v6.1",
      "Houdini"
    ],
    "platforms": [
      "ArtStation",
      "Vimeo",
      "Behance"
    ],
    "experience": "6 years 3D & generative spatial",
    "turnaround": "5-10 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "tariq-proj-1",
        "title": "Monolith Desert Pavilion — The Oasis Void",
        "category": "3D",
        "aspect": "landscape",
        "image": "/portfolios/tariq-al-mansoor-portfolio.jpg",
        "video": null,
        "description": "A monumental travertine and smoked glass sanctuary embedded in red sandstone desert dunes, exploring silence and monumental scale.",
        "creativeDirection": "Low-raking golden hour shadows, razor-sharp architectural edges, and mirror-still courtyard reflection pools.",
        "capabilities": [
          "Architectural Rendering",
          "Atmospheric Desert Light",
          "Monumental Scale"
        ],
        "clientType": "Ultra-Luxury Desert Resort",
        "creativeStyle": "Surreal / 3D",
        "tools": [
          "Blender",
          "Unreal Engine 5",
          "Midjourney v6"
        ],
        "featured": true
      },
      {
        "id": "tariq-proj-2",
        "title": "Solarium Brut — Cantilevered Villa",
        "category": "3D",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Cantilevered board-formed concrete modern villa suspended over coastal cliffs with panoramic glass facades.",
        "creativeDirection": "Rough timber-grained concrete texture, turquoise marine horizon, and warm interior lighting.",
        "capabilities": [
          "Modern Villa Design",
          "Coastal Lighting"
        ],
        "clientType": "Architectural Practice",
        "creativeStyle": "Minimal / Architectural",
        "tools": [
          "Unreal Engine 5"
        ],
        "featured": false
      },
      {
        "id": "tariq-proj-3",
        "title": "Atrium Sanctum — Geometric Vaults",
        "category": "3D",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Cathedral-scale interior atrium featuring ribbed barrel vaults and rhythmic sunlight cutaways slicing through morning dust.",
        "creativeDirection": "Volumetric light shafts, warm plaster surfaces, and mathematically precise symmetry.",
        "capabilities": [
          "Interior Spatial Design",
          "Light Volume Simulation"
        ],
        "clientType": "Contemporary Museum Foundation",
        "creativeStyle": "Surreal / Minimal",
        "tools": [
          "Blender",
          "Houdini"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "sophie-mercier",
    "userId": null,
    "name": "Sophie Mercier",
    "handle": "@sophie.luxuryvisuals",
    "creativeIdentity": "Prestige Advertising Visualist & High Jewelry Director",
    "specialty": "Advertising",
    "categoryTags": [
      "advertising",
      "product-visuals",
      "fashion",
      "creative-direction"
    ],
    "location": "Geneva / Paris (CET)",
    "availability": "Booking for Q4",
    "statusBadge": "Top Rated",
    "heroWork": "/portfolios/sophie-mercier-portfolio.jpg",
    "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    "bio": "Crafting immaculate advertising visuals for high jewelry maisons, prestige fragrance houses, and luxury horology. Obsessed with facet brilliance, dispersion prisms, and flawless commercial styling.",
    "styles": [
      "Luxury",
      "Editorial",
      "Minimal",
      "Photorealistic"
    ],
    "industries": [
      "Luxury & High Fashion",
      "Beauty & Skincare"
    ],
    "capabilities": [
      "High Jewelry Key Art",
      "Prestige Commercials",
      "Raytraced Gemstone Dispersion",
      "Flawless Print Advertising"
    ],
    "tools": [
      "Midjourney v6.1",
      "Octane Render",
      "Photoshop",
      "Magnific AI"
    ],
    "platforms": [
      "Instagram",
      "Vogue Advertising",
      "Behance"
    ],
    "experience": "4 years luxury AI art direction",
    "turnaround": "4-6 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "sophie-proj-1",
        "title": "L'Éclat Éternel — Solitaire Dispersion",
        "category": "Advertising",
        "aspect": "square",
        "image": "/portfolios/sophie-mercier-portfolio.jpg",
        "video": null,
        "description": "Macro advertising key visual of an emerald-cut diamond ring on black mirrored obsidian, capturing chromatic fire and crisp platinum facets.",
        "creativeDirection": "Precise optical prism flares, zero dust artifacts, and high-fashion luxury typography margins.",
        "capabilities": [
          "Gemstone Dispersion",
          "Black Obsidian Reflection",
          "Commercial Retouching"
        ],
        "clientType": "Geneva High Jewelry Maison",
        "creativeStyle": "Luxury / Photorealistic",
        "tools": [
          "Midjourney v6.1",
          "Octane Render"
        ],
        "featured": true
      },
      {
        "id": "sophie-proj-2",
        "title": "Or Végétal — Chained Gold Necklace",
        "category": "Advertising",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Intricately linked 18k yellow gold necklace draped over a sculptural ceramic bust in raking morning daylight.",
        "creativeDirection": "Warm specular metallic highlights, crisp link geometry, and warm ivory studio cyclorama.",
        "capabilities": [
          "Gold Metal Caustics",
          "Sculptural Bust Presentation"
        ],
        "clientType": "Fine Jewelry Collection",
        "creativeStyle": "Editorial / Luxury",
        "tools": [
          "Flux.1 Pro"
        ],
        "featured": false
      },
      {
        "id": "sophie-proj-3",
        "title": "Prisme Solaire — Diamond Earring Drops",
        "category": "Advertising",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Pair of chandelier diamond earrings suspended in beam of crystalline light with iridescent caustic patterns.",
        "creativeDirection": "Sharp jewel facets, caustic rainbow light trails, and clean luxury print layout.",
        "capabilities": [
          "Caustic Simulation",
          "Print Key Art"
        ],
        "clientType": "International Luxury Maison",
        "creativeStyle": "Photorealistic / Luxury",
        "tools": [
          "Midjourney v6.1",
          "Magnific AI"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "amara-diallo",
    "userId": null,
    "name": "Amara Diallo",
    "handle": "@amara.culinary",
    "creativeIdentity": "Sensory Gastronomy & High-End Culinary Advertiser",
    "specialty": "Advertising",
    "categoryTags": [
      "advertising",
      "product-visuals",
      "social-content"
    ],
    "location": "Dakar / Lyon (GMT/CET)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "/portfolios/amara-diallo-portfolio.jpg",
    "avatar": "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80",
    "bio": "Capturing the explosive textures, steam, and chromatic vibrancy of high gastronomy, artisanal beverages, and luxury dining experiences through generative advertising.",
    "styles": [
      "Editorial",
      "Sensory",
      "Commercial",
      "Photorealistic"
    ],
    "industries": [
      "Beverage & Spirits",
      "Food & Beverage",
      "Architecture & Hospitality"
    ],
    "capabilities": [
      "Culinary Advertising",
      "Fluid Splash Photography",
      "Sensory Macro",
      "Menu Art Direction"
    ],
    "tools": [
      "Midjourney v6.1",
      "Flux.1 Pro",
      "Lightroom",
      "Topaz Photo AI"
    ],
    "platforms": [
      "Instagram",
      "Behance"
    ],
    "experience": "3 years food & beverage AI",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "amara-proj-1",
        "title": "Verveine & Citrus — Liquid Splash Dynamics",
        "category": "Advertising",
        "aspect": "landscape",
        "image": "/portfolios/amara-diallo-portfolio.jpg",
        "video": null,
        "description": "High-speed macro capture of an artisanal botanic tonic splash erupting around fresh blood orange slices and mint leaves.",
        "creativeDirection": "Microsecond droplet freezing, crystalline liquid bubbles, and sunlit citrus backlighting.",
        "capabilities": [
          "High-Speed Splash",
          "Citrus Translucency",
          "Commercial Beverage Art"
        ],
        "clientType": "Artisanal Distillery",
        "creativeStyle": "Sensory / Commercial",
        "tools": [
          "Midjourney v6.1",
          "Topaz Photo AI"
        ],
        "featured": true
      },
      {
        "id": "amara-proj-2",
        "title": "Le Table d'Or — Michelin Tasting Room",
        "category": "Advertising",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Atmospheric evening interior of an intimate 3-star Michelin dining room with candlelit linen tables and stemware sparkle.",
        "creativeDirection": "Warm low-light ambient glow, soft bokeh wine glasses, and crisp architectural linen folds.",
        "capabilities": [
          "Hospitality Environment",
          "Low-Light Ambience"
        ],
        "clientType": "Fine Dining Restaurant Group",
        "creativeStyle": "Editorial / Luxury",
        "tools": [
          "Flux.1 Pro"
        ],
        "featured": false
      },
      {
        "id": "amara-proj-3",
        "title": "Ombre Noire — Gourmet Dessert Plating",
        "category": "Advertising",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Dark chocolate ganache dome adorned with gold leaf flakes and fresh raspberries on slate ceramic plate.",
        "creativeDirection": "Glossy chocolate mirror glaze, metallic edible gold leaf reflection, and culinary perfection.",
        "capabilities": [
          "Dessert Styling",
          "Macro Food Photography"
        ],
        "clientType": "Luxury Chocolatier",
        "creativeStyle": "Sensory / Editorial",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "kenji-takahashi",
    "userId": null,
    "name": "Kenji Takahashi",
    "handle": "@kenji.characters",
    "creativeIdentity": "Photoreal Cyberpunk Character & Avatar Sculptor",
    "specialty": "Characters",
    "categoryTags": [
      "characters",
      "3d",
      "ai-video",
      "social-content"
    ],
    "location": "Tokyo / Seoul (JST/KST)",
    "availability": "Available for projects",
    "statusBadge": "Top Rated",
    "heroWork": "/portfolios/kenji-takahashi-portfolio.jpg",
    "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    "bio": "Architect of persistent digital humans, synthetic fashion ambassadors, and micro-expression character seeds. Master of repeatable face consistency across commercial video campaigns.",
    "styles": [
      "Photorealistic",
      "Cinematic",
      "Surreal",
      "Cyberpunk"
    ],
    "industries": [
      "Entertainment & Music",
      "Consumer Tech & Hardware",
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Characters",
      "3D",
      "Consistent Character Seeds",
      "360 Turnarounds",
      "Micro-Facial Rigging"
    ],
    "tools": [
      "Midjourney v6.1",
      "Runway Gen-3",
      "ComfyUI",
      "Magnific AI"
    ],
    "platforms": [
      "YouTube",
      "Instagram",
      "ArtStation"
    ],
    "experience": "4 years character synthesis",
    "turnaround": "4-7 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "kenji-proj-1",
        "title": "Aya 2045 — Virtual Cultural Ambassador",
        "category": "Characters",
        "aspect": "portrait",
        "image": "/portfolios/kenji-takahashi-portfolio.jpg",
        "video": null,
        "description": "Ultra-high-fidelity digital human ambassador for next-generation interactive Tokyo tourism and luxury brand campaigns.",
        "creativeDirection": "Subsurface skin scattering, natural epidermal pores, iris depth, and subtle moisture reflections.",
        "capabilities": [
          "Consistent Character Seed",
          "Photoreal Skin Physics",
          "Facial Micro-Expressions"
        ],
        "clientType": "Global Telecom Brand",
        "creativeStyle": "Photorealistic / Futuristic",
        "tools": [
          "ComfyUI",
          "Midjourney v6.1",
          "Magnific AI"
        ],
        "featured": true
      },
      {
        "id": "kenji-proj-2",
        "title": "Ren — Digital Streetwear Icon in Neo-Shinjuku",
        "category": "Characters",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Synthetic fashion avatar wearing technical reflective outerwear under rainy Shinjuku neon marquees.",
        "creativeDirection": "Wet fabric sheen, chromatic aberration in rain drops, and striking portrait gaze.",
        "capabilities": [
          "Streetwear Styling",
          "Atmospheric Neon"
        ],
        "clientType": "Harajuku Streetwear Brand",
        "creativeStyle": "Cinematic / Cyberpunk",
        "tools": [
          "Runway Gen-3",
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "nina-novak",
    "userId": null,
    "name": "Nina Novak",
    "handle": "@nina.popkinetic",
    "creativeIdentity": "Pop-Kinetic Director & Social Hook Architect",
    "specialty": "Social Content",
    "categoryTags": [
      "social-content",
      "ai-video",
      "advertising",
      "fashion"
    ],
    "location": "Berlin / Brooklyn (CET/EST)",
    "availability": "Available for projects",
    "statusBadge": "Trending",
    "heroWork": "/portfolios/nina-novak-portfolio.jpg",
    "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    "bio": "Creating explosive, hyper-vibrant short-form video hooks, surreal 3D memes, and viral Gen-Z content. Optimized for algorithmic engagement, micro-loop retention, and chromatic impact.",
    "styles": [
      "Playful",
      "Kinetic",
      "Pop",
      "Surreal",
      "Bold"
    ],
    "industries": [
      "Consumer Tech & Hardware",
      "Entertainment & Music",
      "Beverage & Spirits"
    ],
    "capabilities": [
      "Short-Form Video Hooks",
      "Kinetic Typography",
      "Viral Micro-Loops",
      "Social First Art Direction"
    ],
    "tools": [
      "CapCut Pro",
      "Runway Gen-3",
      "Kling 1.5",
      "Midjourney v6.1",
      "After Effects"
    ],
    "platforms": [
      "TikTok",
      "Instagram Reels",
      "YouTube Shorts"
    ],
    "experience": "3 years viral motion",
    "turnaround": "2-4 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "nina-proj-1",
        "title": "Chrome Pop Orbit — 9:16 Viral Micro-Loop",
        "category": "Social Content",
        "aspect": "portrait",
        "image": "/portfolios/nina-novak-portfolio.jpg",
        "video": null,
        "description": "Hypnotic 6-second seamless loop featuring bubblegum pink pneumatic shapes and floating iridescent bubbles.",
        "creativeDirection": "Hyper-saturated candy palette, perfect seamless loop cut, and rhythmic bouncy physics.",
        "capabilities": [
          "Seamless 9:16 Loops",
          "Iridescent Shading",
          "High Retention Timing"
        ],
        "clientType": "Gen-Z Beverage Startup",
        "creativeStyle": "Playful / Kinetic Pop",
        "tools": [
          "Runway Gen-3",
          "Midjourney v6.1",
          "CapCut"
        ],
        "featured": true
      },
      {
        "id": "nina-proj-2",
        "title": "Sub-Bass Beat Drop — Neon Audio Reactive",
        "category": "Social Content",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "High-voltage music studio visualizer capturing pulsating microphone grills, neon audio meters, and concert smoke.",
        "creativeDirection": "Sound-synced pulse lighting, smoky stage backlighting, and dynamic Dutch camera angles.",
        "capabilities": [
          "Audio Reactive Sync",
          "Stage Visuals"
        ],
        "clientType": "Global Music Festival",
        "creativeStyle": "Kinetic / Bold",
        "tools": [
          "After Effects",
          "Kling 1.5"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "mateo-cruz",
    "userId": null,
    "name": "Mateo Cruz",
    "handle": "@mateo.terraworlds",
    "creativeIdentity": "Ecological Worldbuilder & Remote Landscape Director",
    "specialty": "AI Video",
    "categoryTags": [
      "ai-video",
      "ai-photography",
      "creative-direction"
    ],
    "location": "Santiago / Barcelona (CLT/CET)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "/portfolios/mateo-cruz-portfolio.jpg",
    "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    "bio": "Pioneering organic landscape synthesis, speculative wilderness ecology, and natural history AI direction. Creating breathtaking travel cinematography and high-altitude vistas for eco-luxury brands.",
    "styles": [
      "Cinematic",
      "Emotional",
      "Story-driven",
      "Minimal"
    ],
    "industries": [
      "Architecture & Hospitality",
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Cinematic Travel",
      "Atmospheric Grading",
      "Speculative Landscapes",
      "Aerial Stills"
    ],
    "tools": [
      "Midjourney v6.1",
      "Runway Gen-3",
      "DaVinci Resolve Studio"
    ],
    "platforms": [
      "Vimeo",
      "YouTube"
    ],
    "experience": "3.5 years cinematic landscapes",
    "turnaround": "4-6 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "mateo-proj-1",
        "title": "Atacama Starlight — Remote Luxury Eco-Lodge",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "/portfolios/mateo-cruz-portfolio.jpg",
        "video": null,
        "description": "Cinematic drone journey over high-altitude salt flats, copper mountain ridges, and minimalist rammed-earth architecture.",
        "creativeDirection": "Kodak 250D film warmth, crystal starlight night skies, and slow cinematic gliding motion.",
        "capabilities": [
          "Drone Camera Moves",
          "Analog Film Grading",
          "Landscape Architecture"
        ],
        "clientType": "Eco-Hospitality Collective",
        "creativeStyle": "Cinematic / Minimal",
        "tools": [
          "Runway Gen-3",
          "Midjourney v6.1",
          "DaVinci Resolve"
        ],
        "featured": true
      },
      {
        "id": "mateo-proj-2",
        "title": "Altiplano Silence — Salt Flats at Sundown",
        "category": "AI Photography",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Breathtaking mirror reflections of sky gradients on shallow salt water flats at twilight.",
        "creativeDirection": "Perfect horizon symmetry, pastel violet to orange sky gradient, and pure tranquility.",
        "capabilities": [
          "Reflective Horizon",
          "Fine Art Landscape"
        ],
        "clientType": "Luxury Travel Magazine",
        "creativeStyle": "Minimal / Emotional",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "liam-oconnor",
    "userId": null,
    "name": "Liam O'Connor",
    "handle": "@liam.chromemotion",
    "creativeIdentity": "Liquid Chrome & 3D Kinetic Typography Specialist",
    "specialty": "3D",
    "categoryTags": [
      "3d",
      "social-content",
      "advertising",
      "creative-direction"
    ],
    "location": "Dublin / London (GMT)",
    "availability": "Booking for Q4",
    "statusBadge": "Verified Master",
    "heroWork": "/portfolios/liam-oconnor-portfolio.jpg",
    "avatar": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80",
    "bio": "Pioneering liquid chrome motion, kinetic 3D typography, and future-forward brand emblems. Bridging procedural physics simulations with generative AI interpolation.",
    "styles": [
      "Surreal",
      "Kinetic",
      "Futuristic",
      "Bold"
    ],
    "industries": [
      "Consumer Tech & Hardware",
      "Entertainment & Music",
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Liquid Chrome Simulation",
      "3D Typography",
      "Audio-Reactive Loops"
    ],
    "tools": [
      "Cinema 4D",
      "Houdini",
      "Midjourney v6.1",
      "Runway Gen-3"
    ],
    "platforms": [
      "Instagram",
      "Twitter/X",
      "ArtStation"
    ],
    "experience": "5 years 3D motion & generative",
    "turnaround": "4-7 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "liam-proj-1",
        "title": "Liquid Chrome Glyphs — Audio-Reactive Loops",
        "category": "3D",
        "aspect": "portrait",
        "image": "/portfolios/liam-oconnor-portfolio.jpg",
        "video": null,
        "description": "Kinetic liquid mercury emblem morphing seamlessly into futuristic typographic logomarks under studio strobe lights.",
        "creativeDirection": "Viscous fluid surface tension, mirror-perfect metallic reflections, and dark minimalist backdrops.",
        "capabilities": [
          "Fluid Simulation",
          "Kinetic 3D Logotype",
          "Mercury Caustics"
        ],
        "clientType": "Electronic Music Label",
        "creativeStyle": "Kinetic / Futuristic",
        "tools": [
          "Cinema 4D",
          "Houdini",
          "Runway Gen-3"
        ],
        "featured": true
      },
      {
        "id": "liam-proj-2",
        "title": "Metamorphic Obsidian — Fluid Sculpture",
        "category": "3D",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Flowing obsidian ribbon waveforms reflecting prismatic chromatic gradients across sleek curvilinear geometries.",
        "creativeDirection": "Prismatic oil-slick dispersion, smooth mathematical curvature, and deep contrast.",
        "capabilities": [
          "Parametric Curves",
          "Waveform Simulation"
        ],
        "clientType": "Tech Keynote Visuals",
        "creativeStyle": "Surreal / Minimal",
        "tools": [
          "Houdini",
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "saffron-chen",
    "userId": null,
    "name": "Saffron Chen",
    "handle": "@saffron.dreamscapes",
    "creativeIdentity": "Dreamscape Photographer & Ethereal Surrealist",
    "specialty": "AI Photography",
    "categoryTags": [
      "ai-photography",
      "creative-direction",
      "advertising"
    ],
    "location": "Vancouver / Taipei (PST/CST)",
    "availability": "Available for projects",
    "statusBadge": "Top Rated",
    "heroWork": "/portfolios/saffron-chen-portfolio.jpg",
    "avatar": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    "bio": "Weaving nostalgic, dreamlike fine art photography that merges hazy Pacific Northwest fog with surreal flora, floating pavilions, and poetic stillness.",
    "styles": [
      "Surreal",
      "Ethereal",
      "Soft",
      "Editorial"
    ],
    "industries": [
      "Beauty & Skincare",
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Dreamscapes",
      "Ethereal Environments",
      "Editorial Covers"
    ],
    "tools": [
      "Midjourney v6.1",
      "Photoshop",
      "Lightroom"
    ],
    "platforms": [
      "Instagram",
      "Substack"
    ],
    "experience": "3 years fine art photography & AI",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "saffron-proj-1",
        "title": "Floating Peony Pavilion — Alpine Mist",
        "category": "AI Photography",
        "aspect": "landscape",
        "image": "/portfolios/saffron-chen-portfolio.jpg",
        "video": null,
        "description": "A dreamlike pavilion draped in oversized wild peonies, hovering above a still alpine lake veiled in dawn fog.",
        "creativeDirection": "Low-contrast pastel tones, diffused mist lighting, and poetic Asian surrealist sensibility.",
        "capabilities": [
          "Dreamscape Composition",
          "Soft Atmosphere",
          "Fine Art Editorial"
        ],
        "clientType": "Fragrance Campaign",
        "creativeStyle": "Surreal / Ethereal",
        "tools": [
          "Midjourney v6.1",
          "Lightroom"
        ],
        "featured": true
      },
      {
        "id": "saffron-proj-2",
        "title": "Emerald Slumber — Whispering Pines",
        "category": "AI Photography",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Ancient evergreen forest veiled in layers of mountain mist reflecting softly on a tranquil mountain lake.",
        "creativeDirection": "Moody emerald greens, soft veil fog, and timeless tranquil stillness.",
        "capabilities": [
          "Atmospheric Fog",
          "Nature Fine Art"
        ],
        "clientType": "Luxury Meditation App",
        "creativeStyle": "Soft / Ethereal",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "julian-thorne",
    "userId": null,
    "name": "Julian Thorne",
    "handle": "@julian.darkwave",
    "creativeIdentity": "Neo-Gothic AI Video Director & Dark Cyber Cinema",
    "specialty": "AI Video",
    "categoryTags": [
      "ai-video",
      "3d",
      "creative-direction",
      "advertising"
    ],
    "location": "Edinburgh / Berlin (GMT/CET)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "/portfolios/julian-thorne-portfolio.jpg",
    "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    "bio": "Sculpting dark cybernetic cinema, neo-gothic cathedral architectures, and ominous industrial motion graphics for high-end luxury, automotive, and entertainment brands.",
    "styles": [
      "Darkwave",
      "Neo-Gothic",
      "Cinematic",
      "Industrial"
    ],
    "industries": [
      "Entertainment & Music",
      "Automotive",
      "Consumer Tech & Hardware"
    ],
    "capabilities": [
      "Dark Cinema Direction",
      "Volumetric Fog",
      "Synthetic Brutalism"
    ],
    "tools": [
      "Kling 1.5",
      "Runway Gen-3",
      "Midjourney v6.1",
      "DaVinci Resolve"
    ],
    "platforms": [
      "Vimeo",
      "YouTube"
    ],
    "experience": "4 years cyber cinema & AI",
    "turnaround": "5-7 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "julian-proj-1",
        "title": "Monolith of Shadows — Cyber Cathedral",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "/portfolios/julian-thorne-portfolio.jpg",
        "video": null,
        "description": "Ominous cinematic trailer sequence following an autonomous cybernetic explorer through a towering subterranean cathedral.",
        "creativeDirection": "Heavy obsidian reflections, crimson accent lighting, and deep volumetric fog.",
        "capabilities": [
          "Cyber Cinema",
          "Volumetric Architecture",
          "Dramatic Mood Grading"
        ],
        "clientType": "Gaming Studio Teaser",
        "creativeStyle": "Darkwave / Cinematic",
        "tools": [
          "Kling 1.5",
          "Runway Gen-3"
        ],
        "featured": true
      },
      {
        "id": "julian-proj-2",
        "title": "Neural Core — Subterranean Supercomputer",
        "category": "AI Video",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Macro look inside a superconducting quantum motherboard pulsing with cyan and violet data bus traces.",
        "creativeDirection": "Subtle micro-circuit glow, gold-plated bus bars, and moody dark studio backdrop.",
        "capabilities": [
          "Hardware Macro",
          "Tech Key Art"
        ],
        "clientType": "Deep Tech Enterprise",
        "creativeStyle": "Industrial / Cinematic",
        "tools": [
          "Midjourney v6.1",
          "DaVinci Resolve"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "chloe-davenport",
    "userId": null,
    "name": "Chloe Davenport",
    "handle": "@chloe.couture",
    "creativeIdentity": "Avant-Garde Parisian Couture & Sculptural Textile Artist",
    "specialty": "Fashion",
    "categoryTags": [
      "fashion",
      "creative-direction",
      "ai-photography"
    ],
    "location": "Paris (CET)",
    "availability": "Available for projects",
    "statusBadge": "Top Rated",
    "heroWork": "/portfolios/chloe-davenport-portfolio.png",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Pioneering fluid sculptural couture, weightless organza architecture, and haute couture editorial covers for French luxury ateliers and contemporary fashion publications.",
    "styles": [
      "Haute Couture",
      "Sculptural",
      "Editorial",
      "Parisian"
    ],
    "industries": [
      "Luxury & High Fashion",
      "Beauty & Skincare"
    ],
    "capabilities": [
      "Sculptural Couture",
      "Weightless Organza",
      "Editorial Fashion Direction"
    ],
    "tools": [
      "Midjourney v6.1",
      "Flux.1 Pro",
      "Magnific AI"
    ],
    "platforms": [
      "Instagram",
      "Behance"
    ],
    "experience": "4 years luxury fashion AI",
    "turnaround": "4-6 days delivery",
    "featured": true,
    "isDemo": true,
    "projects": [
      {
        "id": "chloe-proj-1",
        "title": "Couture Morphologique — Sculptural Travertine Dress",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "/portfolios/chloe-davenport-portfolio.png",
        "video": null,
        "description": "An impossible gown blending polished travertine marble petals with weightless ivory silk chiffon.",
        "creativeDirection": "Sculptural silhouette, raking golden Parisian sunlight, and flawless editorial texture.",
        "capabilities": [
          "Impossible Garment Synthesis",
          "Marble Silk Fusion",
          "Runway Editorial"
        ],
        "clientType": "Paris Fashion Week Preview",
        "creativeStyle": "Haute Couture / Sculptural",
        "tools": [
          "Flux.1 Pro",
          "Midjourney v6.1"
        ],
        "featured": true
      },
      {
        "id": "chloe-proj-2",
        "title": "Atelier Du Soir — Midnight Silk Organza",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Flowing midnight blue silk evening gown trailing through a candlelit neoclassical Parisian salon.",
        "creativeDirection": "Soft candle caustics, billowy silk weightlessness, and aristocratic French luxury mood.",
        "capabilities": [
          "Chiffon Draping",
          "Salon Ambience"
        ],
        "clientType": "French Haute Couture Label",
        "creativeStyle": "Parisian / Luxury",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-ae29d558",
    "userId": "ae29d558-c097-4520-8007-a89bb0f74f34",
    "name": "Elena Rostova • Atelier Studio",
    "handle": "@elena.atelier.runway",
    "creativeIdentity": "Scandinavian Minimalist Couture & Runway Director",
    "specialty": "Fashion",
    "categoryTags": [
      "fashion",
      "creative-direction",
      "ai-photography"
    ],
    "location": "Copenhagen / Stockholm (CET)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Directing minimalist Nordic fashion campaigns, raw wool texture synthesis, and clean architectural lookbooks with natural winter sunlight.",
    "styles": [
      "Nordic",
      "Minimal",
      "Editorial",
      "Haute Couture"
    ],
    "industries": [
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Nordic Knitwear",
      "Architectural Runway",
      "Minimalist Lookbooks"
    ],
    "tools": [
      "Midjourney v6.1",
      "Flux.1 Pro"
    ],
    "platforms": [
      "Instagram",
      "Vogue Scandinavia"
    ],
    "experience": "3 years Nordic fashion AI",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-ae29d558-proj-1",
        "title": "Nordic Frost — Winter Wool & Cashmere",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Editorial campaign capturing oversized raw wool coats against crisp Copenhagen morning architecture.",
        "creativeDirection": "Subtle winter morning haze, tactile wool fibers, and understated Scandinavian luxury.",
        "capabilities": [
          "Textile Realism",
          "Editorial Lighting"
        ],
        "clientType": "Scandinavian Outerwear Brand",
        "creativeStyle": "Nordic / Minimal",
        "tools": [
          "Flux.1 Pro"
        ],
        "featured": true
      },
      {
        "id": "creator-ae29d558-proj-2",
        "title": "Travertine Silhouette — Monochromatic Trench",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Structured camel hair trench coat framed against geometric stone facades in Stockholm.",
        "creativeDirection": "Warm camel hues, sharp tailoring creases, and minimalist graphic framing.",
        "capabilities": [
          "Structured Tailoring",
          "Lookbook Art Direction"
        ],
        "clientType": "Contemporary Stockholm Label",
        "creativeStyle": "Editorial / Minimal",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-9c766da9",
    "userId": "9c766da9-58d6-45d1-b1a1-d21c0cfb02b9",
    "name": "Maya Chen • Kinetic Lab",
    "handle": "@mayachen.kinetic",
    "creativeIdentity": "High-Frame-Rate Automotive & Sci-Fi Commercial Director",
    "specialty": "AI Video",
    "categoryTags": [
      "ai-video",
      "advertising",
      "creative-direction"
    ],
    "location": "Tokyo / Los Angeles (JST/PST)",
    "availability": "Available for projects",
    "statusBadge": "Top Rated",
    "heroWork": "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Pioneering high-octane commercial cinematography, hyper-speed automotive motion blur, and neon-lit speculative vehicle launches.",
    "styles": [
      "High-Octane",
      "Cinematic",
      "Futuristic",
      "Commercial"
    ],
    "industries": [
      "Automotive",
      "Consumer Tech & Hardware"
    ],
    "capabilities": [
      "Automotive CGI",
      "High-Frame-Rate Motion",
      "Neon Atmosphere"
    ],
    "tools": [
      "Kling 1.5",
      "Runway Gen-3",
      "DaVinci Resolve"
    ],
    "platforms": [
      "YouTube",
      "Vimeo"
    ],
    "experience": "4 years commercial video AI",
    "turnaround": "4-6 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-9c766da9-proj-1",
        "title": "Apex Machina — Cyberpunk Hypercar Reveal",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Sleek aerodynamic concept vehicle carving through rainy neon canyons with active aero transitions.",
        "creativeDirection": "Carbon-fiber surface reflections, rain streaks, and orange-teal anamorphic flares.",
        "capabilities": [
          "Vehicle Lighting",
          "Rain Simulation"
        ],
        "clientType": "Global EV Manufacturer",
        "creativeStyle": "Futuristic / Commercial",
        "tools": [
          "Kling 1.5",
          "Runway Gen-3"
        ],
        "featured": true
      },
      {
        "id": "creator-9c766da9-proj-2",
        "title": "Metropolis 2088 — Skyway Speed Run",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Aerial camera tracking high-speed levitating transport capsules above multi-tiered illuminated skyscrapers.",
        "creativeDirection": "Deep volumetric haze, architectural illumination, and breathtaking vertical scale.",
        "capabilities": [
          "Urban Worldbuilding",
          "Speed Tracking"
        ],
        "clientType": "Sci-Fi Film Studio",
        "creativeStyle": "Cinematic / Sci-Fi",
        "tools": [
          "Runway Gen-3"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-19adba17",
    "userId": "19adba17-770e-4dde-8465-1eed3d4f1b90",
    "name": "Ishmeet Singh",
    "handle": "@ishmeet.vfx",
    "creativeIdentity": "3D Quantum Computing & Procedural Micro-Physics Artist",
    "specialty": "3D",
    "categoryTags": [
      "3d",
      "characters",
      "ai-video",
      "product-visuals"
    ],
    "location": "Bengaluru / Vancouver (IST/PST)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    "bio": "Specializing in procedural micro-physics, holographic semiconductor wafers, and raytraced crystalline lattices for global deep-tech leaders.",
    "styles": [
      "3D",
      "Procedural",
      "Futuristic",
      "Quantum"
    ],
    "industries": [
      "Consumer Tech & Hardware",
      "Entertainment & Music"
    ],
    "capabilities": [
      "Procedural Shading",
      "Quantum Optics",
      "3D Tech Key Visuals"
    ],
    "tools": [
      "Blender",
      "Houdini",
      "Midjourney v6.1"
    ],
    "platforms": [
      "ArtStation",
      "Instagram"
    ],
    "experience": "4 years 3D procedural simulation",
    "turnaround": "4-7 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-19adba17-proj-1",
        "title": "Qubit Matrix — Sub-Nanometer Processing Core",
        "category": "3D",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Macro exploration of superconducting qubit interconnects glowing with cryogenic quantum coherence.",
        "creativeDirection": "Gold-plated cryogenic shielding, glowing violet Josephson junctions, and ultra-macro depth of field.",
        "capabilities": [
          "Semiconductor Visualization",
          "Cryogenic Lighting"
        ],
        "clientType": "Quantum Computing Startup",
        "creativeStyle": "3D / Quantum",
        "tools": [
          "Houdini",
          "Midjourney v6.1"
        ],
        "featured": true
      },
      {
        "id": "creator-19adba17-proj-2",
        "title": "Prism Crystal Core — Volumetric Hologram",
        "category": "3D",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1633493106115-460b5a3bbce0?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Floating crystalline polyhedron refracting raytraced laser light beams into spectral caustic volumes.",
        "creativeDirection": "Volumetric dispersion, floating dust caustics, and crisp geometric precision.",
        "capabilities": [
          "Refraction Caustics",
          "Holographic Renders"
        ],
        "clientType": "Spatial Display Manufacturer",
        "creativeStyle": "Procedural / Futuristic",
        "tools": [
          "Blender",
          "Octane"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-3bae76f5",
    "userId": "3bae76f5-695a-440f-9530-6c672ff62b03",
    "name": "Alloy Curated Studio",
    "handle": "@alloy.curated",
    "creativeIdentity": "Sovereign Brand Vision & Global Campaign Architecture",
    "specialty": "Creative Direction",
    "categoryTags": [
      "creative-direction",
      "advertising",
      "fashion",
      "ai-video"
    ],
    "location": "Global HQ (London/Zurich/NY)",
    "availability": "Available for projects",
    "statusBadge": "Verified Master",
    "heroWork": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85",
    "avatar": "/assets/alloy-emblem-sculpture.jpg",
    "bio": "Directing multi-sensory global brand reinventions, sovereign visual identity systems, and high-impact international advertising campaigns for Tier-1 institutions.",
    "styles": [
      "Sovereign",
      "Monumental",
      "Editorial",
      "Luxury"
    ],
    "industries": [
      "Luxury & High Fashion",
      "Consumer Tech & Hardware",
      "Entertainment & Music"
    ],
    "capabilities": [
      "Campaign Architecture",
      "Creative Direction",
      "Multi-Sensory Worldbuilding",
      "Brand Manifestos"
    ],
    "tools": [
      "Full Generative Suite",
      "Figma",
      "Premiere Pro",
      "Midjourney v6.1"
    ],
    "platforms": [
      "Global OOH",
      "Digital Flagships",
      "Vogue"
    ],
    "experience": "7 years global creative direction",
    "turnaround": "5-10 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-3bae76f5-proj-1",
        "title": "The Sovereign Horizon — Global Brand Manifesto",
        "category": "Creative Direction",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Monumental launch campaign staging light sculptures across international metropolitan plazas.",
        "creativeDirection": "Golden atmospheric particle illumination, majestic human silhouettes, and sovereign typography.",
        "capabilities": [
          "Global Campaign Key Visual",
          "Manifesto Art Direction"
        ],
        "clientType": "International Financial Consortium",
        "creativeStyle": "Monumental / Sovereign",
        "tools": [
          "Midjourney v6.1",
          "Premiere Pro"
        ],
        "featured": true
      },
      {
        "id": "creator-3bae76f5-proj-2",
        "title": "Monochrome Heritage — Architecture of Light",
        "category": "Creative Direction",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "A stark, black-and-white visual identity system celebrating pure form, high-contrast typography, and architectural geometry.",
        "creativeDirection": "Pure carbon blacks, crisp silver foil stamp aesthetics, and Swiss grid layout.",
        "capabilities": [
          "Identity Design",
          "Print Master Packaging"
        ],
        "clientType": "Luxury Design Biennale",
        "creativeStyle": "Minimal / Luxury",
        "tools": [
          "Figma",
          "Flux.1 Pro"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-2fc36de7",
    "userId": "2fc36de7-6bc0-4685-9872-28aa8bd968f8",
    "name": "Hanna Joli",
    "handle": "@hanna.joli",
    "creativeIdentity": "Pastel Gen-Z Aesthetician & Micro-Fashion Storyteller",
    "specialty": "Social Content",
    "categoryTags": [
      "social-content",
      "fashion",
      "ai-photography",
      "advertising"
    ],
    "location": "Paris / Amsterdam (CET)",
    "availability": "Available for projects",
    "statusBadge": "Trending",
    "heroWork": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    "bio": "Creating dreamy pastel social reels, Y2K digital accessories, and whimsical micro-fashion stories tailored for TikTok and Instagram creators.",
    "styles": [
      "Pastel",
      "Playful",
      "Y2K",
      "Whimsical"
    ],
    "industries": [
      "Beauty & Skincare",
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Viral Hooks",
      "Micro-Fashion Stills",
      "Pastel Grading"
    ],
    "tools": [
      "Midjourney v6.1",
      "CapCut",
      "Photoshop"
    ],
    "platforms": [
      "TikTok",
      "Instagram Reels"
    ],
    "experience": "2.5 years social visual content",
    "turnaround": "2-4 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-2fc36de7-proj-1",
        "title": "Cloud Meringue — Y2K Hair & Gloss",
        "category": "Social Content",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Pastel pink portrait campaign highlighting holographic lip oils and butterfly hair clips in soft diffuse daylight.",
        "creativeDirection": "Soft glow lens diffusion, cotton-candy pastel highlights, and playful direct-to-camera eye contact.",
        "capabilities": [
          "Y2K Styling",
          "Beauty Micro-Content"
        ],
        "clientType": "Indie Lip Gloss Label",
        "creativeStyle": "Pastel / Playful",
        "tools": [
          "Midjourney v6.1",
          "Photoshop"
        ],
        "featured": true
      },
      {
        "id": "creator-2fc36de7-proj-2",
        "title": "Golden Hour Glow — Canal Stroll",
        "category": "Social Content",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Sun-drenched streetwear snapshots along Amsterdam canals with warm vintage film flare.",
        "creativeDirection": "Golden backlight halo, relaxed Parisian attitude, and high-engagement social thumbnail composition.",
        "capabilities": [
          "Casual Fashion Stills",
          "Thumbnail Architecture"
        ],
        "clientType": "Sustainable Denim Brand",
        "creativeStyle": "Casual / Sunlit",
        "tools": [
          "CapCut",
          "Flux.1 Pro"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-c7c0f42b",
    "userId": "c7c0f42b-c285-44d8-8c39-9be1af69b5df",
    "name": "Inderpal Singh",
    "handle": "@inderpal.motion",
    "creativeIdentity": "Automotive Motion & Aerodynamic Fluid Simulation Director",
    "specialty": "AI Video",
    "categoryTags": [
      "ai-video",
      "advertising",
      "3d"
    ],
    "location": "Toronto / London (EST/GMT)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    "bio": "Directing high-precision automotive commercials, aerodynamic wind tunnel visualizations, and visceral high-speed motion campaigns for premier mobility brands.",
    "styles": [
      "Automotive",
      "High-Speed",
      "Cinematic",
      "Aerodynamic"
    ],
    "industries": [
      "Automotive",
      "Consumer Tech & Hardware"
    ],
    "capabilities": [
      "Automotive Cinematography",
      "Wind Tunnel Aero",
      "High-Speed Camera Rigs"
    ],
    "tools": [
      "Runway Gen-3",
      "Kling 1.5",
      "Octane Render"
    ],
    "platforms": [
      "YouTube",
      "Vimeo"
    ],
    "experience": "4 years automotive CGI & AI",
    "turnaround": "4-6 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-c7c0f42b-proj-1",
        "title": "Night Circuit — Carbon Monocoque Sprint",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "High-octane commercial tracking an electric endurance racer through wet asphalt chicanes under floodlights.",
        "creativeDirection": "Carbon weave surface reflections, glowing red ceramic brake disc rotors, and asphalt spray caustics.",
        "capabilities": [
          "Night Tracking Shot",
          "Surface Reflection Physics"
        ],
        "clientType": "Electric Motorsport Championship",
        "creativeStyle": "Automotive / Cinematic",
        "tools": [
          "Runway Gen-3",
          "Kling 1.5"
        ],
        "featured": true
      },
      {
        "id": "creator-c7c0f42b-proj-2",
        "title": "Velocity Silver — Sculptural Coupe",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Studio turntable reveal of a silver concept coupe highlighting razor shoulder lines and flush glasshouse.",
        "creativeDirection": "Overhead softbox lighting sweep, pristine liquid silver paint shader, and clean architectural horizon.",
        "capabilities": [
          "Studio Car Reveal",
          "Turntable Animation"
        ],
        "clientType": "Luxury Automotive Maison",
        "creativeStyle": "Commercial / High-Precision",
        "tools": [
          "Octane",
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-ipsingh0000004-gmail-com",
    "userId": null,
    "name": "Aria Mehta",
    "handle": "@aria.surrealism",
    "creativeIdentity": "Biophilic Surrealist & Bioluminescent Botanical Artist",
    "specialty": "AI Photography",
    "categoryTags": [
      "ai-photography",
      "creative-direction",
      "advertising"
    ],
    "location": "Mumbai / London (IST/GMT)",
    "availability": "Available for projects",
    "statusBadge": "Top Rated",
    "heroWork": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Exploring the intersection of deep-forest biology, bioluminescent fungi, and surreal botanical pavilions for luxury beauty and wellness campaigns.",
    "styles": [
      "Biophilic",
      "Surreal",
      "Ethereal",
      "Botanical"
    ],
    "industries": [
      "Beauty & Skincare",
      "Architecture & Hospitality"
    ],
    "capabilities": [
      "Biophilic Surrealism",
      "Botanical Macro",
      "Bioluminescence"
    ],
    "tools": [
      "Midjourney v6.1",
      "Flux.1 Pro",
      "Lightroom"
    ],
    "platforms": [
      "Instagram",
      "Behance"
    ],
    "experience": "3.5 years botanical AI art",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-ipsingh0000004-gmail-com-proj-1",
        "title": "Chlorophyll Lumina — Night Garden Study",
        "category": "AI Photography",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Close-up macro study of tropical monstera leaves radiating subtle emerald bioluminescent veins in twilight rain.",
        "creativeDirection": "Soft emerald internal glow, hyper-crisp leaf venation, and shimmering raindrops.",
        "capabilities": [
          "Macro Botany",
          "Bioluminescent Shading"
        ],
        "clientType": "Luxury Botanical Serum",
        "creativeStyle": "Biophilic / Ethereal",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": true
      },
      {
        "id": "creator-ipsingh0000004-gmail-com-proj-2",
        "title": "Emerald Canopy — Primordial Fern Forest",
        "category": "AI Photography",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Misty aerial viewpoint overlooking ancient giant fern canopies bathed in early morning sun shafts.",
        "creativeDirection": "Dense atmospheric mist, lush layered moss tones, and grand organic scale.",
        "capabilities": [
          "Wilderness Landscape",
          "Canopy Art Direction"
        ],
        "clientType": "Eco-Retreat Brand",
        "creativeStyle": "Surreal / Atmospheric",
        "tools": [
          "Flux.1 Pro"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-fa43fc70",
    "userId": "fa43fc70-94a3-4367-934c-bb7ce22ce20b",
    "name": "Laxmi Bai",
    "handle": "@laxmibai.vision",
    "creativeIdentity": "Royal South Asian Heritage & Gold Brocade Director",
    "specialty": "Creative Direction",
    "categoryTags": [
      "creative-direction",
      "fashion",
      "advertising"
    ],
    "location": "Jaipur / London (IST/GMT)",
    "availability": "Available for projects",
    "statusBadge": "Verified Master",
    "heroWork": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Directing opulent royal heritage narratives, handwoven zari textiles, and majestic marble palace architecture for South Asian and international luxury brands.",
    "styles": [
      "Royal Heritage",
      "Opulent",
      "Editorial",
      "Architectural"
    ],
    "industries": [
      "Luxury & High Fashion",
      "Architecture & Hospitality"
    ],
    "capabilities": [
      "Zari Textile Synthesis",
      "Palace Architectural Direction",
      "Royal Haute Couture"
    ],
    "tools": [
      "Midjourney v6.1",
      "Flux.1 Pro",
      "Photoshop"
    ],
    "platforms": [
      "Instagram",
      "Vogue India"
    ],
    "experience": "5 years heritage luxury direction",
    "turnaround": "5-7 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-fa43fc70-proj-1",
        "title": "Jaigarh Courtyard — The Royal Sovereign",
        "category": "Creative Direction",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Monumental editorial campaign set within carved sandstone jharokhas and marble courtyards at sunset.",
        "creativeDirection": "Warm ochre sandstone textures, intricate lattice shadows, and majestic regal styling.",
        "capabilities": [
          "Heritage Architecture",
          "Sovereign Staging"
        ],
        "clientType": "Heritage Palace Hotel Group",
        "creativeStyle": "Royal Heritage / Architectural",
        "tools": [
          "Flux.1 Pro",
          "Midjourney v6.1"
        ],
        "featured": true
      },
      {
        "id": "creator-fa43fc70-proj-2",
        "title": "Zari Swarnam — Pure Gold Thread Weave",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1609137144821-2747167a5b3a?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Macro textile study capturing metallic gold zari threads woven across crimson silk satin.",
        "creativeDirection": "Intricate metallic thread reflections, heavy silk drape, and jewel-tone richness.",
        "capabilities": [
          "Textile Macro",
          "Gold Thread Synthesis"
        ],
        "clientType": "Couture Bridal House",
        "creativeStyle": "Opulent / Luxury",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-laxmibai-gmail-com",
    "userId": null,
    "name": "Laxmi Bai • Digital Heritage",
    "handle": "@laxmibai.heritage",
    "creativeIdentity": "Kundan Gemstone & Mughal Filigree AI Photographer",
    "specialty": "AI Photography",
    "categoryTags": [
      "ai-photography",
      "creative-direction",
      "fashion"
    ],
    "location": "Jaipur / Mumbai (IST)",
    "availability": "Available for projects",
    "statusBadge": "Top Rated",
    "heroWork": "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Capturing the hypnotic splendor of heritage Indian polki diamonds, uncut emeralds, and fine enameled meenakari jewelry through micro-photography.",
    "styles": [
      "Jewel-Tone",
      "Intricate",
      "Heritage",
      "Photorealistic"
    ],
    "industries": [
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Gemstone Macro",
      "Kundan Filigree",
      "Heirloom Jewelry Stills"
    ],
    "tools": [
      "Midjourney v6.1",
      "Topaz Photo AI"
    ],
    "platforms": [
      "Instagram",
      "Pinterest"
    ],
    "experience": "3 years jewelry AI photography",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-laxmibai-gmail-com-proj-1",
        "title": "Noor-e-Kundan — Uncut Polki Diamonds",
        "category": "AI Photography",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Extreme macro photograph of an antique gold choker set with uncut polki diamonds and hanging South Sea pearls.",
        "creativeDirection": "Specular gold highlight glimmer, natural diamond foil backing, and velvety emerald background.",
        "capabilities": [
          "Polki Diamond Macro",
          "Pearl Luster Simulation"
        ],
        "clientType": "Heirloom Jewelry House",
        "creativeStyle": "Heritage / Luxury",
        "tools": [
          "Midjourney v6.1",
          "Topaz Photo AI"
        ],
        "featured": true
      },
      {
        "id": "creator-laxmibai-gmail-com-proj-2",
        "title": "Panna Royal — Colombian Emerald Solitaire",
        "category": "AI Photography",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Cushion-cut natural emerald ring surrounded by brilliant micro-pavé diamonds resting on raw silk.",
        "creativeDirection": "Deep forest green dispersion, authentic jardin inclusions, and warm 22k gold prongs.",
        "capabilities": [
          "Emerald Dispersion",
          "Pavé Precision"
        ],
        "clientType": "High Jewelry Salon",
        "creativeStyle": "Photorealistic / Intricate",
        "tools": [
          "Flux.1 Pro"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-6525fde5",
    "userId": "6525fde5-3a28-458c-a887-21f833ed51e0",
    "name": "Lakshmi Bai • Fine Art",
    "handle": "@lakshmi.fineart",
    "creativeIdentity": "Classical Temple Sculpture & Figurative Avatar Artist",
    "specialty": "Characters",
    "categoryTags": [
      "characters",
      "fashion",
      "ai-photography"
    ],
    "location": "Chennai / Singapore (IST/SGT)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Reimagining classical bronze temple sculptures and expressive mythological avatars with modern figurative digital painting and cinematic grading.",
    "styles": [
      "Figurative",
      "Sculptural",
      "Classical",
      "Expressive"
    ],
    "industries": [
      "Entertainment & Music",
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Figurative Avatars",
      "Bronze Patina Shading",
      "Classical Posture Design"
    ],
    "tools": [
      "Midjourney v6.1",
      "Photoshop",
      "Magnific AI"
    ],
    "platforms": [
      "ArtStation",
      "Instagram"
    ],
    "experience": "3 years figurative character AI",
    "turnaround": "4-6 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-6525fde5-proj-1",
        "title": "Natya Bronze — Mudra Motion Avatar",
        "category": "Characters",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Fine art digital character study capturing expressive hand mudras and antique bronze patina highlights.",
        "creativeDirection": "Chola bronze surface texture, dramatic rim lighting, and classical figurative dignity.",
        "capabilities": [
          "Anatomical Precision",
          "Bronze Shader"
        ],
        "clientType": "Cultural Heritage Project",
        "creativeStyle": "Figurative / Classical",
        "tools": [
          "Midjourney v6.1",
          "Magnific AI"
        ],
        "featured": true
      },
      {
        "id": "creator-6525fde5-proj-2",
        "title": "Dravidian Grace — Temple Dancer Portrait",
        "category": "Characters",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Portrayal of a traditional dancer in heavy silk pleats and temple jewelry in low-light granite corridors.",
        "creativeDirection": "Warm candlelit eye reflection, gold leaf headpiece, and soft oil painting canvas texture.",
        "capabilities": [
          "Character Seed Consistency",
          "Expressive Eyes"
        ],
        "clientType": "Performing Arts Documentary",
        "creativeStyle": "Expressive / Heritage",
        "tools": [
          "Photoshop",
          "Flux.1 Pro"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-98a3b801",
    "userId": "98a3b801-f542-4a20-a3fe-d732eebccab7",
    "name": "Mahin Sharma • Concept",
    "handle": "@mahin.visuals",
    "creativeIdentity": "Industrial Hardware & Ergonomic Wearable Technologist",
    "specialty": "Product Visuals",
    "categoryTags": [
      "product-visuals",
      "3d",
      "advertising"
    ],
    "location": "New Delhi / San Jose (IST/PST)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    "bio": "Designing tactile consumer electronics, wearable bio-trackers, and precision audio hardware with immaculate industrial studio lighting.",
    "styles": [
      "Industrial",
      "Minimal",
      "Precision",
      "Tech"
    ],
    "industries": [
      "Consumer Tech & Hardware",
      "Automotive"
    ],
    "capabilities": [
      "Hardware Stills",
      "Exploded CAD Renders",
      "Material Texturing"
    ],
    "tools": [
      "Cinema 4D",
      "KeyShot",
      "Midjourney v6.1"
    ],
    "platforms": [
      "Behance",
      "Instagram"
    ],
    "experience": "3.5 years industrial design visualization",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-98a3b801-proj-1",
        "title": "Krypton Watch — Matte Carbon Ceramic",
        "category": "Product Visuals",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Studio product shot of a matte carbon-fiber chronograph on volcanic black sand with crisp directional highlights.",
        "creativeDirection": "Carbon-fiber woven texture, satin bezel finish, and razor-sharp Swiss typography.",
        "capabilities": [
          "Matte Texture Handling",
          "Horology Studio"
        ],
        "clientType": "Tactical Watch Brand",
        "creativeStyle": "Industrial / Precision",
        "tools": [
          "KeyShot",
          "Midjourney v6.1"
        ],
        "featured": true
      },
      {
        "id": "creator-98a3b801-proj-2",
        "title": "Aether Pro — Spatial Audio Transducer",
        "category": "Product Visuals",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1585336261026-621e25e98bb4?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Minimalist desk audio hardware featuring CNC machined volume dials and brushed aluminum chassis.",
        "creativeDirection": "Micro-radial knurling texture, warm walnut desk base, and clean studio cyclorama.",
        "capabilities": [
          "Aluminum Knurling",
          "Desktop Hardware"
        ],
        "clientType": "Audiophile Hardware Startup",
        "creativeStyle": "Minimal / Tech",
        "tools": [
          "Cinema 4D"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-mahinsharma-gmail-com",
    "userId": null,
    "name": "Mahin Sharma",
    "handle": "@mahinsharma",
    "creativeIdentity": "Prestige Commercial Art Director & Perfume Packaging Sculptor",
    "specialty": "Product Visuals",
    "categoryTags": [
      "product-visuals",
      "advertising",
      "ai-photography",
      "creative-direction"
    ],
    "location": "New Delhi / Dubai (IST/GST)",
    "availability": "Available for projects",
    "statusBadge": "Top Rated",
    "heroWork": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    "bio": "Crafting iconic commercial key art for luxury fragrance houses, crystal flacons, and bespoke bottle design using high-contrast lighting.",
    "styles": [
      "Prestige",
      "Editorial",
      "Sculptural",
      "Luxury"
    ],
    "industries": [
      "Beauty & Skincare",
      "Beverage & Spirits"
    ],
    "capabilities": [
      "Fragrance Packaging",
      "Glass Caustic Simulation",
      "Commercial Key Art"
    ],
    "tools": [
      "Midjourney v6.1",
      "Photoshop",
      "Topaz Photo AI"
    ],
    "platforms": [
      "Instagram",
      "Behance"
    ],
    "experience": "4 years commercial packaging AI",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-mahinsharma-gmail-com-proj-1",
        "title": "L'Ambre Noir — Heavy Glass Flacon",
        "category": "Product Visuals",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Heavy solid crystal perfume flacon with gold magnetic cap, casting golden amber caustics on raw dark slate.",
        "creativeDirection": "Internal liquid amber refraction, crisp glass bevels, and atmospheric incense vapor swirl.",
        "capabilities": [
          "Liquid Refraction",
          "Perfume Packaging Stills"
        ],
        "clientType": "Parisian Parfumerie",
        "creativeStyle": "Luxury / Editorial",
        "tools": [
          "Midjourney v6.1",
          "Photoshop"
        ],
        "featured": true
      },
      {
        "id": "creator-mahinsharma-gmail-com-proj-2",
        "title": "Vermeil Elixir — Crystal Decanter Flacon",
        "category": "Product Visuals",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Facetted crystal fragrance decanter illuminated by sharp backlight revealing warm rose and honey hues.",
        "creativeDirection": "Sharp jewel facets, soft diffuse front fill, and clean high-end commercial packaging layout.",
        "capabilities": [
          "Crystal Shading",
          "Key Visual Design"
        ],
        "clientType": "Niche Fragrance House",
        "creativeStyle": "Prestige / Sculptural",
        "tools": [
          "Flux.1 Pro"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-c280948b",
    "userId": "c280948b-2713-4ebc-8783-c601546b1a0f",
    "name": "Marcus Vance",
    "handle": "@marcus.vance",
    "creativeIdentity": "High-Energy Athletic Advertising & Footwear Visualist",
    "specialty": "Advertising",
    "categoryTags": [
      "advertising",
      "product-visuals",
      "ai-video"
    ],
    "location": "Portland / London (PST/GMT)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    "bio": "Directing high-octane footwear campaigns, carbon-plated racing shoe reveals, and kinetic athletic advertising visuals with crisp studio strobe lighting.",
    "styles": [
      "High-Energy",
      "Athletic",
      "Bold",
      "Commercial"
    ],
    "industries": [
      "Consumer Tech & Hardware",
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Footwear Advertising",
      "Carbon Plate Visualization",
      "High-Speed Strobe"
    ],
    "tools": [
      "Midjourney v6.1",
      "Runway Gen-3",
      "Photoshop"
    ],
    "platforms": [
      "Instagram",
      "Behance"
    ],
    "experience": "3.5 years athletic brand advertising",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-c280948b-proj-1",
        "title": "Nitro Runner — Scarlet Aerodynamics",
        "category": "Advertising",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "High-contrast commercial key visual of a crimson marathon racing shoe suspended mid-stride over wet concrete.",
        "creativeDirection": "Punchy primary scarlet red, carbon fiber midsole weave detail, and water splash droplet freeze.",
        "capabilities": [
          "Footwear CGI",
          "Motion Freezing"
        ],
        "clientType": "Global Athletic Brand",
        "creativeStyle": "Athletic / High-Energy",
        "tools": [
          "Midjourney v6.1",
          "Photoshop"
        ],
        "featured": true
      },
      {
        "id": "creator-c280948b-proj-2",
        "title": "Urban Track — Lightweight Knit Trainer",
        "category": "Advertising",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Studio macro capture of breathable engineered mesh knit uppers with reflective neon lace accents.",
        "creativeDirection": "Tactile engineered knit loops, crisp directional studio strobes, and clean white seamless floor.",
        "capabilities": [
          "Textile Mesh Rendering",
          "Macro Studio"
        ],
        "clientType": "Performance Footwear Label",
        "creativeStyle": "Commercial / Bold",
        "tools": [
          "Flux.1 Pro"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-d8f8e8d9",
    "userId": "d8f8e8d9-a0f0-4d22-a470-cad8138e6542",
    "name": "Devon Sterling",
    "handle": "@devon.sterling",
    "creativeIdentity": "Artisanal Spirits & 70mm Cinematic Commercial Director",
    "specialty": "AI Video",
    "categoryTags": [
      "ai-video",
      "creative-direction",
      "advertising"
    ],
    "location": "Edinburgh / Dublin (GMT)",
    "availability": "Available for projects",
    "statusBadge": "Verified Master",
    "heroWork": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    "bio": "Directing 70mm cinematic commercials for single malt distilleries, dark cellar oak aging, and amber liquid turbulence.",
    "styles": [
      "70mm Cinematic",
      "Atmospheric",
      "Rich Amber",
      "Story-driven"
    ],
    "industries": [
      "Beverage & Spirits",
      "Food & Beverage"
    ],
    "capabilities": [
      "Liquid Cinematography",
      "Distillery Ambiance",
      "Oak Cask Worldbuilding"
    ],
    "tools": [
      "Kling 1.5",
      "Runway Gen-3",
      "DaVinci Resolve Studio"
    ],
    "platforms": [
      "Vimeo",
      "YouTube"
    ],
    "experience": "4.5 years spirits commercials",
    "turnaround": "4-6 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-d8f8e8d9-proj-1",
        "title": "Highland Solitude — 30-Year Single Malt",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Cinematic commercial following golden amber whisky swirling inside a crystal tumbler next to glowing fireplace embers.",
        "creativeDirection": "Warm golden brown palette, micro-liquid viscosity legs on crystal glass, and rich crackling wood ambience.",
        "capabilities": [
          "Liquid Swirl Simulation",
          "Firelight Grading"
        ],
        "clientType": "Historic Speyside Distillery",
        "creativeStyle": "70mm Cinematic / Rich Amber",
        "tools": [
          "Kling 1.5",
          "DaVinci Resolve"
        ],
        "featured": true
      },
      {
        "id": "creator-d8f8e8d9-proj-2",
        "title": "Copper Stillhouse — Dawn Distillation",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Slow-motion sequence through historic copper pot stills gleaming under morning skylight rays.",
        "creativeDirection": "Polished copper caustics, soft steam wisps, and historic architectural majesty.",
        "capabilities": [
          "Industrial Architecture",
          "Atmospheric Steam"
        ],
        "clientType": "Artisanal Craft Spirits",
        "creativeStyle": "Atmospheric / Story-driven",
        "tools": [
          "Runway Gen-3"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-9518942b",
    "userId": "9518942b-f9a6-4364-b0b0-6aa5afa3f78a",
    "name": "Elena Milano",
    "handle": "@elena.milano.couture",
    "creativeIdentity": "Milanese Sartorial Tailoring & Cashmere Editorialist",
    "specialty": "Fashion",
    "categoryTags": [
      "fashion",
      "advertising",
      "creative-direction",
      "ai-photography"
    ],
    "location": "Milan (CET)",
    "availability": "Available for projects",
    "statusBadge": "Top Rated",
    "heroWork": "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Celebrating Milanese sartorial elegance, double-faced cashmere overcoats, and refined Galleria Vittorio Emanuele editorial spreads.",
    "styles": [
      "Sartorial",
      "Milanese",
      "Luxury",
      "Editorial"
    ],
    "industries": [
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Sartorial Tailoring",
      "Cashmere Physics",
      "Italian Architecture Framing"
    ],
    "tools": [
      "Flux.1 Pro",
      "Midjourney v6.1",
      "Photoshop"
    ],
    "platforms": [
      "Instagram",
      "Vogue Italia"
    ],
    "experience": "4 years fashion art direction",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-9518942b-proj-1",
        "title": "Galleria Autumn — Double-Faced Cashmere",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Editorial lookbook shot under Milanese vaulted glass domes featuring camel cashmere coats and handcrafted leather gloves.",
        "creativeDirection": "Soft autumnal overcast light, flawless Italian drape, and marble mosaic floor reflections.",
        "capabilities": [
          "Cashmere Realism",
          "Italian Editorial Staging"
        ],
        "clientType": "Via Montenapoleone Fashion House",
        "creativeStyle": "Sartorial / Milanese",
        "tools": [
          "Flux.1 Pro",
          "Midjourney v6.1"
        ],
        "featured": true
      },
      {
        "id": "creator-9518942b-proj-2",
        "title": "Palazzo Tramonto — Sunset Silk Shirting",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Golden hour lookbook on a Renaissance rooftop terrace capturing fluid printed silk scarves billowing in the breeze.",
        "creativeDirection": "Warm golden raking light, terracotta rooftop skyline, and effortless Italian sprezzatura.",
        "capabilities": [
          "Silk Motion",
          "Sunset Palette"
        ],
        "clientType": "Prestige Italian Silk Label",
        "creativeStyle": "Luxury / Editorial",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-e4089cc2",
    "userId": "e4089cc2-a949-4917-b48b-082f39f0c2d1",
    "name": "Elias Thorne",
    "handle": "@elias.thorne.motion",
    "creativeIdentity": "LED Volume Virtual Production & Cyber Gladiator Director",
    "specialty": "AI Video",
    "categoryTags": [
      "ai-video",
      "advertising",
      "characters"
    ],
    "location": "Berlin / Vancouver (CET/PST)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    "bio": "Directing cinematic LED volume environments, gritty dystopian action sequences, and cybernetic character battles for next-gen entertainment.",
    "styles": [
      "Dystopian",
      "Gritty",
      "Action",
      "Cybernetic"
    ],
    "industries": [
      "Entertainment & Music",
      "Consumer Tech & Hardware"
    ],
    "capabilities": [
      "Virtual Production",
      "Action Choreography",
      "Cybernetic Detailing"
    ],
    "tools": [
      "Kling 1.5",
      "Runway Gen-3",
      "Unreal Engine 5"
    ],
    "platforms": [
      "YouTube",
      "Vimeo"
    ],
    "experience": "3.5 years cinematic video AI",
    "turnaround": "4-6 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-e4089cc2-proj-1",
        "title": "Chrono Gladiator — Neo-Colosseum Duel",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Trailer sequence showcasing cybernetic gladiators sparring inside an electrified holographic arena.",
        "creativeDirection": "Electric blue particle arcs, sparks flying off titanium armor plating, and intense low-angle framing.",
        "capabilities": [
          "Action CGI",
          "Sparks & Particle Simulation"
        ],
        "clientType": "AAA Game Studio",
        "creativeStyle": "Dystopian / Action",
        "tools": [
          "Kling 1.5",
          "Runway Gen-3"
        ],
        "featured": true
      },
      {
        "id": "creator-e4089cc2-proj-2",
        "title": "Neon Alley Chase — Wet Asphalt Pursuit",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Camera tracking through rain-swept alleys with neon signboards reflecting in puddles as hovercrafts streak overhead.",
        "creativeDirection": "Cinematic rain sheets, puddles caustic reflections, and rich neon chromatic contrast.",
        "capabilities": [
          "Rain Environment",
          "High-Speed Tracking"
        ],
        "clientType": "Cyberpunk Streaming Series",
        "creativeStyle": "Gritty / Cybernetic",
        "tools": [
          "Runway Gen-3"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-f99954d4",
    "userId": "f99954d4-3f60-45b0-b964-8165328efc53",
    "name": "Elena Milano • Alta Moda",
    "handle": "@elena.altamoda",
    "creativeIdentity": "Venetian Baroque Brocade & Gold Leaf Atelier Artist",
    "specialty": "Fashion",
    "categoryTags": [
      "fashion",
      "ai-photography",
      "creative-direction"
    ],
    "location": "Venice / Milan (CET)",
    "availability": "Available for projects",
    "statusBadge": "Verified Master",
    "heroWork": "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Recreating the decadent grandeur of Venetian masquerades, gilded gold-leaf embroidery, and hand-loomed metallic brocade evening wear.",
    "styles": [
      "Baroque",
      "Gilded",
      "Alta Moda",
      "Opulent"
    ],
    "industries": [
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Gold Leaf Embroidery",
      "Venetian Textile Draping",
      "Grand Ballroom Staging"
    ],
    "tools": [
      "Midjourney v6.1",
      "Flux.1 Pro",
      "Photoshop"
    ],
    "platforms": [
      "Instagram",
      "Alta Moda Runway"
    ],
    "experience": "4.5 years couture AI",
    "turnaround": "4-6 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-f99954d4-proj-1",
        "title": "Palazzo Ducale — Gold Leaf Gilded Gown",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Haute couture gown encrusted with hand-applied 24k gold leaf and Venetian needle lace, photographed in a candlelit grand salon.",
        "creativeDirection": "Warm candle flicker, metallic gold sheen, and heavy regal silhouette.",
        "capabilities": [
          "Gold Leaf Physics",
          "Chandelier Backlighting"
        ],
        "clientType": "Venetian Luxury Atelier",
        "creativeStyle": "Baroque / Alta Moda",
        "tools": [
          "Flux.1 Pro",
          "Midjourney v6.1"
        ],
        "featured": true
      },
      {
        "id": "creator-f99954d4-proj-2",
        "title": "Maschera Nobile — Velvet & Filigree Mask",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Close-up portrait of a model wearing an intricate brass filigree masquerade mask adorned with black Swarovski crystals.",
        "creativeDirection": "Black velvet micro-nap texture, sparkling crystal facets, and mysterious eye contact.",
        "capabilities": [
          "Filigree Detailing",
          "Velvet Shading"
        ],
        "clientType": "Carnival of Venice Gala",
        "creativeStyle": "Gilded / Opulent",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-9f3728fe",
    "userId": "9f3728fe-b717-4acf-9ab5-b5bf861ba4c4",
    "name": "Laxmi Bai • Spatial",
    "handle": "@laxmibai.spatial",
    "creativeIdentity": "Stepwell Geometric Architecture & Acoustic Space Sculptor",
    "specialty": "3D",
    "categoryTags": [
      "3d",
      "creative-direction",
      "product-visuals"
    ],
    "location": "Jaipur / Zurich (IST/CET)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Synthesizing hypnotic Indian stepwell staircases, subterranean thermal pools, and acoustic sandstone pavilions for world-class wellness architecture.",
    "styles": [
      "Geometric",
      "Architectural",
      "Stepwell",
      "Meditative"
    ],
    "industries": [
      "Architecture & Hospitality",
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Stepwell Geometry",
      "Subterranean Pools",
      "Acoustic Architecture"
    ],
    "tools": [
      "Blender",
      "Unreal Engine 5",
      "Midjourney v6.1"
    ],
    "platforms": [
      "ArtStation",
      "Architectural Digest"
    ],
    "experience": "4 years spatial AI design",
    "turnaround": "4-7 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-9f3728fe-proj-1",
        "title": "Chand Baori Reimagined — Subterranean Spa",
        "category": "3D",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Geometric stepwell pavilion with turquoise mineral thermal pools descending into cool sandstone chambers.",
        "creativeDirection": "Mesmerizing repetitive stair geometry, turquoise water caustics, and golden top-down skylight.",
        "capabilities": [
          "Stepwell Matrix",
          "Water Caustics in Stone"
        ],
        "clientType": "International Wellness Sanctuary",
        "creativeStyle": "Geometric / Meditative",
        "tools": [
          "Blender",
          "Unreal Engine 5"
        ],
        "featured": true
      },
      {
        "id": "creator-9f3728fe-proj-2",
        "title": "Jali Pavilion — Brass Acoustic Screens",
        "category": "3D",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Modern brass jali perforated screens casting intricate geometric sunlight tapestries across white marble corridors.",
        "creativeDirection": "Crisp laser-cut brass shadows, marble floor reflection, and pure architectural calm.",
        "capabilities": [
          "Perforated Screen Shadows",
          "Marble Lighting"
        ],
        "clientType": "Luxury Design Center",
        "creativeStyle": "Architectural / Minimal",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-6f5f07e1",
    "userId": "6f5f07e1-8a8c-4391-80a4-3d99b1b6b345",
    "name": "Laxya Gaba",
    "handle": "@laxyagaba",
    "creativeIdentity": "Prestige Beverage & Liquid Kinetic Splash Specialist",
    "specialty": "Product Visuals",
    "categoryTags": [
      "product-visuals",
      "advertising",
      "ai-photography",
      "social-content"
    ],
    "location": "New Delhi / Singapore (IST/SGT)",
    "availability": "Available for projects",
    "statusBadge": "Top Rated",
    "heroWork": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    "bio": "Pioneering hyper-speed fluid splash photography, crystal wine goblet refractions, and luxury beverage advertising campaigns.",
    "styles": [
      "Liquid Splash",
      "Photorealistic",
      "Beverage",
      "Dynamic"
    ],
    "industries": [
      "Beverage & Spirits",
      "Food & Beverage"
    ],
    "capabilities": [
      "Liquid Splash Dynamics",
      "Crystal Wine Goblets",
      "Ice Caustic Simulation"
    ],
    "tools": [
      "Midjourney v6.1",
      "Flux.1 Pro",
      "Topaz Photo AI"
    ],
    "platforms": [
      "Instagram",
      "Behance"
    ],
    "experience": "3.5 years beverage advertising AI",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-6f5f07e1-proj-1",
        "title": "Bordeaux Noir — Vintage Cabernet Splash",
        "category": "Product Visuals",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Studio macro capture of deep crimson wine swirling and splashing out of a crystal balloon goblet in mid-air.",
        "creativeDirection": "Translucent ruby wine rim illumination, suspended micro-droplets, and pitch black infinity background.",
        "capabilities": [
          "Wine Swirl Physics",
          "Crystal Glass Refraction"
        ],
        "clientType": "Grand Cru Wine Estate",
        "creativeStyle": "Liquid Splash / Luxury",
        "tools": [
          "Midjourney v6.1",
          "Topaz Photo AI"
        ],
        "featured": true
      },
      {
        "id": "creator-6f5f07e1-proj-2",
        "title": "Botanical Tonic — Ice Vortex Splash",
        "category": "Product Visuals",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Clear artisan gin and tonic with a carved clear ice sphere and lime wheel erupting in crisp bubbly splash.",
        "creativeDirection": "Effervescent carbonation bubbles, crystalline carved ice cube clarity, and citrus peel oils.",
        "capabilities": [
          "Carbonation Simulation",
          "Ice Lighting"
        ],
        "clientType": "Premium Tonic Brand",
        "creativeStyle": "Photorealistic / Dynamic",
        "tools": [
          "Flux.1 Pro"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-677d32e5",
    "userId": "677d32e5-273d-4f3c-87be-6d37117c0ac5",
    "name": "Astrid Lindholm",
    "handle": "@astrid.nordic",
    "creativeIdentity": "Nordic Fjord & Glacial Drone Cinematography Director",
    "specialty": "AI Video",
    "categoryTags": [
      "ai-video",
      "ai-photography",
      "creative-direction"
    ],
    "location": "Oslo / Tromsø (CET)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Crafting hypnotic cinematic journeys over Norwegian fjords, blue glacial ice shelves, and minimalist Arctic architecture.",
    "styles": [
      "Nordic Noir",
      "Glacial",
      "Cinematic",
      "Minimal"
    ],
    "industries": [
      "Architecture & Hospitality",
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Glacial Aerial Tracking",
      "Arctic Lighting",
      "Documentary Cinematography"
    ],
    "tools": [
      "Kling 1.5",
      "Runway Gen-3",
      "DaVinci Resolve"
    ],
    "platforms": [
      "Vimeo",
      "YouTube"
    ],
    "experience": "3 years Arctic visual direction",
    "turnaround": "4-6 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-677d32e5-proj-1",
        "title": "Glacier Blue — Silent Arctic Yacht",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Electric expedition vessel silently cruising through ice floes beneath towering blue glacial walls.",
        "creativeDirection": "Ethereal cyan and sapphire ice caustics, crisp sub-zero air clarity, and mirror fjord reflections.",
        "capabilities": [
          "Ice Physics",
          "Drone Landscape Moves"
        ],
        "clientType": "Luxury Arctic Expeditions",
        "creativeStyle": "Glacial / Cinematic",
        "tools": [
          "Runway Gen-3",
          "DaVinci Resolve"
        ],
        "featured": true
      },
      {
        "id": "creator-677d32e5-proj-2",
        "title": "Taiga Solitude — Snow-Covered Pines",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Low-altitude drone skim over snow-dusted pine canopies during blue-hour winter twilight.",
        "creativeDirection": "Soft powder snow blowing off branches, deep indigo twilight, and peaceful quietude.",
        "capabilities": [
          "Snow Particle Physics",
          "Forest Flying"
        ],
        "clientType": "Nordic Tourism Board",
        "creativeStyle": "Nordic Noir / Minimal",
        "tools": [
          "Kling 1.5"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-b50f2c34",
    "userId": "b50f2c34-4581-4aa9-93b4-582461065cc7",
    "name": "Aviraj Singh",
    "handle": "@avirajsingh",
    "creativeIdentity": "FPV Action Cinematography & Cyber Mobility Director",
    "specialty": "AI Video",
    "categoryTags": [
      "ai-video",
      "3d",
      "creative-direction",
      "advertising"
    ],
    "location": "Mumbai / Dubai (IST/GST)",
    "availability": "Available for projects",
    "statusBadge": "Verified Master",
    "heroWork": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    "bio": "Pioneering high-velocity FPV drone tracking, dynamic night superbike sprints, and supersonic VTOL mobility visual campaigns.",
    "styles": [
      "High-Velocity",
      "FPV Drone",
      "Cyberpunk",
      "Cinematic"
    ],
    "industries": [
      "Automotive",
      "Entertainment & Music"
    ],
    "capabilities": [
      "FPV Drone Simulation",
      "Superbike Cinematography",
      "Action Pacing"
    ],
    "tools": [
      "Kling 1.5",
      "Runway Gen-3",
      "Premiere Pro"
    ],
    "platforms": [
      "YouTube",
      "Instagram"
    ],
    "experience": "4 years high-speed action AI",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-b50f2c34-proj-1",
        "title": "Apex Sprint — Cyber Mumbai Highway",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Adrenaline-fueled night pursuit following an electric superbike weaving through sea-link bridge traffic.",
        "creativeDirection": "Dynamic banking camera angles, neon taillight light trails, and asphalt grit.",
        "capabilities": [
          "FPV Banking Camera",
          "Night Motion Blur"
        ],
        "clientType": "Performance Motorcycle Brand",
        "creativeStyle": "High-Velocity / Action",
        "tools": [
          "Kling 1.5",
          "Premiere Pro"
        ],
        "featured": true
      },
      {
        "id": "creator-b50f2c34-proj-2",
        "title": "Hyper-Drive GT — Neon Tunnel Acceleration",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Tracking camera keeping pace with a modified hypercar launching down an illuminated underwater tunnel.",
        "creativeDirection": "Synchronized ceiling strobe pulses, motion streak reflections on curved glass, and engine roar sync.",
        "capabilities": [
          "Tunnel Lighting Sync",
          "Automotive Dynamics"
        ],
        "clientType": "International Tuning House",
        "creativeStyle": "Cinematic / Cyberpunk",
        "tools": [
          "Runway Gen-3"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-824f35f4",
    "userId": "824f35f4-c01e-40e3-b79f-1aa5ea586925",
    "name": "Elena Nova",
    "handle": "@elena.nova.dir",
    "creativeIdentity": "Avant-Garde Commercial Director & Multi-Screen Visionary",
    "specialty": "Creative Direction",
    "categoryTags": [
      "creative-direction",
      "ai-video",
      "advertising",
      "fashion"
    ],
    "location": "Berlin / Paris (CET)",
    "availability": "Available for projects",
    "statusBadge": "Top Rated",
    "heroWork": "https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Orchestrating multi-channel commercial campaigns, surrealist desert installations, and high-fashion perfume TV spots for European luxury brands.",
    "styles": [
      "Avant-Garde",
      "Surreal",
      "Multi-Screen",
      "Fashion Forward"
    ],
    "industries": [
      "Luxury & High Fashion",
      "Beauty & Skincare"
    ],
    "capabilities": [
      "Multi-Screen Direction",
      "Surreal Spatial Staging",
      "Commercial Television Spots"
    ],
    "tools": [
      "Midjourney v6.1",
      "Runway Gen-3",
      "DaVinci Resolve"
    ],
    "platforms": [
      "Television OOH",
      "Vimeo",
      "Instagram"
    ],
    "experience": "5 years luxury commercial direction",
    "turnaround": "5-8 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-824f35f4-proj-1",
        "title": "Mirage Pavilion — Desert Glass Cube",
        "category": "Creative Direction",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "A mirrored glass cube reflecting sand dunes and sky in an endless surreal feedback loop during an haute couture commercial.",
        "creativeDirection": "Mirrored glass reflections, heat haze refraction, and avant-garde couture gown styling.",
        "capabilities": [
          "Surreal Installation",
          "Commercial Direction"
        ],
        "clientType": "Global Fragrance Maison",
        "creativeStyle": "Avant-Garde / Surreal",
        "tools": [
          "Midjourney v6.1",
          "Runway Gen-3"
        ],
        "featured": true
      },
      {
        "id": "creator-824f35f4-proj-2",
        "title": "Atelier Lumière — Camera Studio Stills",
        "category": "Creative Direction",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Behind-the-scenes aesthetic capture of high-end camera rigs and lighting setups inside an all-white soundstage.",
        "creativeDirection": "Clean studio geometry, warm spotlight beam, and sophisticated director portfolio mood.",
        "capabilities": [
          "Studio Direction",
          "Lighting Design"
        ],
        "clientType": "Commercial Production Co.",
        "creativeStyle": "Fashion Forward / Editorial",
        "tools": [
          "DaVinci Resolve",
          "Flux.1 Pro"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "test-user-1792790966312",
    "userId": null,
    "name": "Kaelen Vance",
    "handle": "@kaelen.vance",
    "creativeIdentity": "Digital Human Sculptor & High-Fashion Meta-Model Seed Designer",
    "specialty": "Characters",
    "categoryTags": [
      "characters",
      "3d",
      "ai-photography"
    ],
    "location": "Los Angeles / London (PST/GMT)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    "bio": "Creating hyper-consistent virtual models, consistent facial micro-expression seeds, and digital runway ambassadors for international beauty brands.",
    "styles": [
      "Meta-Human",
      "Photoreal",
      "Beauty",
      "Expressive"
    ],
    "industries": [
      "Beauty & Skincare",
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Digital Human Seeds",
      "Consistent Face Retargeting",
      "High-Fashion Avatars"
    ],
    "tools": [
      "ComfyUI",
      "Midjourney v6.1",
      "Magnific AI"
    ],
    "platforms": [
      "Instagram",
      "Metaverse Runways"
    ],
    "experience": "3 years digital humans",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "test-user-1792790966312-proj-1",
        "title": "Selah 01 — Virtual Skin Micro-Pore Study",
        "category": "Characters",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Macro beauty portrait of a digital model showcasing individual skin pores, fine peach fuzz, and realistic eye hydration.",
        "creativeDirection": "Zero artificial smoothing, natural studio softbox lighting, and piercing hazel gaze.",
        "capabilities": [
          "Micro-Pore Simulation",
          "Eye Hydration Physics"
        ],
        "clientType": "International Beauty House",
        "creativeStyle": "Meta-Human / Photoreal",
        "tools": [
          "ComfyUI",
          "Magnific AI"
        ],
        "featured": true
      },
      {
        "id": "test-user-1792790966312-proj-2",
        "title": "Gabriel — Sculptural Menswear Avatar",
        "category": "Characters",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Editorial portrait of a male digital model with defined cheekbone shadows and classic European tailoring.",
        "creativeDirection": "Rembrandt key light, subtle stubble texture, and confident editorial expression.",
        "capabilities": [
          "Male Character Seed",
          "Classic Studio Lighting"
        ],
        "clientType": "Men's Luxury Lookbook",
        "creativeStyle": "Beauty / Expressive",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "test-user-1792792546931",
    "userId": null,
    "name": "Zephyr Holographics",
    "handle": "@zephyr.holographics",
    "creativeIdentity": "Spatial Computing Holograms & Spatial UI Render Specialist",
    "specialty": "3D",
    "categoryTags": [
      "3d",
      "ai-video",
      "creative-direction"
    ],
    "location": "San Francisco / Austin (PST/CST)",
    "availability": "Available for projects",
    "statusBadge": "Verified Master",
    "heroWork": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    "bio": "Pioneering spatial computing visuals, volumetric holographic interfaces, and floating optical prisms for augmented reality keynotes.",
    "styles": [
      "Spatial Computing",
      "Holographic",
      "3D",
      "Clean Tech"
    ],
    "industries": [
      "Consumer Tech & Hardware",
      "Automotive"
    ],
    "capabilities": [
      "Spatial UI Design",
      "Volumetric Holograms",
      "AR Optics"
    ],
    "tools": [
      "Unreal Engine 5",
      "Cinema 4D",
      "Midjourney v6.1"
    ],
    "platforms": [
      "Vision Pro",
      "YouTube",
      "Behance"
    ],
    "experience": "4 years spatial UI & 3D",
    "turnaround": "4-6 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "test-user-1792792546931-proj-1",
        "title": "Aura Glass OS — Spatial Navigation Matrix",
        "category": "3D",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Volumetric 3D spatial user interface glowing in semi-translucent glass widgets above a dark metallic cockpit.",
        "creativeDirection": "Floating optical refraction, neon blue edge glow, and crisp geometric vector typography.",
        "capabilities": [
          "Spatial UI Prototyping",
          "Volumetric Widgets"
        ],
        "clientType": "Next-Gen Headset Manufacturer",
        "creativeStyle": "Spatial Computing / Holographic",
        "tools": [
          "Unreal Engine 5",
          "Cinema 4D"
        ],
        "featured": true
      },
      {
        "id": "test-user-1792792546931-proj-2",
        "title": "Synapse Lattice — Optical Data Stream",
        "category": "3D",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Cascading matrix of green and teal data nodes flowing through a dark subterranean server farm.",
        "creativeDirection": "High-contrast digital phosphor glow, volumetric dust, and rapid optical depth.",
        "capabilities": [
          "Data Stream Simulation",
          "Tech CGI"
        ],
        "clientType": "Cybersecurity Platform",
        "creativeStyle": "Clean Tech / 3D",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "test-user-1792793145945",
    "userId": null,
    "name": "Zephyr Worldbuilding Lab",
    "handle": "@zephyr.worlds",
    "creativeIdentity": "Planetary Mega-Engineering & Exo-Atmosphere Visual Director",
    "specialty": "AI Video",
    "categoryTags": [
      "ai-video",
      "3d",
      "creative-direction"
    ],
    "location": "Austin / Tokyo (CST/JST)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    "bio": "Visualizing planetary scale terraforming, orbital elevators, and speculative mega-structures for luxury sci-fi franchise releases.",
    "styles": [
      "Exo-Planetary",
      "Monumental",
      "Cinematic",
      "Epic"
    ],
    "industries": [
      "Entertainment & Music",
      "Consumer Tech & Hardware"
    ],
    "capabilities": [
      "Planetary Worldbuilding",
      "Orbital Cinematography",
      "Mega-Structure CGI"
    ],
    "tools": [
      "Kling 1.5",
      "Runway Gen-3",
      "Midjourney v6.1"
    ],
    "platforms": [
      "YouTube",
      "Vimeo"
    ],
    "experience": "4 years planetary worldbuilding",
    "turnaround": "4-7 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "test-user-1792793145945-proj-1",
        "title": "Terra Luna — Blue Planet Orbital Arc",
        "category": "AI Video",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Breathtaking orbital cinematic pass over atmospheric cloud formations and azure oceans illuminated by sun-rise flare.",
        "creativeDirection": "Atmospheric rayleigh scattering, photoreal curvature of the earth, and pure quiet cosmic solitude.",
        "capabilities": [
          "Orbital Render",
          "Sun Flare Optics"
        ],
        "clientType": "Space Exploration Documentary",
        "creativeStyle": "Exo-Planetary / Monumental",
        "tools": [
          "Runway Gen-3",
          "Midjourney v6.1"
        ],
        "featured": true
      },
      {
        "id": "test-user-1792793145945-proj-2",
        "title": "Nebula Cradle — Deep Space Gas Giant",
        "category": "AI Video",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Swirling gaseous hydrogen clouds in deep magenta and indigo illuminated by a distant dying neutron star.",
        "creativeDirection": "Fluid cosmic gas turbulence, sparkling stellar nurseries, and rich cinematic color grading.",
        "capabilities": [
          "Nebula Fluid Simulation",
          "Cosmic Lighting"
        ],
        "clientType": "Sci-Fi Video Game Franchise",
        "creativeStyle": "Cinematic / Epic",
        "tools": [
          "Kling 1.5"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-7a0c5ac0",
    "userId": "7a0c5ac0-c8a6-4801-af8e-5aa59b107bb6",
    "name": "Amira Sadek",
    "handle": "@amira.sadek",
    "creativeIdentity": "Arabian Contemporary Luxury & Desert Editorial Advertiser",
    "specialty": "Advertising",
    "categoryTags": [
      "advertising",
      "social-content",
      "product-visuals"
    ],
    "location": "Riyadh / Dubai (AST/GST)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Directing high-end advertising visuals for Middle Eastern luxury hospitality, bespoke oud fragrances, and modern Arabian architecture.",
    "styles": [
      "Arabian Luxury",
      "Desert Gold",
      "Architectural",
      "Editorial"
    ],
    "industries": [
      "Architecture & Hospitality",
      "Beauty & Skincare"
    ],
    "capabilities": [
      "Desert Hospitality Stills",
      "Oud Bottle Advertising",
      "Architectural Shadows"
    ],
    "tools": [
      "Midjourney v6.1",
      "Flux.1 Pro",
      "Photoshop"
    ],
    "platforms": [
      "Instagram",
      "Harper's Bazaar Arabia"
    ],
    "experience": "3.5 years Middle Eastern luxury advertising",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-7a0c5ac0-proj-1",
        "title": "Dune Oasis — AlUla Starlight Resort",
        "category": "Advertising",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Sweeping sunrise campaign across wind-carved red desert dunes framing an ultra-luxury eco-resort canopy.",
        "creativeDirection": "Warm ochre and rose gold sands, soft wind-blown ridge shadows, and pristine luxury hospitality framing.",
        "capabilities": [
          "Desert Scale",
          "Resort Key Visual"
        ],
        "clientType": "AlUla Hospitality Group",
        "creativeStyle": "Arabian Luxury / Desert Gold",
        "tools": [
          "Midjourney v6.1",
          "Flux.1 Pro"
        ],
        "featured": true
      },
      {
        "id": "creator-7a0c5ac0-proj-2",
        "title": "Burj Silhouette — Sunset Glass Horizon",
        "category": "Advertising",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Panoramic dusk cityscape capturing glittering high-rise glass reflections as golden hour transitions to blue night.",
        "creativeDirection": "Glowing architectural spires, calm coastal lagoon reflections, and rich warm evening hues.",
        "capabilities": [
          "Skyline Key Art",
          "Cityscape Retouching"
        ],
        "clientType": "Prestige Real Estate Development",
        "creativeStyle": "Architectural / Editorial",
        "tools": [
          "Flux.1 Pro"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "test-user-1792793669337",
    "userId": null,
    "name": "Zephyr Spatial Media",
    "handle": "@zephyr.spatial",
    "creativeIdentity": "Viral Holographic Loops & AR Product Reveal Specialist",
    "specialty": "Social Content",
    "categoryTags": [
      "social-content",
      "3d",
      "advertising"
    ],
    "location": "San Francisco / London (PST/GMT)",
    "availability": "Available for projects",
    "statusBadge": "Trending",
    "heroWork": "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    "bio": "Creating thumb-stopping holographic loops, iridescent product reveals, and TikTok viral 3D transitions for breakthrough tech and sneaker launches.",
    "styles": [
      "Iridescent",
      "Holographic",
      "Viral Hook",
      "Fast Paced"
    ],
    "industries": [
      "Consumer Tech & Hardware",
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "9:16 AR Hooks",
      "Holographic Sneaker Reveals",
      "Loop Optimization"
    ],
    "tools": [
      "Cinema 4D",
      "Runway Gen-3",
      "CapCut"
    ],
    "platforms": [
      "TikTok",
      "Instagram Reels"
    ],
    "experience": "3 years viral 3D loops",
    "turnaround": "2-4 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "test-user-1792793669337-proj-1",
        "title": "Chroma Shift — Iridescent Gradient Pulse",
        "category": "Social Content",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Seamless 9:16 holographic transition shifting through spectral rainbow gradients for viral smartphone teasers.",
        "creativeDirection": "Velvety chromatic transitions, vibrant color saturations, and optical lens flare sweeps.",
        "capabilities": [
          "Holographic Gradients",
          "Seamless Loops"
        ],
        "clientType": "Next-Gen Smartphone Brand",
        "creativeStyle": "Iridescent / Viral Hook",
        "tools": [
          "Cinema 4D",
          "CapCut"
        ],
        "featured": true
      },
      {
        "id": "test-user-1792793669337-proj-2",
        "title": "Neon Strobe Wand — Cyber Glow Product Reveal",
        "category": "Social Content",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Fast-paced product reveal illuminated by moving handheld neon light tubes in a dark mirrored chamber.",
        "creativeDirection": "Dynamic light streak trails, high-contrast silhouette edge highlights, and quick cut transitions.",
        "capabilities": [
          "Light Painting",
          "Fast-Paced Motion"
        ],
        "clientType": "Gen-Z Gaming Peripheral",
        "creativeStyle": "Holographic / Fast Paced",
        "tools": [
          "Runway Gen-3"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-d065bbf3",
    "userId": "d065bbf3-5cb0-49f7-9a5c-428564b66abe",
    "name": "Xavier F. Dubois",
    "handle": "@xavier.dubois",
    "creativeIdentity": "Brutalist Concrete & Technical Streetwear Visualist",
    "specialty": "Fashion",
    "categoryTags": [
      "fashion",
      "advertising",
      "ai-photography"
    ],
    "location": "Berlin / Paris (CET)",
    "availability": "Available for projects",
    "statusBadge": "Verified Pro",
    "heroWork": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    "bio": "Fusing technical GORE-TEX outerwear, modular utility harnesses, and raw brutalist concrete monoliths into uncompromising fashion editorials.",
    "styles": [
      "Technical Streetwear",
      "Brutalist",
      "High-Contrast",
      "Industrial"
    ],
    "industries": [
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Technical Outerwear",
      "Brutalist Staging",
      "Raw 35mm Grain"
    ],
    "tools": [
      "Midjourney v6.1",
      "Flux.1 Pro",
      "Lightroom"
    ],
    "platforms": [
      "Instagram",
      "Hypebeast"
    ],
    "experience": "3 years techwear fashion AI",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-d065bbf3-proj-1",
        "title": "Monolith GORE-TEX — Bunker Editorial",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Technical weatherproof hooded parka with bonded seam tape, photographed in a raw concrete nuclear bunker.",
        "creativeDirection": "Rough textured concrete background, matte waterproof fabric sheen, and grim overcast daylight.",
        "capabilities": [
          "Bonded Seam Realism",
          "Monolithic Backgrounds"
        ],
        "clientType": "Berlin Technical Streetwear Label",
        "creativeStyle": "Technical Streetwear / Brutalist",
        "tools": [
          "Flux.1 Pro",
          "Lightroom"
        ],
        "featured": true
      },
      {
        "id": "creator-d065bbf3-proj-2",
        "title": "Modular Harness — Urban Functionalist",
        "category": "Fashion",
        "aspect": "portrait",
        "image": "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Tactical nylon utility vest with Cobra buckles worn over heavyweight fleece in brutalist subway station.",
        "creativeDirection": "Heavy shadow undercuts, crisp nylon strap weaving, and cold industrial color grading.",
        "capabilities": [
          "Hardware Buckle Detail",
          "Urban Subsurface"
        ],
        "clientType": "Avant-Garde Utility Brand",
        "creativeStyle": "Industrial / High-Contrast",
        "tools": [
          "Midjourney v6.1"
        ],
        "featured": false
      }
    ]
  },
  {
    "id": "creator-79484bc4",
    "userId": "79484bc4-6d64-4ef4-a574-8cebffdacd53",
    "name": "Esther De Vries",
    "handle": "@esther.devries",
    "creativeIdentity": "Dutch Golden Age Chiaroscuro & Still Life Photographer",
    "specialty": "AI Photography",
    "categoryTags": [
      "ai-photography",
      "product-visuals",
      "creative-direction"
    ],
    "location": "Amsterdam / Antwerp (CET)",
    "availability": "Available for projects",
    "statusBadge": "Verified Master",
    "heroWork": "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=85",
    "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    "bio": "Channeling Johannes Vermeer and Dutch Golden Age masters into contemporary still life photography, heirloom ceramics, and dramatic chiaroscuro lighting.",
    "styles": [
      "Dutch Golden Age",
      "Chiaroscuro",
      "Still Life",
      "Moody"
    ],
    "industries": [
      "Food & Beverage",
      "Beauty & Skincare",
      "Luxury & High Fashion"
    ],
    "capabilities": [
      "Chiaroscuro Lighting",
      "Dutch Still Life",
      "Vintage Glassware Macro"
    ],
    "tools": [
      "Midjourney v6.1",
      "Photoshop",
      "Lightroom"
    ],
    "platforms": [
      "Instagram",
      "Fine Art Biennales"
    ],
    "experience": "4 years fine art photography AI",
    "turnaround": "3-5 days delivery",
    "featured": true,
    "isDemo": false,
    "projects": [
      {
        "id": "creator-79484bc4-proj-1",
        "title": "Vanitas Éternelle — Dark Botanical Study",
        "category": "AI Photography",
        "aspect": "square",
        "image": "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Opulent floral bouquet of dark purple roses, ripe figs, and peeling citrus resting on a dark walnut table.",
        "creativeDirection": "Single north-facing window light shaft, velvet black shadows, and rich Flemish painterly color depth.",
        "capabilities": [
          "Chiaroscuro North Light",
          "Petal Translucency"
        ],
        "clientType": "Artisan Apothecary Line",
        "creativeStyle": "Dutch Golden Age / Chiaroscuro",
        "tools": [
          "Midjourney v6.1",
          "Lightroom"
        ],
        "featured": true
      },
      {
        "id": "creator-79484bc4-proj-2",
        "title": "Pewter & Pomegranate — The Winter Banquet",
        "category": "AI Photography",
        "aspect": "landscape",
        "image": "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1200&q=85",
        "video": null,
        "description": "Antique pewter chalice, cracked pomegranate spilling ruby seeds, and unpolished silver cutlery on linen.",
        "creativeDirection": "Subtle specular highlights on aged pewter, ruby seed jewel tones, and textured Flemish linen.",
        "capabilities": [
          "Aged Metal Textures",
          "Still Life Staging"
        ],
        "clientType": "Gastronomic Journal Cover",
        "creativeStyle": "Still Life / Moody",
        "tools": [
          "Midjourney v6.1",
          "Photoshop"
        ],
        "featured": false
      }
    ]
  }
];
