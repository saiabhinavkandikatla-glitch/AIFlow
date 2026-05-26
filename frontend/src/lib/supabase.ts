import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const authRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        persistSession: true,
        storageKey: 'threadbridge.auth',
      },
    })
  : null

export const getAuthRedirectUrl = () => authRedirectUrl?.trim() || `${window.location.origin}/auth/callback`

export const clearSupabaseAuthStorage = async () => {
  await supabase?.auth.signOut({ scope: 'local' }).catch(() => undefined)

  const clearStorage = (storage: Storage) => {
    Object.keys(storage)
      .filter(
        (key) =>
          key === 'threadbridge.auth' ||
          key === 'threadbridge.oauth.next' ||
          key.startsWith('sb-') ||
          key.toLowerCase().includes('supabase'),
      )
      .forEach((key) => storage.removeItem(key))
  }

  clearStorage(window.localStorage)
  clearStorage(window.sessionStorage)
}

export const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  return supabase
}
