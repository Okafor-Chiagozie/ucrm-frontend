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

export interface Business {
  id: string
  name: string
  description: string | null
  logo: string | null
  is_active: boolean
  categories_count: number
  products_count: number
  created_by: string | null
  created_at: string
  updated_at?: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  business_id: string
  business_name: string | null
  products_count: number
  is_active: boolean
  created_at: string
}

export interface ProductVariation {
  id: string
  name: string
  description: string | null
  price: string
  stock: number
  low_stock_threshold: number
  is_active: boolean
  sort_order: number
}

export interface Product {
  id: string
  name: string
  description: string | null
  image: string | null
  business_id: string
  business_name: string | null
  category_id: string | null
  category_name: string | null
  is_active: boolean
  total_stock: number
  low_stock: boolean
  variations: ProductVariation[]
  created_at: string
  updated_at?: string
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}
