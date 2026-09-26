import React, { useState } from 'react';
import { firebaseStatus, reinitializeFirebase } from '../../services/firebase/firebaseApp';
import { saveStoredFirebaseConfig, clearStoredFirebaseConfig, getStoredFirebaseConfig, type FirebaseClientConfig } from '../../config/firebase.config';
import { seedService } from '../../services/seed/seedService';
import { useAuth } from '../../features/auth/AuthContext';
import { Database, ShieldCheck, AlertTriangle, Key, Sparkles, RefreshCw, X, CheckCircle2 } from 'lucide-react';

export const FirebaseStatusBanner: React.FC = () => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSeedSuccess, setShowSeedSuccess] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const { user, refreshUserData } = useAuth();

  const [customApiKey, setCustomApiKey] = useState('');
  const [customProjectId, setCustomProjectId] = useState('');
  const [customAuthDomain, setCustomAuthDomain] = useState('');
  const [customAppId, setCustomAppId] = useState('');

  const handleOpenConfig = () => {
    const stored = getStoredFirebaseConfig();
    if (stored) {
      setCustomApiKey(stored.apiKey || '');
      setCustomProjectId(stored.projectId || '');
      setCustomAuthDomain(stored.authDomain || '');
      setCustomAppId(stored.appId || '');
    }
    setShowConfigModal(true);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customApiKey || !customProjectId) return;

    const newConfig: FirebaseClientConfig = {
      apiKey: customApiKey.trim(),
      projectId: customProjectId.trim(),
      authDomain: customAuthDomain.trim() || `${customProjectId.trim()}.firebaseapp.com`,
      storageBucket: `${customProjectId.trim()}.appspot.com`,
      messagingSenderId: '123456789',
      appId: customAppId.trim() || `1:123456789:web:demo`,
    };

    saveStoredFirebaseConfig(newConfig);
    reinitializeFirebase();
    setShowConfigModal(false);
  };

  const handleClearConfig = () => {
    clearStoredFirebaseConfig();
    window.location.reload();
  };

  const handleRunSeed = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      await seedService.seedDemoCompany(user.uid);
      await refreshUserData();
      setShowSeedSuccess(true);
      setTimeout(() => setShowSeedSuccess(false), 4000);
    } catch (err) {
      console.error('Error seeding demo data:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <>
      <div className="bg-[#1C1C1C] border-b border-[#2C2C2C] px-3 py-1.5 text-xs text-[#A0A0A0]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Status Indicators */}
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#F5C400]" />
              Backend:
            </span>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                firebaseStatus.isConfigured 
                  ? 'bg-[#2E9B5B]/20 text-[#2E9B5B] border border-[#2E9B5B]/30' 
                  : 'bg-amber-500/10 text-[#F5C400] border border-[#F5C400]/30'
              }`}>
                {firebaseStatus.isConfigured ? (
                  <>
                    <ShieldCheck className="w-3 h-3" /> Live Firebase Connected
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" /> Local Persistence / Sandbox
                  </>
                )}
              </span>

              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#111111] rounded text-[10px] text-[#A0A0A0] border border-[#2C2C2C]">
                Auth: <strong className={firebaseStatus.isAuthAvailable ? 'text-[#2E9B5B]' : 'text-[#F5C400]'}>
                  {firebaseStatus.isAuthAvailable ? 'Live' : 'Simulated'}
                </strong>
              </span>

              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#111111] rounded text-[10px] text-[#A0A0A0] border border-[#2C2C2C]">
                Firestore: <strong className={firebaseStatus.isFirestoreAvailable ? 'text-[#2E9B5B]' : 'text-[#F5C400]'}>
                  {firebaseStatus.isFirestoreAvailable ? 'Live' : 'Isolated'}
                </strong>
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={handleRunSeed}
                disabled={isSeeding}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#252525] hover:bg-[#303030] text-white border border-[#3C3C3C] rounded transition cursor-pointer text-[11px]"
                title="Seeds sample construction workforce data marked [DEMO DATA]"
              >
                <Sparkles className="w-3 h-3 text-[#F5C400]" />
                {isSeeding ? 'Seeding...' : 'Load [DEMO DATA]'}
              </button>
            )}

            <button
              onClick={handleOpenConfig}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#111111] hover:bg-[#252525] text-[#F5C400] border border-[#F5C400]/30 rounded transition cursor-pointer text-[11px]"
            >
              <Key className="w-3 h-3" />
              Configure Credentials
            </button>
          </div>
        </div>
      </div>

      {/* Seed Success Toast */}
      {showSeedSuccess && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#1C1C1C] border border-[#2E9B5B] text-white px-4 py-3 rounded shadow-xl flex items-center gap-2 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#2E9B5B]" />
          <span>Demo construction team seeded with tag <strong>[DEMO DATA]</strong></span>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg max-w-lg w-full p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#2C2C2C]">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#F5C400]" />
                <h3 className="font-bold text-lg">Firebase Connection Status</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-[#A0A0A0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-[#A0A0A0]">
              <div className="p-3 bg-[#111111] rounded border border-[#2C2C2C]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-white">Status:</span>
                  <span className={firebaseStatus.isConfigured ? 'text-[#2E9B5B] font-bold' : 'text-[#F5C400] font-bold'}>
                    {firebaseStatus.isConfigured ? 'Configured (Live)' : 'Not Configured (Isolated Sandbox Mode)'}
                  </span>
                </div>
                <p className="text-xs text-[#A0A0A0] mt-1 leading-relaxed">
                  {firebaseStatus.isConfigured
                    ? `Connected to Firebase project: ${firebaseStatus.projectId}`
                    : 'The app is fully functioning with isolated tenant persistence. To link your live Firebase cloud instance, add environment variables or enter credentials below.'}
                </p>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">
                    API Key (VITE_FIREBASE_API_KEY)
                  </label>
                  <input
                    type="text"
                    required
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#F5C400]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">
                    Project ID (VITE_FIREBASE_PROJECT_ID)
                  </label>
                  <input
                    type="text"
                    required
                    value={customProjectId}
                    onChange={(e) => setCustomProjectId(e.target.value)}
                    placeholder="my-construction-app"
                    className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#F5C400]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">
                      Auth Domain
                    </label>
                    <input
                      type="text"
                      value={customAuthDomain}
                      onChange={(e) => setCustomAuthDomain(e.target.value)}
                      placeholder="app.firebaseapp.com"
                      className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#F5C400]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">
                      App ID
                    </label>
                    <input
                      type="text"
                      value={customAppId}
                      onChange={(e) => setCustomAppId(e.target.value)}
                      placeholder="1:12345:web:abcd"
                      className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#F5C400]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#2C2C2C]">
                  {getStoredFirebaseConfig() ? (
                    <button
                      type="button"
                      onClick={handleClearConfig}
                      className="text-xs text-[#D92D20] hover:underline"
                    >
                      Clear Custom Config
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(false)}
                      className="px-3 py-1.5 bg-[#2C2C2C] hover:bg-[#3C3C3C] text-xs font-medium text-white rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#F5C400] hover:bg-[#e0b400] text-black text-xs font-bold rounded cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Save & Apply
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
