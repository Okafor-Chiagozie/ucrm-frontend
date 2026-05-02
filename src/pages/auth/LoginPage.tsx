import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ApiError } from '@/types'
import { AxiosError } from 'axios'
import { Eye, EyeOff, Lock } from 'lucide-react'

export default function LoginPage() {
  const { login, user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) return null

  if (user) {
    if (user.must_change_password) return <Navigate to="/change-password" replace />
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>
      setError(axiosError.response?.data?.message || 'Login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[oklch(0.15_0.03_250)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.25_0.1_260)] via-[oklch(0.15_0.03_250)] to-[oklch(0.1_0.02_250)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[oklch(0.45_0.2_260)] rounded-full blur-[128px] opacity-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[oklch(0.55_0.2_260)] rounded-full blur-[100px] opacity-15" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[oklch(0.45_0.2_260)] flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">UCRM</span>
            </div>
          </div>
          <div className="space-y-6">
            <h1 className="text-5xl font-bold leading-tight tracking-tight">
              Manage your<br />
              business with<br />
              <span className="text-[oklch(0.7_0.15_260)]">confidence.</span>
            </h1>
            <p className="text-lg text-[oklch(0.7_0.01_250)] max-w-md leading-relaxed">
              Track orders, manage inventory, coordinate your team, and grow your business — all from one powerful dashboard.
            </p>
          </div>
          <p className="text-sm text-[oklch(0.5_0.01_250)]">
            &copy; {new Date().getFullYear()} UCRM. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-[oklch(0.45_0.2_260)] flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[oklch(0.12_0.02_250)]">UCRM</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-[oklch(0.12_0.02_250)]">Welcome back</h2>
            <p className="text-base text-[oklch(0.5_0.02_250)]">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[oklch(0.3_0.02_250)]">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="h-12 text-base px-4 rounded-xl border-[oklch(0.88_0.01_250)] focus-visible:ring-[oklch(0.45_0.2_260)] focus-visible:border-[oklch(0.45_0.2_260)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[oklch(0.3_0.02_250)]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="h-12 text-base px-4 pr-12 rounded-xl border-[oklch(0.88_0.01_250)] focus-visible:ring-[oklch(0.45_0.2_260)] focus-visible:border-[oklch(0.45_0.2_260)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[oklch(0.5_0.02_250)] hover:text-[oklch(0.3_0.02_250)] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 text-base font-semibold rounded-xl bg-[oklch(0.45_0.2_260)] hover:bg-[oklch(0.4_0.22_260)] transition-all duration-200 shadow-lg shadow-[oklch(0.45_0.2_260)]/25"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
