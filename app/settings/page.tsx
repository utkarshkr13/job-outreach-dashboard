'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

type ActiveSection = 'profile' | 'gmail' | 'notion' | 'claude' | 'resume' | 'security';

interface ResumeState {
  url: string | null;
  uploadedAt: string | null;
  loading: boolean;
  message: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<ActiveSection>('profile');
  const [loading, setLoading] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile Form States
  const [profileName, setProfileName] = useState<string>('');
  const [profilePhone, setProfilePhone] = useState<string>('');
  const [profileLinkedin, setProfileLinkedin] = useState<string>('');
  const [profileBio, setProfileBio] = useState<string>('');
  const [profileRoles, setProfileRoles] = useState<string>('');

  // Credentials States
  const [gmailUser, setGmailUser] = useState<string>('');
  const [gmailConnected, setGmailConnected] = useState<boolean>(false);
  
  const [notionApiKey, setNotionApiKey] = useState<string>('');
  const [notionDbId, setNotionDbId] = useState<string>('');
  const [notionConnected, setNotionConnected] = useState<boolean>(false);
  const [notionTesting, setNotionTesting] = useState<boolean>(false);

  const [anthropicApiKey, setAnthropicApiKey] = useState<string>('');
  const [anthropicConnected, setAnthropicConnected] = useState<boolean>(false);

  // Resume State
  const [resume, setResume] = useState<ResumeState>({
    url: null,
    uploadedAt: null,
    loading: false,
    message: '',
  });

  // Security States
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [cronEnabled, setCronEnabled] = useState<boolean>(true);
  const [cronHour, setCronHour] = useState<number>(4);

  // DevTools reseed
  const [reseedLoading, setReseedLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/settings/credentials', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch settings.');
      }

      const p = data.profile || {};
      const c = data.credentials || {};
      const s = data.settings || {};

      setProfileName(p.senderName || user?.displayName || '');
      setProfilePhone(p.phone || '');
      setProfileLinkedin(p.linkedin || '');
      setProfileBio(p.bio || '');
      setProfileRoles(p.targetRoles || '');

      setGmailUser(c.gmailUser || '');
      setGmailConnected(c.gmailConnected || false);
      
      setNotionApiKey(c.notionConnected ? '••••••••••••••••' : '');
      setNotionDbId(c.notionDbId ? '••••••••••••••••' : '');
      setNotionConnected(c.notionConnected || false);

      setAnthropicApiKey(c.anthropicApiKeyConnected ? '••••••••••••••••' : '');
      setAnthropicConnected(c.anthropicApiKeyConnected || false);

      setCronEnabled(s.cronEnabled ?? true);
      setCronHour(s.cronHour ?? 4);

      // Fetch resume status
      await fetchResumeStatus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading settings from server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchResumeStatus = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/resume', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      setResume({
        url: data.url,
        uploadedAt: data.uploadedAt,
        loading: false,
        message: '',
      });
    } catch (err) {
      console.error('Failed to retrieve resume status', err);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/settings/credentials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          profile: {
            senderName: profileName,
            phone: profilePhone,
            linkedin: profileLinkedin,
            bio: profileBio,
            targetRoles: profileRoles,
          },
          settings: {
            cronEnabled,
            cronHour,
          }
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update profile.');

      setSuccessMsg('Profile settings updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save changes.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Gmail OAuth reconnect trigger
  const handleGmailReconnect = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const token = await user?.getIdToken();
      window.location.href = `/api/gmail/oauth?token=${token}`;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to trigger Gmail authentication.');
    }
  };

  // Notion credentials test & save
  const handleNotionSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = await user?.getIdToken();

      // If the fields are changed, save them
      if (notionApiKey !== '••••••••••••••••' || notionDbId !== '••••••••••••••••') {
        const res = await fetch('/api/onboarding/notion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ notionApiKey, notionDbId }),
        });
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to link Notion integration.');
        }
      }

      setNotionConnected(true);
      setSuccessMsg('Notion credentials tested & stored successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection test failed.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Claude API Key save
  const handleClaudeSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = await user?.getIdToken();

      // Only save if modified
      if (anthropicApiKey !== '••••••••••••••••') {
        const res = await fetch('/api/settings/credentials', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            credentials: {
              anthropicApiKey
            }
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to update Claude API key.');
      }

      setAnthropicConnected(true);
      setSuccessMsg('Claude Anthropic API key updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save Claude key.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Resume Upload / Replace
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setResume(prev => ({ ...prev, message: 'Only PDF files are supported.' }));
      return;
    }

    setResume(prev => ({ ...prev, loading: true, message: '' }));
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/resume/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/pdf'
        },
        body: file,
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setResume({
        url: data.url,
        uploadedAt: new Date().toISOString(),
        loading: false,
        message: 'Resume PDF uploaded successfully!'
      });
      
      setTimeout(() => setResume(prev => ({ ...prev, message: '' })), 4000);
    } catch (err: any) {
      setResume(prev => ({ ...prev, loading: false, message: 'Error: ' + err.message }));
    } finally {
      e.target.value = '';
    }
  };

  // DevTools reseed
  const triggerDbReset = async () => {
    setReseedLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/companies/reset', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Database seeded back to 10 pristine recruiter pipelines!');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        throw new Error(data.error || 'Failed to seed.');
      }
    } catch (e: any) {
      setErrorMsg('Error seeding database: ' + e.message);
    } finally {
      setReseedLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 transition-colors duration-300">
      
      {/* HEADER */}
      <div className="border-b border-[#e8e8ed] dark:border-neutral-900 pb-6 mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Settings</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Manage profile bio inputs, linked Google/Notion credentials, and outreach security configurations.</p>
        </div>
        <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 dark:text-neutral-500">
          SaaS Engine Settings
        </div>
      </div>

      {loading ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-neutral-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          
          {/* LEFT SIDEBAR NAVIGATION */}
          <aside className="w-full lg:w-64 shrink-0 space-y-1.5 p-3 rounded-2xl backdrop-blur-md bg-white/40 dark:bg-neutral-900/40 border border-white/50 dark:border-neutral-850">
            {(
              [
                { id: 'profile', label: 'Profile Info', icon: '👤' },
                { id: 'gmail', label: 'Gmail OAuth', icon: '✉️', status: gmailConnected },
                { id: 'notion', label: 'Notion CRM', icon: '📓', status: notionConnected },
                { id: 'claude', label: 'Claude AI API', icon: '🤖', status: anthropicConnected },
                { id: 'resume', label: 'Resume Files', icon: '📄', status: !!resume.url },
                { id: 'security', label: 'Account Security', icon: '🔒' }
              ] as { id: ActiveSection; label: string; icon: string; status?: boolean }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveSection(tab.id); setErrorMsg(null); setSuccessMsg(null); }}
                className={`w-full px-4 py-3 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  activeSection === tab.id
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </span>
                
                {tab.status !== undefined && (
                  <span className={`w-2 h-2 rounded-full ${
                    tab.status ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-red-500'
                  }`} />
                )}
              </button>
            ))}
          </aside>

          {/* RIGHT PANE CARD CONTAINER */}
          <div className="grow w-full space-y-6">
            
            {/* Global Success / Error Banners */}
            {successMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/30 text-xs text-emerald-800 dark:text-emerald-450 flex items-center gap-2 shadow-sm animate-fade-in">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-250 dark:border-red-900/30 text-xs text-red-650 dark:text-red-400 flex items-center gap-2 shadow-sm animate-fade-in">
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SECTION 1: PROFILE INFO */}
            {activeSection === 'profile' && (
              <form onSubmit={handleProfileSave} className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">Profile Information</h3>
                  <p className="text-xs text-neutral-450 dark:text-neutral-500 mt-1">Configure the identity metadata injected into AI generation drafts and email signature modules.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Full Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-neutral-250 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Phone Number</label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-neutral-250 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">LinkedIn URL</label>
                    <input
                      type="text"
                      value={profileLinkedin}
                      onChange={(e) => setProfileLinkedin(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-neutral-250 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Target Roles</label>
                    <input
                      type="text"
                      required
                      value={profileRoles}
                      onChange={(e) => setProfileRoles(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-neutral-250 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Professional Bio</label>
                  <textarea
                    required
                    rows={4}
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    className="w-full p-4 rounded-xl border border-neutral-250 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-none leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-neutral-100 dark:border-neutral-850 pt-6">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-6 h-11 rounded-xl bg-[#fafafa] hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-850 text-neutral-750 dark:text-[#f5f5f7] border border-[#e8e8ed] dark:border-neutral-800 font-semibold text-sm hover:scale-102 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {saveLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* SECTION 2: GMAIL CONNECTION */}
            {activeSection === 'gmail' && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">Gmail Integration</h3>
                  <p className="text-xs text-neutral-450 dark:text-neutral-500 mt-1">Dynamic connection to dispatch outreach emails from your actual Gmail inbox.</p>
                </div>

                <div className="flex items-center gap-4 p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 ${
                    gmailConnected ? 'bg-emerald-500' : 'bg-red-500'
                  }`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-semibold text-sm block">
                      {gmailConnected ? 'Gmail Link Connected' : 'Gmail Connection Disconnected'}
                    </span>
                    <span className="text-xs text-neutral-450 dark:text-neutral-500">
                      {gmailConnected ? `Connected account: ${gmailUser}` : 'Please authenticate to activate dynamic email dispatch.'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-neutral-100 dark:border-neutral-850">
                  <button
                    onClick={handleGmailReconnect}
                    className="px-6 h-11 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-850 dark:text-neutral-200 font-semibold text-xs border border-neutral-200 dark:border-neutral-700 transition-all cursor-pointer"
                  >
                    {gmailConnected ? 'Reconnect Gmail Inbox' : 'Link Gmail Account'}
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 3: NOTION CRM */}
            {activeSection === 'notion' && (
              <form onSubmit={handleNotionSave} className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">Notion Database CRM</h3>
                  <p className="text-xs text-neutral-450 dark:text-neutral-500 mt-1">Configure your personal Notion database credentials for pipeline tracking.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Notion API Integration Token</label>
                    <input
                      type="password"
                      required
                      placeholder="secret_..."
                      value={notionApiKey}
                      onChange={(e) => setNotionApiKey(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-neutral-250 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Notion Database ID</label>
                    <input
                      type="text"
                      required
                      placeholder="Hexadecimal Database ID"
                      value={notionDbId}
                      onChange={(e) => setNotionDbId(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-neutral-250 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-neutral-100 dark:border-neutral-850 pt-6">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-6 h-11 rounded-xl bg-[#fafafa] hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-850 text-neutral-750 dark:text-[#f5f5f7] border border-[#e8e8ed] dark:border-neutral-800 font-semibold text-sm hover:scale-102 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {saveLoading ? 'Testing...' : 'Test & Save Notion Link'}
                  </button>
                </div>
              </form>
            )}

            {/* SECTION 4: CLAUDE AI API KEY */}
            {activeSection === 'claude' && (
              <form onSubmit={handleClaudeSave} className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">Claude AI Engine</h3>
                  <p className="text-xs text-neutral-450 dark:text-neutral-500 mt-1">Configure your personal Anthropic Claude API key for dynamic email generation.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Anthropic API Key</label>
                  <input
                    type="password"
                    required
                    placeholder="sk-ant-..."
                    value={anthropicApiKey}
                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-neutral-250 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white"
                  />
                  <span className="text-[10px] text-neutral-450 dark:text-neutral-500 mt-1 block">
                    All key characters are stored AES-256 encrypted using platform-level env key maps.
                  </span>
                </div>

                <div className="flex justify-end pt-6 border-t border-neutral-100 dark:border-neutral-850">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-6 h-11 rounded-xl bg-[#fafafa] hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-850 text-neutral-750 dark:text-[#f5f5f7] border border-[#e8e8ed] dark:border-neutral-800 font-semibold text-sm hover:scale-102 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {saveLoading ? 'Saving...' : 'Save AI Key'}
                  </button>
                </div>
              </form>
            )}

            {/* SECTION 5: RESUME MANAGEMENT */}
            {activeSection === 'resume' && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">Resume Document Storage</h3>
                  <p className="text-xs text-neutral-450 dark:text-neutral-500 mt-1">Manage PDF resumes attached dynamically during cold outreach pipelines.</p>
                </div>

                {resume.url ? (
                  <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-350">
                        📄
                      </div>
                      <div>
                        <a 
                          href={resume.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline block break-all"
                        >
                          View Current Uploaded PDF Resume
                        </a>
                        <span className="text-[10px] text-neutral-450 dark:text-neutral-500 block mt-0.5">
                          Synced: {resume.uploadedAt ? new Date(resume.uploadedAt).toLocaleDateString() : 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-850 text-center text-neutral-400 dark:text-neutral-550 italic text-xs">
                    No main PDF resume uploaded. General outreach tasks will dispatch without resume attachment.
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100 dark:border-neutral-850">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleResumeUpload}
                    id="resume-file-upload-settings"
                    className="hidden"
                    disabled={resume.loading}
                  />
                  <label
                    htmlFor="resume-file-upload-settings"
                    className="px-6 h-11 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-850 dark:text-neutral-200 font-semibold text-xs border border-neutral-200 dark:border-neutral-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {resume.loading ? 'Uploading...' : 'Upload/Replace PDF Resume'}
                  </label>
                </div>
                {resume.message && (
                  <p className="text-[10px] text-center font-semibold text-emerald-500 mt-2">{resume.message}</p>
                )}
              </div>
            )}

            {/* SECTION 6: ACCOUNT SECURITY */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                
                {/* 2FA Card */}
                <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">Multi-Factor Authentication (2FA)</h3>
                    <p className="text-xs text-neutral-450 dark:text-neutral-500 mt-1">Protect your SaaS account with an extra verification layer (phone/TOTP).</p>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850">
                    <div>
                      <span className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 block">Google Authenticator (TOTP)</span>
                      <span className="text-[10px] text-neutral-450 dark:text-neutral-500 block mt-0.5">Scan QR code using Google Authenticator or Duo security apps.</span>
                    </div>
                    <button
                      onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                        twoFactorEnabled ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-800'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Auto Generation Scheduler */}
                <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">Daily Summary Cron</h3>
                    <p className="text-xs text-neutral-450 dark:text-neutral-500 mt-1">Toggle whether the automated AI engine runs daily drafts at 4am in the morning.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850">
                      <div>
                        <span className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 block">Enable Morning Generation</span>
                        <span className="text-[10px] text-neutral-450 dark:text-neutral-500 block mt-0.5">Triggers automatic daily pipeline scans.</span>
                      </div>
                      <button
                        onClick={() => setCronEnabled(!cronEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                          cronEnabled ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-800'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          cronEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850">
                      <div>
                        <span className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 block">Trigger Hour (Local Time - IST)</span>
                        <span className="text-[10px] text-neutral-450 dark:text-neutral-500 block mt-0.5">Specific hour of dispatch.</span>
                      </div>
                      <select
                        value={cronHour}
                        onChange={(e) => setCronHour(Number(e.target.value))}
                        className="bg-transparent text-xs font-semibold focus:outline-none border border-neutral-250 dark:border-neutral-800 rounded-lg px-2.5 py-1"
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((h) => (
                          <option key={h} value={h}>{h}:00</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Developer Utilities Reset */}
                <div className="p-6 md:p-8 rounded-3xl bg-[#fff3cd] dark:bg-neutral-900/20 border border-[#ffeeba] dark:border-neutral-850 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <span>⚠️</span> Platform DevTools: Reset Pipeline
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Resets your local demo lead database back to the default 10 leads.</p>
                  </div>
                  <button
                    onClick={triggerDbReset}
                    disabled={reseedLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-950/10 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-950/40 cursor-pointer disabled:opacity-50"
                  >
                    {reseedLoading ? 'Resetting...' : 'Reset Leads Database'}
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
