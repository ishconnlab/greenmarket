# Green Market

A responsive e-commerce storefront for fresh food, everyday home goods, and useful devices. Green Market was developed by **Ishimwe Jean Claude** during the **Ishconnect Full-Stack Training, 2026**.

- **Website:** [www.ishconnect.rw](https://www.ishconnect.rw)
- **Frontend:** React, Vite, React Router, Axios
- **API:** Node.js, Express, MongoDB, Mongoose
- **Payments:** MTN MoMo and Airtel Money USSD hand-off, plus manually confirmed Bank of Kigali transfers

## Features

- Browse products with search, categories, sorting, and favorites.
- Register and sign in to manage a cart and place orders.
- Larger checkout product cards, separate store carts, delivery details, and MTN MoMo, Airtel Money, or Bank of Kigali payment choices.
- Mobile-money checkout records the payer's phone number; Bank of Kigali checkout records the payer's account number so the store can match a transfer.
- Sellers apply for and manage their store at `/seller`; shoppers visit its public storefront at `/store/:slug`.
- Green Market admins review store applications, approve/reject requests, pause/resume shops, and remove stores and their active products.
- Seller products can appear in the main catalog, but ordering them opens that seller's standalone store. Main-market and seller-store carts check out independently.
- On supported mobile browsers, open the selected USSD flow from the order confirmation.
- Admin product creation, editing, removal, search, and five-item server-side pages; sellers also manage their own newest-first five-item product pages.
- Admin and seller order lists use ten-item server-side pages. Seller totals are calculated across the whole store, not just the visible page.
- Admin-managed market ticker promotions with image cards and YouTube or Instagram video links.
- Product cards show a readable summary and open a full product-details view with availability and price.
- Product details can be shared directly to WhatsApp and Facebook; Instagram uses the device share sheet and product pages provide social image previews.
- Admin order list, order status controls, and manual payment confirmation.
- Customer order updates and payment confirmations through opt-in web push notifications, including when the storefront is closed.
- Customer order-receipt PDFs and filtered admin order-report PDFs, each with a QR code.
- Admin reports with date and fulfilment-status filters, order value, and confirmed payment totals.
- Clear payment-method selection and payer-account details during checkout.
- Customer profiles with private support inboxes for messages, product wishes, help requests, and issue reports.
- Admin customer-care inbox with replies delivered to the customer's profile and enabled push notifications.
- An installable PWA with custom market-bag-and-leaf SVG/PNG app icons, per-store manifests and branded SVG icons, role-aware bottom navigation, and safe-area-aware layouts. Icons use local assets and hand-authored SVG paths; the frontend does not depend on React icon libraries or Framer Motion.
- Search metadata, social share cards, product structured data, crawler-friendly product URLs, and a generated sitemap for public products and approved stores.
- Help centre, shopping guide, store policies, and privacy information.
- Store contact details for Kabuga Market, customer support, and developer enquiries.
- New-order alerts in the admin dashboard, checked every 15 seconds while the page is open. Browser notifications require permission and a supported browser.
- The desktop footer is hidden in installed standalone mode; its contact, help, policy, and developer details are available from Profile.
- Responsive layouts for desktop and mobile, with a cached application shell for offline loading (checkout and account data still require the API).

Mobile-money USSD hand-off is **not an online payment gateway**: the customer completes payment with their mobile operator, and the store confirms payment in its dashboard. Bank of Kigali orders remain pending while the store provides transfer instructions and verifies the transfer. The website never asks for or stores a payment PIN and does not mark payments paid automatically.

## Store and order workflows

### Seller stores

- Each account has one store profile, enforced by a unique database index on the owner. A second `POST /stores/apply` is rejected when a profile already exists.
- A new seller submits basic details from `/seller`; Green Market reviews the request before the storefront becomes public.
- Sellers edit the existing profile with `PATCH /stores/mine`. Pending, rejected, or removed profiles can be updated and resubmitted; an approved or paused store can update its details without creating another profile.
- Store statuses are `pending`, `approved`, `rejected`, `paused`, and `removed`. Approved and paused store owners can access their own seller-management routes. Pausing hides products from public store pages while retaining seller access to orders and details.
- Sellers can configure the store name and URL, description, category, contact details, address, logo URL, and banner URL. Products are sorted newest first; order and product pages include server-calculated pagination metadata.
- Seller product writes, deletes, summaries, and order updates are scoped to the authenticated owner's store ID. A seller cannot change another store's products or orders by supplying another ID.

### Checkout, inventory, and order status

- Main-market items and each standalone store have separate cart scopes. A checkout uses the signed-in user's server-side cart, and an optional `storeId` only selects the matching approved store's cart items.
- The API reads current product names and prices, calculates the total, reserves stock atomically, creates the order, and removes only the checked-out items in a MongoDB transaction. Client-supplied prices or item totals are not used.
- Status changes move forward: `pending` → `processing` → `shipped` → `delivered`. Cancellation is only allowed from `pending` or `processing`; it returns reserved stock. Shipped/delivered orders cannot be cancelled or moved backward through the normal status controls.
- Payment confirmation is `awaiting_confirmation` or `paid`. A confirmed payment cannot be reverted, and payment status cannot be changed after an order is cancelled. Cancellation and payment confirmation are separate operations.
- The admin and seller dashboards show paginated order lists, while their summary/report APIs aggregate full matching datasets rather than only the current page.

### Admin management and reports

- Admins manage Green Market products and promotions, review seller requests, pause or remove stores, and view marketplace-wide orders. Product-card promotion labels and their preset colors are controlled from the admin product editor.
- Reports support the current week, current month, a custom date range, or all time, with an optional fulfillment-status filter. Summary totals are computed server-side; PDF export fetches all matching report rows even when the order list itself is paginated.
- Customer order receipts and admin reports are downloadable PDFs with readable order details and QR codes. The QR code identifies the corresponding order/report context; it is not a payment authorization or proof of settlement.

### Customer profile, messages, and notifications

- `/profile` contains account details, sign-out, order-history shortcuts, a private support inbox, and a contact form for questions, suggestions, help requests, and reports. Admin replies appear in the customer's inbox.
- The Profile page also contains the store's address, phone and email contacts, help pages, shopping guide, policy/privacy pages, and Ishconnect contact details. These details remain accessible when the footer is hidden in standalone PWA mode.
- Customers can enable Web Push notifications for order receipt, status changes, and payment confirmation. Delivery while signed out or with the site closed requires browser/device push support, permission, a valid subscription, and configured VAPID secrets.

## PWA, icons, and SEO

- The main app manifest is `ecommerce/frontend/public/manifest.webmanifest`. It uses local PNG icons at 180×180 (Apple touch icon), 192×192, and 512×512, generated from the matching authored SVG brand mark. The icon artwork is a full-bleed market bag and leaves with a mask-safe central design.
- Approved standalone stores receive a manifest at `/store/:slug/manifest.webmanifest` and a dynamically generated SVG icon at `/store/:slug/app-icon.svg`. The manifest uses the store name, store-specific URL scope, and a store-specific brand color. The Apple touch icon falls back to the Green Market PNG icon.
- The bottom app navigation uses hand-authored inline SVG paths for Shop, Orders, bag, My store, Profile, Admin, and sign-in as applicable; it does not use `react-icons`, another icon package, or Framer Motion.
- The service worker caches the app shell, manifest, favicon, and app icons for offline shell loading. API-backed actions, orders, checkout, and account data are not available offline.
- In browser-installed standalone mode, the page footer is hidden to keep the app layout native-like; the same contact and information links are grouped on Profile.
- `robots.txt`, the social share card, Open Graph/Twitter metadata, structured product data, and `/sitemap.xml` support crawlers and sharing. Ordinary visitors to `/products/:id` are directed to the storefront; crawler requests receive a product metadata page.

## Pagination and report API behavior

| List | Page size | Scope |
| --- | ---: | --- |
| Admin products | 5 | Optional name search; newest first |
| Seller products | 5 | Current seller's store only; newest first |
| Admin orders | 10 | All stores |
| Seller orders | 10 | Current seller's store only |

Paginated list responses include `{ page, pageSize, total, totalPages }`. Out-of-range pages are clamped to the last available page. Admin report summary/detail endpoints are separate from paginated order-list endpoints so totals and PDF exports are not truncated to the visible page.

## Project layout

| Path | Responsibility |
| --- | --- |
| `ecommerce/backend/server.js` | Express app setup, environment loading, database connection, and startup |
| `ecommerce/backend/models/` | Mongoose schemas for users, products, orders, stores, and supporting data |
| `ecommerce/backend/routes/` | Authenticated/public API routes and access controls |
| `ecommerce/backend/services/orderOperations.js` | Transactional cancellation/stock restoration and order-status transition rules |
| `ecommerce/backend/services/pushNotifications.js` | Web Push subscription delivery |
| `ecommerce/frontend/src/App.jsx` | Routes, app shell, cart state, and mobile navigation |
| `ecommerce/frontend/src/pages/` | Storefront, seller, admin, profile, order, and information pages |
| `ecommerce/frontend/public/` | PWA manifest, service worker, offline shell, robots file, and local icon/social assets |
| `ecommerce/frontend/vercel.json` | Frontend-to-API rewrites for SEO and per-store PWA resources |

## Validation

Run the frontend production build after UI changes:

```powershell
Set-Location ecommerce/frontend
npm run build
```

For backend route/model changes, run `node --check` on each changed `.js` file from the repository root. The backend package currently has no configured automated test suite; MongoDB transaction behavior must be checked against a transaction-capable replica set.

## Requirements

- Node.js 20 or later and npm
- MongoDB Atlas or another MongoDB replica set (checkout, cancellation, and store removal use transactions)

## Run locally

From the project root:

```powershell
Set-Location ecommerce/backend
npm ci
Copy-Item .env.example .env
```

Set `MONGODB_URI` to your MongoDB Atlas connection string and set a long, random `JWT_SECRET` in `ecommerce/backend/.env`. Replace the Atlas URI placeholders with your Atlas database user, cluster, and database. Do not put real credentials in source files or commit `.env`. Existing deployments using `MONGO_URI` continue to work.

Start the API:

```powershell
npm run dev
```

The API listens on port `5000` by default. In a second terminal from the project root:

```powershell
Set-Location ecommerce/frontend
npm ci
npm run dev
```

Vite serves the storefront at `http://localhost:5173`. The frontend uses the deployed Render API by default. To use a local API or another URL, set `VITE_API_URL` in the frontend environment (include the `/api` path), for example `http://localhost:5000/api`.

To load the sample catalog, run this from the project root:

```powershell
Set-Location ecommerce/backend
npm run seed
```

The seed command is safe to rerun; it does not overwrite existing products.

To test customer push notifications locally, generate a VAPID key pair with `npx web-push generate-vapid-keys`, then set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` in `ecommerce/backend/.env`. Keep the private key secret. Customers must sign in to Order history and enable notifications in each browser/device; they can then receive order events even when signed out or when the site is closed, subject to browser and device push support.

To use a local MongoDB server, configure it as a single-node replica set before connecting; standalone MongoDB does not support the multi-document transactions used by order and inventory operations.

## Admin access

Register the account you want to use in the storefront, then promote it from `ecommerce/backend`:

```powershell
Set-Location ecommerce/backend
npm run make-admin -- admin@example.com
```

Sign out and sign back in to refresh the account role in the browser. Admin routes enforce authorization on the API as well as hiding the dashboard from customer accounts. Keep admin credentials private.

The admin dashboard's **Market Watch** section lets administrators create, edit, publish, hide, and remove promotional cards shown beneath the storefront navigation. YouTube links get an automatic thumbnail; for Instagram video links, provide an image URL to use as the card preview. Video cards open the original video in a new tab.

The **Marketplace** section lets administrators review seller applications, approve or reject them, pause or resume approved stores, and remove a store while retaining its historical orders. Each account has one store profile: sellers use **Sell with us** / **My store** to edit or resubmit that profile, rather than create duplicates, and approved sellers manage their own catalog and orders. Customers visit `/store/<slug>` to order from one seller at a time.

## API overview

All API routes are under `/api`.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | API and database health |
| `GET` | `/products` | Public | List products |
| `GET` | `/products/:id` | Public | Get one product |
| `POST` | `/register` | Public | Register an account |
| `POST` | `/login` | Public | Sign in |
| `GET` | `/cart` | Signed in | Read the main cart; optional `storeId` scopes the response to an approved standalone store |
| `POST`, `PATCH`, `DELETE` | `/cart/:productId` | Signed in | Add, change, or remove an item; optional `storeId` enforces the cart scope |
| `GET`, `POST` | `/orders` | Signed in | List the current user's orders and check out; submit `address`, `paymentMethod`, and `paymentAccount`, plus optional `storeId` |
| `GET` | `/admin/products` | Admin | Search and list all products with five-item pagination |
| `POST`, `PUT`, `DELETE` | `/products` and `/products/:id` | Admin | Create, update, and remove products |
| `GET` | `/promotions` | Public | List published market ticker promotions |
| `GET`, `POST` | `/admin/promotions` | Admin | List and create market ticker promotions |
| `PATCH`, `DELETE` | `/admin/promotions/:id` | Admin | Update, publish/hide, or remove a promotion |
| `POST` | `/stores/apply` | Signed in | Create the account's first standalone store profile; a second profile is rejected |
| `GET`, `PATCH` | `/stores/mine` | Signed in | Read or update your own store details |
| `GET` | `/stores/:slug` | Public | Read the public profile for an approved store |
| `GET` | `/stores/:slug/products` | Public | List products for an approved store |
| `GET` | `/admin/stores` | Admin | Review standalone store applications and statuses |
| `PATCH`, `DELETE` | `/admin/stores/:id` | Admin | Approve/reject/pause/resume or remove a store |
| `GET` | `/seller/summary` | Approved/paused seller | Aggregate product, low-stock, open-order, and paid-sales counts for own store |
| `GET`, `POST`, `PATCH`, `DELETE` | `/seller/products` and `/seller/products/:id` | Approved/paused seller | List (five per page), create, update, or delete only own-store products |
| `GET`, `PATCH` | `/seller/orders` and `/seller/orders/:id` | Approved/paused seller | List ten per page and update orders for only the seller's store |
| `GET` | `/admin/orders` | Admin | List orders with customer/payment details, ten per page |
| `GET` | `/admin/orders/report-summary` | Admin | Aggregate report totals for date/status filters |
| `GET` | `/admin/orders/report` | Admin | Retrieve all matching report rows for PDF export |
| `PATCH` | `/admin/orders/:id` | Admin | Update valid forward fulfillment `status` or `paymentStatus` |
| `GET` | `/notifications/public-key` | Public | Get the Web Push application server key |
| `POST`, `DELETE` | `/notifications/subscribe` | Signed in | Register or remove this browser's push subscription |
| `GET`, `POST` | `/contact/messages` | Signed in | Read your support inbox or send a message, wish, help request, or report |
| `GET` | `/admin/messages` | Admin | List customer messages |
| `PATCH` | `/admin/messages/:id/reply` | Admin | Reply to a customer in their profile inbox |
| `GET` | `/share/stores/:slug/manifest.webmanifest` | Public | Dynamic standalone-store install manifest |
| `GET` | `/share/stores/:slug/app-icon.svg` | Public | Dynamic standalone-store vector app icon |

Order fulfillment statuses are `pending`, `processing`, `shipped`, `delivered`, and `cancelled`. Normal status progression is forward-only; cancellation is allowed only before shipment. Payment confirmation statuses are `awaiting_confirmation` and `paid`; confirmed or cancelled-order payment states cannot be changed back through these endpoints.

`paymentMethod` is `momo`, `airtel_money`, or `bank_of_kigali`. `paymentAccount` is the mobile number or bank account number supplied for matching payment; it is visible only to the customer who placed the order, the authorized admin(s), and the owner of the store receiving that order. A `storeId` checkout contains products from that approved store only and creates an independent store-linked order.

## Production deployment

Deploy the backend on **Render** and the frontend on **Vercel**. Keep them as separate services.

### 1. Deploy the API to Render

1. Push the project to a Git repository after verifying that `.env` is ignored and no secrets are committed.
2. In Render, create a Blueprint from the repository. The root [`render.yaml`](./render.yaml) configures the Node web service, production start command, and `/api/health` health check.
3. Set the prompted `MONGODB_URI` to your MongoDB Atlas connection string using a database user with a strong password. Set `CORS_ORIGIN` to `https://greenmarket-livid.vercel.app` (no trailing slash). Render generates `JWT_SECRET`.
4. Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Add its public and private keys as Render `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` secrets, and set `VAPID_SUBJECT` to a contact such as `mailto:admin@example.com`. Never expose or commit the private key.
5. In MongoDB Atlas, allow network access from the deployed Render service using the access policy appropriate for your plan.
6. Wait for the Render service to become healthy at `https://greenmarket-api-2x85.onrender.com`.

The API accepts `MONGODB_URI` and the legacy `MONGO_URI`. Never commit `.env` or paste production credentials into source code.

### 2. Deploy the storefront to Vercel

1. Import the same repository as a Vercel project and set **Root Directory** to `ecommerce/frontend`.
2. Use the Vite defaults: build command `npm run build`, output directory `dist`, install command `npm ci`.
3. Add the environment variable `VITE_API_URL` with `https://greenmarket-api-2x85.onrender.com/api`.
4. Deploy the frontend at `https://greenmarket-livid.vercel.app`. The Render Blueprint already sets this origin in `CORS_ORIGIN`; redeploy the API after syncing Blueprint changes if needed.

The [`ecommerce/frontend/vercel.json`](./ecommerce/frontend/vercel.json) file rewrites client-side routes to the Vite entry point so pages such as `/orders` and `/admin` work when opened directly. Product crawler URLs and `/sitemap.xml` are routed to the Render API; the sitemap lists public products and approved stores. After deployment, submit `https://greenmarket-livid.vercel.app/sitemap.xml` in Google Search Console and verify the site ownership there. SEO metadata improves crawlability and sharing but cannot guarantee a particular Google ranking.

## Environment variables

| Variable | Service | Required | Purpose |
| --- | --- | --- | --- |
| `MONGODB_URI` | Render/API | Yes | MongoDB connection string (`MONGO_URI` is also accepted for existing deployments) |
| `JWT_SECRET` | Render/API | Yes | Signs authentication tokens |
| `CORS_ORIGIN` | Render/API | Yes in production | Comma-separated allowed frontend origins |
| `PORT` | Render/API | No | HTTP port; Render supplies this automatically |
| `VITE_API_URL` | Vercel/frontend | Yes in production | Public API base URL, including `/api` |
| `FRONTEND_URL` | Render/API | No | Storefront origin used in share-page canonical URLs; defaults to the production Vercel URL |
| `VAPID_PUBLIC_KEY` | Render/API | Yes for push | Web Push application server public key |
| `VAPID_PRIVATE_KEY` | Render/API | Yes for push | Secret Web Push application server private key |
| `VAPID_SUBJECT` | Render/API | Yes for push | Contact URI such as `mailto:admin@example.com` |

## Security notes

- Rotate any database credential that has been exposed, and update the Render `MONGODB_URI` secret.
- Do not commit `.env`, database credentials, JWT secrets, or payment PINs.
- Store owners can only manage their own store's products and orders; admin endpoints verify the current database role.
- Order placement, stock reservation/restoration, and store/product removal use MongoDB transactions and therefore require a transaction-capable replica set.
- Checkout retains the payer's mobile number or bank account number on the order for payment matching. Access is restricted to that customer, the authorized admin(s), and the owner of the store receiving the order; never enter a mobile-money or banking PIN on the website.
- Production API startup requires an explicit `CORS_ORIGIN`.
- Mobile-money USSD links contain only the selected provider flow, merchant number, and rounded amount. Payment is manually confirmed; no method is automatically marked paid.
