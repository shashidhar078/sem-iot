# Smart RFID Billing System (ESIOT)

End-to-end local setup with:

- `server/`: Express + MongoDB APIs
- `client/`: React + Vite premium UI

## 1) Prerequisites

- Node.js 20+
- Local MongoDB running on `mongodb://127.0.0.1:27017`

## 2) Start Backend

```bash
cd server
copy .env.example .env
npm install
npm run dev
```

Backend URL: `http://localhost:5000`

## 3) Start Frontend

```bash
cd client
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

Navigation: Cart (with remove buttons) | Payment | Bills (list all previous bills)

## 4) APIs

- `POST /scan`
  - Body: `{ "uid": "123ABC" }`
  - Adds/increments product in cart (or decrements when remove mode enabled)
- `GET /cart`
  - Returns active cart
- `POST /pay`
  - Creates bill and clears cart
- `GET /bill/:id`
  - Returns generated invoice
- `DELETE /cart/:uid`
  - Remove specific item from cart
- `GET /bills`
  - List all generated bills
- `GET /products`
  - List all mapped RFID products
- `POST /products`
  - Add product mapping
- `PUT /products/:uid`
  - Update product details
- `DELETE /products/:uid`
  - Remove product mapping

## 5) ESP32 Integration Target

Send HTTP request to:

- URL: `http://<your-laptop-ip>:5000/scan`
- Method: `POST`
- JSON:
  ```json
  {
    "uid": "A1B2C3D4"
  }
  ```

Use your machine's LAN IP, not `localhost`, when calling from ESP32.

## 6) Optional Scan Behavior Controls

Configure in `server/.env`:

- `SCAN_COOLDOWN_MS=900`
  - Ignores very fast duplicate scans from RFID bounce
- `REMOVE_ON_RESCAN=false`
  - `false`: scan same UID again to increase quantity
  - `true`: scan same UID again to decrease/remove quantity

## 7) Seeded RFID Products

- `123ABC` -> Milk (Rs 50)
- `A1B2C3D4` -> Bread (Rs 35)
- `9F8E7D6C` -> Juice (Rs 90)
- `5566AABB` -> Chocolate (Rs 120)
