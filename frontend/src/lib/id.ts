let fallbackCounter = 0;

function fallbackId(prefix: string) {
  fallbackCounter += 1;
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${timestamp}_${fallbackCounter.toString(36)}_${randomPart}`;
}

export function generateId(prefix = "id") {
  const runtimeCrypto = globalThis.crypto;
  if (runtimeCrypto && typeof runtimeCrypto.randomUUID === "function") {
    return runtimeCrypto.randomUUID();
  }
  return fallbackId(prefix);
}
