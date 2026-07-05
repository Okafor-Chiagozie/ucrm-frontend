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

interface CustomFieldData {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox'
  required: boolean
  options?: string[]
}

interface FormSettingsData {
  heading: string
  subheading: string
  button_text: string
  button_color: string
  success_message: string
  thank_you_url?: string
  show_whatsapp: boolean
  show_email: boolean
  show_coupon: boolean
  custom_fields?: CustomFieldData[]
}

interface FormData {
  product: { id: string; name: string; description: string | null; business_name: string | null }
  form_settings: FormSettingsData
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
  const [customValues, setCustomValues] = useState<Record<string, string | boolean>>({})
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
        custom_fields: customValues,
      })

      // If a thank-you URL is configured, redirect the top window (form may be
      // embedded in an iframe) instead of showing the success screen.
      const thankYouUrl = formData?.form_settings.thank_you_url?.trim()
      if (thankYouUrl) {
        try {
          (window.top ?? window).location.href = thankYouUrl
        } catch {
          window.location.href = thankYouUrl
        }
        return
      }

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
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.01em' }}>{formData.form_settings.heading}</h2>
          <p style={{ color: '#374151', fontSize: 15, fontWeight: 500, margin: 0 }}>{formData.form_settings.subheading}</p>
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
          {formData.form_settings.show_whatsapp && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>WhatsApp Number</label>
            <div style={styles.phoneRow}>
              <select style={{ ...styles.input, ...styles.phoneCode }} value={whatsappCode} onChange={(e) => setWhatsappCode(e.target.value)}>
                {COUNTRY_CODES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input style={{ ...styles.input, flex: 1 }} type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp number" />
            </div>
          </div>
          )}

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
          {formData.form_settings.show_email && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email (Optional)</label>
            <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          )}

          {/* Variations */}
          <div style={styles.fieldGroup}>
            <label style={{ ...styles.label, fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Select Your Package *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {formData.variations.map((v) => (
                <label key={v.id} style={{
                  ...styles.variationCard,
                  borderColor: selectedVariation === v.id ? '#2563eb' : '#9ca3af',
                  background: selectedVariation === v.id ? '#eff6ff' : '#fff',
                  cursor: 'pointer',
                }}>
                  <input type="radio" name="variation" value={v.id} checked={selectedVariation === v.id} onChange={() => setSelectedVariation(v.id)} style={{ display: 'none' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{v.name}</div>
                    {v.description && <div style={{ fontSize: 14, fontWeight: 500, color: '#4b5563', marginTop: 3 }}>{v.description}</div>}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>{formatPrice(Number(v.price))}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Bump Offers */}
          {formData.bump_offers.length > 0 && formData.bump_offers.map((bump) => (
            <div key={bump.id} style={{ ...styles.bumpCard, borderColor: selectedBumps.has(bump.id) ? '#2563eb' : '#9ca3af' }}>
              <h4 style={{ fontSize: 16, fontWeight: 800, color: '#2563eb', margin: '0 0 5px' }}>Would You Like To Add:</h4>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 5px' }}>{bump.product_name} — {bump.variation_name}</p>
              {bump.description && <p style={{ fontSize: 14, fontWeight: 500, color: '#4b5563', margin: '0 0 8px' }}>{bump.description}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{formatPrice(Number(bump.special_price))}</span>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#6b7280', textDecoration: 'line-through' }}>{formatPrice(Number(bump.original_price))}</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#2563eb' }}>
                <input type="checkbox" checked={selectedBumps.has(bump.id)} onChange={() => {
                  const next = new Set(selectedBumps)
                  next.has(bump.id) ? next.delete(bump.id) : next.add(bump.id)
                  setSelectedBumps(next)
                }} style={{ width: 18, height: 18 }} />
                Yes, add this to my order!
              </label>
            </div>
          ))}

          {/* Coupon */}
          {formData.form_settings.show_coupon && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Coupon Code</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...styles.input, flex: 1 }} value={couponCode} onChange={(e) => { setCouponCode(e.target.value); setCouponValid(null) }} placeholder="Enter code" />
              <button type="button" onClick={validateCoupon} disabled={couponChecking || !couponCode.trim()} style={{ ...styles.couponBtn, background: formData.form_settings.button_color }}>
                {couponChecking ? '...' : 'Apply'}
              </button>
            </div>
            {couponValid !== null && (
              <p style={{ fontSize: 14, fontWeight: 600, color: couponValid.valid ? '#059669' : '#dc2626', marginTop: 6 }}>
                {couponValid.valid ? `Coupon applied: ${couponValid.type === 'fixed' ? formatPrice(couponValid.value) : `${couponValid.value}%`} off` : 'Invalid or expired coupon code'}
              </p>
            )}
          </div>
          )}

          {/* Custom Fields */}
          {(formData.form_settings.custom_fields ?? []).map((field) => {
            const value = customValues[field.key]
            const setValue = (v: string | boolean) => setCustomValues((prev) => ({ ...prev, [field.key]: v }))
            if (field.type === 'checkbox') {
              return (
                <div key={field.key} style={styles.fieldGroup}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    <input type="checkbox" checked={value === true} onChange={(e) => setValue(e.target.checked)} required={field.required} style={{ width: 18, height: 18 }} />
                    {field.label}{field.required ? ' *' : ''}
                  </label>
                </div>
              )
            }
            return (
              <div key={field.key} style={styles.fieldGroup}>
                <label style={styles.label}>{field.label}{field.required ? ' *' : ''}</label>
                {field.type === 'textarea' ? (
                  <textarea style={{ ...styles.input, height: 'auto', minHeight: 80, padding: '10px 12px', resize: 'vertical' }} value={(value as string) ?? ''} onChange={(e) => setValue(e.target.value)} required={field.required} />
                ) : field.type === 'select' ? (
                  <select style={styles.input} value={(value as string) ?? ''} onChange={(e) => setValue(e.target.value)} required={field.required}>
                    <option value="">Select an option</option>
                    {(field.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input style={styles.input} type={field.type === 'number' ? 'number' : 'text'} value={(value as string) ?? ''} onChange={(e) => setValue(e.target.value)} required={field.required} />
                )}
              </div>
            )
          })}

          {/* Order Summary */}
          {selectedVariation && (
            <div style={styles.summaryBox}>
              <div style={styles.summaryRow}><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              {deliveryFee > 0 && <div style={styles.summaryRow}><span>Delivery ({state})</span><span>{formatPrice(deliveryFee)}</span></div>}
              {discount > 0 && <div style={{ ...styles.summaryRow, color: '#10b981' }}><span>Discount</span><span>-{formatPrice(discount)}</span></div>}
              <div style={{ ...styles.summaryRow, fontWeight: 800, fontSize: 22, color: '#0f172a', borderTop: '2px solid #cbd5e1', paddingTop: 10, marginTop: 4 }}><span>Total</span><span>{formatPrice(total)}</span></div>
            </div>
          )}

          <button type="submit" disabled={submitting || !selectedVariation || !state} style={{ ...styles.submitBtn, background: formData.form_settings.button_color, opacity: (submitting || !selectedVariation || !state) ? 0.6 : 1 }}>
            {submitting ? 'Placing Order...' : formData.form_settings.button_text}
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
  label: { display: 'block', fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 },
  input: { display: 'block', width: '100%', height: 48, padding: '0 14px', border: '2px solid #9ca3af', borderRadius: 8, fontSize: 16, fontWeight: 500, color: '#0f172a', outline: 'none', boxSizing: 'border-box', background: '#fff' },
  phoneRow: { display: 'flex', gap: 8 },
  phoneCode: { width: 130, flex: 'none' },
  variationCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', border: '2.5px solid', borderRadius: 10, transition: 'all 0.15s' },
  bumpCard: { border: '2.5px dashed', borderRadius: 10, padding: 18, marginBottom: 16, background: '#fafafa' },
  couponBtn: { height: 48, padding: '0 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  summaryBox: { background: '#f3f4f6', borderRadius: 10, padding: 18, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8, border: '1.5px solid #cbd5e1' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600, color: '#0f172a' },
  submitBtn: { width: '100%', height: 54, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 18, fontWeight: 800, cursor: 'pointer', transition: 'background 0.15s' },
  errorBox: { background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 15, fontWeight: 600 },
}
