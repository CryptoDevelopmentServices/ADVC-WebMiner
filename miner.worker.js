importScripts('wasm/yespoweradvc.js');

let Module;
let initialized = false;
let socket = null;

onmessage = async function (e) {
    const { type, input, job, params, proxyURL } = e.data;

    if (type === 'init') {
        Module = await YespowerADVC();
        initialized = true;
        postMessage({ type: 'ready' });
    }

    if (type === 'connect' && proxyURL) {
        socket = new WebSocket(proxyURL);

        socket.onopen = () => {
            postMessage({ type: 'log', message: `[⛏] Connecting to pool...` });
        };

        socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'log') {
                    postMessage({ type: 'log', message: msg.message });
                    return;
                }
            } catch (e) {
                // Not a JSON message; assume raw stratum data
            }

            postMessage({ type: 'stratum', data: event.data });
        };

        socket.onclose = () => {
            postMessage({ type: 'log', message: `[✘] Disconnected from pool.` });
        };

        socket.onerror = (err) => {
            postMessage({ type: 'log', message: `[✘] Connection error: ${err.message}` });
        };
    }

    if (type === 'mine' && initialized) {
        const inputPtr = Module._malloc(80);
        const outputPtr = Module._malloc(32);
        Module.HEAPU8.set(new Uint8Array(input), inputPtr);

        Module._yespower_hash(inputPtr, outputPtr);

        const hash = Module.HEAPU8.slice(outputPtr, outputPtr + 32);
        Module._free(inputPtr);
        Module._free(outputPtr);

        postMessage({ type: 'result', job, hash });
    }
};
