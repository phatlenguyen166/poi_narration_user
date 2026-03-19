import axios from 'axios'

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8087')

export const api = axios.create({
  baseURL: API_BASE_URL
})

export const resolveApiUrl = (path: string | null | undefined): string | null => {
  if (!path) {
    return null
  }
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) {
    return path
  }
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
