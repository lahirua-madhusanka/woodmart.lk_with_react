# Woodmart.lk - Full-Stack Premium eCommerce

Production-oriented eCommerce application with a React frontend and Node.js/Express/MongoDB backend, including JWT auth, cart/wishlist sync, checkout flow, Stripe payment integration, order history, and a full admin dashboard.

## Stack
- Frontend: React, React Router, Tailwind CSS, Framer Motion, Axios, React Toastify, Stripe Elements
- Backend: Node.js, Express.js, MongoDB (Mongoose), JWT, bcrypt, express-validator, Stripe

## Brand Theme
- Primary color: #0959a4

## Project Structure

```text
.
|-- src
|   |-- components
|   |   |-- auth
|   |   |   `-- PrivateRoute.jsx
|   |   |-- admin
|   |   |-- home
|   |   |-- layout
|   |   `-- products
|   |-- context
|   |   |-- AuthContext.jsx
|   |   `-- StoreContext.jsx
|   |-- data
|   |-- pages
|   |   |-- admin
|   |   |-- AboutPage.jsx
|   |   |-- AuthPage.jsx
|   |   |-- CartPage.jsx
|   |   |-- CheckoutPage.jsx
|   |   |-- ContactPage.jsx
|   |   |-- HomePage.jsx
|   |   |-- OrderConfirmationPage.jsx
|   |   |-- OrdersPage.jsx
|   |   |-- ProductDetailsPage.jsx
|   |   |-- ShopPage.jsx
|   |   `-- WishlistPage.jsx
|   |-- routes
|   |   `-- AdminRoute.jsx
|   `-- services
|       |-- adminApi
|       |-- apiClient.js
|       |-- authService.js
|       |-- cartService.js
|       |-- orderService.js
|       |-- productService.js
|       `-- wishlistService.js
`-- server
    |-- config
    |   |-- db.js
    |   `-- env.js
    |-- controllers
    |-- middleware
    |-- models
    |-- routes
    |-- .env.example
    `-- server.js
```

## Environment Variables

### Frontend (`.env`)
Copy from `.env.example`:

```bash
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
```

### Backend (`server/.env`)
Copy from `server/.env.example`:

```bash
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/woodmart
JWT_SECRET=replace_with_a_secure_long_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_replace_me
```

## Install

### 1. Root (frontend)
```bash
npm install
```

### 2. Backend
```bash
npm install --prefix server
```

## Run

### Frontend only
```bash
npm run dev
```

### Backend only
```bash
npm run server
```

### Full stack together
```bash
npm run dev:full
```

## Build Frontend
```bash
npm run build
npm run preview
```

## Deploy To GitHub (Frontend + Backend)

GitHub Pages can host the frontend only (static files). Your backend API must be hosted on a server platform such as Render, Railway, or Fly.io.

### 1. Push repository to GitHub
- Create a GitHub repository and push this project.
- Make sure your default branch is `main`.

### 2. Host backend API
- Deploy the `server` folder to Render/Railway/Fly.
- Set backend environment variables from `server/.env.example`.
- Set `CLIENT_URL` to your GitHub Pages URL after step 4.

### 3. Add GitHub repository secrets
Go to GitHub repository settings:
`Settings -> Secrets and variables -> Actions -> New repository secret`

Create these secrets:
- `VITE_API_URL` : backend API base URL, for example `https://your-backend-domain.com/api`
- `VITE_SOCKET_URL` : backend socket origin, for example `https://your-backend-domain.com`
- `VITE_STRIPE_PUBLISHABLE_KEY` : your Stripe publishable key

### 4. Enable GitHub Pages
- Go to repository `Settings -> Pages`.
- Under `Build and deployment`, choose `GitHub Actions`.

The workflow file `.github/workflows/deploy-frontend-pages.yml` will auto-deploy on every push to `main`.

### 5. Verify deployment
- Open `Actions` tab and confirm the workflow succeeds.
- Open the Pages URL shown in `Settings -> Pages`.
- Verify storefront and admin routes load correctly.

## Backend Hosting (Render)

Use Render to host the Node/Express API from the `server` directory.

### 1. Connect repository
- Go to Render dashboard and choose `New +` -> `Blueprint`.
- Select this GitHub repository.
- Render will detect [render.yaml](render.yaml) and create the API service.

### 2. Set backend environment variables
In Render service settings, fill all `sync: false` variables from [server/.env.example](server/.env.example):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET`
- `CLIENT_URL` : your GitHub Pages frontend URL
- `STRIPE_SECRET_KEY`
- `ADMIN_REGISTER_SECRET`
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Optional but recommended:
- `JWT_EXPIRES_IN` (default `7d`)
- `PRODUCT_IMAGES_BUCKET` (default `product-images`)

### 3. Deploy and verify
- Deploy service.
- Confirm health endpoint works: `https://<render-service>.onrender.com/api/health`

### 4. Connect frontend to backend
After backend is live, set/update GitHub Actions secrets in your repository:

- `VITE_API_URL` = `https://<render-service>.onrender.com/api`
- `VITE_SOCKET_URL` = `https://<render-service>.onrender.com`

Push to `main` to redeploy frontend with the new API URL.

### 5. CORS check
If frontend cannot call backend, confirm `CLIENT_URL` exactly matches your GitHub Pages URL (no trailing slash mismatch).

### Notes
- Routing is already configured for GitHub Pages subpaths.
- If your repository is named `<user>.github.io`, the app deploys at root `/`.
- Otherwise, it deploys at `/<repo-name>/` automatically.

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`

### Products
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (admin)
- `PUT /api/products/:id` (admin)
- `DELETE /api/products/:id` (admin)
- `POST /api/products/:id/reviews` (auth)

### Cart
- `GET /api/cart`
- `POST /api/cart/add`
- `PUT /api/cart/update`
- `DELETE /api/cart/remove`

### Wishlist
- `GET /api/wishlist`
- `POST /api/wishlist/add`
- `DELETE /api/wishlist/remove`

### Orders / Payments
- `POST /api/orders/create-payment-intent`
- `POST /api/orders/create`
- `GET /api/orders/user`
- `GET /api/orders/:id`

### Admin
- `GET /api/admin/stats`
- `GET /api/admin/orders`
- `PUT /api/admin/orders/:id/status`
- `GET /api/admin/users`
- `PUT /api/admin/users/:id/role`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/categories`
- `GET /api/admin/reviews`

## Checkout Flow Implemented
1. Cart review
2. Shipping address
3. Order summary
4. Payment selection (Stripe card or COD)
5. Order confirmation

## Security Included
- Password hashing with bcrypt
- JWT-based authentication
- Protected/private routes
- Admin-only product management routes
- Input validation with express-validator
- Helmet + CORS + HTTP-only auth cookie support
- Stock validation before order creation

## Example Axios Calls

```js
// Login
await apiClient.post("/auth/login", {
  email: "john@example.com",
  password: "secret123",
});

// Add to cart
await apiClient.post("/cart/add", {
  productId: "67ff123abcde4567890f1234",
  quantity: 2,
});

// Create payment intent
await apiClient.post("/orders/create-payment-intent", {
  amount: 149.99,
});

// Create order
await apiClient.post("/orders/create", {
  shippingAddress: {
    fullName: "John Doe",
    line1: "12 Main Street",
    line2: "",
    city: "Colombo",
    postalCode: "00100",
    country: "Sri Lanka",
    phone: "+94 77 123 4567",
  },
  paymentStatus: "paid",
  paymentIntentId: "pi_123",
});
```

## Notes
- If MongoDB has no products, use admin product creation API or seed route to add catalog data.
- Stripe card flow requires valid test keys in both frontend and backend env files.
- Admin routes/pages require a logged-in user with `role: admin`.
