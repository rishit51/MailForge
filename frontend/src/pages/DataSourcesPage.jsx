import React, { useState } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import {
  Upload, FileSpreadsheet, Link as LinkIcon, Trash2, Eye
} from "lucide-react"
import { uploadDataset, usePreviewDatasets } from "../api"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../components/ui/command"
import { fetchPreview } from "../api"
import { Check, ChevronsUpDown } from "lucide-react"

export function DataSourcesPage() {

  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [columns, setColumns] = useState([])
  const [previewRows, setPreviewRows] = useState([])
  const [datasetName, setDatasetName] = useState("")
  const [emailColumn, setEmailColumn] = useState("")
  const [emailDropdownOpen, setEmailDropdownOpen] = useState(false)

  const [uploadState, setUploadState] = useState({
    open:false,fileName:"",fileSize:"",progress:0,status:"idle"
  })

  const [previewLoading, setPreviewLoading] = useState(false)
  const previewRef = React.useRef(null)

  const { datasets, isLoading, refetch } = usePreviewDatasets();
  console.log(datasets)

  /* ---------- FILE PREVIEW ---------- */

  const handleFile = async (f) => {
    if (!f) return
    setFile(f)
    setDatasetName(f.name)

    const chunk = await f.slice(0, 20000).text()
    const lines = chunk.split("\n").slice(0, 7)
    const parsed = lines.map(l => l.split(","))

    setColumns(parsed[0] || [])
    setPreviewRows(parsed.slice(1) || [])

    const detected = (parsed[0] || []).find(c =>
      c.toLowerCase().includes("email")
    )
    if (detected) setEmailColumn(detected)
  }

  /* ---------- PREVIEW FROM SERVER ---------- */
  const handlePreview = async (id) => {
    setPreviewLoading(true)
  
    try {
      const data = await fetchPreview(id)
  
      setColumns(data.json_schema || [])
      setPreviewRows(data.rows || [])
      setDatasetName(data.name || "Dataset preview")
  
      // scroll AFTER state updates render
      setTimeout(() => {
        previewRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }, 50)
  
    } finally {
      setPreviewLoading(false)
    }
  }

  /* ---------- UPLOAD ---------- */

  const uploadFile = async () => {
    if (!file) return

    setUploadState({
      open:true,
      fileName:file.name,
      fileSize:`${(file.size/1024/1024).toFixed(2)} MB`,
      progress:0,
      status:"uploading",
    })

    try {
      await uploadDataset({
        file,
        email_column: emailColumn,
        datasetName,
        onProgress:(percent)=>{
          setUploadState(prev=>({
            ...prev,
            progress:percent,
            status: percent<100 ? "uploading" : "processing"
          }))
        }
      })

      setUploadState(prev=>({...prev,progress:100,status:"processing"}))

      setTimeout(()=>{
        setUploadState(prev=>({...prev,status:"complete"}))
      },800)

    } catch(err){
      console.error(err)
      alert("Upload failed")
      setUploadState({open:false,fileName:"",fileSize:"",progress:0,status:"idle"})
    }

    refetch();
  }

  const getStatusStyles = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-600 border-green-500/20"
      case "processing":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
      case "failed":
        return "bg-red-500/10 text-red-600 border-red-500/20"
      default:
        return "bg-muted text-muted-foreground border"
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* UPLOAD MODAL */}
      {uploadState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-xl border bg-card shadow-2xl p-6 space-y-5">

            <div>
              <p className="font-semibold text-sm">{uploadState.fileName}</p>
              <p className="text-xs text-muted-foreground">{uploadState.fileSize}</p>
            </div>

            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    uploadState.status==="complete"
                      ? "bg-green-500"
                      : uploadState.status==="processing"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                  style={{width:`${uploadState.progress}%`}}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {uploadState.status==="complete"
                  ? "Upload complete"
                  : uploadState.status==="processing"
                  ? "Processing dataset…"
                  : "Uploading file…"}
              </p>
            </div>

            {uploadState.status==="complete" && (
              <Button
                className="w-full"
                onClick={()=>setUploadState({open:false,fileName:"",fileSize:"",progress:0,status:"idle"})}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      )}

      {/* TITLE */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data Sources</h2>
        <p className="text-muted-foreground mt-2">
          Manage your recipient lists and data connections.
        </p>
      </div>

      {/* GRID */}
      <div className="grid gap-8 md:grid-cols-2">

        {/* UPLOAD CARD */}
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>
              Drag and drop your CSV file here or click to browse.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">

            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragOver={(e)=>{e.preventDefault();setIsDragging(true)}}
              onDragLeave={()=>setIsDragging(false)}
              onDrop={(e)=>{
                e.preventDefault()
                setIsDragging(false)
                handleFile(e.dataTransfer.files[0])
              }}
            >
              {!file ? (
                <div className="flex flex-col items-center gap-4">
                  <Upload className="h-8 w-8 text-muted-foreground"/>
                  <Button onClick={()=>document.getElementById("csvInput")?.click()}>
                    Select File
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size/1024/1024).toFixed(2)} MB
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={()=>document.getElementById("csvInput")?.click()}>
                      Replace
                    </Button>
                    <Button variant="destructive" onClick={()=>setFile(null)}>
                      Remove
                    </Button>
                  </div>
                </div>
              )}

              <input
                id="csvInput"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e)=>handleFile(e.target.files?.[0])}
              />
            </div>

            {file && (
              <div className="space-y-4">
                <Input
                  value={datasetName}
                  onChange={(e)=>setDatasetName(e.target.value)}
                  placeholder="Dataset name"
                />

                <Popover open={emailDropdownOpen} onOpenChange={setEmailDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {emailColumn || "Select email column"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50"/>
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search column..." />
                      <CommandEmpty>No column found.</CommandEmpty>
                      <CommandGroup>
                        {columns.map(col=>(
                          <CommandItem
                            key={col}
                            onSelect={()=>{setEmailColumn(col);setEmailDropdownOpen(false)}}
                          >
                            <Check className={`mr-2 h-4 w-4 ${emailColumn===col?"opacity-100":"opacity-0"}`}/>
                            {col}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Button onClick={uploadFile} disabled={!emailColumn} className="w-full">
                  Upload Dataset
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DATASETS LIST */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Datasets</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {isLoading && [...Array(3)].map((_,i)=>(
              <div key={i} className="h-10 rounded bg-muted animate-pulse"/>
            ))}

            {!isLoading && datasets.length===0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Oops… no datasets yet
              </p>
            )}

{datasets.map(ds=>(
  <div key={ds.id} className="flex items-center justify-between p-3 rounded-md border">
    
    <div className="flex items-center gap-3">
      <FileSpreadsheet className="h-4 w-4"/>

      <div className="space-y-1">
        <p className="text-sm font-medium">{ds.name}</p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{ds.rows} rows • {ds.date}</span>

          <span
            className={`px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize ${getStatusStyles(ds.status)}`}
          >
            {ds.status}
          </span>
        </div>
      </div>
    </div>

    <Button variant="ghost" size="icon" onClick={() => handlePreview(ds.id)}>
      <Eye className="h-4 w-4"/>
    </Button>

  </div>
))}
          </CardContent>
        </Card>
      </div>

      {/* PREVIEW TABLE */}
      {columns.length>0 && (
        <Card ref={previewRef}>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
            <CardDescription>{datasetName}</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="rounded-md border overflow-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    {columns.map((c,i)=>(
                      <th key={i} className="px-4 py-2 text-left">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row,i)=>(
                    <tr key={i} className="border-b hover:bg-muted/50">
                      {row.map((cell,j)=>(
                        <td key={j} className="px-4 py-2">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}