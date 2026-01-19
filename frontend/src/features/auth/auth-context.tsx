
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

const EVAL_CODE = import.meta.env.VITE_EVAL_CODE ?? ""


const STORAGE_KEY = "hi_eval_authed_v1"
const SESSION_TTL_MS = 60 * 60 * 1000

type AuthContextType = {
  isAuthed: boolean
  login: (code: string) => Promise<boolean>
  logout: () => void
}

type StoredAuth = {
  expiresAt: number
}
type AuthState = {
  isAuthed: boolean
  expiresAt: number | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const readStoredAuthState = (): AuthState => {
  if (typeof window === "undefined") {
    return { isAuthed: false, expiresAt: null }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { isAuthed: false, expiresAt: null }

    const parsed = JSON.parse(raw) as StoredAuth
    if (typeof parsed.expiresAt !== "number") {
      window.localStorage.removeItem(STORAGE_KEY)
      return { isAuthed: false, expiresAt: null }
    }

    if (Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(STORAGE_KEY)
      return { isAuthed: false, expiresAt: null }
    }

    return { isAuthed: true, expiresAt: parsed.expiresAt }
  } catch {
    return { isAuthed: false, expiresAt: null }
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState(readStoredAuthState)

  const login = useCallback(async (code: string) => {
    if (!EVAL_CODE) {
      console.warn("VITE_EVAL_CODE is not set")
    }

    if (code === EVAL_CODE) {
      const expiresAt = Date.now() + SESSION_TTL_MS
      setAuthState({ isAuthed: true, expiresAt })
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ expiresAt }))
      } catch {
        
      }
      return true
    }

    return false
  }, [])

  const logout = useCallback(() => {
    setAuthState({ isAuthed: false, expiresAt: null })
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      
    }
  }, [])

  useEffect(() => {
    if (!authState.isAuthed || !authState.expiresAt) return

    const now = Date.now()
    if (now >= authState.expiresAt) {
      logout()
      return
    }

    const timeoutId = window.setTimeout(logout, authState.expiresAt - now)
    return () => window.clearTimeout(timeoutId)
  }, [authState.expiresAt, authState.isAuthed, logout])

  return (
    <AuthContext.Provider value={{ isAuthed: authState.isAuthed, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
