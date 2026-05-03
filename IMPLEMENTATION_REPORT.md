# ESIOT Implementation Report

## Project Title
Smart RFID-Based Billing System (ESIOT)

## Objective
Build a real-time billing experience where RFID scans update a live cart, user completes mock payment, bill is generated, and cart is cleared.

## Final System Flow Implemented
1. RFID UID is sent to backend via `POST /scan`
2. Backend maps UID to product
3. Product is added to active cart (or quantity updated)
4. Frontend fetches cart periodically and updates UI live
5. User pays via mock payment
6. Backend creates bill record
7. Cart resets automatically

## Tech Stack Used

### Backend
- Node.js + Express
- MongoDB (local)
- Mongoose ODM

### Frontend
- React + TypeScript + Vite
- Tailwind CSS (v4)
- Framer Motion animations
- Axios for API calls
- Lucide icons

## Backend Work Completed (Shashi)

### Data Models
- `Product`
  - `uid`, `name`, `price`, `category`
- `Cart`
  - singleton active cart with `items[]`, `total`
- `Bill`
  - `billId`, `items[]`, `total`, `paymentStatus`

### APIs Implemented
- `GET /health`
- `POST /scan`
- `GET /cart`
- `DELETE /cart`
- `POST /pay`
- `GET /bill/:id`
- `GET /products`
- `POST /products`
- `PUT /products/:uid`
- `DELETE /products/:uid`

### Backend Functional Features
- UID normalization (`uppercase + trim`)
- Unknown UID handling with clear error message
- Duplicate scan debounce using `SCAN_COOLDOWN_MS`
- Optional remove-on-rescan behavior using `REMOVE_ON_RESCAN`
- Seeded demo product mappings on first start
- Automatic bill generation on payment
- Automatic cart clear post-payment

## Frontend Work Completed (Shashi)

### Screens
- Cart page
- Payment page
- Bill page

### UX/UI Enhancements
- Premium dark gradient background and glassmorphism cards
- Smooth route transitions using Framer Motion
- Live KPIs (item count and total)
- Real-time polling every 2 seconds for cart updates
- Toast notifications for scan, payment, errors
- Reset Cart action with confirmation modal
- Last scanned product row highlighting
- Empty/loading/error state handling

## Integration Readiness Completed
- Backend verified through real HTTP calls:
  - scan -> pay -> bill -> cart clear
- Frontend build and lint passed
- API shape finalized for ESP32 integration

## Environment Controls
Set in `server/.env`:
- `PORT`
- `MONGO_URI`
- `SCAN_COOLDOWN_MS`
- `REMOVE_ON_RESCAN`

## Hardware-Dependent Work Pending (Ganesh Scope Only)
- RC522 wiring with ESP32
- UID read from physical RFID tags
- WiFi connection from ESP32
- HTTP `POST /scan` from ESP32 to backend LAN IP
- Optional hardware buzzer/LCD feedback

## How To Demo (Current Stage)
1. Run MongoDB locally
2. Start backend (`server`)
3. Start frontend (`client`)
4. Hit `POST /scan` using Postman with sample UID
5. See cart update in UI
6. Click Pay
7. Open generated bill page and verify cart is empty

## Notes for Final Review
- Software side is complete and integration-ready.
- Only hardware scan trigger remains for full live showcase.
- Backend already supports real tag scans and error-safe behavior.
