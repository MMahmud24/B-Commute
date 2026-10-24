const API_URL = import.meta.env.VITE_API_URL

export type FieldErrors = Record<string, string[]>

export class ApiError extends Error {
  status: number
  fieldErrors: FieldErrors

  constructor(status: number, fieldErrors: FieldErrors) {
    super('Request failed')
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

// DRF returns errors as {field: [msgs]}, {detail: msg}, or a bare list for non-field errors.
function normalizeErrors(body: unknown): FieldErrors {
  if (Array.isArray(body)) return { non_field_errors: body.map(String) }
  if (body && typeof body === 'object') {
    const out: FieldErrors = {}
    for (const [key, value] of Object.entries(body)) {
      out[key] = Array.isArray(value) ? value.map(String) : [String(value)]
    }
    return out
  }
  return { non_field_errors: ['Something went wrong. Please try again.'] }
}

export async function apiFetch<T>(path: string, options: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, headers, ...rest } = options
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    })
  } catch {
    throw new ApiError(0, { non_field_errors: ['Cannot reach the server. Is the backend running?'] })
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, normalizeErrors(body))
  return body as T
}
