# 🕸️ ADVC-WebMiner

**A blazing fast, browser-based WebMiner for AdventureCoin (ADVC).**
Mine directly from your browser using a custom yespowerADVC WebAssembly backend.
No downloads. No installs. Just pure mining.

---

## 💡 Features

### 🔥 Core Functionality

* 🧠 **yespowerADVC via WebAssembly (WASM)**
* 🖥️ **Multithreaded mining using Web Workers**
* 🏦 **Multi-pool support** with real-time stratum-over-WebSocket
* 🧾 **Wallet + Worker input**
* 📈 **Live stats**: hashrate, shares, latency, difficulty
* ♻️ **Auto-reconnect with exponential backoff**
* 💾 **Auto-saved mining profiles using LocalStorage**
* 📤 **Real pool share submission** (fully functional!)

### 🧩 User Controls

* ⚙️ **1% Dev Donation** mode (1 share per 100 sent)
* 🎛️ **Thread control UI** (adaptive to CPU cores)
* 🌓 **Dark/Light mode toggle**
* 🔳 **QR Code generator for wallet address**
* ⚙️ **Device benchmark tool**
* 🌐 **Language selection UI** (English, Español, Français)
* 📣 **Live share logs** with acceptance sound (`ding.mp3`)
* 📊 **Telemetry graph** (hashrate over time)

---

## 🚀 Getting Started

### 🔗 Online

Try it live:
**[https://yourdomain.com/advc-webminer](https://yourdomain.com/advc-webminer)**
*(Replace with your deployment URL)*

### 🧪 Local Dev

```bash
git clone https://github.com/CryptoDevelopmentServices/ADVC-WebMiner.git
cd ADVC-WebMiner
npm install
npm run dev
```

### 📦 Production Build

```bash
npm run build
```

* Outputs: `/dist` with obfuscated, production-ready JS

---

## 🧩 Supported Pools

* 🌍 `stratum.novagrid.online:3130` (default)
* 🇪🇺 `eu.coin-miners.info:7650`
* 🌐 `zergpool.com:6240`

---

## 💰 Donation Info

This miner includes a **1% developer donation** (1 share per 100) to support future updates.
Dev address:
**`AYFxCGWTAx6wYHfd9CMnbH1WyxCHp7F2H8`**

---

## 🔒 Privacy & Security

* ❌ No cookies, tracking, or 3rd-party analytics
* 🔐 Mining data stays in-browser
* 🌱 All logic is open-source & inspectable
* 📦 WASM and JS are self-contained

---

## 📍 Roadmap

### ✅ Completed

* ✔️ Full mining pipeline with share submission
* ✔️ Pool latency + difficulty stats
* ✔️ Live stats + telemetry graph
* ✔️ Local profile saving (wallet, worker, threads)
* ✔️ Dark/light theme toggle
* ✔️ QR code wallet generator
* ✔️ Benchmark tool (per device)
* ✔️ Dev donation logic (1%)
* ✔️ Multi-language support (EN, ES, FR)
* ✔️ Web Worker-based multithreading
* ✔️ Auto-reconnect logic
* ✔️ Share logging + UI feedback
* ✔️ Pool switching + reconnection fallback
* ✔️ Responsive/mobile layout

### 🕒 In Progress

* 🧠 **Multi-tab mining coordination**
* 🛰️ **Auto-WASM update check/versioning**
* 🌍 **Full i18n/localization content strings**
* 💤 **Energy saver mode**
* 📉 **Live graph: shares per second**
* 🧪 **Push alert notifications**

---

## 👑 Special Thanks

Built with ❤️ by **CryptoDevelopmentServices**
Powered by **AdventureCoin (ADVC)** — A CPU-first cryptocurrency
GitHub: [AdventureCoin-ADVC/AdventureCoin](https://github.com/AdventureCoin-ADVC/AdventureCoin)

---

## 📄 License

**MIT License** — Fork, build, and mine freely. Respect developer effort 🙏

