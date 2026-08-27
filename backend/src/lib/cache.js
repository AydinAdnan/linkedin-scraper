// Tiny TTL cache — skips re-hitting LinkedIn for a profile we just fetched.
const store = new Map();
const TTL_MS = 60 * 60 * 1000; // 1 hour

export function cacheGet(key) {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

export function cacheSet(key, value) {
  store.set(key, { value, expires: Date.now() + TTL_MS });
}
