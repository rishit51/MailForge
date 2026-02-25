import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { StepIndicator } from "@/components/StepIndicator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs"
import {
  ChevronRight,
  ChevronLeft,
  Wand2,
  Calendar,
  Clock,
  Mail,
  Database,
  Loader2,
  CheckCircle,
  Send,
  FileSpreadsheet,
  Sparkles,
  Plus,
} from "lucide-react"

const api_url = import.meta.env.VITE_BASE_URL || "http://localhost:8000"

export default function CreateCampaign() {
  const navigate = useNavigate()

  // Stepper state
  const [currentStep, setCurrentStep] = useState(0)
  const steps = [
    "Select Data",
    "Email Account",
    "Compose",
    "Schedule",
    "Review",
  ]

  // Form state
  const [campaignName, setCampaignName] = useState("")
  const [datasetId, setDatasetId] = useState("")
  const [emailAccountId, setEmailAccountId] = useState("")
  const [subjectTemplate, setSubjectTemplate] = useState("")
  const [bodyTemplate, setBodyTemplate] = useState("")
  
  // Custom prompt for LLM generation
  const [customPrompt, setCustomPrompt] = useState("")
  const [useLLMGeneration, setUseLLMGeneration] = useState(false)
  
  // Scheduling state
  const [scheduleType, setScheduleType] = useState("now")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  
  // Throttling state
  const [throttleEnabled, setThrottleEnabled] = useState(false)
  const [throttleRate, setThrottleRate] = useState(60)

  // Data
  const [datasets, setDatasets] = useState([])
  const [emailAccounts, setEmailAccounts] = useState([])
  const [datasetColumns, setDatasetColumns] = useState([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  
  // LLM generation state
  const [generating, setGenerating] = useState(false)
  const [llmError, setLlmError] = useState("")
  
  // Popover/Dialog states
  const [datasetPopoverOpen, setDatasetPopoverOpen] = useState(false)
  const [emailAccountModalOpen, setEmailAccountModalOpen] = useState(false)

  // Navigation
  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0))

  // Fetch datasets and email accounts
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("access_token")
      const headers = { Authorization: `Bearer ${token}` }

      try {
        const datasetsRes = await fetch(`${api_url}/datasets?page=1&page_size=100`, { headers })
        const datasetsData = await datasetsRes.json()
        setDatasets(Array.isArray(datasetsData.data) ? datasetsData.data : [])

        const accountsRes = await fetch(`${api_url}/email-accounts`, { headers })
        const accountsData = await accountsRes.json()
        setEmailAccounts(Array.isArray(accountsData) ? accountsData : [])
      } catch (err) {
        console.error("Failed to fetch data:", err)
        setError("Failed to load datasets and email accounts")
      } finally {
        setFetchingData(false)
      }
    }

    fetchData()
  }, [])

  // Fetch dataset columns when dataset is selected
  useEffect(() => {
    if (!datasetId) {
      setDatasetColumns([])
      return
    }

    const fetchDatasetDetails = async () => {
      const token = localStorage.getItem("access_token")
      const headers = { Authorization: `Bearer ${token}` }

      try {
        const res = await fetch(`${api_url}/datasets/${datasetId}`, { headers })
        const data = await res.json()
        setDatasetColumns(Array.isArray(data.json_schema) ? data.json_schema : [])
      } catch (err) {
        console.error("Failed to fetch dataset details:", err)
      }
    }

    fetchDatasetDetails()
  }, [datasetId])

  // Get selected objects
  const selectedDataset = datasets.find(d => d.id === parseInt(datasetId))
  const selectedEmailAccount = emailAccounts.find(a => a.id === parseInt(emailAccountId))

  // Generate email content using LLM
  const handleLLMGenerate = async () => {
    if (!customPrompt || datasetColumns.length === 0) {
      setLlmError("Please enter a prompt and select a dataset with columns")
      return
    }

    setGenerating(true)
    setLlmError("")

    try {
      const token = localStorage.getItem("access_token")
      const res = await fetch(`${api_url}/llm/generate-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          user_prompt: customPrompt,
          columns: datasetColumns
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to generate template")
      }

      const data = await res.json()
      setSubjectTemplate(data.subject || "")
      setBodyTemplate(data.body || "")
      
    } catch (err) {
      setLlmError(err.message || "Failed to generate email content")
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("access_token")
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }

      let scheduledAt = null
      if (scheduleType === "scheduled" && scheduledDate && scheduledTime) {
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }

      const payload = {
        dataset_id: parseInt(datasetId),
        email_account_id: parseInt(emailAccountId),
        subject_template: subjectTemplate,
        prompt_template: bodyTemplate,
        scheduled_at: scheduledAt,
        throttle_per_minute: throttleEnabled ? throttleRate : 60,
      }

      const res = await fetch(`${api_url}/email-jobs/`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to create campaign")
      }

      const data = await res.json()
      setSuccess(true)
      
      setTimeout(() => {
        navigate(`/campaign/${data.job_id}`)
      }, 2000)

    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  // Refresh accounts after modal closes
  const handleEmailAccountModalClose = (open) => {
    setEmailAccountModalOpen(open)
    if (!open) {
      const loadAccounts = async () => {
        const token = localStorage.getItem("access_token")
        const headers = { Authorization: `Bearer ${token}` }
        const res = await fetch(`${api_url}/email-accounts`, { headers })
        const data = await res.json()
        setEmailAccounts(Array.isArray(data) ? data : [])
      }
      loadAccounts()
    }
  }

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
        <Card className="border-green-500">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <h2 className="text-xl font-semibold text-green-700">
              Campaign Created Successfully!
            </h2>
            <p className="text-sm text-muted-foreground">
              {scheduleType === "scheduled" 
                ? "Your campaign has been scheduled and will be sent at the specified time."
                : "Your campaign is being processed and emails are being sent."
              }
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create Campaign</h2>
        <p className="text-muted-foreground mt-2">
          Follow the steps to set up your new email campaign.
        </p>
      </div>

      <StepIndicator steps={steps} currentStep={currentStep} />

      <div className="mt-8">
        {/* Step 0: Select Data */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Data Source</CardTitle>
              <CardDescription>
                Choose the recipient list for this campaign.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {datasets.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No datasets found.{" "}
                  <span 
                    className="text-blue-600 cursor-pointer hover:underline"
                    onClick={() => navigate("/datasets")}
                  >
                    Upload a dataset
                  </span>
                </p>
              ) : (
                datasets.map((ds, i) => (
                  <div
                    key={ds.id}
                    onClick={() => setDatasetId(ds.id.toString())}
                    className={`flex items-center space-x-4 border p-4 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                      datasetId === ds.id.toString() ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="dataset"
                      id={`ds-${i}`}
                      className="h-4 w-4 text-primary"
                      checked={datasetId === ds.id.toString()}
                      onChange={() => setDatasetId(ds.id.toString())}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`ds-${i}`}
                        className="text-base font-medium cursor-pointer"
                      >
                        {ds.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {ds.email_column || "No email column"}
                      </p>
                    </div>
                    <Database className="h-5 w-5 text-muted-foreground" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 1: Email Account */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Email Account</CardTitle>
              <CardDescription>
                Choose which email address to send from.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailAccounts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">No email accounts connected.</p>
                  <Button onClick={() => setEmailAccountModalOpen(true)}>
                    Connect Email Account
                  </Button>
                </div>
              ) : (
                emailAccounts.map((acc, i) => (
                  <div
                    key={acc.id}
                    onClick={() => setEmailAccountId(acc.id.toString())}
                    className={`flex items-center space-x-4 border p-4 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                      emailAccountId === acc.id.toString() ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="account"
                      id={`acc-${i}`}
                      className="h-4 w-4 text-primary"
                      checked={emailAccountId === acc.id.toString()}
                      onChange={() => setEmailAccountId(acc.id.toString())}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`acc-${i}`}
                        className="text-base font-medium cursor-pointer"
                      >
                        {acc.email_address}
                      </Label>
                      <p className="text-sm text-muted-foreground capitalize">
                        {acc.provider} • {acc.is_active ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                ))
              )}
              <div className="border-t pt-4">
                <Button variant="outline" onClick={() => setEmailAccountModalOpen(true)}>
                  Connect New Account
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Compose */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* AI Personalization Card */}
            <Card>
              <CardHeader>
                <CardTitle>AI Personalization</CardTitle>
                <CardDescription>
                  Describe how you want the AI to personalize emails for each recipient.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Prompt</Label>
                  <Textarea
                    placeholder="E.g. Write a friendly intro mentioning their company {{company}} and how our product {{product}} can help them..."
                    className="h-24"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={handleLLMGenerate}
                    disabled={generating || !customPrompt || datasetColumns.length === 0}
                  >
                    {generating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="mr-2 h-4 w-4" />
                    )}
                    Generate with AI
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Available placeholders:
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {datasetColumns.map((col) => (
                      <Badge
                        key={col}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => setCustomPrompt(prev => prev + `{{${col}}}`)}
                      >
                        {`{{${col}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
                {llmError && (
                  <p className="text-sm text-red-500">{llmError}</p>
                )}
              </CardContent>
            </Card>

            {/* Email Content Card */}
            <Card>
              <CardHeader>
                <CardTitle>Email Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject Line</Label>
                  <Input 
                    placeholder="Quick question about {{company}}" 
                    value={subjectTemplate}
                    onChange={(e) => setSubjectTemplate(e.target.value)}
                  />
                  <div className="flex gap-1 flex-wrap">
                    {datasetColumns.map((col) => (
                      <Badge
                        key={`sub-${col}`}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted text-xs"
                        onClick={() => setSubjectTemplate(prev => prev + `{{${col}}}`)}
                      >
                        {`{{${col}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <Textarea
                    className="h-64 font-mono text-sm"
                    placeholder="Hi {{name}}, ..."
                    value={bodyTemplate}
                    onChange={(e) => setBodyTemplate(e.target.value)}
                  />
                  <div className="flex gap-1 flex-wrap">
                    {datasetColumns.map((col) => (
                      <Badge
                        key={`body-${col}`}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted text-xs"
                        onClick={() => setBodyTemplate(prev => prev + `{{${col}}}`)}
                      >
                        {`{{${col}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Schedule */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Schedule & Throttling</CardTitle>
              <CardDescription>
                Control when and how fast your emails are sent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <div className="relative">
                    <Input 
                      type="date" 
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <div className="relative">
                    <Input 
                      type="time" 
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                    <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Throttling</h4>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Emails per minute</Label>
                    <Input 
                      type="number" 
                      value={throttleRate}
                      onChange={(e) => setThrottleRate(parseInt(e.target.value) || 60)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Default: 60 emails/minute
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Review Campaign</CardTitle>
              <CardDescription>
                Double check everything before launching.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Dataset
                  </h4>
                  <p className="font-medium">
                    {selectedDataset ? selectedDataset.name : "Not selected"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Sending Account
                  </h4>
                  <p className="font-medium">
                    {selectedEmailAccount ? selectedEmailAccount.email_address : "Not selected"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Schedule
                  </h4>
                  <p className="font-medium">
                    {scheduleType === "scheduled" && scheduledDate && scheduledTime
                      ? `${scheduledDate} at ${scheduledTime}`
                      : "Send immediately"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Throttling
                  </h4>
                  <p className="font-medium">
                    {throttleRate} emails/minute
                  </p>
                </div>
              </div>

              <div className="rounded-md bg-muted p-4">
                <h4 className="text-sm font-medium mb-2">
                  Subject: {subjectTemplate || "(not set)"}
                </h4>
                <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                  {bodyTemplate || "(not set)"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSubmit}
              disabled={loading || !datasetId || !emailAccountId || !subjectTemplate || !bodyTemplate}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {loading ? "Creating..." : "Launch Campaign"}
            </Button>
          ) : (
            <Button 
              onClick={nextStep}
              disabled={
                (currentStep === 0 && !datasetId) ||
                (currentStep === 1 && !emailAccountId)
              }
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Email Account Modal */}
      <EmailAccountModal 
        open={emailAccountModalOpen} 
        onOpenChange={handleEmailAccountModalClose}
        accounts={emailAccounts}
        selectedId={emailAccountId}
        onSelect={(id) => setEmailAccountId(id.toString())}
      />
    </div>
  )
}

/* ---------- Email Account Modal Component ---------- */
function EmailAccountModal({ open, onOpenChange, accounts, selectedId, onSelect }) {
  const [tab, setTab] = useState("gmail")
  const [sgEmail, setSgEmail] = useState("")
  const [sgSenderName, setSgSenderName] = useState("")
  const [sgApiKey, setSgApiKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const api_url = import.meta.env.VITE_BASE_URL || "http://localhost:8000"

  function resetForm() {
    setSgEmail("")
    setSgSenderName("")
    setSgApiKey("")
    setError(null)
    setTab("gmail")
  }

  async function handleGmailSubmit() {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem("access_token")
      const res = await fetch(`${api_url}/email-accounts/gmail/auth-url`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.auth_url) {
        window.location.href = data.auth_url
      }
    } catch (err) {
      setError("Could not start Google login.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSendGridSubmit(e) {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem("access_token")
      await fetch(`${api_url}/email-accounts/sendgrid`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          provider: "sendgrid",
          email_address: sgEmail,
          name: sgSenderName,
          config: { api_key: sgApiKey }
        })
      })
      resetForm()
    } catch (err) {
      setError(err.message || "Could not connect SendGrid")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Select Email Account</DialogTitle>
          <DialogDescription>
            Choose an existing account or connect a new one.
          </DialogDescription>
        </DialogHeader>

        {accounts.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Existing Accounts</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => {
                    onSelect(account.id)
                    onOpenChange(false)
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedId === account.id.toString() 
                      ? "border-primary bg-primary/5" 
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      account.provider === "gmail" ? "bg-red-50" : "bg-blue-50"
                    }`}>
                      <Mail className={`h-4 w-4 ${
                        account.provider === "gmail" ? "text-red-600" : "text-blue-600"
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{account.email_address}</p>
                      <p className="text-xs text-muted-foreground capitalize">{account.provider}</p>
                    </div>
                  </div>
                  {selectedId === account.id.toString() && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <Label className="text-sm text-muted-foreground mb-2 block">Or connect a new account</Label>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="gmail" className="flex-1 gap-2">
                <Mail className="h-4 w-4" /> Gmail
              </TabsTrigger>
              <TabsTrigger value="sendgrid" className="flex-1 gap-2">
                <Send className="h-4 w-4" /> SendGrid
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gmail">
              <div className="space-y-4 pt-4">
                <Button
                  className="w-full"
                  onClick={handleGmailSubmit}
                  disabled={loading}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {loading ? "Redirecting..." : "Connect Gmail"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="sendgrid">
              <form onSubmit={handleSendGridSubmit} className="space-y-4 pt-4">
                <Input
                  placeholder="sender@domain.com"
                  value={sgEmail}
                  onChange={(e) => setSgEmail(e.target.value)}
                  required
                />
                <Input
                  placeholder="Sender name"
                  value={sgSenderName}
                  onChange={(e) => setSgSenderName(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="SendGrid API key"
                  value={sgApiKey}
                  onChange={(e) => setSgApiKey(e.target.value)}
                  required
                />
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Connecting..." : "Connect SendGrid"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

