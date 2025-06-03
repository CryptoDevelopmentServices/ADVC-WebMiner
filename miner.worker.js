importScripts('wasm/yespoweradvc.js');

let Module;
let initialized = false;

onmessage = async function (e) {
    const { type, input, job, params } = e.data;

    if (type === 'init') {
        Module = await YespowerADVC();
        initialized = true;
        postMessage({ type: 'ready' });
    }

    if (type === 'mine' && initialized) {
        // Assuming 80-byte input buffer (Block Header)
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
