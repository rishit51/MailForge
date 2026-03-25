import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccounts } from '../../integrations/api/integrations';
import { useAllDatasets, useCreateDraft, useUpdateDraft, useScheduleJob, useJob } from '../api/campaigns';
import { useDatasetPreview } from '../../datasets/api/datasets';

// Simple frontend template engine matching backend
function renderTemplateFrontend(template: string, data: Record<string, any>) {
  if (!template) return "";
  if (!data || Object.keys(data).length === 0) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] !== undefined ? String(data[key]) : "";
  });
}

function getPreviewData(datasetPreviewData: any, sampleIndex: number): Record<string, any> {
  if (!datasetPreviewData || !datasetPreviewData.rows || datasetPreviewData.rows.length === 0) return {};
  const row = datasetPreviewData.rows[sampleIndex] || datasetPreviewData.rows[0];
  const schema = datasetPreviewData.json_schema;

  if (Array.isArray(schema) && Array.isArray(row)) {
    const data: Record<string, any> = {};
    schema.forEach((col: string, i: number) => {
      data[col] = String(row[i]);
    });
    return data;
  }

  if (!Array.isArray(row) && typeof row === 'object') {
    return row;
  }
  return {};
}

export function CampaignBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  // React Query Hooks
  const { data: accounts = [] } = useAccounts();
  const { data: datasets = [] } = useAllDatasets();
  const { data: existingJob, isLoading: isLoadingJob } = useJob(isEditMode ? Number(id) : null);

  const createDraftMutation = useCreateDraft();
  const updateDraftMutation = useUpdateDraft();
  const scheduleJobMutation = useScheduleJob();

  // Form State
  const [draftId, setDraftId] = useState<number | null>(isEditMode ? Number(id) : null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");

  // Modals & UI State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(false);
  const [previewSampleIndex, setPreviewSampleIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch preview rows for the selected dataset
  const { data: datasetPreview } = useDatasetPreview(selectedDatasetId ? Number(selectedDatasetId) : null);

  // Hydrate form if editing
  useEffect(() => {
    if (existingJob && isEditMode) {
      if (existingJob.dataset_id) setSelectedDatasetId(existingJob.dataset_id);
      if (existingJob.email_account_id) setSelectedAccountId(existingJob.email_account_id);
      if (existingJob.subject_template) setSubjectTemplate(existingJob.subject_template);
      if (existingJob.prompt_template) setBodyTemplate(existingJob.prompt_template);
    }
  }, [existingJob, isEditMode]);

  // Derived Data
  const selectedAccount = accounts.find((a: any) => a.id === selectedAccountId);
  const selectedDataset = datasets.find((d: any) => d.id === selectedDatasetId);

  const sampleData = getPreviewData(datasetPreview, previewSampleIndex);
  const availableVariables = datasetPreview?.json_schema || [];

  const renderedSubject = renderTemplateFrontend(subjectTemplate, sampleData);
  const renderedBody = renderTemplateFrontend(bodyTemplate, sampleData);

  // Handlers
  const insertVariable = (variable: string) => {
    setBodyTemplate(prev => prev + `{{${variable}}}`);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const payload = {
        dataset_id: selectedDatasetId,
        email_account_id: selectedAccountId,
        subject_template: subjectTemplate,
        prompt_template: bodyTemplate,
      };

      if (draftId) {
        await updateDraftMutation.mutateAsync({ id: draftId, payload });
      } else {
        const res = await createDraftMutation.mutateAsync(payload);
        setDraftId(res.job_id);
        // Silently update URL if this is a new draft
        window.history.replaceState({}, '', `/campaigns/${res.job_id}/edit`);
      }
    } catch (err: any) {
      setErrorMsg("Failed to save draft. " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedAccountId || !selectedDatasetId || !subjectTemplate || !bodyTemplate) {
      setErrorMsg("Please select an account, dataset, and provide both subject and body templates before scheduling.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      // Step 1: Ensure it's saved latest
      const payload = {
        dataset_id: selectedDatasetId,
        email_account_id: selectedAccountId,
        subject_template: subjectTemplate,
        prompt_template: bodyTemplate,
      };

      let currentDraftId = draftId;
      if (!currentDraftId) {
        const res = await createDraftMutation.mutateAsync(payload);
        currentDraftId = res.job_id;
        setDraftId(currentDraftId);
      } else {
        await updateDraftMutation.mutateAsync({ id: currentDraftId, payload });
      }

      // Step 2: Schedule it
      await scheduleJobMutation.mutateAsync({
        id: currentDraftId!,
        payload: { throttle_per_minute: 60 } // Default throttle for now
      });

      // Redirect to listing (to be built)
      navigate('/');
    } catch (err: any) {
      setErrorMsg("Failed to schedule campaign. " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditMode && isLoadingJob) {
    return <div className="p-12 text-center text-on-surface-variant">Loading Draft...</div>;
  }

  return (
    <>
      <div className="animate-in fade-in duration-500 pb-24">
        <div className="mb-12">
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight mb-2">Create Your Campaign</h2>
          <div className="flex items-center gap-2 font-label text-sm text-on-surface-variant">
            <span>Drafts</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="font-semibold text-primary">{draftId ? `Draft Job #${draftId}` : 'New Editorial Broadcast'}</span>
          </div>

          {errorMsg && (
            <div className="mt-4 p-4 rounded-lg bg-error-container text-error text-sm font-bold">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-8 items-start">

          {/* Left: Editor & Config (8 Columns) */}
          <div className="col-span-12 lg:col-span-7 space-y-8">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Delivery Service */}
              <section className="bg-surface-container-low rounded-xl p-6">
                <h3 className="font-headline text-[10px] font-bold text-on-surface uppercase tracking-widest mb-4">Delivery Service</h3>
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm h-32 flex flex-col justify-between">
                  {selectedAccount ? (
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 ${selectedAccount.provider === 'gmail' ? 'bg-primary-fixed text-primary' : 'bg-surface-container-highest text-slate-600'} rounded-lg flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-xl">{selectedAccount.provider === 'gmail' ? 'mail' : 'send'}</span>
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-on-surface truncate pr-2">{selectedAccount.email_address}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase">{selectedAccount.provider}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-on-surface-variant opacity-70">
                      <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">help_outline</span>
                      </div>
                      <p className="text-sm font-bold">No Account Selected</p>
                    </div>
                  )}

                  <button onClick={() => setIsAccountModalOpen(true)} className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-primary text-primary text-xs font-bold hover:bg-primary-fixed transition-colors mt-2">
                    <span className="material-symbols-outlined text-base">sync</span>
                    {selectedAccount ? "Change Account" : "Select Account"}
                  </button>
                </div>
              </section>

              {/* Target Dataset */}
              <section className="bg-surface-container-low rounded-xl p-6">
                <h3 className="font-headline text-[10px] font-bold text-on-surface uppercase tracking-widest mb-4">Target Dataset</h3>
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm h-32 flex flex-col justify-between">
                  {selectedDataset ? (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-tertiary-fixed text-tertiary rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">database</span>
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-on-surface truncate pr-2">{selectedDataset.name}</p>
                        <p className="text-[10px] text-on-surface-variant">{selectedDataset.rows || 0} Rows</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-on-surface-variant opacity-70">
                      <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">table_chart</span>
                      </div>
                      <p className="text-sm font-bold">No Dataset Selected</p>
                    </div>
                  )}

                  <button onClick={() => setIsDatasetModalOpen(true)} className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-primary text-primary text-xs font-bold hover:bg-primary-fixed transition-colors mt-2">
                    <span className="material-symbols-outlined text-base">file_open</span>
                    {selectedDataset ? "Change Dataset" : "Select Dataset"}
                  </button>
                </div>
              </section>
            </div>

            {/* Template Editor */}
            <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/10">
              <div className="bg-surface-container-high px-6 py-4 flex items-center justify-between flex-wrap gap-4">
                <div className="flex gap-4">
                  <button className="p-1 hover:text-primary transition-colors"><span className="material-symbols-outlined">format_bold</span></button>
                  <button className="p-1 hover:text-primary transition-colors"><span className="material-symbols-outlined">format_italic</span></button>
                  <button className="p-1 hover:text-primary transition-colors"><span className="material-symbols-outlined">link</span></button>
                  <div className="w-[1px] bg-outline-variant mx-1"></div>
                  <button className="p-1 hover:text-primary transition-colors"><span className="material-symbols-outlined">format_list_bulleted</span></button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter hidden sm:inline">Insert Variables</span>
                  <div className="flex gap-1 flex-wrap">
                    {Array.isArray(availableVariables) && availableVariables.map((col: string) => (
                      <button
                        key={col}
                        onClick={() => insertVariable(col)}
                        className="bg-primary-fixed text-on-primary-fixed px-2 py-1 rounded text-[10px] font-bold hover:bg-primary-fixed-dim transition-colors"
                      >
                        {`{{${col}}}`}
                      </button>
                    ))}
                    {(!availableVariables || availableVariables.length === 0) && (
                      <span className="text-xs text-outline italic">Select a dataset first</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 block">Subject Line</label>
                  <input
                    className="w-full text-xl font-headline font-bold border-none p-0 focus:ring-0 placeholder:text-surface-dim outline-none"
                    type="text"
                    value={subjectTemplate}
                    onChange={(e) => setSubjectTemplate(e.target.value)}
                    placeholder="Quick thought on {{Company}}'s outreach strategy"
                  />
                </div>
                <div className="h-[1px] bg-surface-container"></div>
                <div className="min-h-[400px]">
                  <label className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 block">Email Content</label>
                  <textarea
                    className="w-full min-h-[350px] border-none p-0 focus:ring-0 text-on-surface leading-relaxed resize-none outline-none"
                    placeholder="Hi {{Name}},\n\nI've been following the recent updates at {{Company}}...\n\nBest regards,\nEditorial Team"
                    value={bodyTemplate}
                    onChange={(e) => setBodyTemplate(e.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right: Live Preview (5 Columns) */}
          <div className="col-span-12 lg:col-span-5 sticky top-24">
            <div className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-headline text-sm font-bold text-on-surface uppercase tracking-widest">Real-time Preview</h3>
                <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1 rounded-full text-[10px] font-bold text-on-surface-variant border border-outline-variant/20 shadow-sm">
                  <span className={`w-2 h-2 rounded-full ${selectedDataset ? 'bg-tertiary animate-pulse' : 'bg-surface-dim'}`}></span>
                  {selectedDataset ? 'Live Syncing' : 'Awaiting Dataset'}
                </div>
              </div>

              {/* Device Mockup */}
              <div className="bg-white rounded-xl shadow-xl shadow-blue-900/5 overflow-hidden border border-outline-variant/10">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                  </div>
                  <div className="bg-white rounded-md text-[10px] text-slate-400 flex-1 py-1 px-3 border border-slate-100 italic truncate">
                    Sample: {sampleData[selectedDataset?.email_column || 'email'] || 'recipient@domain.com'}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      From: {selectedAccount ? selectedAccount.email_address : 'outreach@analyst.so'}
                    </p>
                    <h4 className="text-sm font-bold text-slate-900 break-words">{renderedSubject || 'Subject Line...'}</h4>
                  </div>
                  <div className="h-[1px] bg-slate-100"></div>
                  <div className="text-sm text-slate-700 leading-relaxed space-y-4 font-body whitespace-pre-wrap break-words">
                    {renderedBody || 'Email body preview will appear here...'}
                  </div>
                </div>
              </div>

              {/* Data Sample Switcher */}
              {datasetPreview && datasetPreview.rows && datasetPreview.rows.length > 0 && (
                <div className="mt-8 pt-6 border-t border-outline-variant/20">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 block">Test Sample Selection</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {datasetPreview.rows.map((_: any, idx: number) => {
                      const row = getPreviewData(datasetPreview, idx);
                      // Try to guess a name identifying this row, fallback to email
                      const emailHeader = selectedDataset?.email_column || 'email';
                      const nameFallback = row['Name'] || row['name'] || row['First Name'] || row[emailHeader];

                      return (
                        <div
                          key={idx}
                          onClick={() => setPreviewSampleIndex(idx)}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer group ${previewSampleIndex === idx ? 'bg-surface-container-lowest border-primary ring-2 ring-primary/10' : 'bg-surface-container-low/50 border-outline-variant/30 hover:border-primary'}`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className={`w-8 h-8 rounded-full ${previewSampleIndex === idx ? 'bg-primary-fixed text-primary' : 'bg-surface-container-highest text-on-surface-variant'} flex items-center justify-center font-bold text-xs shrink-0 uppercase`}>
                              {String(nameFallback).slice(0, 2) || "?"}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold truncate">{String(nameFallback)}</p>
                              <p className="text-[10px] text-on-surface-variant truncate">Row {idx + 1}</p>
                            </div>
                          </div>
                          <span className={`material-symbols-outlined text-sm shrink-0 ${previewSampleIndex === idx ? 'text-primary' : 'text-slate-300 group-hover:text-primary transition-colors'}`}>
                            {previewSampleIndex === idx ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* Contextual FAB */}
      <div className="fixed bottom-8 right-8 flex gap-4 z-40">
        <button
          onClick={handleSaveDraft}
          disabled={isSaving}
          className="bg-surface-container-lowest text-on-surface px-6 py-3 rounded-full font-bold shadow-lg border border-outline-variant/20 flex items-center gap-2 hover:bg-surface-container-high transition-all active:scale-95 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">{isSaving ? 'sync' : 'save'}</span>
          {isSaving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          onClick={handleFinalize}
          disabled={isSaving}
          className="bg-gradient-to-br from-primary to-primary-container text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-primary/25 flex items-center gap-3 hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
        >
          <span className="material-symbols-outlined">send_and_archive</span>
          Finalize & Schedule
        </button>
      </div>

      {/* Select Delivery Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold">Select Delivery Account</h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {accounts.map((acc: any) => (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${selectedAccountId === acc.id ? 'border-primary bg-primary-fixed/5 ring-2 ring-primary' : 'border-outline-variant/30 hover:border-primary'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-outline-variant/20 shadow-sm">
                        <span className={`material-symbols-outlined ${acc.provider === 'gmail' ? 'text-primary' : 'text-slate-500'}`}>{acc.provider === 'gmail' ? 'mail' : 'send'}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{acc.email_address}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-on-surface-variant uppercase font-bold">{acc.provider}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className={`text-[10px] font-bold uppercase ${acc.is_active ? 'text-tertiary' : 'text-error'}`}>{acc.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined ${selectedAccountId === acc.id ? 'text-primary' : 'text-slate-300 group-hover:text-primary transition-colors'}`}>
                      {selectedAccountId === acc.id ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <div className="p-4 text-center text-on-surface-variant italic">No accounts found. Add one in the Integrations page.</div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant/10 flex gap-4">
              <button onClick={() => navigate('/integrations')} className="flex-1 bg-surface-container-low text-on-surface font-bold py-3 rounded-lg hover:bg-surface-container-high transition-colors">Manage Accounts</button>
              <button onClick={() => setIsAccountModalOpen(false)} className="flex-1 bg-primary text-white text-center font-bold py-3 rounded-lg shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">Confirm Selection</button>
            </div>
          </div>
        </div>
      )}

      {/* Select Dataset Modal */}
      {isDatasetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold">Select Target Dataset</h3>
              <button onClick={() => setIsDatasetModalOpen(false)} className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {datasets.map((ds: any) => (
                  <div
                    key={ds.id}
                    onClick={() => {
                      setSelectedDatasetId(ds.id);
                      setPreviewSampleIndex(0); // Reset sample strictly
                    }}
                    className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${selectedDatasetId === ds.id ? 'border-primary bg-primary-fixed/5 ring-2 ring-primary' : 'border-outline-variant/30 hover:border-primary'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-outline-variant/20 shadow-sm">
                        <span className="material-symbols-outlined text-slate-500">table_chart</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{ds.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-on-surface-variant uppercase font-bold">{ds.rows || 0} Rows</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="text-[10px] text-on-surface-variant font-bold uppercase">{ds.date || new Date().toISOString().split('T')[0]}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined ${selectedDatasetId === ds.id ? 'text-primary' : 'text-slate-300 group-hover:text-primary transition-colors'}`}>
                      {selectedDatasetId === ds.id ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </div>
                ))}
                {datasets.length === 0 && (
                  <div className="p-4 text-center text-on-surface-variant italic">No datasets found. Upload one in Data Sources.</div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant/10 flex gap-4">
              <button onClick={() => navigate('/datasets')} className="flex-1 bg-surface-container-low text-on-surface font-bold py-3 rounded-lg hover:bg-surface-container-high transition-colors">Upload New Data</button>
              <button onClick={() => setIsDatasetModalOpen(false)} className="flex-1 bg-primary text-white text-center font-bold py-3 rounded-lg shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">Confirm Dataset</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
