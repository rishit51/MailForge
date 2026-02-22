import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState("")

  useEffect(() => {
    const token = searchParams.get("token")

    if (token) {
      // Use the same login method from AuthContext
      login(token)
        .then(() => {
          navigate("/")
        })
        .catch((err) => {
          setError("Failed to authenticate with GitHub")
          console.error(err)
        })
    } else {
      setError("No authentication token received")
    }
  }, [searchParams, navigate, login])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <button
              onClick={() => navigate("/login")}
              className="mt-4 w-full py-2 px-4 bg-primary text-primary-foreground rounded-md"
            >
              Back to Login
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Authenticating with GitHub...</p>
        </CardContent>
      </Card>
    </div>
  )
}