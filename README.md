# LODS Terminal — Lean On Delivery Services

<div align="center">

![LODS Terminal](https://img.shields.io/badge/LODS-Terminal-primary?style=for-the-badge&logo=rocket)
![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)
![React 19](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)

**The centralized command and dispatch operations platform for Lean On Delivery Services (LODS).**

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Database & Auth Setup](#-database--auth-setup) • [Ecosystem Integration](#-ecosystem-integration)

</div>

---

## 📖 Overview

**LODS Terminal** serves as the primary operations center for the LODS ecosystem. Designed for dispatchers, branch managers, and administrators, it coordinates real-time on-demand deliveries (*Pabili*, *Padala*, *Food Delivery*), manages merchant partners, assigns credentials, tracks active delivery riders via GPS, and generates operational business reports.

---

## ✨ Key Features

### 🚀 1. Mission Control Dashboard
- **Real-Time KPIs:** Live tracking of active orders, online riders, pending dispatches, and daily revenue.
- **Operations Visualizer:** Interactive Leaflet map displaying active rider positions and delivery destination points.
- **Live Order Feed:** Real-time streaming table of inbound and in-transit orders with clickable order details.

### 📦 2. Orders & Dispatch Management
- **Booking Creation:** Comprehensive multi-service booking engine (*Food*, *Pabili*, *Padala*).
- **Interactive Order Details Modal:** Click any Booking ID to open full delivery details, itemized breakdown, payment breakdown, and live rider telemetry.
- **Dispatch Transfer & Reassignment:** Smart popover enabling instant re-assignment of deliveries to riders sorted by lowest active workload.

### 🏪 3. Merchant & Partner Management
- **Directory & Catalog:** Manage store profiles, categories, addresses, and contacts.
- **Mobile Login Credentials:** Assign and synchronize email/password credentials to Supabase Authentication so partners can log into the **LODS Mobile App** under the Merchant portal.
- **Batch Auth Sync:** One-click synchronization utility ensuring all registered store accounts are populated in Supabase Auth.

### 🛵 4. Rider Fleet & DTR
- **Fleet Tracker:** Monitor rider status (`online`, `busy`, `offline`), vehicle types, and battery/telemetry.
- **Daily Time Record (DTR):** Track attendance, log-in/log-out timestamps, and working hours.
- **Deliveries Performance:** Per-rider delivery metrics and revenue summaries.

### 👥 5. Clients (CRM) & Operations
- **Customer Profiles:** Customer order history, saved addresses, contact numbers, and loyalty stats.
- **Sales & Revenue Reports:** Filterable financial analytics with date range picker and CSV export.
- **Teller Shifts & Work Schedules:** Organize dispatch personnel schedules and shift assignments.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router with Turbopack) |
| **Frontend** | React 19, TypeScript |
| **Styling & UI** | Tailwind CSS, Radix UI primitives, Shadcn UI patterns |
| **Database & Realtime** | Supabase (PostgreSQL, Supabase Realtime WebSocket Channels) |
| **Authentication** | Supabase Auth (GoTrue) with Role-Based Access Control |
| **Maps & Geospatial** | Leaflet, React-Leaflet |
| **Icons & Charts** | Lucide React, Recharts |
| **Forms & Validation** | React Hook Form, Zod |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18.18+ or 20+
- **npm** or **pnpm**
- A configured **Supabase** project

### 1. Clone & Install

```bash
git clone https://github.com/AFXS1114/lods-terminal.git
cd lods-terminal
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Optional: Required for admin-level user provisioning via API routes
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser.

---

## 🗄 Database & Auth Setup

The terminal relies on Supabase for data persistence and authentication. 

### SQL Migration
To configure the merchant authentication RPC and ensure database triggers run smoothly without constraints issues:

1. Open your **Supabase Dashboard → SQL Editor**.
2. Run the migration script located at [`supabase/assign_partner_credentials.sql`](supabase/assign_partner_credentials.sql).
3. This creates:
   - Resilient trigger handler `public.handle_new_user()`
   - RPC function `public.assign_merchant_credentials()`
   - Proper identity synchronization for `auth.users` and `auth.identities`

---

## 📱 Ecosystem Integration

LODS Terminal works alongside the **LODS Mobile App** (`lods-mobile2`):
- **Clients:** Place orders via mobile app -> Populates in terminal's Orders feed.
- **Terminal:** Dispatches order to available rider -> Notifies rider on mobile.
- **Riders:** Mobile sends live GPS coordinates -> Terminal visualizes on Operations Map.
- **Merchants:** Login to mobile app using credentials assigned in Terminal's Partners page.

---

## 📂 Project Structure

```text
lods-terminal/
├── src/
│   ├── app/
│   │   ├── api/partners/         # Credentials assignment & sync routes
│   │   ├── dashboard/
│   │   │   ├── mission-control/  # Main operations center & live map
│   │   │   ├── orders/           # Orders management & booking form
│   │   │   ├── partners/         # Merchant directory & credentials tool
│   │   │   ├── riders/           # Rider fleet & tracking
│   │   │   ├── clients/          # CRM & customer management
│   │   │   ├── sales-report/     # Analytics & rider delivery logs
│   │   │   ├── schedule/         # Staff rosters & shift planning
│   │   │   └── dtr/              # Daily time records
│   │   └── layout.tsx
│   ├── components/
│   │   ├── dashboard/            # KPI stats, map visualizer, live order feed
│   │   ├── orders/               # Booking form, transfer popover, detail modal
│   │   └── ui/                   # Reusable UI component library (Radix/Shadcn)
│   ├── hooks/                    # Toast and UI hooks
│   ├── lib/                      # Utilities and formatting helpers
│   └── supabase/                 # Supabase client and real-time collection hooks
├── supabase/
│   └── assign_partner_credentials.sql
└── package.json
```

---

## 📄 License

This software is proprietary and confidential to **Lean On Delivery Services (LODS)**.
