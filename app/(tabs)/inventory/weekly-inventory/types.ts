export interface Root {
  data: Data
}

export interface Data {
  id: number
  name: string
  count_date: string
  status: string
  notes: string
  content: Content
  location: Location
  user: User
  details: Details
  details_count: number
  company_id: number
  created_at: string
  updated_at: string
}

export interface Content {
  products_count: number
}

export interface Location {
  id: number
  company_id: number
  name: string
  description: string
  address: string
  city: string
  state: string
  country: string
  postal_code: string
  phone: string
  email: string
  is_warehouse: number
  is_active: boolean
  settings: any
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  name: string
  email: string
  email_verified_at: string
  avatar: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Unit {
  name: string
  abbreviation: string
}

export interface Product {
  id: number
  name: string
  code: string
  image: any
  unit: Unit
}

export interface InventoryCountDetail {
  id: number
  product_id: number
  location_id: number
  system_quantity: string
  counted_quantity: string
  difference: string
  notes: string | null
  product: Product
}

export interface Details {
  [key: string]: InventoryCountDetail
}
