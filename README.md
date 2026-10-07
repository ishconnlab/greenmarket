# Green Market

A responsive e-commerce storefront for fresh food, everyday home goods, and useful devices. Green Market was developed by **Ishimwe Jean Claude** during the **Ishconnect Full-Stack Training, 2026**.

- **Website:** [www.ishconnect.rw](https://www.ishconnect.rw)
- **Frontend:** React, Vite, React Router, Axios
- **API:** Node.js, Express, MongoDB, Mongoose
- **Payments:** Rwanda MTN MoMo and Airtel Money USSD hand-off, with manual payment confirmation

## Features

- Browse products with search, categories, sorting, and favorites.
- Register and sign in to manage a cart and place orders.
- Checkout with a delivery address and MTN MoMo or Airtel Money payment choice.
- On supported mobile browsers, open the selected USSD flow from the order confirmation.
- Admin product creation, editing, and removal.
- Admin order list, order status controls, and manual payment confirmation.
- New-order alerts in the admin dashboard, checked every 15 seconds while the page is open. Browser notifications require permission and a supported browser.
- Responsive layouts for desktop and mobile.

USSD hand-off is **not an online payment gateway**: the customer completes payment with their mobile operator, and an administrator confirms payment in the dashboard. The website never asks for or stores a payment PIN. Bank of Kigali checkout is not enabled until its complete merchant details and verified USSD flow are available.

## Requirements

- Node.js 20 or later and npm
- A MongoDB database (local or MongoDB Atlas)

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

## Admin access

Register the account you want to use in the storefront, then promote it from `ecommerce/backend`:

```powershell
Set-Location ecommerce/backend
npm run make-admin -- admin@example.com
```

Sign out and sign back in to refresh the account role in the browser. Admin routes enforce authorization on the API as well as hiding the dashboard from customer accounts. Keep admin credentials private.

## API overview

All API routes are under `/api`.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | API and database health |
| `GET` | `/products` | Public | List products |
| `GET` | `/products/:id` | Public | Get one product |
| `POST` | `/register` | Public | Register an account |
| `POST` | `/login` | Public | Sign in |
| `GET`, `POST` | `/cart` | Signed in | Read cart and place items into cart |
| `PATCH`, `DELETE` | `/cart/:productId` | Signed in | Change or remove a cart item |
| `GET`, `POST` | `/orders` | Signed in | List the current user's orders and check out |
| `POST`, `PUT`, `DELETE` | `/products` and `/products/:id` | Admin | Create, update, and remove products |
| `GET` | `/admin/orders` | Admin | List all orders with customer and payment details |
| `PATCH` | `/admin/orders/:id` | Admin | Update fulfillment `status` or `paymentStatus` |

Order fulfillment statuses are `pending`, `processing`, `shipped`, `delivered`, and `cancelled`. Payment confirmation statuses are `awaiting_confirmation` and `paid`.

## Production deployment

Deploy the backend on **Render** and the frontend on **Vercel**. Keep them as separate services.

### 1. Deploy the API to Render

1. Push the project to a Git repository after verifying that `.env` is ignored and no secrets are committed.
2. In Render, create a Blueprint from the repository. The root [`render.yaml`](./render.yaml) configures the Node web service, production start command, and `/api/health` health check.
3. Set the prompted `MONGODB_URI` to your MongoDB Atlas connection string using a database user with a strong password. Set `CORS_ORIGIN` to `https://greenmarket-livid.vercel.app` (no trailing slash). Render generates `JWT_SECRET`.
4. In MongoDB Atlas, allow network access from the deployed Render service using the access policy appropriate for your plan.
5. Wait for the Render service to become healthy at `https://greenmarket-api-2x85.onrender.com`.

The API accepts `MONGODB_URI` and the legacy `MONGO_URI`. Never commit `.env` or paste production credentials into source code.

### 2. Deploy the storefront to Vercel

1. Import the same repository as a Vercel project and set **Root Directory** to `ecommerce/frontend`.
2. Use the Vite defaults: build command `npm run build`, output directory `dist`, install command `npm ci`.
3. Add the environment variable `VITE_API_URL` with `https://greenmarket-api-2x85.onrender.com/api`.
4. Deploy the frontend at `https://greenmarket-livid.vercel.app`. The Render Blueprint already sets this origin in `CORS_ORIGIN`; redeploy the API after syncing Blueprint changes if needed.

The [`ecommerce/frontend/vercel.json`](./ecommerce/frontend/vercel.json) file rewrites client-side routes to the Vite entry point so pages such as `/orders` and `/admin` work when opened directly.

## Environment variables

| Variable | Service | Required | Purpose |
| --- | --- | --- | --- |
| `MONGODB_URI` | Render/API | Yes | MongoDB connection string (`MONGO_URI` is also accepted for existing deployments) |
| `JWT_SECRET` | Render/API | Yes | Signs authentication tokens |
| `CORS_ORIGIN` | Render/API | Yes in production | Comma-separated allowed frontend origins |
| `PORT` | Render/API | No | HTTP port; Render supplies this automatically |
| `VITE_API_URL` | Vercel/frontend | Yes in production | Public API base URL, including `/api` |

## Security notes

- Rotate any database credential that has been exposed, and update the Render `MONGODB_URI` secret.
- Do not commit `.env`, database credentials, JWT secrets, or payment PINs.
- Production API startup requires an explicit `CORS_ORIGIN`.
- Payment links contain only the selected provider flow, merchant number, and rounded amount. Payment PINs must be entered only in the mobile operator's secure USSD prompt.
