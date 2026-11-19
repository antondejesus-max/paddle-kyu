import React, { useState } from 'react';
import { FirebaseConfig, getStoredFirebaseConfig } from '../lib/firebaseConfig';
import { switchFirebaseConfig, isUsingFirebase } from '../lib/db';
import { Database, Cloud, HardDrive, CheckCircle2, AlertCircle, X, ExternalLink } from 'lucide-react';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({
  isOpen,
  onClose
}) => {
  const currentConfig = getStoredFirebaseConfig();
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [projectId, setProjectId] = useState(currentConfig?.projectId || '');
  const [authDomain, setAuthDomain] = useState(currentConfig?.authDomain || '');
  const [storageBucket, setStorageBucket] = useState(currentConfig?.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(currentConfig?.messagingSenderId || '');
  const [appId, setAppId] = useState(currentConfig?.appId || '');
  const [rawJson, setRawJson] = useState('');

  if (!isOpen) return null;

  const isConnectedToFirebase = isUsingFirebase();

  const handleParseJson = () => {
    try {
      // Find object inside json or javascript snippet (e.g. const firebaseConfig = { ... };)
      const jsonStart = rawJson.indexOf('{');
      const jsonEnd = rawJson.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = rawJson.substring(jsonStart, jsonEnd + 1);
        // Replace unquoted keys if any
        const cleaned = jsonStr
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
          .replace(/'/g, '"');
        const parsed = JSON.parse(cleaned);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.projectId) setProjectId(parsed.projectId);
        if (parsed.authDomain) setAuthDomain(parsed.authDomain);
        if (parsed.storageBucket) setStorageBucket(parsed.storageBucket);
        if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId);
        if (parsed.appId) setAppId(parsed.appId);
        alert('Parsed Firebase credentials successfully!');
      } else {
        alert('Could not find JSON object in input');
      }
    } catch (e) {
      alert('Error parsing JSON: ' + (e as Error).message);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !projectId) {
      alert('API Key and Project ID are required');
      return;
    }

    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim()
    };

    switchFirebaseConfig(config);
  };

  const handleResetToMock = () => {
    if (confirm('Switch back to Local Zero-Config Real-Time Engine?')) {
      switchFirebaseConfig(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2 text-amber-400">
          <Database className="w-6 h-6" />
          <h2 className="text-xl font-bold text-white">Cloud Firestore & Sync Settings</h2>
        </div>

        {/* Current Engine Status Banner */}
        <div className="p-3.5 rounded-2xl border mb-4 flex items-center justify-between gap-3 bg-slate-950">
          <div className="flex items-center gap-3">
            {isConnectedToFirebase ? (
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Cloud className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400">
                <HardDrive className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-white">
                {isConnectedToFirebase ? 'Active: Cloud Firebase Firestore' : 'Active: Local Real-Time Sync Engine'}
              </div>
              <div className="text-[11px] text-slate-400">
                {isConnectedToFirebase
                  ? `Connected to project "${projectId || currentConfig?.projectId}"`
                  : 'Zero-config mode. Real-time multi-tab broadcasting enabled.'}
              </div>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isConnectedToFirebase
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-lime-500/20 text-lime-300 border-lime-500/40'
            }`}
          >
            {isConnectedToFirebase ? 'Cloud' : 'Local'}
          </span>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-1 space-y-3">
          <div className="text-xs text-slate-300 font-semibold">
            Connect your Firebase Project:
          </div>

          {/* Quick Paste JSON */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Paste Firebase Web App config (optional):</span>
              <button
                type="button"
                onClick={handleParseJson}
                className="text-lime-400 hover:underline font-medium"
              >
                Auto-Fill Fields
              </button>
            </label>
            <textarea
              rows={2}
              value={rawJson}
              onChange={e => setRawJson(e.target.value)}
              placeholder='const firebaseConfig = { apiKey: "...", projectId: "..." };'
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-lime-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-lime-500"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Project ID
              </label>
              <input
                type="text"
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                placeholder="paddle-ladder-123"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Auth Domain
              </label>
              <input
                type="text"
                value={authDomain}
                onChange={e => setAuthDomain(e.target.value)}
                placeholder="project.firebaseapp.com"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-lime-500"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                App ID
              </label>
              <input
                type="text"
                value={appId}
                onChange={e => setAppId(e.target.value)}
                placeholder="1:12345:web:abcd"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleResetToMock}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              Reset to Local Engine
            </button>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20"
            >
              Save & Connect Firebase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
