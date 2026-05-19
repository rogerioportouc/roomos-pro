import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'user'
  dept?: string
  sso?: string
}

interface AuthState {
  token: string | null
  user: User | null
  setToken: (token: string) => void
  setUser: (user: User) => void
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setToken: (token) => {
        set({ token })
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      },
      setUser: (user) => set({ user }),
      logout: () => {
        axios.post('/api/auth/logout').catch(() => {})
        delete axios.defaults.headers.common['Authorization']
        set({ token: null, user: null })
      },
      fetchMe: async () => {
        const token = get().token
        if (!token) return
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        const { data } = await axios.get('/api/auth/me')
        set({ user: data })
      },
    }),
    { name: 'roomos-auth', partialize: (s) => ({ token: s.token }) }
  )
)
