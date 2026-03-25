import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  integrationsApi,
  useAccounts,
  useDeleteAccount,
  useCreateSendgrid,
  useUpdateSendgrid
} from '../api/integrations';

export function Integrations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: accounts = [], isLoading, refetch } = useAccounts();
  const deleteMutation = useDeleteAccount();
  const createSendgridMutation = useCreateSendgrid();
  const updateSendgridMutation = useUpdateSendgrid();

  // Modals state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'gmail' | 'sendgrid'>('gmail');

  // Sendgrid create form state
  const [sgEmail, setSgEmail] = useState('');
  const [sgSenderName, setSgSenderName] = useState('');
  const [sgApiKey, setSgApiKey] = useState('');
  const [sgError, setSgError] = useState<string | null>(null);

  // Sendgrid update form state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateAccountId, setUpdateAccountId] = useState<number | null>(null);
  const [updateApiKey, setUpdateApiKey] = useState('');

  // Webhook Credentials state
  const [isCredsModalOpen, setIsCredsModalOpen] = useState(false);
  const [credsLoading, setCredsLoading] = useState(false);
  const [credsData, setCredsData] = useState<any>(null);
  const [credsError, setCredsError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      searchParams.delete('connected');
      setSearchParams(searchParams, { replace: true });
      refetch();
    }
  }, [searchParams, setSearchParams, refetch]);

  const handleGmailConnect = async () => {
    try {
      setSgError(null);
      const url = await integrationsApi.gmailAuth();
      if (!url) throw new Error("Missing auth URL");
      window.location.href = url;
    } catch (err) {
      setSgError("Could not start Google login. Please try again.");
    }
  };

  const handleSendgridConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSgError(null);
      await createSendgridMutation.mutateAsync({
        email_address: sgEmail,
        name: sgSenderName,
        config: { api_key: sgApiKey }
      });
      setIsConnectModalOpen(false);
      setSgEmail('');
      setSgSenderName('');
      setSgApiKey('');
    } catch (err: any) {
      setSgError(err.message || "Failed to connect. Check API key.");
    }
  };

  const handleSendgridUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateAccountId) return;
    try {
      setSgError(null);
      await updateSendgridMutation.mutateAsync({
        id: updateAccountId,
        payload: { config: { api_key: updateApiKey } }
      });
      setIsUpdateModalOpen(false);
      setUpdateApiKey('');
      setUpdateAccountId(null);
    } catch (err: any) {
      setSgError(err.message || "Failed to update API key.");
    }
  };

  const openUpdateModal = (accountId: number) => {
    setUpdateAccountId(accountId);
    setUpdateApiKey('');
    setSgError(null);
    setIsUpdateModalOpen(true);
  };

  const handleViewCredentials = async (accountId: number) => {
    setCredsData(null);
    setCredsError(null);
    setIsCredsModalOpen(true);
    setCredsLoading(true);
    try {
      const data = await integrationsApi.generateSendgridCredentials(accountId);
      setCredsData(data);
    } catch (err: any) {
      setCredsError(err.message || "Failed to generate credentials.");
    } finally {
      setCredsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const activeCount = accounts.filter((a: any) => a.is_active).length;

  return (
    <div className="pt-8 pb-12 animate-in fade-in duration-500">

      {/* Header Section */}
      <section className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface mb-2">Email Accounts</h1>
          <p className="text-on-surface-variant max-w-lg">Manage your connected providers and webhook delivery systems for automated editorial distribution.</p>
        </div>
        <button
          onClick={() => {
            setSgError(null);
            setIsConnectModalOpen(true);
          }}
          className="signature-glow text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 tinted-shadow hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          Connect New Account
        </button>
      </section>

      {/* Metrics Blade */}
      <section className="mb-12 bg-surface-container-lowest rounded-xl p-8 tinted-shadow border-l-4 border-primary">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <div>
            <p className="text-[0.6875rem] font-label text-on-surface-variant uppercase tracking-widest mb-1">Connected Channels</p>
            <p className="text-3xl font-headline font-bold text-on-surface">{isLoading ? "-" : activeCount}</p>
          </div>
          <div>
            <p className="text-[0.6875rem] font-label text-on-surface-variant uppercase tracking-widest mb-1">Queue Status</p>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-tertiary"></span>
              <p className="text-xl font-headline font-semibold text-tertiary">All Systems Operational</p>
            </div>
          </div>
        </div>
      </section>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {isLoading && (
          <div className="bg-surface-container-low animate-pulse h-64 rounded-xl"></div>
        )}

        {accounts.map((acc: any) => {
          const isGmail = acc.provider === 'gmail';
          const isActive = acc.is_active;

          return (
            <div key={acc.id} className={`bg-surface-container-lowest p-6 rounded-xl tinted-shadow hover:bg-surface-container-low transition-colors group ${!isActive ? 'border-2 border-dashed border-outline-variant/30' : ''}`}>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isGmail ? 'bg-red-50' : (isActive ? 'bg-blue-50' : 'bg-surface-container')}`}>
                  {isGmail ? (
                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDxI6s-pZHhYNGeQdKwGL2n_DmBUC8mPgw_7s72zBhWT-KH7sB7bHzqnIzipoxJW7pyokLLBWb4J2g18cKRRBzyWlL8Qc9d3GIlx_U8hIaLG1pE9awqDsE8ZHDVuQwOKrr4ntom1rhZcUZECqrObyh3nFNqsUu00h513ydGTaVMAzmJp44Brev_Y4lbTlKW45NQhKo4E1iz5WWG76bFlNQ-LmQnaDNgWAFswcK-3RYc6LMHTAg3p93Z4erormG8Q8Kw-JIT4e72f1Y_" alt="Gmail" className="w-8 h-8" />
                  ) : (
                    <span className={`material-symbols-outlined text-3xl ${isActive ? 'text-primary' : 'text-outline'}`}>send</span>
                  )}
                </div>
                {isActive ? (
                  <span className="bg-tertiary/10 text-tertiary px-2 py-1 rounded text-[0.6875rem] font-bold">Connected</span>
                ) : (
                  <span className="bg-surface-container-highest text-on-surface-variant px-2 py-1 rounded text-[0.6875rem] font-bold">Inactive</span>
                )}
              </div>

              <div className="mb-8">
                <h3 className="font-headline font-bold text-lg mb-1 truncate" title={acc.email_address}>{acc.email_address}</h3>
                <p className="text-on-surface-variant text-xs">{isGmail ? 'Gmail (OAuth)' : 'SendGrid API'}</p>
              </div>

              {!isGmail && isActive && (
                <div className="space-y-2 mb-6">
                  <button onClick={() => handleViewCredentials(acc.id)} className="w-full bg-surface-container-high text-on-secondary-container py-2.5 rounded-lg text-xs font-bold hover:bg-secondary-container transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">key</span>
                    {acc.has_oauth_credentials ? "View Webhook Credentials" : "Generate Webhook Credentials"}
                  </button>
                </div>
              )}

              {(!isActive && !isGmail) && (
                <div className="space-y-2 mb-6">
                  <button onClick={() => openUpdateModal(acc.id)} className="w-full bg-primary/5 text-primary py-2.5 rounded-lg text-xs font-bold hover:bg-primary/10 transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Update API Key
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4">
                <button
                  onClick={() => deleteMutation.mutate(acc.id)}
                  disabled={deleteMutation.isPending}
                  className="text-error text-xs font-semibold hover:underline opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  Disconnect
                </button>

                {isGmail ? (
                  <button onClick={handleGmailConnect} className="text-primary text-xs font-semibold flex items-center gap-1">
                    Reconnect <span className="material-symbols-outlined text-sm">refresh</span>
                  </button>
                ) : (
                  isActive ? (
                    <button onClick={() => openUpdateModal(acc.id)} className="text-primary text-xs font-semibold flex items-center gap-1">
                      Manage API <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  ) : (
                    <span className="text-xs text-on-surface-variant">Update key to reconnect</span>
                  )
                )}
              </div>
            </div>
          );
        })}

        {!isLoading && accounts.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 py-16 text-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/50">
            <span className="material-symbols-outlined text-4xl text-outline mb-4">mail</span>
            <h3 className="text-lg font-headline font-bold mb-2">No accounts connected</h3>
            <p className="text-on-surface-variant text-sm mb-6">Connect an email provider to start sending automated campaigns.</p>
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="bg-surface-container-high text-on-surface px-6 py-2 rounded-lg font-bold hover:bg-surface-container-highest transition-colors"
            >
              Get Started
            </button>
          </div>
        )}
      </div>

      {/* Connect Email Account Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
              <h2 className="text-2xl font-headline font-bold text-on-surface">Connect Email Account</h2>
              <button onClick={() => setIsConnectModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex border-b border-outline-variant/10">
              <button
                onClick={() => setActiveTab('gmail')}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'gmail' ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-on-surface-variant hover:bg-surface-container'}`}
              >
                Gmail (OAuth)
              </button>
              <button
                onClick={() => setActiveTab('sendgrid')}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'sendgrid' ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-on-surface-variant hover:bg-surface-container'}`}
              >
                SendGrid API
              </button>
            </div>

            <div className="p-10">
              {activeTab === 'gmail' && (
                <div className="text-center animate-in fade-in slide-in-from-left-4">
                  <div className="mb-8 flex justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-[#f6fafe] flex items-center justify-center shadow-inner">
                      <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKuYfkn_4FREf7ZrUrcSMUP12dmNFZvprOxps8hc04Z0-7yKi_K2nyb2HEKpWXvRkECX7lUJ4gvnyCaL9XcjtJwxbwQNBETWkzXEq3SQZIapRSCRyCh0SVHFInlDp94pmPmEKarI90SkVuwcGs76OrmtBdibB443grwOuniQ9kl8AcSC7iS4FhJefriI2dlPdlr1Uw1nPtGwXe-x5AhNUvGmkZUp8fpbiPeFlYADErlYUF7NI1v_RaEPkAMQofZbFRDU9C0-QCUr_Y" alt="Gmail" className="w-12 h-12" />
                    </div>
                  </div>
                  <p className="text-on-surface-variant text-sm mb-10 leading-relaxed px-6">
                    Connect your Google workspace account to enable automated draft creation and sent-folder tracking directly from the dashboard.
                  </p>

                  {sgError && (
                    <div className="mb-6 p-3 rounded-md bg-error-container text-error text-sm">
                      {sgError}
                    </div>
                  )}

                  <button
                    onClick={handleGmailConnect}
                    className="w-full flex items-center justify-center gap-3 border border-outline-variant/50 py-3.5 rounded-lg hover:bg-surface-container transition-all group"
                  >
                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9q9m9UTDmRYtEIYGvj3y11UEoqzV8CzMq3_JRgxlu0xCBYJesbKyJ9WTjUvN0PS6vU6v2A8YEG1IiGGX0J53YpzkQQP0TXK34t56SgsVro26fBJqmwMSRaHzqFH9r-Ny6lpG7zizEcrQ8dKasRkDVoW5r9X0AdBsW6Q5KvaF78V4JDJGHifBp1pTJDmluR7IaTCfTY3U0CQx1wEvFdaF-2TJHW6HLJrv2UYMl2ZhLdoL5su2xgBx-tdgPx0cCw8i4jB5y-vqXmEZ6" alt="Google" className="w-5 h-5" />
                    <span className="font-headline font-bold text-on-surface">Continue with Google</span>
                  </button>
                  <p className="mt-6 text-[0.625rem] text-outline uppercase tracking-widest">Secure OAuth 2.0 Connection</p>
                </div>
              )}

              {activeTab === 'sendgrid' && (
                <form onSubmit={handleSendgridConnect} className="animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-4 mb-8">
                    {sgError && (
                      <div className="p-3 rounded-md bg-error-container text-error text-sm">
                        {sgError}
                      </div>
                    )}

                    <div>
                      <label className="text-[0.6875rem] font-label text-on-surface-variant uppercase tracking-widest block mb-1">Email <span className="text-error">*</span></label>
                      <input
                        type="email"
                        required
                        value={sgEmail}
                        onChange={(e) => setSgEmail(e.target.value)}
                        placeholder="sender@domain.com"
                        className="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[0.6875rem] font-label text-on-surface-variant uppercase tracking-widest block mb-1">Sender Name (Optional)</label>
                      <input
                        type="text"
                        value={sgSenderName}
                        onChange={(e) => setSgSenderName(e.target.value)}
                        placeholder="Marketing Team"
                        className="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[0.6875rem] font-label text-on-surface-variant uppercase tracking-widest block mb-1">API Key <span className="text-error">*</span></label>
                      <input
                        type="password"
                        required
                        value={sgApiKey}
                        onChange={(e) => setSgApiKey(e.target.value)}
                        placeholder="SG.xxxxxxxxxxxxxxxx"
                        className="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={createSendgridMutation.isPending}
                    className="w-full py-3.5 signature-glow text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {createSendgridMutation.isPending ? "Connecting..." : "Connect SendGrid"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update API Key Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-xl overflow-hidden shadow-2xl flex flex-col p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-headline font-bold text-on-surface">Update API Key</h2>
              <button onClick={() => setIsUpdateModalOpen(false)} className="text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSendgridUpdate} className="space-y-6">
              {sgError && (
                <div className="p-3 rounded-md bg-error-container text-error text-sm">{sgError}</div>
              )}

              <div>
                <label className="text-[0.6875rem] font-label text-on-surface-variant uppercase tracking-widest block mb-1">New API Key</label>
                <input
                  type="password"
                  required
                  value={updateApiKey}
                  onChange={(e) => setUpdateApiKey(e.target.value)}
                  placeholder="SG.xxxxxxxxxxxxxxxx"
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={updateSendgridMutation.isPending}
                className="w-full py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {updateSendgridMutation.isPending ? "Updating..." : "Save API Key"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Webhook Credentials Drawer */}
      {isCredsModalOpen && (
        <div className="fixed bottom-12 right-12 z-[70]">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-primary/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-primary/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">security</span>
                <h2 className="text-lg font-headline font-bold text-on-surface">Webhook Credentials</h2>
              </div>
              <button onClick={() => setIsCredsModalOpen(false)} className="text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {credsLoading && (
                <div className="py-4 text-center text-on-surface-variant animate-pulse">Generating secure keys...</div>
              )}

              {credsError && (
                <div className="p-4 rounded-lg bg-error-container text-error text-sm">{credsError}</div>
              )}

              {credsData && (
                <>
                  {credsData.warning && (
                    <div className="p-3 bg-amber-50 text-amber-800 rounded border border-amber-200 text-sm mb-4">
                      <span className="font-bold">Important:</span> {credsData.warning}
                    </div>
                  )}
                  {credsData.message && (
                    <div className="p-3 bg-surface-container text-on-surface-variant rounded text-sm mb-4">
                      {credsData.message}
                    </div>
                  )}

                  <div>
                    <label className="text-[0.6875rem] font-label text-on-surface-variant uppercase tracking-widest block mb-2">Client ID</label>
                    <div className="bg-surface-container p-3 rounded font-mono text-sm flex justify-between items-center group">
                      <span className="truncate">{credsData.client_id}</span>
                      <button onClick={() => copyToClipboard(credsData.client_id)} className="material-symbols-outlined text-outline text-lg hover:text-primary transition-colors">content_copy</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[0.6875rem] font-label text-on-surface-variant uppercase tracking-widest block mb-2">Client Secret</label>
                    <div className="bg-surface-container p-3 rounded font-mono text-sm flex justify-between items-center group">
                      <span className="truncate">{credsData.client_secret}</span>
                      <button onClick={() => copyToClipboard(credsData.client_secret)} className="material-symbols-outlined text-outline text-lg hover:text-primary transition-colors">content_copy</button>
                    </div>
                  </div>
                  <div className="pt-4">
                    <button onClick={() => setIsCredsModalOpen(false)} className="w-full bg-surface-container-high text-on-surface font-bold py-2.5 rounded-lg text-sm hover:bg-surface-container-highest transition-colors">Done</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
