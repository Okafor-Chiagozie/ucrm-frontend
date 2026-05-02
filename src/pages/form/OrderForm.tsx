import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1'

interface Variation {
  id: string
  name: string
  description: string | null
  price: string
  in_stock: boolean
}

interface BumpOfferData {
  id: string
  headline: string
  description: string | null
  product_name: string | null
  variation_name: string | null
  special_price: string
  original_price: string
}

interface DeliveryFeeData {
  state: string
  fee: string
}

interface FormData {
  product: { id: string; name: string; description: string | null; business_name: string | null }
  variations: Variation[]
  delivery_fees: DeliveryFeeData[]
  bump_offers: BumpOfferData[]
}

const COUNTRY_CODES = [
  { value: '+234', label: '+234 (Nigeria)' },
  { value: '+1', label: '+1 (US/CA)' },
  { value: '+44', label: '+44 (UK)' },
  { value: '+233', label: '+233 (Ghana)' },
  { value: '+254', label: '+254 (Kenya)' },
  { value: '+27', label: '+27 (South Africa)' },
]

export default function OrderForm() {
  const { productId } = useParams<{ productId: string }>()
  const [formData, setFormData] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneCode, setPhoneCode] = useState('+234')
  const [whatsapp, setWhatsapp] = useState('')
  const [whatsappCode, setWhatsappCode] = useState('+234')
  const [address, setAddress] = useState('')
  const [state, setState] = useState('')
  const [email, setEmail] = useState('')
  const [selectedVariation, setSelectedVariation] = useState('')
  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set())
  const [couponCode, setCouponCode] = useState('')
  const [couponValid, setCouponValid] = useState<null | { valid: boolean; type: string; value: number }>(null)
  const [couponChecking, setCouponChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<{ order_number: string; total: string } | null>(null)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    axios.get(`${API}/form/${productId}`).then(({ data }) => {
      setFormData(data.data)
    }).catch(() => {
      setError('Failed to load form. This product may not be available.')
    }).finally(() => setLoading(false))
  }, [productId])

  // Notify parent iframe of height changes
  useEffect(() => {
    const sendHeight = () => {
      window.parent.postMessage({ type: 'ucrm-form-height', height: document.body.scrollHeight }, '*')
    }
    sendHeight()
    const observer = new MutationObserver(sendHeight)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    return () => observer.disconnect()
  }, [formData, submitted])

  const savePartial = () => {
    if (phone.length >= 7) {
      axios.post(`${API}/form/${productId}/partial`, { phone, phone_code: phoneCode, name }).catch(() => {})
    }
  }

  const validateCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponChecking(true)
    try {
      const { data } = await axios.post(`${API}/form/${productId}/validate-coupon`, { code: couponCode })
      setCouponValid(data)
    } catch {
      setCouponValid({ valid: false, type: '', value: 0 })
    } finally {
      setCouponChecking(false)
    }
  }

  // Calculate totals
  const variation = formData?.variations.find((v) => v.id === selectedVariation)
  const subtotal = (variation ? Number(variation.price) : 0) +
    Array.from(selectedBumps).reduce((sum, bumpId) => {
      const bump = formData?.bump_offers.find((b) => b.id === bumpId)
      return sum + (bump ? Number(bump.special_price) : 0)
    }, 0)

  const deliveryFee = state ? Number(formData?.delivery_fees.find((f) => f.state === state)?.fee ?? 0) : 0

  let discount = 0
  if (couponValid?.valid) {
    discount = couponValid.type === 'fixed' ? Math.min(couponValid.value, subtotal) : Math.round(subtotal * (couponValid.value / 100))
  }

  const total = subtotal + deliveryFee - discount

  const formatPrice = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    try {
      const { data } = await axios.post(`${API}/form/${productId}/submit`, {
        name, phone, phone_code: phoneCode,
        whatsapp: whatsapp || undefined, whatsapp_code: whatsappCode,
        address, state, email: email || undefined,
        variation_id: selectedVariation,
        bump_offer_ids: Array.from(selectedBumps),
        coupon_code: couponValid?.valid ? couponCode : undefined,
      })
      setSubmitted(data.data)
    } catch (err) {
      setSubmitError((err as any).response?.data?.message || 'Failed to place order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrapper}>
          <div style={styles.spinner} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading form...</p>
        </div>
      </div>
    )
  }

  if (error || !formData) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#ef4444', fontSize: 14 }}>{error || 'Product not available.'}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, textAlign: 'center', padding: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Order Placed Successfully!</h2>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 16px' }}>Your order number is:</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', fontFamily: 'monospace', margin: '0 0 8px' }}>{submitted.order_number}</p>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>Total: {formatPrice(Number(submitted.total))}</p>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 16 }}>We will contact you shortly to confirm your order.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Place Your Order</h2>
          <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Fill the form below to order. Ensure your phone number is correct.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {submitError && <div style={styles.errorBox}>{submitError}</div>}

          {/* Name */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Full Name *</label>
            <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" required />
          </div>

          {/* Phone */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Phone Number *</label>
            <div style={styles.phoneRow}>
              <select style={{ ...styles.input, ...styles.phoneCode }} value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)}>
                {COUNTRY_CODES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input style={{ ...styles.input, flex: 1 }} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={savePartial} placeholder="08012345678" required />
            </div>
          </div>

          {/* WhatsApp */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>WhatsApp Number</label>
            <div style={styles.phoneRow}>
              <select style={{ ...styles.input, ...styles.phoneCode }} value={whatsappCode} onChange={(e) => setWhatsappCode(e.target.value)}>
                {COUNTRY_CODES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input style={{ ...styles.input, flex: 1 }} type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp number" />
            </div>
          </div>

          {/* Address */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Delivery Address *</label>
            <input style={styles.input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter your full address" required />
          </div>

          {/* State */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>State *</label>
            <select style={styles.input} value={state} onChange={(e) => setState(e.target.value)} required>
              <option value="">Select your state</option>
              {formData.delivery_fees.map((f) => <option key={f.state} value={f.state}>{f.state}</option>)}
            </select>
          </div>

          {/* Email */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email (Optional)</label>
            <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>

          {/* Variations */}
          <div style={styles.fieldGroup}>
            <label style={{ ...styles.label, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Select Your Package *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {formData.variations.map((v) => (
                <label key={v.id} style={{
                  ...styles.variationCard,
                  borderColor: selectedVariation === v.id ? '#2563eb' : '#e5e7eb',
                  background: selectedVariation === v.id ? '#eff6ff' : '#fff',
                  opacity: v.in_stock ? 1 : 0.5,
                  cursor: v.in_stock ? 'pointer' : 'not-allowed',
                }}>
                  <input type="radio" name="variation" value={v.id} checked={selectedVariation === v.id} onChange={() => v.in_stock && setSelectedVariation(v.id)} disabled={!v.in_stock} style={{ display: 'none' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{v.name}</div>
                    {v.description && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{v.description}</div>}
                    {!v.in_stock && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>Out of stock</div>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{formatPrice(Number(v.price))}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Bump Offers */}
          {formData.bump_offers.length > 0 && formData.bump_offers.map((bump) => (
            <div key={bump.id} style={{ ...styles.bumpCard, borderColor: selectedBumps.has(bump.id) ? '#2563eb' : '#e5e7eb' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', margin: '0 0 4px' }}>Would You Like To Add:</h4>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>{bump.product_name} — {bump.variation_name}</p>
              {bump.description && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>{bump.description}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{formatPrice(Number(bump.special_price))}</span>
                <span style={{ fontSize: 14, color: '#9ca3af', textDecoration: 'line-through' }}>{formatPrice(Number(bump.original_price))}</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2563eb' }}>
                <input type="checkbox" checked={selectedBumps.has(bump.id)} onChange={() => {
                  const next = new Set(selectedBumps)
                  next.has(bump.id) ? next.delete(bump.id) : next.add(bump.id)
                  setSelectedBumps(next)
                }} />
                Yes, add this to my order!
              </label>
            </div>
          ))}

          {/* Coupon */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Coupon Code</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...styles.input, flex: 1 }} value={couponCode} onChange={(e) => { setCouponCode(e.target.value); setCouponValid(null) }} placeholder="Enter code" />
              <button type="button" onClick={validateCoupon} disabled={couponChecking || !couponCode.trim()} style={styles.couponBtn}>
                {couponChecking ? '...' : 'Apply'}
              </button>
            </div>
            {couponValid !== null && (
              <p style={{ fontSize: 12, color: couponValid.valid ? '#10b981' : '#ef4444', marginTop: 4 }}>
                {couponValid.valid ? `Coupon applied: ${couponValid.type === 'fixed' ? formatPrice(couponValid.value) : `${couponValid.value}%`} off` : 'Invalid or expired coupon code'}
              </p>
            )}
          </div>

          {/* Order Summary */}
          {selectedVariation && (
            <div style={styles.summaryBox}>
              <div style={styles.summaryRow}><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              {deliveryFee > 0 && <div style={styles.summaryRow}><span>Delivery ({state})</span><span>{formatPrice(deliveryFee)}</span></div>}
              {discount > 0 && <div style={{ ...styles.summaryRow, color: '#10b981' }}><span>Discount</span><span>-{formatPrice(discount)}</span></div>}
              <div style={{ ...styles.summaryRow, fontWeight: 700, fontSize: 18, borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 4 }}><span>Total</span><span>{formatPrice(total)}</span></div>
            </div>
          )}

          <button type="submit" disabled={submitting || !selectedVariation || !state} style={{ ...styles.submitBtn, opacity: (submitting || !selectedVariation || !state) ? 0.6 : 1 }}>
            {submitting ? 'Placing Order...' : 'Place Order Now'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", padding: 16, minHeight: '100vh', background: 'transparent' },
  card: { maxWidth: 520, margin: '0 auto', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  loadingWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 },
  spinner: { width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  fieldGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input: { display: 'block', width: '100%', height: 42, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#fff' },
  phoneRow: { display: 'flex', gap: 8 },
  phoneCode: { width: 130, flex: 'none' },
  variationCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '2px solid', borderRadius: 8, transition: 'all 0.15s' },
  bumpCard: { border: '2px dashed', borderRadius: 8, padding: 16, marginBottom: 16, background: '#fafafa' },
  couponBtn: { height: 42, padding: '0 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  summaryBox: { background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#374151' },
  submitBtn: { width: '100%', height: 48, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13 },
}
