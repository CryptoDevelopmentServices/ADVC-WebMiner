# 🕸️ ADVC-WebMiner

**A blazing fast, browser-based WebMiner for AdventureCoin (ADVC).**  
Mine directly from your browser using a custom yespowerADVC WebAssembly backend.  
No downloads, no installs — just pure mining power.

---

## 💡 Features

### 🔥 Core Functionality
- 🧠 **WebAssembly-based yespowerADVC hashing**
- 🖥️ **Thread control** (1 to max CPU threads)
- 🏦 **Multi-pool support** (connect to real ADVC mining pools)
- 🧾 **Wallet + Worker input**
- 📈 **Live hashrate, accepted/rejected shares, session stats**
- ♻️ **Auto-reconnect with backoff**
- 💾 **LocalStorage miner profile saving**
- 📤 **Real pool share submission (stratum over WebSocket)**

### 🧩 Optional Toggles
- ⚙️ **Donation mining mode** (1% of every 100 shares goes to dev wallet)
- 🔄 **Embed-ready** (for iframes/blogs)
- ⚠️ **Mobile-friendly layout**
- 🔒 **Privacy-friendly & obfuscated release build**

### 🧪 Extras
- 📊 Device benchmark mode
- 🏁 Pool benchmark mode
- 🌙 Dark/light mode switch
- 🧠 QR code wallet generator
- 📣 Web push alerts (optional)
- 🕵️‍♂️ Real-time miner logs + diagnostics

---

## 🚀 Getting Started

### 🔗 Online
Run the latest version in-browser (hosted copy):  
**[https://yourdomain.com/advc-webminer](https://yourdomain.com/advc-webminer)**  
_(Replace with your deployment URL)_

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
Output will include:
- `/dist` folder
- Obfuscated production JS
- Ready-to-host miner

---

## 🧩 Pools Supported

- 🌍 `stratum.novagrid.online:3130` (Default)
- 🇪🇺 `eu.coin-miners.info:7650`
- 🌐 `zergpool.com:6240`

---

## 💰 Donation Info

Mining includes a **1% developer donation** per 100 shares to help fund continued development:  
**`AYFxCGWTAx6wYHfd9CMnbH1WyxCHp7F2H8`**

This is clearly disclosed in the UI and is **not hidden or obfuscated**.

---

## 🔒 Privacy & Security

- No cookies, no trackers.
- Wallets/keys are stored **only in your browser**.
- Optional telemetry is opt-in.
- All WASM, JS, and share handling are open source.

---

## 📍 Roadmap

✅ Live pool stats (latency, difficulty)  
✅ Saved mining profiles  
✅ Donation mode  
✅ Admin debug panel  
✅ Push alerts  
✅ Benchmarking tools  
🕒 Multi-tab coordination  
🕒 Auto-WASM updates  
🕒 Language localization  
🕒 Energy saver mode  
🕒 Share graph, live telemetry dashboard  
🕒 More to come…

---

## 👑 Special Thanks

Built with ❤️ by CryptoDevelopmentServices  
AdventureCoin (ADVC) — A CPU-friendly, community-first cryptocurrency.  
https://github.com/AdventureCoin-ADVC/AdventureCoin

---

## 📄 License

MIT License — use freely, fork openly, respect dev time 🙏
