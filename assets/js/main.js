let mining = false;
let shareCount = 0;
let accepted = 0;
let rejected = 0;
let donationSent = 0;
let interval, startTime;
let hashrateHistory = [];

const devAddress = "AYFxCGWTAx6wYHfd9CMnbH1WyxCHp7F2H8";
let telemetryInterval;

// QR Code helper
// const QRCode = {
//   toCanvas: function (canvas, text) {
//     import("https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js").then((qr) =>
//       qr.default.toCanvas(canvas, text, { width: 256 })
//     );
//   },
// };

// Only run after DOM is ready
window.onload = () => {
  const ding = document.getElementById("ding");
  const telemetryCanvas = document.getElementById("telemetryGraph");
  const telemetryCtx = telemetryCanvas?.getContext("2d");

  const walletInput = document.getElementById("wallet");
  const workerInput = document.getElementById("worker");
  const poolInput = document.getElementById("pool");
  const threadInput = document.getElementById("threads");
  const languageSelect = document.getElementById("language");

  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (walletInput) walletInput.value = localStorage.getItem("minerWallet") || "";
  if (workerInput) workerInput.value = localStorage.getItem("minerWorker") || "";
  if (poolInput) poolInput.value = localStorage.getItem("minerPool") || "";
  if (threadInput) threadInput.value = localStorage.getItem("minerThreads") || "2";
  if (languageSelect) languageSelect.value = localStorage.getItem("minerLang") || "en";

  if (startBtn) {
    startBtn.onclick = () => {
      const wallet = walletInput?.value.trim();
      const worker = workerInput?.value.trim();
      const pool = poolInput?.value;
      const threads = parseInt(threadInput?.value, 10) || 1;

      if (!wallet) return alert("Please enter a wallet address.");
      localStorage.setItem("minerWallet", wallet);
      localStorage.setItem("minerWorker", worker);
      localStorage.setItem("minerPool", pool);
      localStorage.setItem("minerThreads", threads);

      startMining(wallet, worker, pool, threads);
    };
  }

  if (stopBtn) stopBtn.onclick = stopMining;

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.onclick = () => {
      document.body.classList.toggle("dark-mode");
      document.body.style.backgroundColor = document.body.classList.contains("dark-mode")
        ? "#121212"
        : "#ffffff";
    };
  }

  const qrBtn = document.getElementById("qrBtn");
  if (qrBtn) {
    qrBtn.onclick = () => {
      const wallet = walletInput?.value.trim();
      if (!wallet) return alert("Enter wallet first.");
      const canvas = document.getElementById("qrCanvas");
      if (!canvas) return;
      canvas.classList.toggle("hidden");
      QRCode.toCanvas(canvas, wallet);
    };
  }

  if (languageSelect) {
    languageSelect.onchange = (e) => {
      const lang = e.target.value;
      localStorage.setItem("minerLang", lang);
      alert(`Language set to ${lang}. Multilingual UI coming soon.`);
    };
  }

  const benchBtn = document.getElementById("benchmarkBtn");
  if (benchBtn) {
    benchBtn.onclick = () => {
      const result = Math.floor(Math.random() * 30 + 50);
      alert(`Benchmark completed. Estimated hashrate: ${result} H/s`);
    };
  }

  // Admin panel shortcut
  document.addEventListener("keydown", (e) => {
    if (e.shiftKey && e.key.toLowerCase() === "d") {
      alert(`Accepted: ${accepted}, Rejected: ${rejected}, Dev Shares: ${donationSent}`);
    }
  });

  // Notification permission
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }

  // Multi-tab check
  if (localStorage.getItem("tabActive")) {
    alert("Another mining tab is already open. Mining disabled in this tab.");
    if (startBtn) startBtn.disabled = true;
  } else {
    localStorage.setItem("tabActive", "true");
    window.addEventListener("beforeunload", () => localStorage.removeItem("tabActive"));
  }

  // --- Core functions below this point ---

  function startMining(wallet, worker, pool, threads) {
    mining = true;
    shareCount = accepted = rejected = donationSent = 0;
    hashrateHistory = [];
    startTime = Date.now();
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    updateStats();
    startTelemetry();

    interval = setInterval(() => {
      simulateShare(wallet);
      updateStats();
    }, 1000 / threads);
  }

  function stopMining() {
    mining = false;
    clearInterval(interval);
    clearInterval(telemetryInterval);
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
  }

  function simulateShare(wallet) {
    if (!mining) return;

    const isAccepted = Math.random() > 0.05;
    shareCount++;

    if (shareCount % 100 === 0) {
      logShare(`🎁 Dev Donation Share sent to ${devAddress}`);
      donationSent++;
    } else {
      const target = isAccepted ? wallet : "invalid";
      if (isAccepted) {
        accepted++;
        try {
          ding?.play();
        } catch (e) {
          console.warn("Ding sound failed:", e);
        }
        logShare(`✅ Share accepted for ${target}`);
      } else {
        rejected++;
        logShare(`❌ Share rejected`);
      }
    }
  }

  function updateStats() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById("elapsed").textContent = `${elapsed}s`;
    document.getElementById("accepted").textContent = accepted;
    document.getElementById("rejected").textContent = rejected;
    document.getElementById("donationCount").textContent = donationSent;
    const hashrate = Math.floor(Math.random() * 20 + 50);
    document.getElementById("hashrate").textContent = `${hashrate} H/s`;
    hashrateHistory.push(hashrate);
    if (hashrateHistory.length > 100) hashrateHistory.shift();
  }

  function logShare(msg) {
    const log = document.getElementById("shareLog");
    const now = new Date().toLocaleTimeString();
    log.innerHTML = `[${now}] ${msg}<br>` + log.innerHTML;
  }

  function startTelemetry() {
    if (!telemetryCtx) return;
    telemetryInterval = setInterval(() => {
      telemetryCtx.clearRect(0, 0, telemetryCanvas.width, telemetryCanvas.height);
      telemetryCtx.strokeStyle = "#0f0";
      telemetryCtx.beginPath();
      telemetryCtx.moveTo(0, 200 - hashrateHistory[0]);
      for (let i = 1; i < hashrateHistory.length; i++) {
        telemetryCtx.lineTo((i / hashrateHistory.length) * telemetryCanvas.width, 200 - hashrateHistory[i]);
      }
      telemetryCtx.stroke();
    }, 1000);
  }

  function notify(title, body) {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  }
};
