# FreshSpin Web Admin

React/Vite admin frontend with an Express API and PostgreSQL database.

## Local setup

1. Install dependencies with `npm install`.
2. Install PostgreSQL and create a database named `webadmin` (or choose another name).
3. Set `DATABASE_URL` in `.env` to the PostgreSQL connection string. Set `JWT_SECRET` to a long random value. The existing `.env.example` shows all supported variables.
4. Start the API with `npm run server`. It creates the required tables and inserts initial services, inventory, settings, a drying stack, and the first admin account if they are missing.
5. In another terminal, start the frontend with `npm run dev` and open `http://localhost:5173`.

For an explicit database setup without starting the API, run `npm run db:setup`. The API listens on port 8000 by default (`API_PORT` can change it); Vite proxies `/api` requests there during development.

## Development login

The initial admin is `admin@freshspin.local` with password `FreshSpin123!`. Override these with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before the first setup. The password is hashed before it is stored. Change the development default before using the app outside a local environment.

## API

The API implements the frontend's login/session, dashboard, customers, orders, payments, services, alerts, inventory, staff, settings, drying stack, humidity history, and reports endpoints. All endpoints except `/api/health`, `/api/login`, and `/api/telemetry` require a bearer token. Telemetry uploads use the `X-Device-Key` header. The humidity endpoints return an unavailable state until a device inserts readings.

## ESP32 humidity sensor

The API accepts sensor readings at `POST /api/telemetry`, protected by the `DEVICE_API_KEY` in `.env`. After changing or setting this key, restart the API with `npm run server`.

For a DHT22/AM2302 sensor, use the example at `examples/esp32-dht22/esp32-dht22.ino`:

1. Install the Arduino libraries **DHT sensor library** and **Adafruit Unified Sensor**.
2. Connect DHT22 VCC to 3V3, GND to GND, and DATA to GPIO 4. For a bare DHT22, add a 10 kΩ pull-up between DATA and 3V3; many modules already include it.
3. Connect the PC running the API and the ESP32 to the same Wi-Fi network or Android hotspot. Keep the API running.
4. Find the PC's IPv4 address on that Wi-Fi network (`ipconfig` on Windows). Put it in the sketch's `API_URL`, for example `http://192.168.43.100:8000/api/telemetry`. Do not use `localhost` there; from the ESP32, localhost means the ESP32 itself.
5. Set the hotspot name and password in the sketch, and copy the same value as `DEVICE_API_KEY` from `.env` into `DEVICE_KEY` in the sketch. Select your ESP32 board and upload.
6. Open Serial Monitor at 115200 baud. HTTP status 201 means the API stored the reading. The dashboard polls for new readings every 10 seconds and marks the device offline after 3 minutes without a reading.

If the ESP32 cannot connect, check that Windows Firewall allows inbound TCP port 8000 on the private Wi-Fi network and that the hotspot does not isolate connected devices. If your sensor is a DHT11, change `DHT_TYPE` to `DHT11`; other sensor types need a matching Arduino sensor library and read code.

## Deploy to Render

The repository includes `render.yaml`, which describes one Node web service (serving both the built React app and API) and a PostgreSQL database.

1. Push the project to a GitHub repository. Keep `.env` private; `.gitignore` excludes it. Set any local credentials that were committed previously to new values before deploying.
2. In Render, choose **New → Blueprint** and connect the repository containing `render.yaml`.
3. When prompted, provide `SEED_ADMIN_EMAIL` and a strong `SEED_ADMIN_PASSWORD`. Render generates `JWT_SECRET` and `DEVICE_API_KEY` and connects `DATABASE_URL` to the provisioned database.
4. Deploy. Render builds with `npm ci --include=dev && npm run build`, starts with `npm start`, and checks `/api/health`. The service URL serves the UI; its `/api` routes reach the same server.

5. For a deployed ESP32, point it at `https://YOUR-SERVICE.onrender.com/api/telemetry` and copy the generated `DEVICE_API_KEY` from the Render dashboard into the sketch. The local example uses HTTP; for Render, configure the ESP32 HTTP client for HTTPS with certificate validation.

The Blueprint places the service and database in Singapore and uses Render's Free plans for a no-cost demo. Free web services can sleep after 15 minutes without requests, and Free Postgres expires 30 days after creation. Upgrade the database to a paid plan before storing data you need to keep. [Render free plan limits](https://render.com/docs/free).
