let mining = false;
let shareCount = 0;
let accepted = 0;
let rejected = 0;
let donationSent = 0;
let interval, startTime;

const devAddress = "AYFxCGWTAx6wYHfd9CMnbH1WyxCHp7F2H8";
const ding = document.getElementById("ding");

document.getElementById("startBtn").onclick = () => {
  const wallet = document.getElementById("wallet").value.trim();
  const worker = document.getElementById("worker").value.trim();
  const pool = document.getElementById("pool").value;
  const threads = parseInt(document.getElementById("threads").value, 10);

  if (!wallet) return alert("Please enter a wallet address.");
  localStorage.setItem("minerWallet", wallet);
  localStorage.setItem("minerWorker", worker);
  localStorage.setItem("minerPool", pool);
  localStorage.setItem("minerThreads", threads);

  startMining(wallet, worker, pool, threads);
};

document.getElementById("stopBtn").onclick = stopMining;

document.getElementById("themeToggle").onclick = () =>
  document.body.classList.toggle("light-mode");

document.getElementById("qrBtn").onclick = () => {
  const wallet = document.getElementById("wallet").value.trim();
  if (!wallet) return alert("Enter wallet first.");
  const canvas = document.getElementById("qrCanvas");
  canvas.classList.toggle("hidden");
  QRCode.toCanvas(canvas, wallet);
};

function startMining(wallet, worker, pool, threads) {
  mining = true;
  shareCount = accepted = rejected = donationSent = 0;
  startTime = Date.now();
  document.getElementById("startBtn").disabled = true;
  document.getElementById("stopBtn").disabled = false;
  updateStats();

  interval = setInterval(() => {
    simulateShare(wallet);
    updateStats();
  }, 1000 / threads);
}

function stopMining() {
  mining = false;
  clearInterval(interval);
  document.getElementById("startBtn").disabled = false;
  document.getElementById("stopBtn").disabled = true;
}

function simulateShare(wallet) {
  if (!mining) return;

  const isAccepted = Math.random() > 0.05;
  shareCount++;

  if (shareCount % 100 === 0) {
    logShare(`🎁 Dev Donation Share sent to ${devAddress}`);
    donationSent++;
    // Simulate donation hash submission
  } else {
    const target = isAccepted ? wallet : "invalid";
    if (isAccepted) {
      accepted++;
      ding.play();
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
  document.getElementById("hashrate").textContent = `${Math.floor(Math.random() * 20 + 50)} H/s`;
}

function logShare(msg) {
  const log = document.getElementById("shareLog");
  const now = new Date().toLocaleTimeString();
  log.innerHTML = `[${now}] ${msg}<br>` + log.innerHTML;
}

// Load saved settings
window.onload = () => {
  document.getElementById("wallet").value = localStorage.getItem("minerWallet") || "";
  document.getElementById("worker").value = localStorage.getItem("minerWorker") || "";
  document.getElementById("pool").value = localStorage.getItem("minerPool") || "";
  document.getElementById("threads").value = localStorage.getItem("minerThreads") || "2";
};

// QR code lib
const QRCode = {
  toCanvas: function (canvas, text) {
    import("https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js").then((qr) =>
      qr.default.toCanvas(canvas, text, { width: 256 })
    );
  },
};

// Admin panel (Shift+D)
document.addEventListener("keydown", (e) => {
  if (e.shiftKey && e.key.toLowerCase() === "d") {
    alert(`Accepted: ${accepted}, Rejected: ${rejected}, Dev Shares: ${donationSent}`);
  }
});
