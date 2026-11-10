import { useState, useEffect } from 'react'
import api from '../api/client'
import {
  Users, UserPlus, Shield, Key, Mail, CheckCircle, XCircle, Trash2, Edit3, RefreshCw
} from 'lucide-react'

export default function StaffManagementView({ showToast }) {
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)

  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('staff')

  const fetchStaff = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api.get('/api/staff')
      setStaffList(res.data?.data || [])
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Unable to load staff. Check your connection and retry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  const handleCreateStaff = async (e) => {
    e.preventDefault()
    if (!name || !email || !password) {
      showToast('Please fill all required fields', 'error')
      return
    }

    try {
      const res = await api.post('/api/staff', {
        name,
        email,
        password,
        role
      })

      if (res?.data?.success) {
        showToast(`Staff member "${name}" created successfully!`)
        fetchStaff()
      } else {
        showToast(res?.data?.message || 'Failed to create staff member', 'error')
        return
      }

      setIsAddModalOpen(false)
      setName('')
      setEmail('')
      setPassword('')
      setRole('staff')
    } catch (err) {
      showToast('Error saving staff member', 'error')
    }
  }

  const handleUpdateStaff = async (e) => {
    e.preventDefault()
    if (!selectedStaff) return

    try {
      const res = await api.put(`/api/staff/${selectedStaff.id}`, {
        name,
        email,
        role
      })

      if (res?.data?.success) {
        showToast(`Staff member "${name}" updated successfully!`)
        fetchStaff()
      } else {
        showToast(res?.data?.message || 'Failed to update staff member', 'error')
        return
      }

      setIsEditModalOpen(false)
      setSelectedStaff(null)
    } catch (err) {
      showToast('Error updating staff member', 'error')
    }
  }

  const handleDeleteStaff = async (id, staffName) => {
    if (!window.confirm(`Are you sure you want to remove staff member "${staffName}"?`)) return

    try {
      await api.delete(`/api/staff/${id}`)
      setStaffList(prev => prev.filter(s => s.id !== id))
      showToast(`Staff member "${staffName}" removed`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete staff member', 'error')
    }
  }

  const openEditModal = (staff) => {
    setSelectedStaff(staff)
    setName(staff.name)
    setEmail(staff.email)
    setRole(staff.role)
    setIsEditModalOpen(true)
  }

  const renderRoleBadge = (r) => {
    const map = {
      admin: 'bg-navy text-white border-navy',
      staff: 'bg-brand-tintstrong text-navy border-brand-light',
      cashier: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    }
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border uppercase tracking-wider ${map[r?.toLowerCase()] || 'bg-brand-tintstrong text-navy'}`}>
        {r?.toLowerCase() === 'staff' ? 'Laundry Staff' : r}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Action Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-line">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-navy shrink-0" />
            <h2 className="text-xl font-bold text-navy break-words">Laundry Staff & Cashier Management</h2>
          </div>
          <p className="text-xs text-ink-secondary mt-1">
            Manage system access, assign roles (Admin, Laundry Staff, Cashier), and configure permissions.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchStaff}
            disabled={loading}
            className="p-2.5 rounded-xl bg-brand-tint hover:bg-brand-tintstrong border border-line text-navy transition"
            title="Refresh Staff"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-navy' : ''}`} />
          </button>

          <button
            onClick={() => {
              setName('')
              setEmail('')
              setPassword('')
              setRole('staff')
              setIsAddModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy hover:bg-navy-hover text-white font-semibold text-xs shadow-card transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Staff</span>
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-line shadow-xl overflow-hidden">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy">Active Personnel Directory ({staffList.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-navy">
            <thead className="bg-brand-tint uppercase text-[11px] font-bold text-ink-secondary border-b border-line">
              <tr>
                <th className="py-3.5 px-4">Staff Name</th>
                <th className="py-3.5 px-4">Email / Login</th>
                <th className="py-3.5 px-4">Role Access</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && staffList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-secondary text-xs">
                    Loading staff…
                  </td>
                </tr>
              ) : loadError && staffList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center space-y-2">
                    <p className="text-xs font-bold text-navy">Unable to load staff</p>
                    <p className="text-xs text-ink-secondary">{loadError}</p>
                    <button
                      onClick={fetchStaff}
                      className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-hover text-white text-xs font-bold transition"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : (
              <>
              {staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-brand-tint transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-tintstrong border border-brand-light flex items-center justify-center font-bold text-navy">
                        {staff.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-navy break-words">{staff.name}</div>
                        <div className="text-[11px] text-ink-secondary">FreshSpin Team</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-navy break-all">
                    {staff.email}
                  </td>
                  <td className="py-3.5 px-4">
                    {renderRoleBadge(staff.role)}
                  </td>
                  <td className="py-3.5 px-4 text-ink-secondary">
                    {staff.created_at ? new Date(staff.created_at).toLocaleDateString() : 'Active'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(staff)}
                        className="p-1.5 rounded-lg bg-brand-tint hover:bg-brand-tintstrong text-navy hover:text-navy transition"
                        title="Edit Staff"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-navy" />
                      </button>
                      {staff.role !== 'admin' && (
                        <button
                          onClick={() => handleDeleteStaff(staff.id, staff.name)}
                          className="p-1.5 rounded-lg bg-brand-tint hover:bg-danger-tint text-ink-secondary hover:text-rose-400 transition"
                          title="Remove Staff"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && !loading && !loadError && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-secondary">
                    No staff members registered. Click "Add New Staff" to create one.
                  </td>
                </tr>
              )}
              </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Staff */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-navy" />
                Add New Staff Member
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-ink-secondary hover:text-navy"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block text-navy font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2 text-navy focus:outline-none focus:border-brand-light"
                />
              </div>

              <div>
                <label className="block text-navy font-semibold mb-1">Email / Username *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@freshspin.ph"
                  className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2 text-navy focus:outline-none focus:border-brand-light"
                />
              </div>

              <div>
                <label className="block text-navy font-semibold mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2 text-navy focus:outline-none focus:border-brand-light"
                />
              </div>

              <div>
                <label className="block text-navy font-semibold mb-1">Access Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2 text-navy focus:outline-none focus:border-brand-light"
                >
                  <option value="staff">Laundry Staff (Operations & Humidity Monitoring)</option>
                  <option value="cashier">Cashier (Walk-in Orders & Payments)</option>
                  <option value="admin">Administrator (Full Business Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-brand-tint text-navy hover:text-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-hover text-white font-semibold shadow-card"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Staff */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-navy" />
                Edit Staff Member
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-ink-secondary hover:text-navy"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block text-navy font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2 text-navy focus:outline-none focus:border-brand-light"
                />
              </div>

              <div>
                <label className="block text-navy font-semibold mb-1">Email / Username *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2 text-navy focus:outline-none focus:border-brand-light"
                />
              </div>

              <div>
                <label className="block text-navy font-semibold mb-1">Access Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-brand-tint border border-line rounded-xl px-3 py-2 text-navy focus:outline-none focus:border-brand-light"
                >
                  <option value="staff">Laundry Staff (Operations & Humidity Monitoring)</option>
                  <option value="cashier">Cashier (Walk-in Orders & Payments)</option>
                  <option value="admin">Administrator (Full Business Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-brand-tint text-navy hover:text-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-hover text-white font-semibold shadow-card"
                >
                  Update Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
