import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { authApi } from '@/lib/api'
import { clearSupabaseAuthStorage, getAuthRedirectUrl, requireSupabase, supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

const OAUTH_NEXT_KEY = 'aiflow.oauth.next'

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  token: string | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signup: (payload: { name?: string; email: string; password: string }) => Promise<{ message: string; needsVerification: boolean }>
  login: (payload: { email: string; password: string }) => Promise<void>
  loginWithGoogle: () => Promise<void>
  resendVerification: (email: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (password: string) => Promise<void>
  changePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<void>
  updateProfile: (payload: { name?: string; avatar_url?: string }) => Promise<void>
  deleteAccount: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const token = session?.access_token ?? null

  const clearStaleAuthState = useCallback(async () => {
    await clearSupabaseAuthStorage()
    setSession(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const accessToken = session?.access_token
    if (!accessToken) {
      setProfile(null)
      return
    }
    const response = await authApi.me(accessToken)
    setProfile(response.user)
  }, [session?.access_token])

  useEffect(() => {
    let mounted = true
    if (!supabase) {
      setLoading(false)
      return
    }
    const client = supabase

    const initializeSession = async () => {
      try {
        const { data } = await client.auth.getSession()
        if (!mounted) return
        setSession(data.session)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initializeSession().catch(() => {
      if (mounted) setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!token) {
      setProfile(null)
      return
    }
    refreshProfile().catch(() => setProfile(null))
  }, [refreshProfile, token])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      token,
      loading,
      refreshProfile,
      signup: async (payload) => {
        await clearStaleAuthState()
        try {
          const response = await authApi.signup(payload)
          if (response.session) {
            const { data } = await requireSupabase().auth.setSession(response.session)
            setSession(data.session ?? response.session)
          }
          return {
            message: response.message,
            needsVerification: !response.session,
          }
        } catch (error) {
          await clearStaleAuthState()
          throw error
        }
      },
      login: async (payload) => {
        await clearStaleAuthState()
        const response = await authApi.login(payload)
        const { data } = await requireSupabase().auth.setSession(response.session)
        setSession(data.session ?? response.session)
        setProfile(response.user)
      },
      loginWithGoogle: async () => {
        const client = requireSupabase()
        await clearStaleAuthState()
        window.localStorage.setItem(OAUTH_NEXT_KEY, '/app')

        try {
          const { error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
              queryParams: {
                prompt: 'select_account',
              },
              redirectTo: getAuthRedirectUrl(),
            },
          })
          if (error) throw error
        } catch (error) {
          await clearStaleAuthState()
          throw error
        }
      },
      resendVerification: async (email) => {
        const { error } = await requireSupabase().auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
          },
        })
        if (error) throw error
      },
      forgotPassword: async (email) => {
        const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
      },
      resetPassword: async (password) => {
        const { error } = await requireSupabase().auth.updateUser({ password })
        if (error) throw error
      },
      changePassword: async ({ currentPassword, newPassword }) => {
        const client = requireSupabase()
        const email = session?.user?.email ?? profile?.email
        if (!email) throw new Error('Could not verify your account email.')

        const { error: verifyError } = await client.auth.signInWithPassword({
          email,
          password: currentPassword,
        })
        if (verifyError) throw new Error('Current password is incorrect.')

        const { error: updateError } = await client.auth.updateUser({ password: newPassword })
        if (updateError) throw updateError
      },
      updateProfile: async (payload) => {
        if (!token) throw new Error('Not signed in.')
        const response = await authApi.updateMe(token, payload)
        setProfile(response.user)
      },
      deleteAccount: async () => {
        if (!token) throw new Error('Not signed in.')
        await authApi.deleteMe(token)
        await supabase?.auth.signOut()
        setSession(null)
        setProfile(null)
      },
      logout: async () => {
        if (token) {
          await authApi.logout(token).catch(() => undefined)
        }
        await supabase?.auth.signOut()
        setSession(null)
        setProfile(null)
      },
    }),
    [clearStaleAuthState, loading, profile, refreshProfile, session, token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
