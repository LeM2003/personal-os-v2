export function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined || raw === '') return fallback
  try {
    const v = JSON.parse(raw)
    return v == null ? fallback : (v as T)
  } catch {
    return fallback
  }
}
