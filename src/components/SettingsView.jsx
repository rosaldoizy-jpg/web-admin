import { useState, useEffect } from 'react'
import api from '../api/client'
import {
  Settings, Sliders, Shield, Save, RefreshCw, Cpu, Droplets, Building2, Phone, MapPin, FileText, Lock, Layers
} from 'lucide-react'

export default function SettingsView({ showToast }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // Settings State
  const [businessName, setBusinessName] = useState('FreshSpin Laundry')
  const [businessAddress, setBusinessAddress] = useState('Poblacion 1, Victoria, Laguna, Philippines')
  const [contactNumber, setContactNumber] = useState('+63 917 890 1234')
  
  // IoT & Sensor Thresholds
  const [humidityThreshold, setHumidityThreshold] = useState(70.0)
  const [dryingTimeDefault, setDryingTimeDefault] = useState(60)
  const [systemStatus, setSystemStatus] = useState('Online')

  // Legal Documents
  const [termsConditions, setTermsConditions] = useState('')
  const [privacyPolicy, setPrivacyPolicy] = useState('')

  // Drying Stack
  const [stackName, setStackName] = useState('Main Stack')
  const [stackLocation, setStackLocation] = useState('Drying Area 1')
  const [stackCount, setStackCount] = useState(0)
  const [stackCapacity, setStackCapacity] = useState(50)
  const [stackNotes, setStackNotes] = useState('')
  const [stackId, setStackId] = useState(null)

  const fetchSettings = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api.get('/api/settings')
      if (res?.data?.data) {
        const d = res.data.data
        if (d.business_name) setBusinessName(d.business_name)
        if (d.business_address) setBusinessAddress(d.business_address)
        if (d.contact_number) setContactNumber(d.contact_number)
        if (d.humidity_threshold) setHumidityThreshold(d.humidity_threshold)
        if (d.drying_time_default) setDryingTimeDefault(d.drying_time_default)
        if (d.system_status) setSystemStatus(d.system_status)
        if (d.terms_conditions !== undefined) setTermsConditions(d.terms_conditions || '')
        if (d.privacy_policy !== undefined) setPrivacyPolicy(d.privacy_policy || '')
      }
      
      // Fetch drying stack data
      const stacksRes = await api.get('/api/drying-stacks')
      if (stacksRes?.data?.data && stacksRes.data.data.length > 0) {
        const stack = stacksRes.data.data[0]
        setStackName(stack.name || 'Main Stack')
        setStackLocation(stack.location || 'Drying Area 1')
        setStackCount(stack.count || 0)
        setStackCapacity(stack.capacity || 50)
        setStackNotes(stack.notes || '')
        setStackId(stack.id)
      }
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Unable to load settings. Check your connection and retry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        business_name: businessName,
        business_address: businessAddress,
        contact_number: contactNumber,
        humidity_threshold: Number(humidityThreshold),
        drying_time_default: Number(dryingTimeDefault),
        system_status: systemStatus,
        terms_conditions: termsConditions,
        privacy_policy: privacyPolicy
      }

      const res = await api.put('/api/settings', payload)
      if (res?.data?.success) {
        showToast('System settings and sensor thresholds saved successfully!')
      } else {
        showToast(res?.data?.message || 'Failed to save settings', 'error')
      }

      // Save drying stack separately
      if (stackId) {
        await api.put(`/api/drying-stacks/${stackId}`, {
          name: stackName,
          location: stackLocation,
          count: stackCount,
          capacity: stackCapacity,
          notes: stackNotes
        })
        showToast('Drying stack updated successfully!')
      } else if (stackName || stackCount > 0 || stackCapacity > 0) {
        // If no ID but has data, we might need to create (though the seeder creates one)
        showToast('Drying stack data noted (update existing stack in mobile app first)')
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl bg-white border border-line animate-pulse" />
        <div className="h-64 rounded-2xl bg-white border border-line animate-pulse" />
        <p className="text-center text-xs text-ink-secondary">Loading settings…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-12 rounded-2xl bg-white border border-line text-center space-y-3">
        <p className="text-sm font-bold text-navy">Unable to load settings</p>
        <p className="text-xs text-ink-secondary">{loadError}</p>
        <button
          onClick={fetchSettings}
          className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-hover text-white text-xs font-bold transition"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-line">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-navy" />
            <h2 className="text-xl font-bold text-navy">System Settings & IoT Thresholds</h2>
          </div>
          <p className="text-xs text-ink-secondary mt-1">
            Configure the humidity warning threshold and store information.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          className="p-2.5 rounded-xl bg-brand-tint hover:bg-brand-tintstrong border border-line text-navy transition self-start md:self-auto"
          title="Reload Settings"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-navy' : ''}`} />
        </button>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: ESP32 IoT & Sensor Thresholds */}
        <div className="bg-white rounded-2xl border border-line shadow-xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <Cpu className="w-5 h-5 text-navy" />
            <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
              ESP32 Humidity Threshold
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            {/* Warning Humidity */}
            <div className="space-y-1.5 bg-brand-tint p-4 rounded-xl border border-line">
              <label className="flex items-center gap-2 font-bold text-amber-400">
                <Droplets className="w-4 h-4" />
                Warning Humidity Threshold (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="40"
                max="95"
                value={humidityThreshold}
                onChange={(e) => setHumidityThreshold(e.target.value)}
                className="w-full bg-white border border-line rounded-lg px-3 py-2 text-navy font-mono focus:outline-none focus:border-brand-light"
              />
              <p className="text-[11px] text-ink-secondary">Default: 70%. A warning is sent once when humidity crosses this threshold.</p>
            </div>

            {/* Default Drying Duration */}
            <div className="space-y-1.5 bg-brand-tint p-4 rounded-xl border border-line">
              <label className="flex items-center gap-2 font-bold text-navy">
                <Sliders className="w-4 h-4" />
                Est. Drying Cycle (Minutes)
              </label>
              <input
                type="number"
                min="15"
                max="180"
                value={dryingTimeDefault}
                onChange={(e) => setDryingTimeDefault(e.target.value)}
                className="w-full bg-white border border-line rounded-lg px-3 py-2 text-navy font-mono focus:outline-none focus:border-brand-light"
              />
              <p className="text-[11px] text-ink-secondary">Standard estimated cycle length for predictive algorithms.</p>
            </div>
          </div>
        </div>

        {/* Section 2: Store Information */}
        <div className="bg-white rounded-2xl border border-line shadow-xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <Building2 className="w-5 h-5 text-navy" />
            <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
              Store Information & Official Contact
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-navy font-semibold">Laundry Brand Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2.5 text-navy focus:outline-none focus:border-brand-light"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-navy font-semibold">Contact Mobile / Hotline</label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2.5 text-navy focus:outline-none focus:border-brand-light"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-navy font-semibold">Store Address (Victoria, Laguna)</label>
              <input
                type="text"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2.5 text-navy focus:outline-none focus:border-brand-light"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Legal Documents */}
        <div className="bg-white rounded-2xl border border-line shadow-xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <FileText className="w-5 h-5 text-navy" />
            <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
              Terms & Conditions
            </h3>
          </div>

          <div className="space-y-1.5">
            <label className="block text-navy font-semibold">Terms & Conditions (shown to customers)</label>
            <textarea
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              rows={8}
              className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2.5 text-navy focus:outline-none focus:border-brand-light text-xs resize-y"
              placeholder="Enter your terms and conditions here..."
            />
            <p className="text-[11px] text-ink-secondary">This will be displayed to customers during signup and in the app.</p>
          </div>
        </div>

        {/* Section 4: Privacy Policy */}
        <div className="bg-white rounded-2xl border border-line shadow-xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <Lock className="w-5 h-5 text-navy" />
            <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
              Privacy Policy
            </h3>
          </div>

          <div className="space-y-1.5">
            <label className="block text-navy font-semibold">Privacy Policy (shown to customers)</label>
            <textarea
              value={privacyPolicy}
              onChange={(e) => setPrivacyPolicy(e.target.value)}
              rows={8}
              className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2.5 text-navy focus:outline-none focus:border-brand-light text-xs resize-y"
              placeholder="Enter your privacy policy here..."
            />
            <p className="text-[11px] text-ink-secondary">This will be displayed to customers during signup and in the app.</p>
          </div>
        </div>

        {/* Section 5: Drying Stack */}
        <div className="bg-white rounded-2xl border border-line shadow-xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <Layers className="w-5 h-5 text-navy" />
            <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
              Drying Stack Management
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-navy font-semibold">Stack Name</label>
              <input
                type="text"
                value={stackName}
                onChange={(e) => setStackName(e.target.value)}
                className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2.5 text-navy focus:outline-none focus:border-brand-light"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-navy font-semibold">Location</label>
              <input
                type="text"
                value={stackLocation}
                onChange={(e) => setStackLocation(e.target.value)}
                className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2.5 text-navy focus:outline-none focus:border-brand-light"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-navy font-semibold">Current Count</label>
              <input
                type="number"
                min="0"
                value={stackCount}
                onChange={(e) => setStackCount(Number(e.target.value))}
                className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2.5 text-navy focus:outline-none focus:border-brand-light"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-navy font-semibold">Max Capacity</label>
              <input
                type="number"
                min="1"
                value={stackCapacity}
                onChange={(e) => setStackCapacity(Number(e.target.value))}
                className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2.5 text-navy focus:outline-none focus:border-brand-light"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-navy font-semibold">Notes</label>
              <textarea
                value={stackNotes}
                onChange={(e) => setStackNotes(e.target.value)}
                rows={3}
                className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2.5 text-navy focus:outline-none focus:border-brand-light text-xs resize-y"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-navy hover:bg-navy-hover text-white font-bold text-sm shadow-card transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
