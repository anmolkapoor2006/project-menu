# Task 3: Real-Time Ordering System, WebSockets, and Analytics Dashboards

Continuing on the same project (multi-tenant cafe QR-menu platform). Auth, DB, project scaffolding, menu management, QR codes, and public menu pages are already done. Now build the final phase: the customer ordering cart, real-time kitchen order notifications using WebSockets, and data analytics dashboards for both Cafe Admins and the platform Super Admin.

## What to build in this task:

1. **Extend Prisma schema** with:
   - Order: `id` (UUID), `restaurant_id` (FK -> Restaurant), `table_number` (string, optional), `status` (enum: `RECEIVED`, `PREPARING`, `SERVED`, `CANCELLED`, default: `RECEIVED`), `created_at`, `updated_at`
   - OrderItem: `id` (UUID), `order_id` (FK -> Order), `menu_item_id` (FK -> MenuItem), `quantity` (int), `price_at_order` (decimal/float), `notes` (string, optional)
   Run migrations.

2. **Backend APIs & WebSockets (Socket.io):**
   - Integrate `socket.io` into the Express server.
   - Listen for client connections. When a Restaurant Admin client connects, join them to a specific WebSocket room: `restaurant_<restaurantId>`.
   - `POST /api/public/menu/:slug/order` (public endpoint) — places a new order. Saves the order and items to the DB, and emits a WebSocket event `new_order` with the order payload to the target restaurant's room (`restaurant_<restaurantId>`).
   - `GET /api/restaurants/:id/orders` (protected) — fetch orders for the restaurant (support filtering by active/past status).
   - `PUT /api/orders/:id/status` (protected) — update order status.
   - `GET /api/restaurants/:id/analytics` (protected) — returns stats for the Restaurant Admin: total views/scans, view count over time (grouped by day), top 5 most viewed items, and order volume.
   - `GET /api/admin/analytics/platform` (protected, Super Admin only) — returns platform-wide stats: total onboarded restaurants, total scans, total views (broken down by QR vs direct link), top restaurants leaderboard, and daily signup growth.

3. **Frontend — Public Menu Page (Cart & Checkout):**
   - Add a floating cart badge and sliding cart drawer to the public menu page.
   - Customers can add items to the cart, adjust quantities, add special instructions (notes) per item, and enter their table number.
   - Implement a checkout button: **"Place Order - Pay at Counter"**.
   - On submission, call the place-order API. Once successful, clear the cart and redirect the customer to a clean "Order Received" confirmation page showing their order summary and state (e.g., "Sent to kitchen").

4. **Frontend — Restaurant Admin Dashboard (Live Orders & Analytics UI):**
   - **Live Orders View**: Establish a WebSocket connection on mount. Whenever a `new_order` event is received, append it to the live orders state and play a brief notification sound. Display orders as cards showing the table number, elapsed time, item details, and status action buttons (e.g., "Start Preparing", "Serve", "Cancel").
   - **Analytics View**: Render a dashboard with summary cards (Total Scans, Conversion Rate, Total Orders) and charts (using Recharts or Chart.js) showing traffic trends over the last 30 days and a bar chart of top-performing menu items.

5. **Frontend — Super Admin Dashboard (Platform Dashboard UI):**
   - Display platform metrics: total restaurants registered, total system-wide views, and QR scan conversion rate.
   - Render a data table listing all registered restaurants, showing their slug, owner email, creation date, view/scan stats, and a toggle switch to activate/deactivate their subscription status.
   - Render graphs showing platform growth (restaurants registered over time) and platform traffic activity (daily views & scans).

## Deliverable
A complete real-time ordering cycle: A customer scans the QR, adds items to their cart, inputs their table number, and places an order. The order instantly pops up on the Restaurant Admin's dashboard with an audio ping. The Restaurant Admin can transition the order status. Both the Cafe Admin and the Super Admin can see updated graphs and scan metrics reflecting the new activity.
