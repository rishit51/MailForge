import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

const api_url = import.meta.env.VITE_BASE_URL


export default function ChooseDataset() {
  const navigate = useNavigate()
  const [datasets, setDatasets] = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("access_token")
        const res = await fetch(`${api_url}/datasets`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error("Failed to load datasets")
        setDatasets(await res.json())
      } catch (e) {
        setError(e.message)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Select Dataset</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Select
            onValueChange={(id) =>
              setSelected(datasets.find((d) => d.id === Number(id)) || null)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a dataset" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map((ds) => (
                <SelectItem key={ds.id} value={String(ds.id)}>
                  {ds.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            disabled={!selected}
            className="w-full"
            onClick={() =>
              navigate("/campaigns/new/details", {
                state: { dataset: selected },
              })
            }
          >
            Continue
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
