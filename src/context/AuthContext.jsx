import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)   // { email, id, name, avatar }
  const [loading, setLoading] = useState(true)

  function makeUser(email) {
    return {
      email,
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      avatar: email.charAt(0).toUpperCase(),
    }
  }

  useEffect(() => {
    // Check for stored session (works even without Supabase)
    const stored = localStorage.getItem('sahayak_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }

    // Also listen for Supabase session if configured
    const isSupabaseConfigured =
      import.meta.env.VITE_SUPABASE_URL &&
      !import.meta.env.VITE_SUPABASE_URL.includes('your-project')

    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          const u = makeUser(data.session.user.email)
          setUser(u)
          localStorage.setItem('sahayak_user', JSON.stringify(u))
        }
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
        if (session?.user) {
          const u = makeUser(session.user.email)
          setUser(u)
          localStorage.setItem('sahayak_user', JSON.stringify(u))
        } else if (!session) {
          setUser(null)
          localStorage.removeItem('sahayak_user')
        }
      })
      return () => subscription.unsubscribe()
    }
    setLoading(false)
  }, [])

  function loginDemo(email, displayName) {
    const u = {
      email,
      name: displayName || makeUser(email).name,
      avatar: email.charAt(0).toUpperCase(),
    }
    setUser(u)
    localStorage.setItem('sahayak_user', JSON.stringify(u))
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('sahayak_user')
    const isConfigured = import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('your-project')
    if (isConfigured) supabase.auth.signOut()
  }

  function updateProfileName(newName) {
    if (!user) return
    const u = { ...user, name: newName }
    setUser(u)
    localStorage.setItem('sahayak_user', JSON.stringify(u))
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginDemo, logout, makeUser, updateProfileName }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
