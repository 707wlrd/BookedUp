# BookedUp — Checklist de déploiement production

## 1. Supabase

### 1.1 Base de données
```sql
-- Ouvrir Supabase Dashboard → SQL Editor → coller et exécuter :
-- apps/web/supabase/00_consolidated_migration.sql
```

### 1.2 Storage buckets
Dashboard → Storage → New Bucket :
- [ ] `avatars` — Public ✓, max 5 MB, types acceptés : `image/*`
- [ ] `covers`  — Public ✓, max 10 MB, types acceptés : `image/*`

### 1.3 Auth
- [ ] Activer Email provider
- [ ] Désactiver "Confirm email" en prod si vous gérez vous-même la validation
- [ ] Configurer Site URL : `https://bookedup.fr`
- [ ] Ajouter Redirect URLs : `https://bookedup.fr/**`

---

## 2. Stripe

- [ ] Passer les clés en **mode Live** (`sk_live_...`, `pk_live_...`)
- [ ] Créer un Webhook → `https://bookedup.fr/api/webhooks/stripe`
  - Événements requis : `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`
  - Copier le **Signing Secret** → `STRIPE_WEBHOOK_SECRET`
- [ ] Créer les produits + prix pour les plans Pro / Premium → copier les Price IDs
  - `STRIPE_PRICE_PRO` = `price_live_...`
  - `STRIPE_PRICE_PREMIUM` = `price_live_...`

---

## 3. Resend

- [ ] Vérifier le domaine `bookedup.fr` dans Resend (DNS TXT + MX)
- [ ] Créer une API Key (full access)
- [ ] Tester l'envoi depuis le dashboard Resend

---

## 4. Vercel

### 4.1 Variables d'environnement
Aller dans Vercel Dashboard → Settings → Environment Variables et ajouter **toutes** les variables de `.env.example` :

```
NEXT_PUBLIC_APP_URL          = https://bookedup.fr
NEXT_PUBLIC_SUPABASE_URL     = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY    = eyJ...
STRIPE_SECRET_KEY            = sk_live_...
STRIPE_WEBHOOK_SECRET        = whsec_...
STRIPE_PRICE_PRO             = price_live_...
STRIPE_PRICE_PREMIUM         = price_live_...
RESEND_API_KEY               = re_...
RESEND_FROM_EMAIL            = BookedUp <noreply@bookedup.fr>
RESEND_REPLY_TO              = contact@bookedup.fr
ANTHROPIC_API_KEY            = sk-ant-...
CRON_SECRET                  = <openssl rand -hex 32>
```

### 4.2 Domaine
- [ ] Ajouter `bookedup.fr` dans Vercel → Domains
- [ ] Vérifier les DNS (CNAME ou A record)
- [ ] SSL automatique ✓ (Vercel gère)

### 4.3 Build
```bash
cd apps/web
npm run build   # Vérifier 0 erreurs TypeScript
```

### 4.4 Cron Jobs
Vérifier que `vercel.json` contient bien les crons (déjà configuré) :
```json
{
  "crons": [
    { "path": "/api/reminders",      "schedule": "0 7 * * *" },
    { "path": "/api/review-requests","schedule": "0 11 * * *" }
  ]
}
```
> Les crons Vercel passent un header `Authorization: Bearer <CRON_SECRET>`. Vérifier que `CRON_SECRET` est identique entre Vercel env vars et les routes.

---

## 5. App Mobile (Expo)

```bash
cd apps/mobile

# Créer un compte Expo si nécessaire
npx expo login

# Build iOS (nécessite Apple Developer account $99/an)
npx eas build --platform ios --profile production

# Build Android
npx eas build --platform android --profile production
```

### Variables d'environnement mobile
Créer `apps/mobile/.env` :
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_URL=https://bookedup.fr
```

### Deep links
- iOS: `bookedup://` configuré dans `app.json` → `scheme: "bookedup"`
- Android: idem
- Tester : `npx uri-scheme open bookedup://appointment/TEST --ios`

---

## 6. Tests avant mise en ligne

### Flux de réservation
- [ ] Aller sur `/barbers/[votre-slug]`
- [ ] Sélectionner un service + créneau + remplir le formulaire
- [ ] Vérifier la réception de l'email de confirmation (client + barber)
- [ ] Si acompte activé : vérifier le redirect Stripe Checkout + webhook

### Annulation
- [ ] Cliquer sur le lien d'annulation dans l'email de confirmation
- [ ] Vérifier que l'annulation est impossible < 24h
- [ ] Vérifier l'email de confirmation d'annulation

### Studio
- [ ] Login → onboarding → créer un salon complet
- [ ] Vérifier les KPIs sur la page d'accueil Studio
- [ ] Ajouter un service, créer un stylist
- [ ] Tester le calendrier (créer un bloc)

### Notifications push (mobile)
- [ ] Tester sur un device physique (pas simulateur)
- [ ] Faire une réservation → vérifier la notif push sur le téléphone du barber

---

## 7. Monitoring post-lancement

- [ ] Activer Vercel Analytics (`npx vercel env add VERCEL_ANALYTICS_ID`)
- [ ] Configurer les alertes Supabase (Dashboard → Alerts) sur : stockage > 80%, erreurs auth
- [ ] Surveiller les logs Vercel les premières 24h : Dashboard → Logs → Filtre `error`
- [ ] Tester les crons manuellement le jour J :
  ```bash
  curl -X POST https://bookedup.fr/api/reminders \
    -H "Authorization: Bearer $CRON_SECRET"
  ```

---

## Checklist finale ✅

- [ ] Build sans erreur TypeScript
- [ ] Variables d'environnement toutes renseignées sur Vercel
- [ ] Migrations SQL appliquées
- [ ] Buckets Supabase créés
- [ ] Webhook Stripe configuré et testé
- [ ] Domaine vérifié et SSL actif
- [ ] Email de confirmation reçu en test
- [ ] Flux d'annulation testé
- [ ] Crons testés manuellement
- [ ] App mobile buildée et testée sur device physique
