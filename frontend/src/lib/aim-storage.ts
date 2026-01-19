const STORAGE_KEY = "aimWorkflow.finalAim"

type StoredAim = {
  title: string
  description: string
}

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

export function loadStoredAim(): StoredAim | null {
  if (!isBrowser()) return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAim
    if (
      typeof parsed?.title === "string" &&
      parsed.title.trim().length > 0 &&
      typeof parsed?.description === "string" &&
      parsed.description.trim().length > 0
    ) {
      return parsed
    }
  } catch {
    
  }
  return null
}

export function storeFinalAim(value: StoredAim | null): void {
  if (!isBrowser()) return
  if (!value) {
    window.sessionStorage.removeItem(STORAGE_KEY)
    return
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    
  }
}
