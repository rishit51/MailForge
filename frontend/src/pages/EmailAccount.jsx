"use client"

import React, { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Plus, CheckCircle2, Trash2, Send, KeyRound } from "lucide-react"


const initialAccounts= [
  {
    id: "1",
    email: "marketing@company.com",
    provider: "gmail",
    dailyLimit: "2,000",
    sentToday: 1240,
    lastUsed: "2 mins ago",
    status: "connected",
  },
  {
    id: "2",
    email: "outreach@company.com",
    provider: "sendgrid",
    dailyLimit: "100,000",
    sentToday: 12450,
    lastUsed: "5 mins ago",
    status: "connected",
  },
]

function ProviderIcon({ provider }) {
  if (provider === "gmail") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
        <Mail className="h-5 w-5 text-red-600" />
      </div>
    )
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
      <Send className="h-5 w-5 text-blue-600" />
    </div>
  )
}

function ProviderLabel({ provider }) {
  if (provider === "gmail") return "Gmail (OAuth)"
  return "SendGrid API"
}

function AccountCard({
  account,
  onDisconnect,
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute right-0 top-0 p-4">
        <Badge className="gap-1 border-transparent bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          Connected
        </Badge>
      </div>
      <CardHeader>
        <ProviderIcon provider={account.provider} />
        <CardTitle className="pt-1">{account.email}</CardTitle>
        <CardDescription>
          <ProviderLabel provider={account.provider} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between py-1">
              <span>Daily Limit</span>
              <span className="font-medium text-foreground">
                {account.dailyLimit}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>Sent Today</span>
              <span className="font-medium text-foreground">
                {account.sentToday.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>Last Used</span>
              <span className="font-medium text-foreground">
                {account.lastUsed}
              </span>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="w-full">
              Test
            </Button>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => onDisconnect(account.id)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Disconnect
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ConnectAccountModal({
  open,
  onOpenChange,
  onAdd,
}) {
  const [tab, setTab] = useState("gmail")

  // Gmail form state
  const [gmailEmail, setGmailEmail] = useState("")
  const [gmailClientId, setGmailClientId] = useState("")
  const [gmailClientSecret, setGmailClientSecret] = useState("")

  // SendGrid form state
  const [sgEmail, setSgEmail] = useState("")
  const [sgSenderName, setSgSenderName] = useState("")
  const [sgApiKey, setSgApiKey] = useState("")

  function resetForm() {
    setGmailEmail("")
    setGmailClientId("")
    setGmailClientSecret("")
    setSgEmail("")
    setSgSenderName("")
    setSgApiKey("")
    setTab("gmail")
  }

  function handleGmailSubmit(e) {
    e.preventDefault()
    if (!gmailEmail) return
    onAdd({
      id: crypto.randomUUID(),
      email: gmailEmail,
      provider: "gmail",
      dailyLimit: "2,000",
      sentToday: 0,
      lastUsed: "Never",
      status: "connected",
    })
    resetForm()
    onOpenChange(false)
  }

  function handleSendGridSubmit(e) {
    e.preventDefault()
    if (!sgEmail || !sgApiKey) return
    onAdd({
      id: crypto.randomUUID(),
      email: sgEmail,
      provider: "sendgrid",
      dailyLimit: "100,000",
      sentToday: 0,
      lastUsed: "Never",
      status: "connected",
    })
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Connect Email Account</DialogTitle>
          <DialogDescription>
            Choose a provider and enter your credentials to connect a new sending
            account.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v)}
          className="mt-2"
        >
          <TabsList className="w-full">
            <TabsTrigger value="gmail" className="flex-1 gap-2">
              <Mail className="h-4 w-4" />
              Gmail
            </TabsTrigger>
            <TabsTrigger value="sendgrid" className="flex-1 gap-2">
              <Send className="h-4 w-4" />
              SendGrid API
            </TabsTrigger>
          </TabsList>

          {/* Gmail Tab */}
          <TabsContent value="gmail">
            <form onSubmit={handleGmailSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="gmail-email">Email Address</Label>
                <Input
                  id="gmail-email"
                  placeholder="you@gmail.com"
                  type="email"
                  value={gmailEmail}
                  onChange={(e) => setGmailEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gmail-client-id">OAuth Client ID</Label>
                <Input
                  id="gmail-client-id"
                  placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                  value={gmailClientId}
                  onChange={(e) => setGmailClientId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gmail-client-secret">OAuth Client Secret</Label>
                <Input
                  id="gmail-client-secret"
                  type="password"
                  placeholder="Enter client secret"
                  value={gmailClientSecret}
                  onChange={(e) => setGmailClientSecret(e.target.value)}
                />
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Gmail accounts are limited to 2,000 emails per day. You will be
                  redirected to Google to authorize access after saving.
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Connect Gmail</Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* SendGrid Tab */}
          <TabsContent value="sendgrid">
            <form onSubmit={handleSendGridSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="sg-email">Sender Email Address</Label>
                <Input
                  id="sg-email"
                  placeholder="sender@yourdomain.com"
                  type="email"
                  value={sgEmail}
                  onChange={(e) => setSgEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sg-name">Sender Name</Label>
                <Input
                  id="sg-name"
                  placeholder="Your Company"
                  value={sgSenderName}
                  onChange={(e) => setSgSenderName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sg-api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="sg-api-key"
                    type="password"
                    placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={sgApiKey}
                    onChange={(e) => setSgApiKey(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <KeyRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  SendGrid supports up to 100,000 emails per day depending on
                  your plan. Make sure your sender is verified in SendGrid.
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Connect SendGrid</Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export function EmailAccountsPage() {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [modalOpen, setModalOpen] = useState(false)

  function handleDisconnect(id) {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
  }

  function handleAddAccount(account) {
    setAccounts((prev) => [...prev, account])
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-balance">
            Email Accounts
          </h2>
          <p className="mt-2 text-muted-foreground">
            Connect and manage your sending accounts via Gmail or SendGrid.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Connect New Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Mail className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No accounts connected</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by connecting a Gmail or SendGrid account.
          </p>
          <Button className="mt-6" onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Connect Account
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      )}

      <ConnectAccountModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAdd={handleAddAccount}
      />
    </div>
  )
}
