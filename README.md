# BookedUp — *Stay Booked.*

Plateforme SaaS de réservation pour barbiers et salons de coiffure.
Web (Next.js) + Mobile (Expo) + Supabase + Stripe + IA (Claude).

```
bookedup/
├── apps/
│   ├── web/          → Next.js 14, Tailwind, Framer Motion, next-intl
│   └── mobile/       → Expo Router, React Native, i18n-js
├── packages/
│   └── shared/       → Types et helpers partagés
└── supabase/
    ├── schema.sql    → Tables + triggers
    ├── policies.sql  → Row Level Security
    └── seed.sql      → Données de démo
```

## 🚀 Démarrage rapide

### 1. Pré-requis

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Compte [Supabase](https://supabase.com)
- Compte [Stripe](https://stripe.com) (mode test)
- Clé [Anthropic](https://console.anthropic.com) pour les features IA

### 2. Installation

```bash
pnpm install
cp .env.example .env.local
# Remplir les variables dans .env.local
```

### 3. Base de données Supabase

Dans le SQL Editor de ton projet Supabase, exécuter dans l'ordre :

1. `supabase/schema.sql`
2. `supabase/policies.sql`
3. `supabase/seed.sql` (optionnel — données de démo)

### 4. Stripe

Créer deux produits récurrents (mensuel) :
- **Pro** : 19 € → copier le `price_id` dans `STRIPE_PRICE_PRO`
- **Premium** : 49 € → copier le `price_id` dans `STRIPE_PRICE_PREMIUM`

Webhook local pour tester :
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Le secret affiché → `STRIPE_WEBHOOK_SECRET`.

### 5. Lancer

```bash
# Web — http://localhost:3000
pnpm dev

# Mobile — Expo Go
pnpm dev:mobile
```

## 📄 Routes web

| Route | Description |
|---|---|
| `/` | Landing page |
| `/pricing` | Tarifs détaillés |
| `/barbers` | Découverte des barbiers |
| `/barbers/[slug]` | Profil public d'un barbier |
| `/book/[slug]` | Flow de réservation 4 étapes |
| `/login` `/register` | Auth (Supabase) |
| `/dashboard` | Dashboard client (mes RDV) |
| `/studio` | Dashboard barbier (overview) |
| `/studio/calendar` | Agenda hebdo |
| `/studio/appointments` | Liste des RDV (accepter/refuser) |
| `/studio/clients` | Fiches clients |
| `/studio/services` | CRUD services |
| `/studio/payments` | Transactions Stripe |
| `/studio/analytics` | KPIs, graphiques |
| `/studio/ai` | Studio IA (captions, stories, rappels) |
| `/studio/settings` | Profil, horaires, abonnement |

## 🔌 API routes

- `POST /api/appointments` — Créer un RDV (+ Stripe Checkout si acompte)
- `POST /api/stripe/checkout` — Abonnement barbier (Pro/Premium)
- `POST /api/stripe/webhook` — Webhook Stripe
- `POST /api/ai/caption` — Générer caption Instagram
- `POST /api/ai/story` — Générer post créneaux dispos
- `POST /api/ai/reminder` — Générer SMS de rappel

## 📱 Mobile

App Expo Router avec 5 onglets :
- **Aujourd'hui** — programme du jour + stats
- **RDV** — liste de tous les rendez-vous
- **Clients** — fiches clients
- **Revenus** — graphiques CA
- **IA** — génération de contenu

Push notifications via `expo-notifications` (le token Expo s'enregistre dans la table `push_tokens`).

## 🎨 Design system

- **Couleurs** : noir profond `#05060a`, accent `#3b82ff` (electric blue)
- **Typo** : système (Geist en var CSS)
- **Animations** : Framer Motion (web), Reanimated (mobile)
- **Inspiration** : Stripe, Linear, Notion

## 🧱 Pile technique

| Layer | Tech |
|---|---|
| Framework web | Next.js 14 (App Router) |
| Mobile | Expo SDK 51, Expo Router |
| Style | TailwindCSS + Framer Motion |
| Base | PostgreSQL 15 (Supabase) |
| Auth | Supabase Auth |
| Paiements | Stripe (Checkout + Subscriptions) |
| IA | Anthropic Claude (Opus 4.7) avec prompt caching |
| i18n | next-intl (web), i18n-js (mobile) — FR / EN |

## ⚠️ État du scaffold

Ce dépôt est un **scaffold production-ready** : architecture, schéma DB, UI complète, API câblées.

À compléter avant production :
- Middleware Supabase pour la session SSR
- Triggers/RPC pour la création automatique du `profile` après `signUp`
- Page de checkout client (actuellement redirection vers Stripe direct)
- Envoi email/SMS (Resend + Twilio)
- Génération réelle d'images IA pour Instagram (Replicate / DALL·E)
- Tests E2E (Playwright)
- Sentry / Datadog
- CI/CD (Vercel pour web, EAS pour mobile)

## 📝 Licence

Propriétaire — © BookedUp 2026.
