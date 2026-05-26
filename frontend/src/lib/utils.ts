import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Plan } from '@/lib/types'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const formatDate = (date: string | Date) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))

export const currentMonthCount = (items: Array<{ created_at: string }>) => {
  const now = new Date()
  return items.filter((item) => {
    const date = new Date(item.created_at)
    return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth()
  }).length
}

export const monthlyThreadLimit = (plan?: Plan | null) => {
  if (plan === 'free') return 5
  if (plan === 'starter') return 20
  return null
}
