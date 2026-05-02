import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ApiError } from '@/types'
import { AxiosError } from 'axios'
import { Eye, EyeOff } from 'lucide-react'

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
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar-primary/20 via-sidebar to-black/40" />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary rounded-full blur-[128px] opacity-10" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div>
            <span className="text-2xl font-bold tracking-tight">UCRM</span>
          </div>
          <div className="space-y-5">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
              Manage your<br />
              business with<br />
              <span className="text-primary">confidence.</span>
            </h1>
            <p className="text-base text-sidebar-foreground max-w-md leading-relaxed">
              Track orders, manage inventory, coordinate your team, and grow your business — all from one powerful dashboard.
            </p>
          </div>
          <p className="text-sm text-sidebar-foreground/50">
            &copy; {new Date().getFullYear()} UCRM. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12 bg-card">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-4">
            <span className="text-2xl font-bold tracking-tight">UCRM</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-11">
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
