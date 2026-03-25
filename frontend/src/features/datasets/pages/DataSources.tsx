import React, { useState, useRef } from 'react';
import { datasetsApi, usePreviewDatasets, useUploadDataset } from '../api/datasets';
import Papa from 'papaparse';


export function DataSources() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [datasetName, setDatasetName] = useState("");
  const [emailColumn, setEmailColumn] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  const [uploadState, setUploadState] = useState({
    open: false, fileName: "", fileSize: "", progress: 0, status: "idle"
  });

  const [previewLoading, setPreviewLoading] = useState(false);
  const previewRef = useRef<HTMLElement>(null);

  const { datasets, isLoading } = usePreviewDatasets();
  const uploadDatasetMutation = useUploadDataset();

  /* ---------- FILE PREVIEW ---------- */
  const handleFile = async (f?: File) => {
    if (!f) return;

    setFile(f);
    setDatasetName(f.name);
    setParseError(null);

    Papa.parse(f, {
      preview: 7,            // same as slice(0, 7)
      skipEmptyLines: true,  // 👈 handles empty lines
      complete: (result) => {
        const parsed = result.data as string[][];

        setColumns(parsed[0] || []);
        setPreviewRows(parsed.slice(1) || []);

        const detected = (parsed[0] || []).find(c =>
          c.toLowerCase().includes("email")
        );

        if (detected) setEmailColumn(detected);
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        setParseError(err.message || "An error occurred while parsing the CSV file.");
      }
    });
  };

  /* ---------- PREVIEW FROM SERVER ---------- */
  const handlePreview = async (id: number) => {
    setPreviewLoading(true);
    try {
      const data = await datasetsApi.fetchPreview(id);
      console.log(data.rows);
      setColumns(data.json_schema || []);
      setPreviewRows(data.rows || []);
      setDatasetName(data.name || "Dataset preview");

      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } finally {
      setPreviewLoading(false);
    }
  };

  /* ---------- UPLOAD ---------- */
  const uploadFile = async () => {
    if (!file) return;
    setUploadState({
      open: true,
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      progress: 0,
      status: "uploading",
    });

    try {
      await uploadDatasetMutation.mutateAsync({
        file,
        email_column: emailColumn,
        datasetName,
        onProgress: (percent) => {
          setUploadState(prev => ({
            ...prev,
            progress: percent,
            status: percent < 100 ? "uploading" : "processing"
          }));
        }
      });

      setUploadState(prev => ({ ...prev, progress: 100, status: "processing" }));
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, status: "complete" }));
      }, 800);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
      setUploadState({ open: false, fileName: "", fileSize: "", progress: 0, status: "idle" });
    }
    // Refetch is handled automatically by the mutation's onSuccess invalidation
  };

  return (
    <div className="flex-1 space-y-12 animate-in fade-in duration-500 relative">
      <style>
        {`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      {/* Upload Progress Modal Overlay */}
      {uploadState.open && uploadState.status !== "complete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 tinted-shadow border border-white/20 animate-in zoom-in-95 fade-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors ${uploadState.status === 'processing' ? 'bg-amber-100' : 'bg-primary/10'}`}>
                <span className={`material-symbols-outlined text-3xl ${uploadState.status === 'processing' ? 'text-amber-500 animate-spin' : 'text-primary animate-bounce'}`}>
                  {uploadState.status === 'processing' ? 'sync' : 'cloud_upload'}
                </span>
              </div>
              <h3 className="text-xl font-bold font-headline text-on-surface mb-1">
                {uploadState.status === 'processing' ? 'Processing Dataset' : 'Importing Dataset'}
              </h3>
              <p className="text-on-surface-variant text-sm mb-8">{uploadState.fileName} ({uploadState.fileSize})</p>

              <div className="w-full space-y-3 mb-8">
                <div className="flex justify-between text-xs font-bold font-label text-on-surface">
                  <span>Progress</span>
                  <span>{uploadState.progress}%</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${uploadState.status === 'processing' ? 'bg-amber-500' : 'signature-glow'}`} style={{ width: `${uploadState.progress}%` }}></div>
                </div>
                <p className="text-[10px] text-outline font-medium">
                  {uploadState.status === 'processing' ? 'Validating records...' : 'Uploading secure file...'}
                </p>
              </div>

              <button
                onClick={() => setUploadState({ open: false, fileName: "", fileSize: "", progress: 0, status: "idle" })}
                className="w-full py-3 bg-surface-container-low text-on-surface font-bold rounded-lg text-sm hover:bg-surface-container-high transition-colors"
                disabled={uploadState.status === 'processing'}
              >
                Cancel Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion state of modal */}
      {uploadState.open && uploadState.status === "complete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 tinted-shadow border border-white/20 animate-in zoom-in-95 fade-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-tertiary/10 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-tertiary text-3xl">check_circle</span>
              </div>
              <h3 className="text-xl font-bold font-headline text-on-surface mb-1">Import Successful</h3>
              <p className="text-on-surface-variant text-sm mb-8">Your data has been successfuly uploaded and parsed. It is being processed right now.</p>
              <button
                onClick={() => {
                  setUploadState({ open: false, fileName: "", fileSize: "", progress: 0, status: "idle" });
                  setFile(null);
                  setDatasetName("");
                  setEmailColumn("");
                  setColumns([]);
                  setPreviewRows([]);
                  setPreviewLoading(false);
                  setParseError(null);
                }}
                className="w-full py-3.5 signature-glow text-white font-bold rounded-lg text-sm hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header Section */}
      <section className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-2">
          <span className="text-primary font-semibold tracking-wider text-xs uppercase font-label">Step 01 / Data Preparation</span>
          <h2 className="text-4xl font-extrabold text-on-surface font-headline tracking-tight">Import Your Data</h2>
          <p className="text-on-surface-variant max-w-2xl text-lg leading-relaxed">
            Upload your source materials.
          </p>
        </div>
      </section>

      {/* Bento Grid Import Options */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* CSV Upload Zone (Col 7) */}
        <div
          className={`md:col-span-7 bg-surface-container-low rounded-xl p-8 transition-all duration-300 relative overflow-hidden border ${isDragging ? "border-primary ring-2 ring-primary ring-inset bg-surface-container-high" : "border-transparent hover:border-primary/20"} ${!file ? "min-h-[320px] flex flex-col justify-center" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            handleFile(e.dataTransfer.files[0])
          }}
        >
          {/* Background Icon mapping when empty */}
          {!file && (
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <span className="material-symbols-outlined text-9xl">upload_file</span>
            </div>
          )}

          {!file ? (
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6 tinted-shadow transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-primary text-3xl">cloud_upload</span>
              </div>
              <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Upload CSV File</h3>
              <p className="text-on-surface-variant text-sm mb-8 max-w-xs">Drag and drop your spreadsheet here or click to browse files from your local drive.</p>
              <label className="cursor-pointer">
                <input className="hidden" type="file" accept=".csv" onChange={(e) => handleFile(e.target.files?.[0] as File)} />
                <span className="px-8 py-3 signature-glow text-white font-semibold rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">add</span> Select CSV File
                </span>
              </label>
              <p className="mt-4 text-[10px] text-outline font-medium uppercase tracking-widest">Max file size: 100MB</p>
            </div>
          ) : (
            <div className="flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center tinted-shadow text-primary">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <div className="min-w-0 pr-4">
                  <h3 className="text-lg font-bold font-headline text-on-surface truncate pr-2" title={file.name}>{file.name}</h3>
                  <p className="text-xs text-outline font-medium uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready for mapping</p>
                </div>
                <button onClick={() => { setFile(null); setParseError(null); }} className="ml-auto flex-shrink-0 text-slate-400 hover:text-error transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {parseError && (
                <div className="mb-8 p-4 rounded-xl bg-error/10 text-error text-sm flex items-start gap-4 border border-error/20">
                  <span className="material-symbols-outlined mt-0.5">error</span>
                  <div>
                    <h4 className="font-bold text-[13px] uppercase tracking-widest mb-1 opacity-80">Parsing Failed</h4>
                    <p>{parseError}</p>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest font-label block">Dataset Name</label>
                  <input
                    className="w-full bg-white border-outline-variant rounded-lg text-sm px-4 py-2.5 focus:ring-primary focus:border-primary outline-none"
                    placeholder="Enter name..."
                    type="text"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest font-label block">Email Column</label>
                  <select
                    className="w-full bg-white border-outline-variant rounded-lg text-sm px-4 py-2.5 focus:ring-primary focus:border-primary outline-none"
                    value={emailColumn}
                    onChange={(e) => setEmailColumn(e.target.value)}
                  >
                    <option value="">Select email column</option>
                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={uploadFile}
                disabled={!emailColumn || !datasetName.trim()}
                className="w-full py-3.5 signature-glow text-white font-bold rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">upload</span> Upload Dataset
              </button>
            </div>
          )}
        </div>

        {/* Recent Datasets (Col 5) */}
        <div className="md:col-span-5 flex flex-col h-[400px] md:h-full bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden tinted-shadow">
          <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between shrink-0 bg-surface-container-lowest">
            <h3 className="font-bold font-headline text-on-surface text-sm uppercase tracking-wider">Recent Datasets</h3>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[340px] scrollbar-hide">
            {isLoading && [...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border-b border-outline-variant/10">
                <div className="h-10 rounded-lg bg-surface-container-low animate-pulse w-full"></div>
              </div>
            ))}

            {!isLoading && datasets.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-8">
                No previous datasets.
              </p>
            )}

            {datasets.map(ds => (
              <div key={ds.id} className="p-4 border-b border-outline-variant/10 hover:bg-surface-container-low cursor-pointer transition-colors group">
                <div className="flex items-center gap-4">
                  {ds.status === 'completed' ? (
                    <div className="w-10 h-10 rounded-lg bg-primary-fixed flex flex-shrink-0 items-center justify-center text-on-primary-fixed">
                      <span className="material-symbols-outlined text-xl">grid_on</span>
                    </div>
                  ) : ds.status === 'processing' ? (
                    <div className="w-10 h-10 rounded-lg bg-secondary-container flex flex-shrink-0 items-center justify-center text-on-secondary-container">
                      <span className="material-symbols-outlined text-xl animate-spin">sync</span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-error-container flex flex-shrink-0 items-center justify-center text-on-error-container">
                      <span className="material-symbols-outlined text-xl">error_outline</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-sm font-bold text-on-surface truncate pr-2">{ds.name}</h4>
                      {ds.status === 'completed' && <span className="px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed-variant text-[9px] font-extrabold rounded-full uppercase">Completed</span>}
                      {ds.status === 'processing' && <span className="px-2 py-0.5 bg-primary-fixed text-on-primary-fixed-variant text-[9px] font-extrabold rounded-full uppercase animate-pulse">Processing</span>}
                      {ds.status === 'failed' && <span className="px-2 py-0.5 bg-error-container text-on-error-container text-[9px] font-extrabold rounded-full uppercase font-mono">Failed</span>}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-on-surface-variant font-medium">{ds.rows || 0} rows • {ds.date}</p>
                      {ds.status !== 'failed' ? (
                        <button onClick={(e) => { e.stopPropagation(); handlePreview(ds.id); }} className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-primary outline-none">
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                      ) : (
                        <button className="text-error">
                          <span className="material-symbols-outlined text-lg">info</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Preview Section */}
      {columns.length > 0 && (
        <section ref={previewRef as React.RefObject<HTMLDivElement>} className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">visibility</span>
              <h3 className="text-lg font-bold font-headline text-on-surface">Data Preview: <span className="text-on-surface-variant font-medium">{datasetName}</span></h3>
              <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-xs rounded-full">Showing first {previewRows.length} rows</span>
            </div>
          </div>

          {previewLoading ? (
            <div className="w-full h-48 rounded-xl border border-outline-variant/30 bg-surface-container-low animate-pulse"></div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/30 tinted-shadow max-w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-surface-container-low">
                    {columns.map((c, i) => (
                      <th key={i} className="px-8 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest font-label border-b border-outline-variant/20 whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {previewRows.map((row, i) => (
                    <tr key={i} className="hover:bg-surface-container-low transition-colors group">
                      {row.map((cell, j) => (
                        <td key={j} className="px-8 py-5 text-sm font-medium text-on-surface truncate max-w-[200px]">{cell}</td>
                      ))}

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
