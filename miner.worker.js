importScripts('wasm/yespoweradvc.js');

let Module;
let initialized = false;
let socket = null;
let workerIndex = 0;

let currentJob = null;
let totalHashes = 0;
let startTime = 0;
let mining = false;
let hashrateInterval = null;

// Utility: Convert hex string to Uint8Array
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Utility: Convert Uint8Array to hex string
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Yespower hash a given input (80-byte blob), returns 32-byte hash
function yespowerHash(blob) {
  if (!Module || typeof Module._yespower_hash !== 'function') {
    postMessage({ type: 'log', message: `[!] Worker #${workerIndex} attempted to hash before yespower module was ready.`, workerIndex });
    return new Uint8Array(32);
  }

  const inputPtr = Module._malloc(80);
  const outputPtr = Module._malloc(32);
  try {
    Module.HEAPU8.set(blob, inputPtr);
    Module._yespower_hash(inputPtr, outputPtr);
    const hash = new Uint8Array(Module.HEAPU8.buffer, outputPtr, 32);
    const hashCopy = new Uint8Array(32);
    hashCopy.set(hash);
    return hashCopy;
  } finally {
    Module._free(inputPtr);
    Module._free(outputPtr);
  }
}

// Compare if hash is less than target
function lessThanTarget(hash, target) {
  for (let i = 31; i >= 0; i--) {
    if (hash[i] < target[i]) return true;
    if (hash[i] > target[i]) return false;
  }
  return false;
}

// Mining loop
async function mineJob(blob, target) {
  const blobCopy = new Uint8Array(blob);
  for (let nonce = 0; nonce <= 0xFFFFFFFF; nonce++) {
    if (!mining) {
      postMessage({ type: 'log', message: `[⏹] Mining stopped by flag.`, workerIndex });
      return null;
    }

    // Set nonce
    blobCopy[39] = nonce & 0xff;
    blobCopy[40] = (nonce >> 8) & 0xff;
    blobCopy[41] = (nonce >> 16) & 0xff;
    blobCopy[42] = (nonce >> 24) & 0xff;

    const hash = yespowerHash(blobCopy);
    totalHashes++;

    const now = Date.now();
    if (now - startTime >= 1000) {
      const hps = totalHashes / ((now - startTime) / 1000);
      postMessage({ type: 'hashrate', hps });
      startTime = now;
      totalHashes = 0;
    }

    if (lessThanTarget(hash, target)) {
      postMessage({
        type: 'share',
        nonce,
        hash: bytesToHex(hash),
        workerIndex
      });
      return { nonce, hash };
    }

    if (nonce % 1_000_000 === 0) {
      postMessage({ type: 'log', message: `[⛏] Mining progress: nonce ${nonce}`, workerIndex });
    }

    if (nonce % 100_000 === 0) {
      await new Promise(r => setTimeout(r, 1)); // Yield briefly to avoid UI freeze
    }
  }
  return null;
}

onmessage = async (e) => {
  const { type, input, job, params, proxyURL, workerIndex: idx, blob, target } = e.data;

  if (type === 'init') {
    if (initialized) {
      postMessage({ type: 'log', message: `[!] Worker #${idx} already initialized. Skipping duplicate init.`, workerIndex: idx });
      return;
    }

    postMessage({ type: 'log', message: `[⏳] Worker #${idx} initializing WASM module...`, workerIndex: idx });
    Module = await YespowerADVC();
    initialized = true;
    workerIndex = idx || 0;
    totalHashes = 0;
    startTime = Date.now();
    postMessage({ type: 'ready', workerIndex });

    if (hashrateInterval) clearInterval(hashrateInterval);
    hashrateInterval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const hashrate = elapsedSeconds > 0 ? totalHashes / elapsedSeconds : 0;
      postMessage({ type: 'hashrate', hps: hashrate });
    }, 2000);

    postMessage({ type: 'log', message: `[✅] Worker #${workerIndex} WASM module initialized.`, workerIndex });
  }

  else if (type === 'connect' && proxyURL) {
    if (socket) {
      socket.close();
      socket = null;
    }

    socket = new WebSocket(proxyURL);

    socket.onopen = () => {
      postMessage({ type: 'log', message: `[⛏] Worker #${workerIndex} connected to pool proxy: ${proxyURL}`, workerIndex });
    };

    socket.onmessage = (event) => {
      const data = event.data;
      const messages = data.split(/\r?\n/);
      for (const msgStr of messages) {
        if (!msgStr.trim()) continue;
        try {
          const msg = JSON.parse(msgStr);
          if (msg.type === 'log') {
            postMessage({ type: 'log', message: msg.message, workerIndex });
            continue;
          }
          postMessage({ type: 'stratum', data: msgStr, workerIndex });
        } catch {
          postMessage({ type: 'stratum', data: msgStr, workerIndex });
        }
      }
    };

    socket.onclose = () => {
      postMessage({ type: 'log', message: `[✘] Worker #${workerIndex} disconnected from pool.`, workerIndex });
    };

    socket.onerror = (err) => {
      postMessage({ type: 'log', message: `[✘] Worker #${workerIndex} connection error: ${err.message}`, workerIndex });
      setTimeout(() => postMessage({ type: 'reconnect', workerIndex }), 5000);
    };
  }

  else if (type === 'disconnect') {
    if (socket) {
      socket.close();
      socket = null;
    }
    mining = false;
    if (hashrateInterval) clearInterval(hashrateInterval);
    postMessage({ type: 'log', message: `[⏹] Worker #${workerIndex} disconnected and mining stopped.`, workerIndex });
  }

  else if (type === 'job') {
    if (!initialized) {
      postMessage({ type: 'log', message: `[!] Worker #${workerIndex} received job but WASM not initialized yet.`, workerIndex });
      return;
    }

    if (!blob || !target || !job || !job.job_id) {
      postMessage({ type: 'log', message: `[!] Worker #${workerIndex} invalid job data.`, workerIndex });
      return;
    }

    mining = false;
    totalHashes = 0;
    startTime = Date.now();
    mining = true;

    let blobBytes, targetBytes;
    try {
      blobBytes = blob instanceof Uint8Array ? blob : hexToBytes(blob);
      targetBytes = target instanceof Uint8Array ? target : hexToBytes(target);
    } catch (err) {
      postMessage({ type: 'log', message: `[!] Worker #${workerIndex} failed to parse blob/target: ${err.message}`, workerIndex });
      return;
    }

    postMessage({ type: 'log', message: `[⛏] Worker #${workerIndex} started mining job.`, workerIndex });

    const result = await mineJob(blobBytes, targetBytes);
    mining = false;

    if (result) {
      postMessage({
        type: 'share',
        result: {
          nonce: result.nonce.toString(16).padStart(8, '0'),
          hash: bytesToHex(result.hash),
          job_id: job.job_id
        },
        workerIndex
      });
    }
  }
};
