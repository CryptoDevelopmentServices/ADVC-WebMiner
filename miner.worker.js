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

// Yespower hash a given input (80-byte blob) Uint8Array, returns 32-byte hash Uint8Array
function yespowerHash(blob) {
  const inputPtr = Module._malloc(80);
  const outputPtr = Module._malloc(32);

  Module.HEAPU8.set(blob, inputPtr);
  Module._yespower_hash(inputPtr, outputPtr);

  const hash = new Uint8Array(Module.HEAPU8.buffer, outputPtr, 32);

  // Make a copy because buffer will be freed
  const hashCopy = new Uint8Array(32);
  hashCopy.set(hash);

  Module._free(inputPtr);
  Module._free(outputPtr);

  return hashCopy;
}

// Compare if hash is less than target (both Uint8Array), little endian (Bitcoin style)
function lessThanTarget(hash, target) {
  // Bitcoin uses big-endian target, but in stratum mining usually targets are little endian
  // Here we assume target is given in little endian
  for (let i = 31; i >= 0; i--) {
    if (hash[i] < target[i]) return true;
    if (hash[i] > target[i]) return false;
  }
  return false; // equal means not less
}

// Main mining loop - simple nonce increment from 0 to 0xFFFFFFFF (32-bit)
// Note: nonce is bytes 39..42 inclusive (4 bytes) in blob (0-based index)
// Return first valid nonce and hash that meet target
function mineJob(blob, target) {
  const blobCopy = new Uint8Array(blob); // copy to modify nonce
  for (let nonce = 0; nonce <= 0xFFFFFFFF; nonce++) {
    // Write nonce into blob bytes 39..42 (4 bytes little endian)
    blobCopy[39] = nonce & 0xff;
    blobCopy[40] = (nonce >> 8) & 0xff;
    blobCopy[41] = (nonce >> 16) & 0xff;
    blobCopy[42] = (nonce >> 24) & 0xff;

    const hash = yespowerHash(blobCopy);
    totalHashes++;

    if (lessThanTarget(hash, target)) {
      return { nonce, hash };
    }
  }
  return null; // no valid nonce found (shouldn't happen often)
}

onmessage = async (e) => {
  const { type, input, job, params, proxyURL, workerIndex: idx, blob, target } = e.data;

  if (type === 'init') {
    Module = await YespowerADVC();
    initialized = true;
    workerIndex = idx || 0;
    totalHashes = 0;
    startTime = Date.now();
    postMessage({ type: 'ready', workerIndex });

    // Start periodic hashrate reporting every 2 seconds
    if (hashrateInterval) clearInterval(hashrateInterval);
    hashrateInterval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const hashrate = elapsedSeconds > 0 ? totalHashes / elapsedSeconds : 0;
      postMessage({ type: 'hashrate', value: hashrate, workerIndex });
    }, 2000);
  }

  if (type === 'connect' && proxyURL) {
    socket = new WebSocket(proxyURL);

    socket.onopen = () => {
      postMessage({ type: 'log', message: `[⛏] Worker #${workerIndex} connected to pool proxy.` , workerIndex});
    };

    socket.onmessage = (event) => {
      const data = event.data;

      // Split incoming messages by newlines
      const messages = data.split(/\r?\n/);

      for (const msgStr of messages) {
        if (!msgStr.trim()) continue;

        try {
          const msg = JSON.parse(msgStr);
          if (msg.type === 'log') {
            postMessage({ type: 'log', message: msg.message, workerIndex });
            continue;
          }
          // Pass JSON messages as stratum if no special handling
          postMessage({ type: 'stratum', data: msgStr, workerIndex });
        } catch {
          // Not JSON, treat as raw stratum data
          postMessage({ type: 'stratum', data: msgStr, workerIndex });
        }
      }
    };

    socket.onclose = () => {
      postMessage({ type: 'log', message: `[✘] Worker #${workerIndex} disconnected from pool.`, workerIndex });
    };

    socket.onerror = (err) => {
      postMessage({ type: 'log', message: `[✘] Worker #${workerIndex} connection error: ${err.message}`, workerIndex });
    };
  }

  if (type === 'disconnect') {
    if (socket) {
      socket.close();
      socket = null;
    }
    mining = false;
    if (hashrateInterval) clearInterval(hashrateInterval);
  }

  if (type === 'job' && initialized) {
    if (!blob || !target) {
      postMessage({ type: 'log', message: `[!] Invalid job data.`, workerIndex });
      return;
    }
    mining = true;

    // Parse hex strings if needed (some code passes hex string, some pass Uint8Array)
    let blobBytes = blob instanceof Uint8Array ? blob : hexToBytes(blob);
    let targetBytes = target instanceof Uint8Array ? target : hexToBytes(target);

    postMessage({ type: 'log', message: `[⛏] Worker #${workerIndex} started mining job.`, workerIndex });

    // Mine job - find nonce and hash
    const result = mineJob(blobBytes, targetBytes);
    mining = false;

    if (result) {
      postMessage({
        type: 'share',
        nonce: result.nonce,
        result: bytesToHex(result.hash),
        workerIndex
      });
      postMessage({ type: 'log', message: `[✓] Worker #${workerIndex} found valid share! Nonce: ${result.nonce}`, workerIndex });
    } else {
      postMessage({ type: 'log', message: `[✘] Worker #${workerIndex} failed to find valid nonce.`, workerIndex });
    }
  }
};
