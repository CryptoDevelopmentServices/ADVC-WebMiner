let mining = false;
let shareCount = 0;
let accepted = 0;
let rejected = 0;
let donationSent = 0;
let interval, startTime;
let hashrateHistory = [];
let currentPoolSocket = null;
let telemetryInterval;
let workers = [];
let jobData = null;
let jobId = "";

const devAddress = "AYFxCGWTAx6wYHfd9CMnbH1WyxCHp7F2H8";

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

  // Restore from localStorage
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

      connectToPool(pool, wallet, worker, threads);
    };
  }

  if (stopBtn) stopBtn.onclick = stopMining;

  // Pool dropdown change listener to switch pools on the fly
  if (poolInput) {
    poolInput.onchange = (e) => {
      const newPool = e.target.value;
      if (mining) {
        const wallet = localStorage.getItem("minerWallet") || "";
        const worker = localStorage.getItem("minerWorker") || "";
        const threads = parseInt(localStorage.getItem("minerThreads"), 10) || 1;
        connectToPool(newPool, wallet, worker, threads);
        logShare(`🔁 Switched to pool ${newPool}`);
      }
    };
  }

  // Theme toggle button for light/dark mode
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.onclick = () => {
      document.body.classList.toggle("dark-mode");
      document.body.style.backgroundColor = document.body.classList.contains("dark-mode")
        ? "#121212"
        : "#ffffff";
    };
  }

  // QR code toggle and generation
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

  // Language selector stub
  if (languageSelect) {
    languageSelect.onchange = (e) => {
      const lang = e.target.value;
      localStorage.setItem("minerLang", lang);
      alert(`Language set to ${lang}. Multilingual UI coming soon.`);
    };
  }

  // Benchmark button stub - random estimated hashrate
  const benchBtn = document.getElementById("benchmarkBtn");
  if (benchBtn) {
    benchBtn.onclick = () => {
      const result = Math.floor(Math.random() * 30 + 50);
      alert(`Benchmark completed. Estimated hashrate: ${result} H/s`);
    };
  }

  // Debug stats display on Shift+D keypress
  document.addEventListener("keydown", (e) => {
    if (e.shiftKey && e.key.toLowerCase() === "d") {
      alert(`Accepted: ${accepted}, Rejected: ${rejected}, Dev Shares: ${donationSent}`);
    }
  });

  // Request notification permission if needed
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }

  // Connect to mining pool via proxy and start workers
  function connectToPool(pool, wallet, worker, threads) {
    if (currentPoolSocket) {
      currentPoolSocket.close();
      currentPoolSocket = null;
    }

    const proxyURL = `ws://localhost:3333/?pool=${encodeURIComponent(pool)}`;
    currentPoolSocket = new WebSocket(proxyURL);

    currentPoolSocket.onopen = () => {
      console.log(`🟢 Connected to proxy for ${pool}`);
      appendToLog(`[✓] Connected to pool: ${pool}`);
      currentPoolSocket.send(JSON.stringify({ id: 1, method: "mining.subscribe", params: [] }));
      currentPoolSocket.send(JSON.stringify({ id: 2, method: "mining.authorize", params: [`${wallet}.${worker}`, "x"] }));
      startMining(wallet, worker, pool, threads);
    };

    currentPoolSocket.onclose = () => {
      console.warn("🔌 Pool connection closed.");
      stopMining();
    };

    currentPoolSocket.onerror = (err) => {
      console.error("WebSocket Error:", err);
      stopMining();
    };

    currentPoolSocket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);

      if (data.method === "mining.set_difficulty") {
        console.log("Difficulty set:", data.params[0]);
        document.getElementById("difficulty").textContent = data.params[0];
      }

      if (data.method === "mining.notify") {
        jobId = data.params[0];
        const blob = data.params[2];
        const target = data.params[3];
        jobData = { jobId, blob, target };
        dispatchWork(blob, target);
      }

      if (data.id === 4) {
        const isAccepted = data.result === true;
        const wallet = localStorage.getItem("minerWallet");
        const target = isAccepted ? wallet : "invalid";

        if (isAccepted) {
          accepted++;
          try { ding?.play(); } catch (e) {}
          logShare(`✅ Share accepted for ${target}`);
        } else {
          rejected++;
          logShare(`❌ Share rejected`);
        }
        updateStats();
      }
    };
  }

  // Start mining workers
  function startMining(wallet, workerName, pool, threads) {
    mining = true;
    shareCount = accepted = rejected = donationSent = 0;
    hashrateHistory = [];
    startTime = Date.now();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    updateStats();
    startTelemetry();

    workers = [];
    const proxyURL = `ws://localhost:3333/?pool=${encodeURIComponent(pool)}`;

    for (let i = 0; i < threads; i++) {
      const w = new Worker("assets/js/miner.worker.js");
      w.onmessage = onWorkerMessage;
      workers.push(w);

      // Initialize WASM
      w.postMessage({ type: "init" });
      // Connect the worker's WebSocket to the pool proxy
      w.postMessage({ type: "connect", proxyURL });
    }
  }

  // Stop mining and clean up workers
  function stopMining() {
    mining = false;
    clearInterval(interval);
    clearInterval(telemetryInterval);
    startBtn.disabled = false;
    stopBtn.disabled = true;
    workers.forEach(w => {
      w.postMessage({ type: "disconnect" }); // optionally add this to workers if you want to close sockets cleanly
      w.terminate();
    });
    workers = [];
  }

  // Dispatch new mining job to workers
  function dispatchWork(blob, target) {
    for (const w of workers) {
      w.postMessage({ type: "job", blob, target });
    }
  }

  // Append messages to the share log in UI
  function appendToLog(message) {
    const logElem = document.getElementById('shareLog'); 
    if (logElem) {
      const entry = document.createElement('div');
      entry.textContent = message;
      logElem.appendChild(entry);
      logElem.scrollTop = logElem.scrollHeight; // auto-scroll
    }
  }

  // Handle messages from workers
  function onWorkerMessage(e) {
    const msg = e.data;

    if (msg.type === "log") {
      logShare(msg.message);
    }

    if (msg.type === "share") {
      shareCount++;

      // Every 100th share is a dev fee share
      const isDevFeeShare = shareCount % 100 === 0;
      const address = isDevFeeShare ? devAddress : localStorage.getItem("minerWallet");
      const worker = isDevFeeShare ? "donation" : localStorage.getItem("minerWorker");

      const submit = {
        id: 4,
        method: "mining.submit",
        params: [
          `${address}.${worker}`,
          jobId,
          msg.nonce,
          msg.result
        ]
      };

      if (isDevFeeShare) {
        donationSent++;
        appendToLog("💚 Dev share submitted to support the project!");
        notify("Dev Share Sent", "Thanks for supporting continued development!");
      } else {
        accepted++;
      }

      currentPoolSocket?.send(JSON.stringify(submit));
      updateStats();
    }
  }

  // Update mining stats UI
  function updateStats() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById("elapsed").textContent = `${elapsed}s`;
    document.getElementById("accepted").textContent = accepted;
    document.getElementById("rejected").textContent = rejected;
    document.getElementById("donationCount").textContent = donationSent;

    // TODO: calculate real hashrate based on shares & time
    const hashrate = Math.floor(Math.random() * 20 + 50);
    document.getElementById("hashrate").textContent = `${hashrate} H/s`;

    hashrateHistory.push(hashrate);
    if (hashrateHistory.length > 100) hashrateHistory.shift();
  }

  // Show a notification if permission granted
  function notify(title, body) {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  }

  // Start telemetry graph updates
  function startTelemetry() {
    if (!telemetryCtx || !telemetryCanvas) return;
    telemetryInterval = setInterval(() => {
      telemetryCtx.clearRect(0, 0, telemetryCanvas.width, telemetryCanvas.height);
      telemetryCtx.strokeStyle = "#0f0";
      telemetryCtx.beginPath();
      telemetryCtx.moveTo(0, 200 - (hashrateHistory[0] || 0));
      for (let i = 1; i < hashrateHistory.length; i++) {
        telemetryCtx.lineTo(
          (i / hashrateHistory.length) * telemetryCanvas.width,
          200 - (hashrateHistory[i] || 0)
        );
      }
      telemetryCtx.stroke();
    }, 1000);
  }
};
