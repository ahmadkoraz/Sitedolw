import React, { useState, useEffect } from 'react';
import type { JobSite, Project, JobSiteStatus } from '../../types';
import { getPurposeLimitedPosition } from '../../utils/geofence';
import {
  X,
  MapPin,
  Compass,
  AlertCircle,
  Loader2,
  Navigation,
  Sliders,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface JobSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (siteData: JobSite) => Promise<void>;
  initialSite?: JobSite | null;
  projects: Project[];
  companyId: string;
}

export const JobSiteModal: React.FC<JobSiteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSite,
  projects,
  companyId,
}) => {
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Toronto');
  const [province, setProvince] = useState('Ontario');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState(43.6532);
  const [longitude, setLongitude] = useState(-79.3832);
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [enforceGeofence, setEnforceGeofence] = useState(true);
  const [status, setStatus] = useState<JobSiteStatus>('active');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);

  useEffect(() => {
    if (initialSite) {
      setName(initialSite.name);
      setProjectId(initialSite.projectId);
      setAddress(initialSite.address);
      setCity(initialSite.city);
      setProvince(initialSite.province);
      setPostalCode(initialSite.postalCode || '');
      setLatitude(initialSite.latitude);
      setLongitude(initialSite.longitude);
      setRadiusMeters(initialSite.radiusMeters);
      setEnforceGeofence(initialSite.enforceGeofence);
      setStatus(initialSite.status);
      setNotes(initialSite.notes || '');
    } else {
      setName('');
      setProjectId(projects[0]?.projectId || '');
      setAddress('');
      setCity('Toronto');
      setProvince('Ontario');
      setPostalCode('');
      setLatitude(43.6532);
      setLongitude(-79.3832);
      setRadiusMeters(100);
      setEnforceGeofence(true);
      setStatus('active');
      setNotes('');
    }
    setError(null);
  }, [initialSite, isOpen, projects]);

  if (!isOpen) return null;

  const handleDetectCurrentPosition = async () => {
    setDetectingGps(true);
    setError(null);
    try {
      const pos = await getPurposeLimitedPosition();
      setLatitude(Number(pos.latitude.toFixed(6)));
      setLongitude(Number(pos.longitude.toFixed(6)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to acquire current location.');
    } finally {
      setDetectingGps(false);
    }
  };

  const handleApplyPreset = (lat: number, lng: number, presetCity: string, presetAddress: string) => {
    setLatitude(lat);
    setLongitude(lng);
    setCity(presetCity);
    setAddress(presetAddress);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Job site name is required.');
      return;
    }
    if (!projectId) {
      setError('Please associate this site with a Project.');
      return;
    }
    if (!address.trim()) {
      setError('Address is required.');
      return;
    }
    if (isNaN(latitude) || isNaN(longitude)) {
      setError('Valid latitude and longitude coordinates are required.');
      return;
    }

    setLoading(true);
    try {
      const jobSiteId = initialSite?.jobSiteId || `site_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const timestamp = new Date().toISOString();

      const siteData: JobSite = {
        jobSiteId,
        companyId,
        projectId,
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        province: province.trim(),
        postalCode: postalCode.trim() || undefined,
        latitude: Number(latitude),
        longitude: Number(longitude),
        radiusMeters: Number(radiusMeters),
        enforceGeofence,
        status,
        notes: notes.trim() || undefined,
        createdAt: initialSite?.createdAt || timestamp,
        updatedAt: timestamp,
        createdBy: initialSite?.createdBy || 'system',
      };

      await onSave(siteData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job site.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg max-w-2xl w-full p-6 text-white shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A0A0A0] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold uppercase tracking-tight mb-1 text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#F5C400]" />
          {initialSite ? 'Edit Job Site & Geofence' : 'Register New Job Site & Geofence'}
        </h3>
        <p className="text-xs text-[#A0A0A0] mb-5">
          Define physical location boundaries and enforce automated attendance geofencing
        </p>

        {error && (
          <div className="mb-4 p-3 bg-[#D92D20]/15 border border-[#D92D20]/40 rounded text-xs text-[#D92D20] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Site Name <span className="text-[#F5C400]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bay Street Commercial Tower"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#F5C400]" /> Associated Project <span className="text-[#F5C400]">*</span>
              </label>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.code} &mdash; {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Street Address <span className="text-[#F5C400]">*</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="100 Bay Street"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                City / Municipality
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          {/* GPS Coordinates & Quick Presets */}
          <div className="p-4 bg-[#111111] rounded border border-[#2C2C2C] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#252525]">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#F5C400]" />
                Geofence GPS Coordinates
              </span>
              <button
                type="button"
                onClick={handleDetectCurrentPosition}
                disabled={detectingGps}
                className="text-xs text-[#F5C400] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                {detectingGps ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Detecting...
                  </>
                ) : (
                  <>
                    <Navigation className="w-3 h-3" /> Detect Device Location
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#A0A0A0] mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="w-full bg-[#1C1C1C] border border-[#333333] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#F5C400]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#A0A0A0] mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="w-full bg-[#1C1C1C] border border-[#333333] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#F5C400]"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-[#A0A0A0]">
              <span>Quick Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset(43.6487, -79.3817, 'Toronto', '100 King St West')}
                className="px-2 py-0.5 bg-[#252525] hover:bg-[#303030] text-white rounded cursor-pointer"
              >
                Financial District (Toronto)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(43.5932, -79.6421, 'Mississauga', '300 City Centre Dr')}
                className="px-2 py-0.5 bg-[#252525] hover:bg-[#303030] text-white rounded cursor-pointer"
              >
                Mississauga Hub
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(43.8561, -79.3370, 'Markham', '101 Town Centre Blvd')}
                className="px-2 py-0.5 bg-[#252525] hover:bg-[#303030] text-white rounded cursor-pointer"
              >
                Markham Tech Park
              </button>
            </div>
          </div>

          {/* Radius Slider & Radar Visualizer */}
          <div className="p-4 bg-[#111111] rounded border border-[#2C2C2C] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#F5C400]" />
                Geofence Radius Perimeter
              </span>
              <span className="font-mono text-xs font-bold text-[#F5C400] bg-[#1C1C1C] px-2.5 py-1 rounded border border-[#F5C400]/30">
                {radiusMeters} meters
              </span>
            </div>

            <input
              type="range"
              min="25"
              max="1000"
              step="25"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="w-full accent-[#F5C400] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#666666] font-mono">
              <span>25m (Tight Building)</span>
              <span>100m (Standard Site)</span>
              <span>500m (Civil/Highway)</span>
              <span>1000m (Expansive Quarry)</span>
            </div>

            {/* Visual Geofence Radar Canvas */}
            <div className="h-28 w-full bg-[#181818] border border-[#2A2A2A] rounded-md relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#333333_1px,transparent_1px)] [background-size:12px_12px] opacity-40" />
              
              {/* Outer Boundary Ring */}
              <div
                className="rounded-full border-2 border-dashed border-[#F5C400]/60 bg-[#F5C400]/10 flex items-center justify-center transition-all duration-300 shadow-lg shadow-[#F5C400]/5"
                style={{
                  width: `${Math.min(100, Math.max(30, (radiusMeters / 1000) * 100))}%`,
                  height: `${Math.min(90, Math.max(30, (radiusMeters / 1000) * 90))}%`,
                }}
              >
                {/* Center Pin */}
                <div className="w-4 h-4 rounded-full bg-[#F5C400] flex items-center justify-center shadow-md shadow-black">
                  <div className="w-1.5 h-1.5 rounded-full bg-black" />
                </div>
              </div>

              <div className="absolute bottom-2 left-2 text-[10px] font-mono text-[#A0A0A0] bg-black/60 px-2 py-0.5 rounded">
                Center: {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </div>
            </div>

            {/* Geofence Enforcement Policy Checkbox */}
            <div className="pt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={enforceGeofence}
                  onChange={(e) => setEnforceGeofence(e.target.checked)}
                  className="rounded accent-[#F5C400] w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-white">
                  Enforce Site Geofence at Clock In
                </span>
              </label>

              <span className="text-[11px] text-[#A0A0A0]">
                {enforceGeofence ? 'Requires supervisor override if off-site' : 'Soft audit warning only'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as JobSiteStatus)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              >
                <option value="active">Active (Dispatches permitted)</option>
                <option value="inactive">Inactive</option>
                <option value="closed">Closed / Handed Over</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Safety Notes & Gate Info
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gate 2 access via North ramp. Hard hat mandatory."
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#2C2C2C]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#252525] hover:bg-[#303030] text-xs font-semibold text-white rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#F5C400] hover:bg-[#e0b400] text-black text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-2 shadow-md shadow-[#F5C400]/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Job Site & Geofence'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
