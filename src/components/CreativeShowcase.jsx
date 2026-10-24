// src/components/CreativeShowcase.jsx
// SECTION 3 — Showcase Creative Work
// Curated editorial showcase of commercial work across visual categories:
// - Fashion & Lifestyle
// - Beauty & Skincare
// - Product Campaigns
// - Interiors & Architecture
// - Experimental AI Art
// Directly integrated with real creators and profiles in the marketplace!

import React, { useState } from 'react';
import { ArrowRight, Sparkles, Filter, ExternalLink } from 'lucide-react';

export default function CreativeShowcase({ creators = [], onSelectCreator, onExploreAll }) {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Works' },
    { id: 'fashion', label: 'Fashion & Lifestyle' },
    { id: 'beauty', label: 'Beauty & Skincare' },
    { id: 'product', label: 'Product Campaigns' },
    { id: 'interior', label: 'Interiors & Architecture' },
    { id: 'ai-art', label: 'Experimental AI Art' },
  ];

  const galleryItems = [
    {
      id: 'gallery-1',
      title: 'Aura Privée Haute Couture',
      category: 'fashion',
      categoryLabel: 'Fashion & Lifestyle',
      creatorId: 'elena-rostova',
      creatorName: 'Ananya Roy',
      discipline: 'AI Fashion Direction',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
      span: 'tall'
    },
    {
      id: 'gallery-2',
      title: "L'Hydratation Pure",
      category: 'beauty',
      categoryLabel: 'Beauty & Skincare',
      creatorId: 'zora-vance',
      creatorName: 'Zoya Merchant',
      discipline: 'Macro Beauty & Light',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1000&q=85',
      span: 'normal'
    },
    {
      id: 'gallery-3',
      title: 'Titanium Chronos Precision',
      category: 'product',
      categoryLabel: 'Product Campaigns',
      creatorId: 'alex-rivera',
      creatorName: 'Aarav Kapoor',
      discipline: '3D Spatial CGI',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=85',
      span: 'normal'
    },
    {
      id: 'gallery-4',
      title: 'Solarium Atrium Sanctuary',
      category: 'interior',
      categoryLabel: 'Interiors & Architecture',
      creatorId: 'sofia-rossi',
      creatorName: 'Suhana Rao',
      discipline: 'Architectural Renders',
      image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85',
      span: 'normal'
    },
    {
      id: 'gallery-5',
      title: 'Echoes of the Solarium',
      category: 'ai-art',
      categoryLabel: 'Experimental AI Art',
      creatorId: 'maya-chen',
      creatorName: 'Maya Sharma',
      discipline: 'Generative Cinema',
      image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=85',
      span: 'wide'
    },
    {
      id: 'gallery-6',
      title: 'Organic Botanical Caustics',
      category: 'product',
      categoryLabel: 'Product Campaigns',
      creatorId: 'kai-sorenson',
      creatorName: 'Kabir Sengupta',
      discipline: 'Synthetic Physics & VFX',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=85',
      span: 'normal'
    }
  ];

  const filteredItems = activeCategory === 'all' 
    ? galleryItems 
    : galleryItems.filter(item => item.category === activeCategory);

  return (
    <section className="alloy-showcase-section" id="showcase">
      <div className="page-container alloy-showcase-container">
        
        {/* Section Header */}
        <div className="alloy-showcase-header">
          <div className="section-pill-badge">
            <span className="pill-dot" />
            <span>PORTFOLIO SHOWCASE</span>
          </div>

          <h2 className="showcase-headline font-editorial">
            Meet creativity in every direction.
          </h2>

          <p className="showcase-subtext">
            Explore commercial campaigns, editorial visuals, and 3D spatial renders published by AI creators on Alloy.
          </p>

          {/* Category Filter Pills */}
          <div className="showcase-category-nav" role="tablist">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`category-nav-pill ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                role="tab"
                aria-selected={activeCategory === cat.id}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Asymmetrical Editorial Grid */}
        <div className="showcase-editorial-grid">
          {filteredItems.map((item) => {
            const creator = creators.find(c => c.id === item.creatorId);
            return (
              <div 
                key={item.id}
                className={`showcase-grid-card card-span-${item.span}`}
                onClick={() => onSelectCreator && onSelectCreator(item.creatorId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelectCreator && onSelectCreator(item.creatorId)}
                title={`View ${item.creatorName}'s profile and portfolio`}
              >
                <div className="card-image-wrap">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="card-work-img"
                    loading="lazy"
                  />
                  <div className="card-gradient-scrim" />
                </div>

                <div className="card-overlay-content">
                  <span className="card-category-tag">{item.categoryLabel}</span>
                  <h3 className="card-work-title font-editorial">{item.title}</h3>
                  <div className="card-creator-row">
                    <span className="card-creator-by">by {item.creatorName}</span>
                    <span className="card-discipline-pill">{item.discipline}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Action */}
        <div className="showcase-action-footer">
          <button
            type="button"
            className="btn-editorial-outline"
            onClick={onExploreAll}
            id="showcase-explore-all-btn"
          >
            <span>Browse all creators & work</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </section>
  );
}
