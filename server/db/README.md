# ALLOY / CreaSync — Supabase Database Setup Guide

This directory contains the unified, consolidated database setup files for the ALLOY / CreaSync platform.

## Files Overview
- **`schema.sql`**: The single, unified master schema. Creates all 20 tables, extensions, cryptographic helpers, security definer functions, triggers, indexes, Row Level Security (RLS) policies, and Realtime publications.
- **`seed.sql`**: Curated demo seed data including demo brands (*Lumina Botanica*, *Vanguard Horology*, *Solis Living*), creators (*Maya Chen*), portfolio projects, production workflows, Creative DNA dossiers, and Trust Centre verification claims.

---

## 3-Step Setup for a Brand New Supabase Project

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a new project.
2. Note your database password and wait ~1 minute for the project to provision.

### Step 2: Run SQL in the Supabase Dashboard
1. Open your project dashboard at [app.supabase.com](https://app.supabase.com).
2. Go to the **SQL Editor** tab on the left sidebar.
3. Open or copy the contents of [`server/db/schema.sql`](./schema.sql) and click **RUN**.
   - *Status: Success. All tables, functions, and RLS policies created.*
4. Open or copy the contents of [`server/db/seed.sql`](./seed.sql) and click **RUN**.
   - *Status: Success. Demo brands, creator profiles, workflows, and trust claims populated.*

### Step 3: Configure Environment Variables
1. In your Supabase Dashboard, go to **Project Settings** -> **API** (`/settings/api`).
2. Copy your **Project URL** and **anon / public key**, plus your **service_role key** (secret).
3. Paste them into your `.env` file at the root of the project:

```env
# Project URL (starts with https://...)
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co

# Public Anon API Key (Safe for browser / client-side)
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Service Role Secret (Admin/Backend server provisioning only)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Storage bucket name for portfolios & media
VITE_SUPABASE_STORAGE_BUCKET=creasynq-media
```

---

## Optional: Provision Admin & Demo Accounts in Supabase Auth

Once your `.env` is configured with the new database credentials:

### 1. Provision Super Admin & Judge Accounts
```bash
npm run provision:admin
```
This automatically creates the Judge Reviewer (`judge@alloy.market`) and Super Admin (`admin@alloy.market`) accounts in Supabase Auth with administrative privileges.

### 2. Provision Demo Brand & Creator Accounts
```bash
node server/scripts/provision_demo_users.js
```
This automatically creates test accounts for:
- **Brand Demo**: `lumina.demo@alloy.market` (Password: `AlloyDemo2026!`)
- **Creator Demo**: `maya.demo@alloy.market` (Password: `AlloyDemo2026!`)

---

## Database Architecture Summary

| Table | Description | Access Policy (RLS) |
|---|---|---|
| `profiles` | User profiles linked to Supabase Auth (`auth.users`) | Public read; owner update |
| `admin_roles` | Explicit super_admin & judge_admin authorizations | Super Admin only |
| `creator_profiles` | Creator directory, styles, tools, capabilities, and badges | Published public; owner update |
| `portfolio_projects`| Multi-asset portfolio items, workflow stages, and media | Published public; owner manage |
| `creator_workflows` | Structured production workflows & human involvement notes | Published public; owner manage |
| `creative_dna` | Quantitative DNA traits, aesthetic scores, and provenance | Public read; creator update |
| `brands` | Brand directory, aesthetic definitions, and color systems | Public read; brand owner update |
| `campaigns` | Briefs, requirements, deliverables, budgets, and timelines | Published public; brand manage |
| `shortlists` | Private brand-curated creator shortlists | Brand owner only |
| `invitations` | Direct collaboration proposals & status | Verified participants only |
| `collaborations` | Active production contracts, milestones, and deliverable reviews | Verified participants only |
| `messages` | Direct chat messages secured by cryptographic participant validation | Verified participants only |
| `activity_logs` | Audit trail of platform actions (no passwords or secrets) | Actor & Admin read |
| `verification_claims` | Trust Centre verification across 4 pillars | Public non-private; Admin approve |
| `trust_reports` | AlloyTrust governance & risk investigation dossiers | Super Admin only |
| `platform_config` | Dynamic platform policies and risk thresholds | Super Admin only |
