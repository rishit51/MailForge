import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"

const api_url = import.meta.env.VITE_BASE_URL

export default function Signup() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  
  const navigate = useNavigate()

  const handleSignUp = async (e) => {
    if (e) e.preventDefault()
    setError("")

    try {
      const res = await fetch(`${api_url}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || "Signup failed")
      }

      const data = await res.json()
      console.log(data)
      navigate("/login", {
        state: { username: data.email },
      })
    } catch (err) {
      setError(err.message || "Failed to sign up. Please try again.")
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left: Signup */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary underline">
                Login
              </Link>
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setError("")
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
                    setError("")
                    setPassword(e.target.value)
                  }}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Signup failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full">
                Sign up
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right: Quote / Illustration */}
      <div className="hidden lg:flex items-center justify-center bg-muted p-8">
        {/* Replace with <Quotes /> if you really want */}
        <p className="text-xl text-muted-foreground max-w-md text-center">
          Start sending emails that look personal but scale like automation.
        </p>
      </div>
    </div>
  )
}
