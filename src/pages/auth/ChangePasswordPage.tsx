import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ApiError } from '@/types'
import { AxiosError } from 'axios'
import { Lock, Eye, EyeOff } from 'lucide-react'

export default function ChangePasswordPage() {
  const { user, isLoading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!user.must_change_password) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      })
      await refreshUser()
      navigate('/dashboard')
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>
      const errors = axiosError.response?.data?.errors
      if (errors) {
        setError(Object.values(errors).flat().join(' '))
      } else {
        setError(axiosError.response?.data?.message || 'Failed to change password.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[oklch(0.98_0.002_250)] px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[oklch(0.45_0.2_260)] flex items-center justify-center shadow-lg shadow-[oklch(0.45_0.2_260)]/25">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[oklch(0.12_0.02_250)]">Update your password</h2>
            <p className="text-base text-[oklch(0.5_0.02_250)] mt-2">For security, you must set a new password before continuing.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-[oklch(0.92_0.01_250)] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[oklch(0.3_0.02_250)]">Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="h-12 text-base px-4 pr-12 rounded-xl"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[oklch(0.3_0.02_250)]">New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="h-12 text-base px-4 pr-12 rounded-xl"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[oklch(0.3_0.02_250)]">Confirm New Password</Label>
              <Input
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Re-enter new password"
                required
                minLength={8}
                className="h-12 text-base px-4 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 text-base font-semibold rounded-xl bg-[oklch(0.45_0.2_260)] hover:bg-[oklch(0.4_0.22_260)] transition-all duration-200 shadow-lg shadow-[oklch(0.45_0.2_260)]/25"
            >
              {submitting ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
