# TLC Treats: Start here

**What you have:** a customer website where people build an order and send it to Miss TLC on WhatsApp, and an **owner app** (`/admin/`) where she sees every order, favourites and her margins.

**Coffee analogy:** the website is the shop window and counter. WhatsApp is the order slip handed across. The online database is the order book behind the counter, and the owner app is the page of that book she reads each morning.

## What works right now (no setup)
- Menu, prices, cart, checkout, delivery/collection date rules.
- Order sent to **+27 78 204 3547** on WhatsApp with every detail typed out.
- Installs on a phone like an app ("Add to Home Screen").

## What needs one-time setup
The order book, reports and margins need an online database. Without it, orders still arrive on WhatsApp.

### 1. Create the free database (about 10 minutes)
1. Go to https://console.firebase.google.com and create a project called **tlc-treats**.
2. **Build > Firestore Database > Create database** (production mode, any region).
3. **Build > Authentication > Get started > Email/Password > Enable**. Then **Users > Add user** with her email and a strong password. Do not enable anything else.
4. **Project settings > General > Your apps > Web (</>)**. Copy the config (apiKey, authDomain, projectId, appId).
5. Open `menu.js` and paste it into `firebase: { ... }`.
6. In `firestore.rules`, replace `OWNER_EMAIL_HERE` (twice) with her email, then paste the whole file into **Firestore > Rules > Publish**.
7. Commit and push. Open `/admin/`, sign in, place a test order on the site, and watch it appear.

### 2. Card payment of the deposit (optional)
1. She registers at https://www.payfast.co.za as a merchant.
2. Put her **merchant ID** and **merchant key** in `menu.js` under `payfast`, set `enabled:true` and `sandbox:false`.
3. PayFast emails her each payment. She then sets the order to **Deposit received** in the app.
*This simple version does not confirm payments automatically, so she always checks the PayFast email before ticking it.*

## Changing things
- **Prices and items:** `menu.js` only.
- **Her cost prices:** in the app, **Costs** tab. They are private to her.
- **Her number or deposit %:** `menu.js`.

## Try it yourself
1. Run `python3 -m http.server 8000` inside this folder.
2. Open http://localhost:8000 and place an order. On localhost it is stored in the browser so you can test.
3. Open http://localhost:8000/admin/ to see it, move it through the steps, add costs, and view Reports.

## Glossary
- **Deposit:** the 50% paid up front to confirm an order.
- **Margin:** what is left of the selling price after the cost to make it. Selling at R600 and making it for R350 leaves R250, a 42% margin.
- **Firestore:** the online database where orders are stored.
