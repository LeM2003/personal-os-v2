interface RateLimitOptions {
  windowMs: number
  max: number
}

interface Entry {
  count: number
  resetTime: number
}

type CheckFn = (ip: string) => { success: boolean; remaining: number }

export function rateLimit(options: RateLimitOptions): CheckFn {
  const { windowMs, max } = options
  const hits = new Map<string, Entry>()

  setInterval(() => {
    const now = Date.now()
    for (const [ip, entry] of hits) {
      if (now > entry.resetTime) {
        hits.delete(ip)
      }
    }
  }, windowMs)

  return (ip: string) => {
    const now = Date.now()
    const entry = hits.get(ip)

    if (!entry || now > entry.resetTime) {
      hits.set(ip, { count: 1, resetTime: now + windowMs })
      return { success: true, remaining: max - 1 }
    }

    entry.count++

    if (entry.count > max) {
      return { success: false, remaining: 0 }
    }

    return { success: true, remaining: max - entry.count }
  }
}
