export interface User {
  id: string
  name: string
  email: string
  phone: string | null
  must_change_password: boolean
  is_active: boolean
  available_from: string | null
  available_to: string | null
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
  staff_count: number
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
  quantity: number
  is_active: boolean
  sort_order: number
}

export interface FormSettings {
  heading: string
  subheading: string
  button_text: string
  button_color: string
  success_message: string
  show_whatsapp: boolean
  show_email: boolean
  show_coupon: boolean
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
  stock: number
  low_stock_threshold: number
  low_stock: boolean
  form_settings: FormSettings
  variations: ProductVariation[]
  created_at: string
  updated_at?: string
}

export interface OrderItem {
  id: string
  product_name: string
  variation_name: string
  price: string
  quantity: number
  total: string
  is_bump: boolean
}

export interface Order {
  id: string
  order_number: string
  business_id: string
  business_name: string | null
  customer_name: string
  customer_phone: string
  customer_whatsapp: string | null
  customer_address: string
  customer_state: string
  customer_email: string | null
  ip_address: string | null
  source_url: string | null
  subtotal: string
  delivery_fee: string
  discount: string
  total: string
  coupon_code: string | null
  status: string
  scheduled_at: string | null
  delivered_at: string | null
  notes: string | null
  assigned_agent: { id: string; name: string } | null
  items: OrderItem[]
  items_count: number
  allowed_statuses: string[]
  requires_agent: boolean
  created_at: string
  updated_at?: string
}

export interface FlaggedIp {
  id: string
  ip_address: string
  reason: string | null
  flagged_by: string | null
  is_active: boolean
  created_at: string
}

export interface DeliveryFee {
  id: string
  business_id: string
  business_name: string | null
  state: string
  fee: string
  is_active: boolean
}

export interface Coupon {
  id: string
  business_id: string
  business_name: string | null
  code: string
  type: 'fixed' | 'percentage'
  value: string
  max_uses: number | null
  times_used: number
  expires_at: string | null
  is_active: boolean
  is_valid: boolean
  created_at: string
}

export interface PartialOrderData {
  id: string
  business_id: string
  business_name: string | null
  phone: string
  name: string | null
  ip_address: string | null
  source_url: string | null
  converted: boolean
  created_at: string
}

export interface BumpOffer {
  id: string
  product_id: string
  product_name: string | null
  bump_product_id: string
  bump_product_name: string | null
  bump_product_image: string | null
  bump_variation_id: string
  bump_variation_name: string | null
  bump_variation_price: string | null
  headline: string
  description: string | null
  special_price: string
  original_price: string
  is_active: boolean
  created_at: string
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}
