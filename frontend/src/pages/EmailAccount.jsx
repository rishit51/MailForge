"use client"

import React, { useState, useEffect } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Plus, CheckCircle2, Trash2, Send, KeyRound, Shield } from "lucide-react"

import {
  gmailAuth,
  fetchAccounts,
  deleteAccount,
  createSendgridAccount,
  generateSendgridCredentials,
} from "../api"



/* ---------- Small UI helpers ---------- */

function ProviderIcon({ provider }) {
  return provider === "gmail" ? (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
      <Mail className="h-5 w-5 text-red-600" />
    </div>
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
      <Send className="h-5 w-5 text-blue-600" />
    </div>
  )
}

function ProviderLabel({ provider }) {
  return provider === "gmail" ? "Gmail (OAuth)" : "SendGrid API"
}

function AccountCard({ account, onDisconnect, onGenerateCredentials }) {
  const isSendgrid = account.provider === "sendgrid"
  const hasCredentials = account.config?.oauth_credentials_viewed

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute right-0 top-0 p-4">
        {account.is_active ? (
          <Badge className="gap-1 border-transparent bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </Badge>
        ) : (
          <Badge className="gap-1 border-transparent bg-muted text-muted-foreground">
            Inactive
          </Badge>
        )}
      </div>

      <CardHeader>
        <ProviderIcon provider={account.provider} />
        <CardTitle className="pt-1 text-s">{account.email_address}</CardTitle>
        <CardDescription>
          <ProviderLabel provider={account.provider} />
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        {isSendgrid && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onGenerateCredentials(account)}
          >
            <Shield className="mr-2 h-4 w-4" />
            {hasCredentials ? "View Webhook Credentials" : "Generate Webhook Credentials"}
          </Button>
        )}
        
        <Button
          variant="outline"
          className="w-full text-destructive"
          onClick={() => onDisconnect(account.id)}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Disconnect
        </Button>
      </CardContent>
    </Card>
  )
}



/* ---------- Modal ---------- */

function ConnectAccountModal({ open, onOpenChange, reload }) {

  const [tab, setTab] = useState("gmail")

  const [sgEmail, setSgEmail] = useState("")
  const [sgSenderName, setSgSenderName] = useState("")
  const [sgApiKey, setSgApiKey] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function resetForm() {
    setSgEmail("")
    setSgSenderName("")
    setSgApiKey("")
    setError(null)
    setTab("gmail")
  }

  /* ----- Gmail connect ----- */
  async function handleGmailSubmit() {
    try {
      setLoading(true)
      setError(null)

      const url = await gmailAuth()

      if (!url) throw new Error("Missing auth URL")

      window.location.href = url
    } catch (err) {
      console.error(err)
      setError("Could not start Google login. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  /* ----- SendGrid connect ----- */
  async function handleSendGridSubmit(e) {
    e.preventDefault()
  
    try {
      setLoading(true)
      setError(null)
  
      await createSendgridAccount({
        provider: "sendgrid",
        email_address: sgEmail,
        name:sgSenderName,
        config: {
          api_key: sgApiKey,
          
        },
      })
  
      // Only runs if the above didn't throw
      resetForm()
      onOpenChange(false)
      reload()
  
    } catch (err) {
      console.error(err)
      setError(err.message || "Could not connect SendGrid. Please check your API key.")
      // Modal stays open, form stays populated
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Connect Email Account</DialogTitle>
          <DialogDescription>
            Connect Gmail or SendGrid to start sending emails.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="gmail" className="flex-1 gap-2">
              <Mail className="h-4 w-4" /> Gmail
            </TabsTrigger>
            <TabsTrigger value="sendgrid" className="flex-1 gap-2">
              <Send className="h-4 w-4" /> SendGrid
            </TabsTrigger>
          </TabsList>

          {/* Gmail tab */}
          <TabsContent value="gmail">
            <div className="space-y-4 pt-6">
              <Button
                className="w-full"
                onClick={handleGmailSubmit}
                disabled={loading}
              >
                <Mail className="mr-2 h-4 w-4" />
                {loading ? "Redirecting..." : "Continue with Google"}
              </Button>
            </div>
          </TabsContent>

          {/* SendGrid tab */}
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

              <div className="relative">
                <Input
                  type="password"
                  placeholder="SendGrid API key"
                  value={sgApiKey}
                  onChange={(e) => setSgApiKey(e.target.value)}
                  required
                />
                <KeyRound className="absolute right-3 top-3 h-4 w-4 opacity-50" />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Connecting..." : "Connect SendGrid"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}



/* ---------- Page ---------- */

export function EmailAccountsPage() {

  const [accounts, setAccounts] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  
  // Webhook credentials dialog state
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const [credentialsLoading, setCredentialsLoading] = useState(false)
  const [credentialsError, setCredentialsError] = useState(null)

  async function loadAccounts() {
    const data = await fetchAccounts()
    setAccounts(data)
  }

  useEffect(() => {
    loadAccounts()

    const params = new URLSearchParams(window.location.search)
    if (params.get("connected")) {
      loadAccounts()
      window.history.replaceState({}, "", "/accounts")
    }
  }, [])

  async function handleDisconnect(id) {
    await deleteAccount(id)
    loadAccounts()
  }

  async function handleGenerateCredentials(account) {
    setSelectedAccount(account)
    setCredentialsDialogOpen(true)
    setCredentials(null)
    setCredentialsError(null)
    setCredentialsLoading(true)

    try {
      const data = await generateSendgridCredentials(account.id)
      setCredentials(data)
    } catch (err) {
      console.error(err)
      setCredentialsError(err.message || "Failed to generate credentials.")
    } finally {
      setCredentialsLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Email Accounts</h2>
          <p className="mt-2 text-muted-foreground">
            Connect Gmail or SendGrid accounts.
          </p>
        </div>

        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Connect New Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Mail className="h-7 w-7 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No accounts connected</h3>
          <Button className="mt-6" onClick={() => setModalOpen(true)}>
            Connect Account
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              onDisconnect={handleDisconnect}
              onGenerateCredentials={handleGenerateCredentials}
            />
          ))}
        </div>
      )}

      <ConnectAccountModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        reload={loadAccounts}
      />

      {/* Webhook Credentials Dialog */}
      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>SendGrid Webhook Credentials</DialogTitle>
            <DialogDescription>
              Use these credentials to configure OAuth for SendGrid webhook events.
            </DialogDescription>
          </DialogHeader>

          {credentialsLoading && (
            <div className="py-8 text-center text-muted-foreground">
              Generating credentials...
            </div>
          )}

          {credentialsError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {credentialsError}
            </div>
          )}

          {credentials && !credentialsLoading && (
            <div className="space-y-4">
              {credentials.warning && (
                <div className="rounded-md border border-amber-400/40 bg-amber-50 p-3 text-sm text-amber-800">
                  <strong>Warning:</strong> {credentials.warning}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Client ID</label>
                <Input
                  value={credentials.client_id}
                  readOnly
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Client Secret</label>
                <Input
                  value={credentials.client_secret}
                  readOnly
                  className="font-mono"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCredentialsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
