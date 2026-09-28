import React, { useState, useEffect } from 'react';
import type { JobSite, Project, JobSiteStatus } from '../../types';
import { getPurposeLimitedPosition } from '../../utils/geofence';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  MapPin,
  Compass,
  AlertCircle,
  Navigation,
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
    if (!address.trim()) {
      setError('Street address is required.');
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
        latitude,
        longitude,
        radiusMeters,
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

  const projectOptions = projects.map((p) => ({
    value: p.projectId,
    label: `${p.code} - ${p.name}`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialSite ? 'Edit Job Site Location' : 'Configure New Job Site'}
      description="Set physical construction boundaries, geofence radius, and project linkage"
      maxWidth="xl"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Job Site Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apex Site A - Tower Foundation"
          />

          <Select
            label="Associated Project Contract"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={projectOptions.length > 0 ? projectOptions : [{ value: '', label: 'No Projects Available' }]}
          />
        </div>

        <Input
          label="Street Address"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 100 University Avenue"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="City"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <Select
            label="Province / State"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            options={[
              { value: 'Ontario', label: 'Ontario' },
              { value: 'British Columbia', label: 'British Columbia' },
              { value: 'Alberta', label: 'Alberta' },
              { value: 'Quebec', label: 'Quebec' },
              { value: 'Manitoba', label: 'Manitoba' },
              { value: 'Nova Scotia', label: 'Nova Scotia' },
            ]}
          />

          <Input
            label="Postal Code"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="M5J 2H7"
          />
        </div>

        {/* GPS Geofence Configuration Section */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-semibold text-slate-200">
                GPS Coordinates & Radar Geofence
              </h4>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={detectingGps}
              leftIcon={<Navigation className="w-3.5 h-3.5 text-amber-400" />}
              onClick={handleDetectCurrentPosition}
            >
              Use Current GPS
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="number"
              step="0.000001"
              label="Latitude"
              required
              value={latitude}
              onChange={(e) => setLatitude(parseFloat(e.target.value))}
            />

            <Input
              type="number"
              step="0.000001"
              label="Longitude"
              required
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value))}
            />
          </div>

          {/* Quick Metro Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-500 mr-1">Quick Presets:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset(43.6532, -79.3832, 'Toronto', '100 Queen St W')}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Toronto Downtown
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(43.5890, -79.6441, 'Mississauga', '300 City Centre Dr')}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Mississauga
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(49.2827, -123.1207, 'Vancouver', '800 Robson St')}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Vancouver
            </button>
          </div>

          {/* Geofence Perimeter Slider */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
              <span className="font-medium">Verification Perimeter Radius</span>
              <span className="font-mono text-amber-400 font-semibold">{radiusMeters} meters</span>
            </div>
            <input
              type="range"
              min="25"
              max="500"
              step="25"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(parseInt(e.target.value))}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>25m (Tight Building)</span>
              <span>150m (Standard Site)</span>
              <span>500m (Large Infrastructure)</span>
            </div>
          </div>

          {/* Enforce Geofence Checkbox */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="enforceGeofence"
              checked={enforceGeofence}
              onChange={(e) => setEnforceGeofence(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500/40 bg-slate-900 border-slate-700 cursor-pointer"
            />
            <label htmlFor="enforceGeofence" className="text-xs text-slate-300 cursor-pointer">
              Enforce strict perimeter: alert supervisors if employee clocks in outside radius
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Site Operational Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as JobSiteStatus)}
            options={[
              { value: 'active', label: 'Active (Open for Dispatch)' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'completed', label: 'Completed' },
            ]}
          />

          <Input
            label="Site Safety / Dispatch Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. PPE required, check in with trailer supervisor"
          />
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
          >
            {initialSite ? 'Save Changes' : 'Create Job Site'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
