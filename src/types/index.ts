export interface User {
  id: string
  name: string
  email: string
  phone: string | null
  must_change_password: boolean
  is_active: boolean
  role: string | null
  permissions: string[]
  created_by: string | null
  created_at: string
  updated_at?: string
}

export interface Role {
  id: number
  name: string
  permissions_count: number
  permissions?: string[]
  all_permissions?: string[]
  created_at: string
}

export interface Setting {
  [key: string]: string
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface PaginatedResponse<T> {
  data: {
    current_page: number
    data: T[]
    last_page: number
    per_page: number
    total: number
  }
  meta: PaginationMeta
}

export interface LoginResponse {
  message: string
  data: {
    user: User
    token: string
  }
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}
