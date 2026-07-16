# FirstStop

A real-time electronics storefront for the Qatar market (phones, laptops,
tablets, TVs, appliances and accessories, priced in QAR). Built as a single
**Next.js 16** app (App Router) with **Prisma 7 + PostgreSQL**, and no external
services — payments and the real-time layer are self-contained.

**Features:** catalog with server-side filtering/sorting/pagination, product
pages, guest + user cart & wishlist, email/password auth with roles, checkout
with a simulated card processor and a "Pay in 4" BNPL option, live stock/order
updates over Server-Sent Events, and a role-gated admin panel (dashboard,
products, orders, customers, notifications feed).

## Tech stack

Next.js 16 (App Router, Server Components & Server Actions) · React 19 ·
TypeScript · Tailwind CSS · Prisma 7 (`pg` driver adapter) · PostgreSQL (Neon).

## Run locally

Requires Node.js 18+ and a PostgreSQL database (a free [Neon](https://neon.tech)
project works well).

```bash
# 1. Install dependencies (also generates the Prisma client)
npm install

# 2. Configure the database connection
cp .env.example .env
#    then edit .env and set DATABASE_URL to your Postgres connection string

# 3. Create the schema and load demo data
npx prisma db push        # create tables
npm run db:seed           # 6 categories, 14 brands, 45 products, 2 demo users

# 4. Start the dev server
npm run dev               # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`,
`npm run db:studio`.

## Demo logins

Created by the seed script:

| Role     | Email                    | Password       |
| -------- | ------------------------ | -------------- |
| Admin    | `admin@firststop.qa`     | `admin1234`    |
| Customer | `customer@firststop.qa`  | `customer1234` |

Sign in as the admin to reach the panel at **`/admin`**.

**Test checkout:** use card `4242 4242 4242 4242` to approve or
`4000 0000 0000 0002` to simulate a decline (any future expiry + 3-digit CVC),
or choose **Pay in 4**. Payments are simulated — no real charge.

## Admin panel

The panel lives under **`/admin`** (role-gated: `ADMIN` / `SUPERADMIN`). The
collapsible sidebar groups the sections; staff see only the sections a
superadmin has granted them (see `src/lib/permissions.ts`).

| Group     | Route                     | What it does                                                        |
| --------- | ------------------------- | ------------------------------------------------------------------ |
| General   | `/admin`                  | Dashboard: KPIs, monthly-target gauge, top categories, traffic sources, sales chart, recent orders, low stock |
| Sales     | `/admin/orders`           | Orders list (search / sort / filter / paginate) → `/admin/orders/[id]` details, `/…/invoice`, CSV export |
| Sales     | `/admin/transactions`     | Payments across all orders — status/method filters, search, success volume |
| Sales     | `/admin/invoices`         | One invoice per order → printable single-invoice view              |
| Catalog   | `/admin/products`         | Products grid/table, `/new`, `/[id]` edit + details                |
| Catalog   | `/admin/categories`       | Category CRUD (`/new`, `/[id]`) with product counts + parent nesting |
| Catalog   | `/admin/inventory`        | Stock levels + adjustment history                                  |
| Customers | `/admin/customers`        | Customer list → `/admin/customers/[id]` profile                    |
| Marketing | `/admin/discounts`        | Coupons CRUD (`/new`, `/[id]`)                                     |
| Marketing | `/admin/campaigns`        | Email campaigns CRUD (`/new`, `/[id]`) — draft / schedule / send   |
| Account   | `/admin/settings`         | Store details + staff Roles & Permissions (superadmin only)        |
| Account   | `/admin/profile`          | The signed-in admin's own name / email / password                 |

### Where to plug in a real API

Everything is backed by real data (Prisma/Postgres) except **email campaigns**,
which use a typed in-memory mock. Swap points, one file each:

- **Campaigns** — `src/lib/campaigns.ts`. Reimplement `listCampaigns`,
  `getCampaign`, `createCampaign`, `updateCampaign`, `sendCampaign`,
  `deleteCampaign` against a real backend (or add a `Campaign` Prisma model) and
  delete the seed array; the signatures already match a real data layer.
- **Traffic sources** — `getTrafficSources` in `src/lib/admin.ts` returns a
  derived, deterministic breakdown (the store has no analytics pipeline).
  Replace that one function with a real analytics query.
- **Monthly target** — `getMonthlyTarget` in `src/lib/admin.ts` derives the goal
  from last month's revenue; add a `StoreSetting` field to make it explicit.

All other admin reads live in `src/lib/admin.ts` and writes in
`app/admin/actions.ts` (plus `app/admin/*/actions.ts`) — already real Prisma.

## Environment variables

| Variable       | Required | Description                                             |
| -------------- | -------- | ------------------------------------------------------ |
| `DATABASE_URL` | Yes      | PostgreSQL connection string. Needed at build + runtime. |

`DATABASE_URL` is the **only** variable you need to set. `NODE_ENV` is managed
by Next.js / your host. See `.env.example`.

## Deployment

Standard Next.js app — deploys to Vercel with no extra config. Set
`DATABASE_URL` in your host's environment settings (for Vercel: Production,
Preview, and Development). `postinstall` runs `prisma generate` during the
build; run `npx prisma db push` (and optionally `npm run db:seed`) against your
production database once.

> **Real-time note:** live stock/order updates use Server-Sent Events backed by
> an in-process event bus, which works on a single long-running Node process
> (local dev, or a managed Node host). On serverless/multi-instance platforms
> (e.g. Vercel), the push channel is unreliable because instances don't share
> the bus and streaming functions are time-limited — but the app **degrades
> gracefully**: live components fall back to the server-rendered value, so pages
> always show correct data on load/refresh. To make real-time robust on
> serverless, swap the in-process bus in `src/lib/events.ts` for Redis pub/sub
> (the publish/subscribe API is designed for that).
