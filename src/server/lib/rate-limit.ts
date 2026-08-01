// Rate limiting en memoria, por proceso. Suficiente para un único servidor
// Next.js (no hay Redis en el stack); si algún día se escala a varias
// instancias, esto debe migrar a un backend compartido (Redis INCR + TTL).

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Limpieza perezosa: cada vez que se consulta un bucket vencido se descarta,
// y cada cierto número de llamadas se barre el mapa completo para no
// acumular memoria indefinidamente con claves que ya no se van a reusar.
let callsSinceSweep = 0;

function sweep() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    callsSinceSweep++;
    if (callsSinceSweep >= 500) {
      callsSinceSweep = 0;
      sweep();
    }
    return { ok: true, remaining: max - 1 };
  }

  if (existing.count >= max) {
    return { ok: false, remaining: 0 };
  }

  existing.count++;
  return { ok: true, remaining: max - existing.count };
}
