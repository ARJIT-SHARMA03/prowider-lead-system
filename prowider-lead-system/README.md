# Prowider Mini Lead Distribution System

A full-stack lead generation and distribution system built with Next.js 14 + PostgreSQL (Prisma).

## Live Demo

> [Add your Vercel/Railway deployment URL here]

---

## Features

| Feature | Route | Description |
|---------|-------|-------------|
| Customer Form | `/request-service` | Submit service enquiry → auto-assigns 3 providers |
| Provider Dashboard | `/dashboard` | Real-time view of all providers, quotas, and leads |
| Real-Time Updates | SSE stream | Dashboard updates without page refresh |
| Webhook Simulation | `/test-tools` | Reset quotas, test idempotency, test concurrency |

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router, TypeScript)
- **Database:** PostgreSQL via Prisma ORM
- **Real-time:** Server-Sent Events (SSE)

---

## Local Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/YOUR_USERNAME/prowider-lead-system
cd prowider-lead-system
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and set your DATABASE_URL
```

### 3. Set up the database

```bash
# Push schema to your PostgreSQL database
npm run db:push

# Seed with 3 services and 8 providers
npm run db:seed
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Database Schema

```
services        — 3 services (Service 1, 2, 3)
providers       — 8 providers (monthly quota: 10, fair_pick_count for round-robin)
leads           — customer enquiries (unique constraint: phone + serviceId)
lead_assignments — junction table (leadId + providerId, unique per pair)
webhook_events  — idempotency log for webhook calls
```

---

## Allocation Algorithm

### Mandatory Assignments

| Service   | Mandatory Providers | Fair Pool         |
|-----------|--------------------|--------------------|
| Service 1 | Provider 1         | Providers 2, 3, 4 |
| Service 2 | Provider 5         | Providers 6, 7, 8 |
| Service 3 | Providers 1 & 4    | Providers 2, 3, 5, 6, 7, 8 |

### Logic (per lead)

1. Add all mandatory providers for the service (if under quota)
2. Fill remaining slots from the fair pool using **round-robin** (`fair_pick_count` column — lowest count goes first)
3. Each lead always gets **exactly 3 providers**
4. No provider can be assigned the same lead twice
5. Monthly quota (10) is hard-capped per provider

### Why Not Random?

Random selection could unfairly favor some providers. Using `fair_pick_count` as a round-robin index ensures equal distribution across the pool over time, regardless of server restarts.

---

## Concurrency Handling

All provider assignments run inside a **serializable PostgreSQL transaction** with `SELECT ... FOR UPDATE` row-level locking:

```sql
SELECT id, name, monthly_quota, current_month_leads, fair_pick_count
FROM providers
WHERE id = ANY($1::int[])
FOR UPDATE
```

This prevents two concurrent lead submissions from:
- Assigning the same provider slot twice
- Exceeding the monthly quota
- Corrupting the `fair_pick_count` counter

---

## Webhook Idempotency

The `/api/webhook/reset-quota` endpoint:

1. Requires an `idempotency-key` header
2. Checks the `webhook_events` table for that key
3. If already processed → returns 200 with the original result, **no side effects**
4. If new → processes the request, stores the key, returns result

This means calling the webhook 10× with the same key resets quota only **once**.

---

## Real-Time Dashboard

Uses **Server-Sent Events (SSE)**:

1. Dashboard opens a persistent connection to `/api/providers/stream`
2. When a new lead is assigned, `broadcastLeadUpdate()` pushes an event to all open connections
3. Each client re-fetches `/api/providers` to get fresh data

This works without WebSockets and persists through server restarts.

---

## Deployment (Vercel + Neon/Supabase)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# DATABASE_URL = your PostgreSQL connection string
# WEBHOOK_SECRET = any random secret
```

After deploying, run the seed from your local machine pointing at the production DB:

```bash
DATABASE_URL="your-production-url" npm run db:seed
```

---

## Submission Checklist

- [x] Next.js frontend
- [x] PostgreSQL database (Prisma ORM)
- [x] Mandatory provider assignment
- [x] Fair round-robin allocation (not random)
- [x] Monthly quota enforcement
- [x] Duplicate lead prevention (phone + service, DB-level constraint)
- [x] Real-time dashboard (SSE)
- [x] Webhook with idempotency
- [x] Concurrency-safe (serializable transactions + FOR UPDATE)
- [x] Seed data (3 services, 8 providers)
- [x] GitHub repository
- [ ] Live demo URL (add after deployment)
