import type { InputMethod, ManualThreadInput, Profile, Thread } from '@/lib/types'
import type { Session } from '@supabase/supabase-js'

const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
const API_URL = import.meta.env.PROD ? '' : configuredApiUrl || 'http://localhost:4000'

type ApiOptions = RequestInit & {
  token?: string | null
}

const readError = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: { message?: string } }
    return body.error?.message ?? `Request failed with ${response.status}`
  } catch {
    return `Request failed with ${response.status}`
  }
}

export const apiRequest = async <T>(path: string, { token, headers, body, ...options }: ApiOptions = {}) => {
  const isForm = body instanceof FormData
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    body,
    headers: {
      ...(isForm ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const authApi = {
  signup: (body: { email: string; password: string; name?: string }) =>
    apiRequest<{ message: string; session?: Session; user?: unknown }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    apiRequest<{ user: Profile; session: Session }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  me: (token: string) => apiRequest<{ user: Profile; stats: { total_threads: number } }>('/api/auth/me', { token }),
  updateMe: (token: string, body: { name?: string; avatar_url?: string }) =>
    apiRequest<{ user: Profile }>('/api/auth/me', {
      token,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  logout: (token: string) =>
    apiRequest<{ ok: boolean }>('/api/auth/logout', {
      token,
      method: 'POST',
      body: JSON.stringify({}),
    }),
  deleteMe: (token: string) =>
    apiRequest<void>('/api/auth/me', {
      token,
      method: 'DELETE',
    }),
}

export const threadApi = {
  list: (token: string, query?: { search?: string; tag?: string }) => {
    const params = new URLSearchParams()
    if (query?.search) params.set('search', query.search)
    if (query?.tag) params.set('tag', query.tag)
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<{ threads: Thread[] }>(`/api/threads${suffix}`, { token })
  },
  get: (token: string, id: string) => apiRequest<{ thread: Thread }>(`/api/threads/${id}`, { token }),
  create: (
    token: string,
    payload: {
      input_method: InputMethod
      content?: string | ManualThreadInput
      file?: File | null
    },
  ) => {
    const form = new FormData()
    form.append('input_method', payload.input_method)
    if (payload.content !== undefined) {
      form.append('content', typeof payload.content === 'string' ? payload.content : JSON.stringify(payload.content))
    }
    if (payload.file) {
      form.append('file', payload.file)
    }
    return apiRequest<{ thread: Thread }>('/api/threads/create', {
      token,
      method: 'POST',
      body: form,
    })
  },
  update: (token: string, id: string, body: { title: string }) =>
    apiRequest<{ thread: Thread }>(`/api/threads/${id}`, {
      token,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (token: string, id: string) =>
    apiRequest<void>(`/api/threads/${id}`, {
      token,
      method: 'DELETE',
    }),
  regenerate: (token: string, id: string) =>
    apiRequest<{ thread: Thread }>(`/api/threads/${id}/regenerate`, {
      token,
      method: 'POST',
      body: JSON.stringify({}),
    }),
}

export const billingApi = {
  checkout: (token: string, plan: 'starter' | 'pro' | 'team') =>
    apiRequest<{ url: string; mode: 'checkout' | 'portal' }>('/api/billing/checkout', {
      token,
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),
  portal: (token: string) =>
    apiRequest<{ url: string }>('/api/billing/portal', {
      token,
      method: 'POST',
      body: JSON.stringify({}),
    }),
  syncCheckoutSession: (token: string, sessionId: string) =>
    apiRequest<{ user: Profile }>(`/api/billing/sync-checkout-session/${sessionId}`, {
      token,
    }),
}
