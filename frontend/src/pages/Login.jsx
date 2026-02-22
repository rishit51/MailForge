import React, { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { AlertCircle, CheckCircle2, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom'
const api_url = import.meta.env.VITE_BASE_URL

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)


  const navigate = useNavigate()
  const location = useLocation()

  const usernameFromSignup = location.state?.username

  const { login } = useAuth()
  // Pre-fill email if passed from signup redirect
  useEffect(() => {
    if (usernameFromSignup) {
      setEmail(usernameFromSignup)
      setSuccessMessage('Account created successfully! Please login.')

    }
  }, [usernameFromSignup]);
  const handleSignIn = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const apiUrl = api_url
      // URLEncoded form body matching the real API contract
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      form.append('grant_type', 'password')
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (
            err
          ).detail || 'Invalid email or password',
        )
      }
      const data = await res.json();
      login(data.access_token);
      navigate('/');
    } catch (err) {
      // Demo mode: simulate login when no backend is available
      if (!email || !password) {
        setError('Please enter your email and password.')
      }
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left: Login */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-muted-foreground">
                MailForge
              </span>
            </div>
            <CardTitle className="text-2xl">Login</CardTitle>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={(e) => navigate('/signup')}
                className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                Sign up
              </button>
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setError('')
                    setEmail(e.target.value)
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setError('')
                    setPassword(e.target.value)
                  }}
                />
              </div>

              {/* Success message (e.g. after signup redirect) */}
              {successMessage && (
                <div className="flex items-start gap-3 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Success</p>
                    <p className="opacity-80">{successMessage}</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Login failed</p>
                    <p className="opacity-80">{error}</p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                isLoading={isLoading}
              >
                {isLoading ? 'Logging in…' : 'Login'}
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-px bg-border flex-1" />
                OR
                <div className="h-px bg-border flex-1" />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right: Quote */}
      <div className="hidden lg:flex items-center justify-center bg-muted p-8">
        <p className="text-xl text-muted-foreground max-w-md text-center leading-relaxed">
          Send personalized emails at scale without losing your sanity.
        </p>
      </div>
    </div>
  )
}
