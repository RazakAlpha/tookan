# Delivery Address & Tookan Dispatch Plugin

Validates customer addresses, checks delivery range, and dispatches drivers via Tookan.

Drop this into your existing ordering app. No refactoring needed.

---

## What's In This Folder

```
├── env.config                         COPY THIS TO .env — ready to run, no keys needed
├── package.json                       scripts: start, dev, test
├── Dockerfile                         production image (Node 22 Alpine)
│
├── src/                               APPLICATION ROOT
│   ├── server.js                      starts the HTTP server
│   ├── app.js                         Express app + routes + middleware
│   ├── config/index.js                reads .env, exports all settings
│   ├── middleware/
│   │   ├── rateLimiter.js             blocks too many requests per IP
│   │   └── validate.js                rejects bad query params / body fields
│   ├── utils/
│   │   ├── geo.js                     haversine distance + point-in-polygon math
│   │   └── response.js                wraps every response in { success, data/error }
│   ├── address/                       ADDRESS MODULE — autocomplete, validation, service area
│   │   ├── routes/addressRoutes.js
│   │   ├── controllers/addressController.js
│   │   ├── services/addressService.js
│   │   └── providers/
│   │       ├── index.js               factory — picks provider from config
│   │       ├── base/AddressProvider.js
│   │       ├── google/                Google Places API
│   │       ├── mapbox/                Mapbox Geocoding API
│   │       └── mock/                  fake addresses for testing (no API key)
│   └── delivery/                      DELIVERY MODULE — dispatch to Tookan
│       ├── routes/deliveryRoutes.js
│       ├── controllers/deliveryController.js
│       ├── services/deliveryService.js
│       ├── validators/dispatchValidator.js
│       └── providers/
│           ├── index.js
│           ├── base/DeliveryProvider.js
│           ├── tookan/TookanProvider.js
│           └── mock/
│
├── database/
│   └── 001_delivery_address_schema.sql  run this against your DB
│
└── tests/
    ├── address.test.js
    ├── delivery.test.js
    └── api.test.js
```

---

## Setup — 4 Steps

### 1. Use this repo as a service or copy `src/` into your app

Run it from this repository as a standalone API, or copy the `src/` tree into your project (for example `src/` or `lib/delivery/`) and adjust `require` paths.

### 2. Create your .env file

```bash
cp env.config .env
```

On Windows PowerShell: `Copy-Item env.config .env`

That's it. The defaults use mock providers so everything works immediately with no API keys.

### 3. Install dependencies

```bash
npm install
```

### 4. Run the server or mount routes

**Standalone (this repo):**

```bash
npm start
```

Development with auto-restart:

```bash
npm run dev
```

**Mount in an existing Express app:**

```javascript
const addressRoutes = require("./src/address/routes/addressRoutes");
const deliveryRoutes = require("./src/delivery/routes/deliveryRoutes");

app.use("/api/address", addressRoutes);
app.use("/api/delivery", deliveryRoutes);
```

Test it: `http://localhost:3001/api/health`

### Deploy (Docker)

From the repository root:

```bash
docker build -t delivery-plugin .
docker run --rm -p 3001:3001 --env-file .env delivery-plugin
```

The container listens on `PORT` (default **3001**). Set `PORT` in `.env` or `-e PORT=8080` if your host expects a different port.

---

## How to Use It — The One Function That Matters

After setup, you call one function from your order flow:

```javascript
const { getDeliveryService } = require("./src/delivery/services/deliveryService");
const deliveryService = getDeliveryService();

// Call this after the customer places an order
const result = await deliveryService.createDispatch(
  {
    orderId: order.id.toString(),
    customer: {
      name: order.customer_name,
      phone: order.customer_phone,
      address: order.delivery_address,
      formattedAddress: order.formatted_address,
      addressLine1: order.address_line1,
      addressLine2: order.address_line2 || "",
      city: order.city,
      state: order.state,
      postalCode: order.postal_code,
      country: order.country || "US",
      latitude: order.latitude,
      longitude: order.longitude,
      placeId: order.place_id || "",
    },
    pickup: {
      name: store.name,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
    },
    notes: order.delivery_notes || "",
  },
  {
    store: {
      id: store.id.toString(),
      latitude: store.latitude,
      longitude: store.longitude,
      radiusKm: store.delivery_radius_km,
    },
  }
);
```

### What You Get Back

**If it worked:**
```javascript
{
  blocked: false,
  addressValidation: { status: "valid" },
  serviceAreaCheck: { allowed: true, distanceFromStore: 2.4 },
  dispatch: {
    taskId: "12345678",              // save this in your DB
    trackingUrl: "https://trfrk.com/xxxxx",  // show this to the customer
    status: "created"
  }
}
```

**If the address was bad:**
```javascript
{
  blocked: true,
  blockReason: "Address validation failed: Missing fields: city, postalCode",
  dispatch: null
}
```

**If the customer is too far away:**
```javascript
{
  blocked: true,
  blockReason: "Service area check failed: Outside service area: 1204 km away, limit is 15 km",
  dispatch: null
}
```

### What to Do With the Result

```javascript
if (result.blocked) {
  // Don't charge the customer. Show them the reason.
  await updateOrder(order.id, { delivery_status: "blocked", reason: result.blockReason });
  throw new Error(result.blockReason);
}

// Save the Tookan task info to your database
await updateOrder(order.id, {
  delivery_status: "dispatched",
  tookan_task_id: result.dispatch.taskId,
  tracking_url: result.dispatch.trackingUrl,
});
```

---

## What Happens Inside (The 4-Step Flow)

When you call `createDispatch`, this runs:

```
Step 1: VALIDATE ADDRESS
    Does the customer have street, city, zip, lat, lng?
    Missing anything → BLOCKED (no Tookan call)
        │
        ▼ all fields present
Step 2: CHECK SERVICE AREA
    Calculate km between store and customer using Haversine formula
    Too far → BLOCKED (no Tookan call)
        │
        ▼ within range
Step 3: BUILD TOOKAN PAYLOAD
    Map your fields → Tookan's field names
    Move apartment number to description (Google Maps can't parse it)
    Convert dates to Tookan format
    Attach address as meta_data custom fields
        │
        ▼
Step 4: SEND TO TOOKAN
    POST to https://api.tookanapp.com/v2/create_task
    Get back: job_id + tracking_link
    Return to your code
```

---

## Adding Address Autocomplete to Your Checkout Page

So customers pick addresses from a dropdown instead of typing freeform:

```javascript
// 1. Search as they type (debounce this — don't call every keystroke)
const res = await fetch(`/api/address/autocomplete?q=${input}`);
const { data: suggestions } = await res.json();
// Show dropdown: ["123 Main St, Atlanta, GA", "123 Main Ave, Decatur, GA", ...]

// 2. When they pick one
const res2 = await fetch(`/api/address/place/${suggestions[0].id}`);
const { data: details } = await res2.json();
// details = { addressLine1, city, state, postalCode, latitude, longitude, ... }
// Save ALL of these to the order

// 3. Optional: check delivery range before they submit
const res3 = await fetch("/api/address/service-check", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    address: { latitude: details.latitude, longitude: details.longitude },
    store: { id: "store_1", latitude: 33.770, longitude: -84.385, radiusKm: 15 },
  }),
});
const { data: check } = await res3.json();
if (!check.allowed) showError("Sorry, we don't deliver to this area");
```

---

## Checking Delivery Status After Dispatch

```javascript
const status = await deliveryService.getTaskStatus(savedTaskId);
// status = { taskId, status: "in_progress", agentName: "Mike", agentPhone: "555-0200", trackingUrl }
```

Tookan status values:

| Status | Meaning |
|---|---|
| unassigned | No driver yet |
| assigned | Driver assigned |
| accepted | Driver accepted the task |
| started | Driver started |
| in_progress | Driver on the way |
| successful | Delivered |
| failed | Delivery failed |
| cancel | Cancelled |

To cancel: `await deliveryService.cancelTask(savedTaskId);`

---

## Where to Call the Plugin in Your Code

| When | Where in your code |
|---|---|
| Customer submits order | Your `createOrder` function, after saving to DB |
| Staff confirms order | Your `confirmOrder` function |
| Payment clears | Your payment webhook handler |
| Staff clicks "Send to driver" | Your admin dispatch endpoint |
| Scheduled delivery | A cron job at the scheduled time |

The call is always `deliveryService.createDispatch(payload, options)`.

---

## Going Live

### Development (works now, no keys needed)
```env
ADDRESS_PROVIDER=mock
DELIVERY_PROVIDER=mock
```

### Production (edit your .env)
```env
ADDRESS_PROVIDER=google
GOOGLE_PLACES_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key

DELIVERY_PROVIDER=tookan
TOOKAN_API_KEY=your_key
TOOKAN_TIMEZONE=-300
```

### Before switching to production

1. Run `POST /api/delivery/dispatch/preview` with real order data — verify the Tookan payload looks right
2. Create one test task in Tookan — check it shows in the Tookan dashboard
3. Verify custom fields show up (if blank, your template labels don't match — see Tookan Gotchas below)
4. Verify the tracking URL works
5. Cancel the test task

---

## Database

Run `database/001_delivery_address_schema.sql` against your database. Change `delivery_orders` to your actual table name.

Adds these columns to your orders table:
- `customer_address_line1`, `city`, `state`, `postal_code`, `country`
- `customer_latitude`, `customer_longitude`, `customer_place_id`
- `address_validation_status`, `service_area_allowed`
- `provider_task_id`, `provider_tracking_url`, `provider_status`

Creates a `delivery_tasks` table for Tookan task tracking history.

---

## Tookan Gotchas

### meta_data labels must match your Tookan template

The `label` in each custom field must exactly match the label in your Tookan dashboard template (Dashboard → Settings → Templates → Edit). If it doesn't match, the field appears blank.

### Timezone is a minute offset, not a timezone name

`TOOKAN_TIMEZONE=-300` means EST (UTC-5). Formula: `hours_ahead_of_UTC × -60`. If your tasks show wrong times, this is wrong.

### Apartment numbers break address parsing

Tookan uses Google Maps to parse addresses. "123 Main St Apt 4B" confuses it. The plugin automatically moves Apt/Suite to the task description instead.

### Auto-assignment needs agents online

If no driver gets assigned: check they're online, on duty, within geofence, tags match, and wallet isn't empty.

### Pass custom meta_data for your template fields

```javascript
customMetaData: [
  { label: "Order Total", data: "$42.50" },
  { label: "Items", data: "2x Burger, 1x Fries" },
],
```

### Assign to a specific driver

```javascript
fleetId: "70441",  // the driver's fleet_id from Tookan
```

---

## API Endpoints

| Method | URL | What it does |
|---|---|---|
| GET | `/api/address/autocomplete?q=...` | Search addresses |
| GET | `/api/address/place/:placeId` | Get full address details |
| POST | `/api/address/validate` | Check if address is complete |
| POST | `/api/address/reverse-geocode` | Convert lat/lng to address |
| POST | `/api/address/service-check` | Check if address is in delivery range |
| POST | `/api/delivery/dispatch` | Validate + check area + send to Tookan |
| POST | `/api/delivery/dispatch/delivery-only` | Delivery task only (no pickup) |
| POST | `/api/delivery/dispatch/pickup-only` | Pickup task only |
| POST | `/api/delivery/dispatch/preview` | See Tookan payload without sending |
| GET | `/api/delivery/task/:taskId` | Check task status (Tookan uses `get_job_details` internally) |
| POST | `/api/delivery/task/:taskId/cancel` | Cancel a task (`cancel_task`) |
| POST | `/api/delivery/tasks/bulk` | `create_multiple_tasks` |
| POST | `/api/delivery/tasks/search` | `get_all_tasks` (filters in JSON body; max 31-day window upstream) |
| POST | `/api/delivery/tasks/details` | `get_job_details` — body `{ "jobIds": [ … ], … }` |
| POST | `/api/delivery/tasks/by-order-id` | `get_job_details_by_order_id` — body `{ "orderIds": [ … ], … }` |
| PATCH | `/api/delivery/tasks/:jobId` | `edit_task` |
| POST | `/api/delivery/tasks/edit-multiple` | `edit_multiple_tasks` |
| DELETE | `/api/delivery/tasks/:jobId` | `delete_task` (distinct from cancel) |
| POST | `/api/delivery/tasks/:jobId/status` | `update_task_status` — body `{ "job_status": "2" }` |
| POST | `/api/delivery/tasks/:jobId/assign` | `assign_task` |
| POST | `/api/delivery/tasks/:jobId/auto-assign` | `re_autoassign_task` |
| POST | `/api/delivery/tasks/reassign-open` | `reassign_open_tasks` |
| POST | `/api/delivery/tasks/assign-fleet` | `assign_fleet_to_task` |
| POST | `/api/delivery/tasks/assign-fleet-related` | `assign_fleet_to_related_tasks` |
| POST | `/api/delivery/agents` | `add_agent` |
| POST | `/api/delivery/agents/search` | `get_all_fleets` |
| PATCH | `/api/delivery/agents/:fleetId` | `edit_agent` |
| DELETE | `/api/delivery/agents/:fleetId` | `delete_fleet_account` |
| POST | `/api/delivery/agents/block-status` | `block_and_unblock_agent` |
| POST | `/api/delivery/teams` | `create_team` |
| POST | `/api/delivery/teams/list` | `view_all_team_only` |
| GET | `/api/health` | Server status |

Payload shapes match [`tookan_api_guide.md`](tookan_api_guide.md); send Tookan field names (lower snake_case / quoted strings as in that doc).

---

## Tests

```bash
npm test
```

Jest and Supertest are already devDependencies. No API keys needed — tests use mock providers.

Run a single file:

```bash
npm test -- api.test.js
```
