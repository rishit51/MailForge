import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useNavigate } from "react-router-dom"

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">
            Welcome to Email Sender
          </h1>
          <p className="text-muted-foreground">
            Upload a dataset, personalize emails using AI, and send them at scale.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            className="flex-1"
            onClick={() => navigate("/datasets")}
          >
            Upload Dataset
          </Button>

          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/campaigns/new")}
          >
            Create Campaign
          </Button>
        </div>
      </Card>
    </div>
  )
}
