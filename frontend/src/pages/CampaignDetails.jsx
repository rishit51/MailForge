import { useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Sparkles } from "lucide-react"

const api_url = import.meta.env.VITE_BASE_URL

export default function CampaignDetails() {
  const navigate = useNavigate()
  const location = useLocation()
  const dataset = location.state?.dataset

  const [aiPrompt, setAiPrompt] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [generating, setGenerating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  // Guard: user should not land here directly
  useEffect(() => {
    if (!dataset) {
      navigate("/campaigns/new", { replace: true })
    }
  }, [dataset, navigate])

  if (!dataset) return null

  const insertPlaceholder = (col) => {
    setBody((prev) => prev + ` {{${col}}}`)
  }

  const generateWithAI = async () => {
    if (!aiPrompt) return

    setGenerating(true)
    setError("")

    try {
      const token = localStorage.getItem("access_token")

      const res = await fetch(`${api_url}/llm/generate-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_prompt: aiPrompt,
          columns: dataset.json_schema,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to generate template")
      }

      const data = await res.json()

      setSubject(data.subject)
      setBody(data.body)
    } catch (e) {
      setError(e.message || "AI generation failed")
    } finally {
      setGenerating(false)
    }
  }

  const createCampaign = async () => {
    if (!subject || !body) return

    setCreating(true)
    setError("")

    try {
      const token = localStorage.getItem("access_token")

      const res = await fetch(`${api_url}/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dataset_id: dataset.id,
          subject,
          prompt: body,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to create campaign")
      }

      navigate("/")
    } catch (e) {
      setError(e.message || "Campaign creation failed")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Dataset context */}
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Using dataset: <strong>{dataset.name}</strong>
        </CardContent>
      </Card>

      {/* AI Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate with AI</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe the kind of email you want to send..."
            rows={4}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
          />

          <Button
            onClick={generateWithAI}
            disabled={!aiPrompt || generating}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Subject & Body
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Placeholders */}
      <Card>
        <CardHeader>
          <CardTitle>Available Placeholders</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-wrap gap-2">
          {dataset.json_schema.map((col) => (
            <Badge
              key={col}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => insertPlaceholder(col)}
            >
              {`{{${col}}}`}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {/* Manual Editing */}
      <Card>
        <CardHeader>
          <CardTitle>Email Content</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            placeholder="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <Textarea
            placeholder="Email body"
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <Button
            className="w-full"
            onClick={createCampaign}
            disabled={!subject || !body || creating}
          >
            {creating ? "Creating Campaign…" : "Create Campaign"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
