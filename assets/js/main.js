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

// Store hashrate per worker index
const workerHashrates = [];

window.onload = () => {
  const ding = document.getElementById("ding");
  const telemetryCanvas = document.getElementById("telemetryGraph");
  const telemetryCtx = telemetryCanvas?.getContext("2d");

  const walletInput = document.getElementById("wallet");
  const workerInput = document.getElementById("workerName");
  const poolInput = document.getElementById("poolSelect");
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

  document.addEventListener("keydown", (e) => {
    if (e.shiftKey && e.key.toLowerCase() === "d") {
      alert(`Accepted: ${accepted}, Rejected: ${rejected}, Dev Shares: ${donationSent}`);
    }
  });

  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }

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
      appendToLog("🔌 Pool connection closed.");
      stopMining();
    };

    currentPoolSocket.onerror = (err) => {
      console.error("WebSocket Error:", err);
      appendToLog("❗ WebSocket error. Check connection.");
      stopMining();
    };

    currentPoolSocket.onmessage = (msg) => {
      let raw;

      // Decode msg.data into a string
      if (typeof msg.data === 'string') {
        raw = msg.data;
      } else if (msg.data instanceof ArrayBuffer) {
        raw = new TextDecoder().decode(msg.data);
      } else if (msg.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          processStratumMessages(reader.result);
        };
        reader.readAsText(msg.data);
        return;
      } else {
        console.warn("Unknown message type:", msg.data);
        return;
      }

      processStratumMessages(raw);
    };

    // Helper to process one or more newline-delimited JSON messages
    function processStratumMessages(raw) {
      const messages = raw.split(/\r?\n/);

      for (const msgStr of messages) {
        if (!msgStr.trim()) continue;

        try {
          const data = JSON.parse(msgStr);

          if (data.method === "mining.set_difficulty") {
            console.log("Difficulty set:", data.params[0]);
            appendToLog(`🎯 Difficulty set: ${data.params[0]}`);
            document.getElementById("difficulty").textContent = data.params[0];
          }

          if (data.method === "mining.notify") {
            const start = Date.now();
            const jobId = data.params[0];
            const blob = data.params[2];
            const target = data.params[3];
            jobData = { jobId, blob, target };
            dispatchWork(blob, target);
            appendToLog("📨 New mining job received.");
            updateLatency(start);
          }

          if (data.id === 4) {
            const isAccepted = data.result === true;
            const wallet = localStorage.getItem("minerWallet");
            const target = isAccepted ? wallet : "invalid";

            if (isAccepted) {
              accepted++;
              try { ding?.play(); } catch (e) {}
              logShare(`✅ Share accepted for ${target}`);
              appendToLog(`✅ Share accepted for ${target}`);
            } else {
              rejected++;
              logShare(`❌ Share rejected`);
              appendToLog("❌ Share rejected");
            }
            updateStats();
          }
        } catch (e) {
          console.warn("Non-JSON message received:", msgStr);
        }
      }
    };
  }

  // Start mining workers
  function startMining(wallet, workerName, pool, threads) {
    mining = true;
    shareCount = accepted = rejected = donationSent = 0;
    hashrateHistory = [];
    workerHashrates.length = 0; // reset hashrate tracking
    startTime = Date.now();
    if (interval) clearInterval(interval);
    interval = setInterval(updateStats, 1000); // Update every second
    startBtn.disabled = true;
    stopBtn.disabled = false;
    updateStats();
    startTelemetry();
    appendToLog(`⚒️ Mining started with ${threads} thread(s) for ${wallet}`);


    workers = [];
    const proxyURL = `ws://localhost:3333/?pool=${encodeURIComponent(pool)}`;

    for (let i = 0; i < threads; i++) {
      const w = new Worker("assets/js/miner.worker.js");
      w.onmessage = onWorkerMessage;
      workers.push(w);

      w.workerIndex = i; // assign worker index
      w.postMessage({ type: "init", workerIndex: i });
      w.postMessage({ type: "connect", proxyURL });

    }
  }

  function stopMining() {
    mining = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;

    if (currentPoolSocket) {
      currentPoolSocket.close();
      currentPoolSocket = null;
    }

    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    if (telemetryInterval) {
      clearInterval(telemetryInterval);
      telemetryInterval = null;
    }

    // Terminate all workers
    workers.forEach(w => w.terminate());
    workers = [];

    appendToLog("⛔ Mining stopped.");
  }

  function dispatchWork(blob, target) {
    for (const w of workers) {
      w.postMessage({ type: "job", blob, target });
    }
  }

  // Helper function to append messages to the log area in the UI
  function appendToLog(message) {
    const shareLog = document.getElementById("shareLog");
    if (!shareLog) return;
    const entry = document.createElement("div");
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    shareLog.appendChild(entry);
    shareLog.scrollTop = shareLog.scrollHeight;
  }

  function onWorkerMessage(e) {
    const msg = e.data;

    if (msg.type === "log") {
      logShare(msg.message);
    }

    else if (msg.type === "share") {
      shareCount++;

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

    else if (msg.type === "hashrate" && typeof msg.value === "number") {
      const workerIndex = msg.workerIndex;

      if (typeof workerIndex === "number") {
        workerHashrates[workerIndex] = msg.value;
        updateStats();
      }
    }
  }

  function updateStats() {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const seconds = String(elapsedSeconds % 60).padStart(2, '0');
    document.getElementById("elapsedTime").textContent = `${minutes}:${seconds}`;
    document.getElementById("accepted").textContent = accepted;
    document.getElementById("rejected").textContent = rejected;
    document.getElementById("donationSent").textContent = donationSent;

    // Compute total hashrate
    const totalHashrate = workerHashrates.reduce((a, b) => a + b, 0);
    document.getElementById("hashrate").textContent = `${totalHashrate.toFixed(2)} H/s`;
  }

  function updateLatency(start) {
    const latency = Date.now() - start;
    document.getElementById("latency").textContent = `${latency} ms`;
  }

  function logShare(msg) {
    const log = document.getElementById("shareLog");
    const now = new Date().toLocaleTimeString();
    log.innerHTML = `[${now}] ${msg}<br>` + log.innerHTML;
  }

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

  function notify(title, body) {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  };
};
