# 🚀 SPIHEAD — Multi-Currency AI-Powered CRM & Sales Execution Suite

[![React](https://img.shields.io/badge/React-19.0.1-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21.2-lightgrey.svg?logo=express)](https://expressjs.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-2.5_Flash-orange.svg?logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**SPIHEAD** is a full-stack, enterprise-grade AI-powered CRM and Sales Intelligence platform tailored for Freelancers, Growing Businesses, and Multinational Enterprises. It features real-time multi-currency conversion, dynamic industry-specific business adaptation, Microsoft 365 / Outlook integration, role-based access control (RBAC), and server-side Google Gemini AI copilot intelligence.

---

## ✨ Key Features & Capabilities

### 🧠 1. Google Gemini AI Sales Copilot
- **AI Lead Energy Scoring**: Real-time qualitative lead evaluation (*Hot*, *Warm*, *Cold*) with AI reasonings and engagement probabilities.
- **Next-Best-Action Engine**: Recommends personalized follow-up actions and outreach channels based on lead activity and industry context.
- **AI Proposal & Email Drafter**: Automatically drafts tailored sales communications, proposals, and objection responses using contextual company parameters.
- **Smart Pipeline Insights**: Analyzes pipeline health, deal velocity, and identifies high-risk stalled deals.

### 🏢 2. Business & Industry Adaptation Engine
- **Custom Industry Presets**: Instant workspace adaptation for **8 Core Sectors**:
  - *Enterprise Software & SaaS*
  - *Healthcare & Medical Devices*
  - *Real Estate & Property Development*
  - *CleanTech & Renewable Energy*
  - *Financial Services & Wealth Management*
  - *Commercial Construction*
  - *Legal & Corporate Practice*
  - *Industrial Manufacturing*
- **Dynamic Terminology**: Adapts CRM lead terminology (*Patients*, *Clients*, *Properties*, *Accounts*, *Cases*) and pipeline stages (*Clinical Assessment*, *Listing & Offer*, *Site Survey*, etc.) to match the subscriber's industry model.

### 💱 3. Multi-Currency Global Sales
- **Real-Time Rate Conversion**: Supports seamless deal tracking across 9 global currencies (**USD**, **EUR**, **GBP**, **ZAR**, **CAD**, **AUD**, **JPY**, **INR**, **AED**).
- **Global Pipeline Aggregation**: Dynamically converts deal values and total pipeline estimates into the user's preferred reporting currency.

### 🔐 4. Enterprise Role-Based Access Control (RBAC)
- **Role Hierarchy**:
  - `Owner` / `Admin`: Full access to configuration settings, business presets, team administration, and system storage wipes.
  - `Sales Manager`: Pipeline overview, team performance metrics, and deal reassignments.
  - `Sales Rep`: Operational pipeline view, lead updates, and communication tracking.
  - `Auditor`: Read-only access to compliance, audit logs, and security feeds.
- **Access Guarding**: `authRole` security layer restricts critical operations (`SettingsView`, `ClearAllData`) to authorized `Admin` or `Owner` credentials.

### 📧 5. Microsoft 365 & Outlook Workflow Integration
- **Outlook Email & Calendar Sync**: Simulates M365 authentication, email tracking, and meeting scheduling.
- **Teams Notifications**: Automated channel alerts for high-value deal wins and lead energy surges.

---

## 🛠️ Technology Stack

| Layer | Technology / Library | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, TypeScript | Reactive, type-safe single-page UI architecture |
| **Styling & Design** | Tailwind CSS v4, Lucide React | Modern utility styling & responsive vector iconography |
| **Animation Engine** | Motion (`motion/react`) | Fluid route transitions and micro-interactions |
| **Backend Server** | Express.js (Node.js) | Full-stack API routes & Vite dev server middleware |
| **AI Integration** | `@google/genai` | Server-side Google Gemini AI Copilot orchestration |
| **Bundler & Build** | Vite 6, `esbuild` | Lightning-fast development & production CJS bundling |

---

## 📁 Repository Directory Structure

```
.
├── server.ts                  # Express full-stack entry point & Vite middleware
├── index.html                 # Main application entry HTML
├── metadata.json              # Platform metadata & capabilities declaration
├── package.json               # Dependencies, scripts, and package specs
├── tsconfig.json              # TypeScript compiler configuration
├── vite.config.ts             # Vite server & build configurations
└── src/
    ├── main.tsx               # Client bootstrap entry
    ├── App.tsx                # Main view router & layout orchestrator
    ├── components/            # Reusable UI components
    │   ├── Navbar.tsx         # Navigation header
    │   ├── Sidebar.tsx        # Responsive navigation sidebar with business widget
    │   ├── CurrencySelector.tsx# Dynamic currency switching component
    │   ├── BusinessCustomizerModal.tsx # Industry adaptation modal
    │   └── UpgradePlanModal.tsx # Tier upgrading modal
    ├── views/                 # Core Application Pages
    │   ├── DashboardView.tsx   # Executive analytics & deal metrics
    │   ├── PipelineView.tsx    # Interactive Kanban deal management
    │   ├── LeadsView.tsx       # Lead table, activity logs & AI scoring
    │   ├── SettingsView.tsx    # RBAC-guarded workspace & profile configurations
    │   ├── ProfileView.tsx     # User identity, MFA, and M365 account status
    │   ├── SignUpView.tsx      # Onboarding & industry preset selector
    │   └── SignInView.tsx      # Multi-role authentication panel
    ├── lib/                   # State Stores & Business Logic Services
    │   ├── authService.ts     # User sessions, RBAC permissions, audit logging
    │   ├── companyService.ts  # Industry profiles & custom lead terminology
    │   ├── currencyService.ts # Real-time exchange rates & formatting
    │   ├── geminiService.ts   # Server-proxied Gemini AI Copilot requests
    │   ├── m365Service.ts     # Microsoft 365 / Outlook simulation engine
    │   ├── store.ts           # Centralized reactive CRM store
    │   └── subscriptionService.ts # Subscription tiers & seat licensing
    └── types/                 # Shared TypeScript Interfaces & Models
        ├── crm.ts             # Leads, Deals, Pipelines, Users, Audit Logs
        └── subscription.ts    # SaaS plans & feature capabilities
```

---

## 🚦 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Google Gemini API Key**: Required for AI Sales Copilot functionality ([Get API Key](https://aistudio.google.com/))

---

### Installation & Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/spihead-crm.git
   cd spihead-crm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the project root directory (refer to `.env.example`):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Launch Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 📜 Available NPM Scripts

- `npm run dev`: Boots the full-stack Express server with Vite middleware on port `3000`.
- `npm run build`: Builds the client assets with Vite and bundles `server.ts` into `dist/server.cjs` via `esbuild`.
- `npm run start`: Executes the production bundled server (`node dist/server.cjs`).
- `npm run lint`: Performs TypeScript static type-checking (`tsc --noEmit`).

---

## 🔒 Security & Privacy

- **Server-Side API Proxying**: API keys (such as `GEMINI_API_KEY`) are kept exclusively server-side and never exposed to client browser bundles.
- **RBAC Verification**: Administrative routes and destruction handlers (`ClearAllData`) are validated against `authRole` permissions.
- **Audit Logging**: All security events, role escalations, and sensitive actions are logged in the real-time audit feed.

---

## 📄 License

This project is open-source software licensed under the **MIT License**.
