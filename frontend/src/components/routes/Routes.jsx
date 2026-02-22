import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Sidebar } from "../Sidebar"


export function AuthOnlyRoute({ children }) {
  const { user, isLoading } = useAuth()

  if (isLoading) return null
  if (user) return <Navigate to="/" replace />

  return children
}


export function ProtectedRoute({ children }) {

  const { user, isLoading } = useAuth()

  if (isLoading) return null

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (

    <div className="dark min-h-screen bg-background text-foreground flex">

      <Sidebar />

      <main className="flex-1 h-screen overflow-auto">

        <div className="w-full p-6">

          {children}

        </div>

      </main>

    </div>

  )
}

