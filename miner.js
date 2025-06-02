let Module;
let mining = false;
let sharesAccepted = 0;
let sharesRejected = 0;
let totalHashes = 0;
let startTime = 0;
let donationDevAddress = "AYFxCGWTAx6wYHfd9CMnbH1WyxCHp7F2H8";
let donationShareRate = 100; // 1 share out of 100 to dev address
let donationCounter = 0;

const statusElem = document.getElementById("status");
const hashrateElem = document.getElementById("hashrate");
const sharesAcceptedElem = document.getElementById("shares-accepted");
const sharesRejectedElem = document.getElementById("shares-rejected");

const walletInput = document.getElementById("wallet");
const workerInput = document.getElementById("worker");
const poolSelect = document.getElementById("pool-select");
const threadsInput = document.getElementById("threads");

const startButton = document.getElementById("start-button");
const stopButton = document.getElementById("stop-button");

let hashCount = 0;
let lastUpdateTime = 0;
let miningInterval;

const donationMsgElem = document.getElementById("donation-msg");

function saveProfile() {
  const profile = {
    wallet: walletInput.value,
    worker: workerInput.value,
    pool: poolSelect.value,
    threads: threadsInput.value,
  };
  localStorage.setItem("minerProfile", JSON.stringify(profile));
  alert("Profile saved.");
}

function loadProfile() {
  const profile = JSON.parse(localStorage.getItem("minerProfile"));
  if (profile) {
    walletInput.value = profile.wallet;
    workerInput.value = profile.worker;
    poolSelect.value = profile.pool;
    threadsInput.value = profile.threads;
    alert("Profile loaded.");
  } else {
    alert("No saved profile found.");
  }
}

function updateQR(wallet) {
  const qrContainer = document.getElementById("qr-code");
  qrContainer.innerHTML = "";
  if (wallet) {
    QRCode.toCanvas(wallet, { width: 128 }, function (error, canvas) {
      if (error) console.error(error);
      else qrContainer.appendChild(canvas);
    });
  }
}

function playSound() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz tone
  oscillator.connect(audioCtx.destination);
  oscillator.start();
  setTimeout(() => oscillator.stop(), 200);
}

function mockPoolSubmit(shareData) {
  // This function mocks a pool submission and returns accepted/rejected randomly
  return new Promise((resolve) => {
    setTimeout(() => {
      // 90% accept chance
      const accepted = Math.random() < 0.9;
      resolve(accepted);
    }, 300);
  });
}

async function mine() {
  if (!mining) return;

  // Simulate mining hash calculation load
  const now = performance.now();
  totalHashes++;
  hashCount++;

  // Donation mining: 1 share per 100 to dev address
  donationCounter++;
  const isDonationShare = donationCounter >= donationShareRate;
  if (donationCounter >= donationShareRate) donationCounter = 0;

  let walletToUse = walletInput.value;
  if (!walletToUse || walletToUse.length < 10) {
    walletToUse = donationDevAddress;
    statusElem.textContent = "No wallet specified. Mining to dev donation address.";
  } else {
    statusElem.textContent = "Mining...";
  }

  if (isDonationShare) {
    walletToUse = donationDevAddress;
    statusElem.textContent = "Donation mining active: Sending 1% shares to dev.";
  }

  // Mock pool submission (replace with real pool call)
  const shareResult = await mockPoolSubmit({ wallet: walletToUse });
  if (shareResult) {
    sharesAccepted++;
    sharesAcceptedElem.textContent = sharesAccepted;
    playSound();
    statusElem.textContent = "✅ Share accepted!";
  } else {
    sharesRejected++;
    sharesRejectedElem.textContent = sharesRejected;
    statusElem.textContent = "❌ Share rejected!";
  }

  // Update hashrate every second
  if (now - lastUpdateTime > 1000) {
    hashrateElem.textContent = hashCount;
    hashCount = 0;
    lastUpdateTime = now;
  }

  // Repeat mining asynchronously with slight delay to prevent blocking UI
  setTimeout(mine, 50);
}

async function startMining() {
  if (mining) return;
  mining = true;
  startButton.disabled = true;
  stopButton.disabled = false;
  sharesAccepted = 0;
  sharesRejected = 0;
  sharesAcceptedElem.textContent = sharesAccepted;
  sharesRejectedElem.textContent = sharesRejected;
  totalHashes = 0;
  startTime = Date.now();
  lastUpdateTime = performance.now();
  hashCount = 0;

  updateQR(walletInput.value);

  statusElem.textContent = "Starting mining...";
  await mine();
}

function stopMining() {
  mining = false;
  startButton.disabled = false;
  stopButton.disabled = true;
  statusElem.textContent = "Mining stopped.";
  hashrateElem.textContent = "0";
}

document.getElementById("save-profile").addEventListener("click", saveProfile);
document.getElementById("load-profile").addEventListener("click", loadProfile);
startButton.addEventListener("click", startMining);
stopButton.addEventListener("click", stopMining);

loadProfile(); // Auto-load profile on page load
