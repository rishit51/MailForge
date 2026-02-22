import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Papa from "papaparse"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, CheckCircle } from "lucide-react"

const api_url = import.meta.env.VITE_BASE_URL

export default function Datasets() {
  const navigate = useNavigate()

  const [datasetName, setDatasetName] = useState("")
  const [file, setFile] = useState(null)
  const [columns, setColumns] = useState([])
  const [emailColumn, setEmailColumn] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleFileSelect = (file) => {
    setError("")
    setFile(file)
    setColumns([])
    setEmailColumn("")

    Papa.parse(file, {
      header: true,
      preview: 1,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields || []
        if (!fields.length) {
          setError("CSV has no header row")
          return
        }
        setColumns(fields)
      },
      error: () => {
        setError("Failed to read CSV file")
      },
    })
  }

  const handleUpload = async () => {
    if (!file || !emailColumn || !datasetName) return

    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("email_column", emailColumn)
      formData.append("name", datasetName)

      const token = localStorage.getItem("access_token")

      const res = await fetch(`${api_url}/datasets/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Upload failed")
      }

      setSuccess(true)
    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  // Auto redirect after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate("/")
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [success, navigate])

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {!success && (
        <Card>
          <CardHeader>
            <CardTitle>Create Dataset</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              placeholder="Dataset name (e.g. Leads - Jan 2026)"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
            />

            <Input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileSelect(f)
              }}
            />

            {columns.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2">
                  {columns.map((col) => (
                    <Badge key={col} variant="secondary">
                      {col}
                    </Badge>
                  ))}
                </div>

                <Select value={emailColumn} onValueChange={setEmailColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select email column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || !emailColumn || !datasetName || loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Uploading..." : "Upload Dataset"}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Upload failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-500">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <h2 className="text-xl font-semibold text-green-700">
              Dataset uploaded successfully
            </h2>
            <p className="text-sm text-muted-foreground">
              Redirecting to home…
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
