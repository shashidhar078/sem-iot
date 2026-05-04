# Smart RFID Billing System (ESIOT)

A modern, full-stack IoT billing application designed for rapid, seamless checkout experiences. This system bridges the gap between hardware (ESP32 RFID Scanners) and software, providing a completely automated billing ecosystem that drastically reduces checkout times and eliminates manual billing errors.

## 🌟 About the System & Its Importance

In traditional retail or cafeteria environments, the billing process creates severe bottlenecks. Customers must wait for an attendant to manually scan or input every single item. 

**ESIOT** solves this by leveraging RFID technology integrated directly into a dynamic web ecosystem. When items tagged with RFID stickers are passed over an ESP32 scanner, they are instantaneously added to the active customer's digital cart. 

**Key Benefits:**
- **Frictionless Checkout:** Items are added instantly without manual entry.
- **Hardware-Software Sync:** The frontend dynamically polls the backend (every 2 seconds) so the UI updates automatically as soon as the ESP32 registers a scan. No page refreshes required.
- **Hardware Fault Tolerance:** Includes built-in cooldowns (`SCAN_COOLDOWN_MS`) to ignore duplicate scans caused by sensor bounce, ensuring accurate billing.
- **Digital Receipts:** Paperless billing is enforced through an integrated **Twilio WhatsApp API**, automatically sending formatted digital receipts directly to the customer's phone upon successful wallet payment.

## 🚀 Tech Stack

- **Frontend:** React, Vite, TailwindCSS v4, Framer Motion, Lucide React
- **Backend:** Node.js, Express.js, MongoDB (Mongoose)
- **Integrations:** Twilio REST API (WhatsApp Sandbox)
- **Hardware Interface:** Standard HTTP POST from ESP32/Arduino

## 📁 Project Structure

The project has been refactored into a clean, modular architecture:

```text
sem-iot/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── api/            # Axios instance & interceptors
│   │   ├── components/     # Reusable UI (Guards, Modals, Toasts)
│   │   ├── pages/          # Full page views (Admin, Customer, Login)
│   │   └── types/          # TypeScript interfaces
│   └── vite.config.ts      # Vite config with IPv4 strict proxy
└── server/                 # Express Backend
    ├── src/
    │   ├── models/         # Mongoose Schemas (User, Product, Cart, Bill)
    │   ├── routes/         # Modular feature routers (auth, cart, scan, pay, etc.)
    │   ├── utils/          # Helper logic & user resolution
    │   ├── store.js        # Global state for hardware-to-user routing
    │   └── server.js       # Main entry & MongoDB connection
    └── .env                # Secrets and configuration
```

## ⚙️ Prerequisites

- **Node.js** (v18 or higher recommended)
- **MongoDB** (Local `127.0.0.1:27017` or Atlas cluster)
- **Twilio Account** (For WhatsApp receipts)

## 🛠️ Installation & Run Guide

### 1. Backend Setup

Open a terminal and navigate to the server folder:
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory. Here is the template you must follow:
```env
PORT=5000
MONGO_URI=mongodb+srv://<your-cluster-url>
# Behavior configurations
SCAN_COOLDOWN_MS=900
REMOVE_ON_RESCAN=false
# Twilio Config
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Start the backend:
```bash
npm run dev
```
*The server will run on `http://localhost:5000`.*

### 2. Frontend Setup

Open a **new** terminal and navigate to the client folder:
```bash
cd client
npm install
```

Start the frontend:
```bash
npm run dev
```
*The React app will be available at `http://localhost:5173`.*

> **Login Credentials:** On first boot, the system automatically creates an admin account:
> - **Email:** `admin@esiot.com`
> - **Password:** `admin123`

## 📡 API Endpoints (Quick Reference)

- **Auth:** `POST /auth/login`, `POST /auth/signup`
- **Scan (Hardware):** `POST /scan` (Body: `{ "uid": "CARD_HEX" }`)
- **Cart:** `GET /cart`, `DELETE /cart`, `DELETE /cart/:uid`
- **Wallet:** `GET /wallet`, `POST /wallet/add`
- **Payment:** `POST /pay` (Validates wallet, creates bill, triggers WhatsApp)
- **Products:** `GET /products`, `PUT /products/:uid`

## 🔌 Hardware Integration (ESP32)

To connect your ESP32 scanner to the system, program it to make an HTTP POST request every time a card is tapped.

- **URL:** `http://<YOUR-LAPTOP-IP>:5000/scan` *(Do not use `localhost` on the ESP32!)*
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Payload:**
  ```json
  {
    "uid": "A1B2C3D4"
  }
  ```

### Hardware Safeguards
You can tweak how the backend responds to the scanner using `.env` variables:
- `SCAN_COOLDOWN_MS`: (Default 900) Prevents the system from registering duplicate scans if the user holds the card on the reader for too long.
- `REMOVE_ON_RESCAN`: If set to `true`, scanning an item already in the cart will remove it instead of adding a second quantity.
