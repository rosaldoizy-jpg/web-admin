import React, { useState, useEffect } from 'react'
import api from '../api/client'
import {
  Package, Plus, Search, Filter, AlertTriangle, CheckCircle2,
  XCircle, ArrowDown, ArrowUp, RefreshCw, Trash2, Edit3, Layers, Box
} from 'lucide-react'

export default function InventoryView({
  inventory: inventoryProp,
  loading: loadingProp,
  onRefresh: onRefreshProp,
  showToast
}) {
  const [items, setItems] = useState([])
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [adjustType, setAdjustType] = useState('stock_in')
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  // New Item State
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('Detergent')
  const [newItemQuantity, setNewItemQuantity] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('liters')
  const [newItemMinStock, setNewItemMinStock] = useState('')

  const fetchItems = async () => {
    setFetching(true)
    setFetchError(null)
    try {
      const res = await api.get('/api/inventory')
      setItems(res.data?.data || [])
    } catch (err) {
      setFetchError(err.response?.data?.message || 'Unable to load inventory. Check your connection and retry.')
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (inventoryProp === undefined) fetchItems()
  }, [])

  const inventory = inventoryProp ?? items
  const loading = loadingProp ?? fetching
  const refresh = () => {
    if (onRefreshProp) onRefreshProp()
    else fetchItems()
  }

  // Categories list
  const categories = ['All', 'Detergent', 'Fabric Softener', 'Plastic Bags', 'Laundry Supplies', 'Other Supplies']

  // Filtering
  const filteredItems = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                          item.category.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Summary counts
  const totalCount = inventory.length
  const lowStockCount = inventory.filter(i => i.status === 'LOW STOCK').length
  const outOfStockCount = inventory.filter(i => i.status === 'OUT OF STOCK').length
  const inStockCount = inventory.filter(i => i.status === 'IN STOCK').length

  const handleOpenAdjust = (item, type = 'stock_in') => {
    setSelectedItem(item)
    setAdjustType(type)
    setAdjustQty('')
    setAdjustReason(type === 'stock_in' ? 'Restocked from supplier' : 'Used for daily wash cycles')
    setIsAdjustModalOpen(true)
  }

  const handleSaveAdjustment = async (e) => {
    e.preventDefault()
    if (!selectedItem || !adjustQty || Number(adjustQty) <= 0) {
      showToast('Please enter a valid quantity.', 'error')
      return
    }

    try {
      const res = await api.post(`/api/inventory/${selectedItem.id}/stock`, {
        type: adjustType,
        quantity: Number(adjustQty),
        reason: adjustReason,
      })
      if (res.data?.success) {
        showToast(`Stock updated: ${adjustType === 'stock_in' ? '+' : '-'}${adjustQty} ${selectedItem.unit} for ${selectedItem.name}`)
        setIsAdjustModalOpen(false)
        refresh()
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to adjust stock', 'error')
    }
  }

  const handleCreateItem = async (e) => {
    e.preventDefault()
    if (!newItemName || !newItemQuantity || !newItemMinStock) {
      showToast('Please fill out all required fields.', 'error')
      return
    }

    try {
      const res = await api.post('/api/inventory', {
        name: newItemName,
        category: newItemCategory,
        quantity: Number(newItemQuantity),
        unit: newItemUnit,
        minimum_stock: Number(newItemMinStock),
      })
      if (res.data?.success) {
        showToast(`Item "${newItemName}" added to inventory!`)
        setIsAddModalOpen(false)
        setNewItemName('')
        setNewItemQuantity('')
        setNewItemMinStock('')
        refresh()
      }
    } catch (err) {
      showToast('Failed to create inventory item', 'error')
    }
  }

  const handleDeleteItem = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return
    try {
      await api.delete(`/api/inventory/${id}`)
      showToast(`Deleted ${name}`)
      refresh()
    } catch (err) {
      showToast('Failed to delete item', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-navy">Laundry Supplies & Inventory</h2>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Live Stock Tracking
            </span>
          </div>
          <p className="text-xs text-ink-secondary">Monitor detergent, softener, packaging bags, and laundry supply levels</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-brand-tint hover:bg-brand-tintstrong border border-line text-navy hover:text-navy transition"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-navy' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-navy hover:bg-navy-hover text-white font-bold text-sm shadow-card flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Add Supply Item
          </button>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Total Items</span>
            <div className="p-2 rounded-xl bg-brand-tintstrong text-navy border border-brand-light">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-navy">{totalCount}</div>
          <div className="mt-1 text-xs text-ink-secondary">Tracked consumables</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">In Stock</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-400">{inStockCount}</div>
          <div className="mt-1 text-xs text-ink-secondary">Sufficient supply levels</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Low Stock</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-400">{lowStockCount}</div>
          <div className="mt-1 text-xs text-amber-400">Near minimum threshold</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Out of Stock</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-rose-400">{outOfStockCount}</div>
          <div className="mt-1 text-xs text-rose-400">Requires replenishment</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-line flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-ink-secondary" />
          <input
            type="text"
            placeholder="Search supplies, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-line text-sm text-navy placeholder-ink-secondary focus:outline-none focus:border-brand-light"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
          <Filter className="w-4 h-4 text-ink-secondary" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                categoryFilter === cat
                  ? 'bg-brand-light text-navy font-black'
                  : 'bg-white text-navy hover:text-navy border border-line'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Items Table */}
      {loading && inventory.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white border border-line space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 rounded-xl bg-brand-tint animate-pulse" />
          ))}
          <p className="text-center text-xs text-ink-secondary">Loading inventory…</p>
        </div>
      ) : fetchError && inventory.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-line text-center space-y-3">
          <p className="text-sm font-bold text-navy">Unable to load inventory</p>
          <p className="text-xs text-ink-secondary">{fetchError}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-hover text-white text-xs font-bold transition"
          >
            Retry
          </button>
        </div>
      ) : (
      <div className="p-6 rounded-2xl bg-white border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-tint text-ink-secondary text-xs uppercase font-semibold">
              <tr>
                <th className="p-3.5 rounded-l-xl">Item Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Stock Level</th>
                <th className="p-3.5">Min Threshold</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 rounded-r-xl text-right">Quick Stock Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-ink-secondary">
                    No laundry supplies found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const pct = Math.min(100, Math.round((item.quantity / Math.max(1, item.minimum_stock * 2)) * 100))
                  const isLow = item.status === 'LOW STOCK'
                  const isOut = item.status === 'OUT OF STOCK'

                  return (
                    <tr key={item.id} className="hover:bg-brand-tint transition">
                      <td className="p-3.5">
                        <div className="font-bold text-navy">{item.name}</div>
                        <div className="text-[11px] text-ink-secondary">ID: INV-{String(item.id).padStart(4, '0')}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-brand-tint text-navy border border-line text-xs">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold text-base ${isOut ? 'text-rose-400' : (isLow ? 'text-amber-400' : 'text-navy')}`}>
                            {item.quantity}
                          </span>
                          <span className="text-xs text-ink-secondary">{item.unit}</span>
                        </div>
                        {/* Visual stock bar */}
                        <div className="w-32 bg-brand-tint h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${isOut ? 'bg-rose-500' : (isLow ? 'bg-amber-500' : 'bg-emerald-500')}`}
                            style={{ width: `${Math.max(5, pct)}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3.5 text-xs text-ink-secondary font-mono">
                        {item.minimum_stock} {item.unit}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                          isOut
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : (isLow ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30')
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAdjust(item, 'stock_in')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition"
                            title="Restock / Add Stock"
                          >
                            <ArrowUp className="w-3 h-3" /> Stock In
                          </button>
                          <button
                            onClick={() => handleOpenAdjust(item, 'stock_out')}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition"
                            title="Deduct Stock"
                          >
                            <ArrowDown className="w-3 h-3" /> Stock Out
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 rounded-lg bg-brand-tint hover:bg-danger-tint text-ink-secondary hover:text-rose-400 border border-line transition"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-line rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-navy flex items-center gap-2 mb-1">
              {adjustType === 'stock_in' ? (
                <ArrowUp className="w-5 h-5 text-emerald-400" />
              ) : (
                <ArrowDown className="w-5 h-5 text-amber-400" />
              )}
              {adjustType === 'stock_in' ? 'Stock In (Restock)' : 'Stock Out (Usage)'}
            </h3>
            <p className="text-xs text-ink-secondary mb-4">
              Item: <strong className="text-navy">{selectedItem.name}</strong> (Current: {selectedItem.quantity} {selectedItem.unit})
            </p>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-ink-secondary block mb-1">Quantity ({selectedItem.unit})</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  placeholder={`Amount in ${selectedItem.unit}`}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-brand-tint border border-line text-sm text-navy focus:outline-none focus:border-brand-light"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-ink-secondary block mb-1">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Supplier restock, Daily detergent batch"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-brand-tint border border-line text-sm text-navy focus:outline-none focus:border-brand-light"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-brand-tint hover:bg-brand-tintstrong text-navy font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition ${
                    adjustType === 'stock_in'
                      ? 'bg-navy hover:bg-navy-hover shadow-card'
                      : 'bg-navy hover:bg-navy-hover shadow-card'
                  }`}
                >
                  Confirm {adjustType === 'stock_in' ? 'Restock' : 'Deduction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-line rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-navy flex items-center gap-2 mb-1">
              <Box className="w-5 h-5 text-navy" />
              Add New Supply Item
            </h3>
            <p className="text-xs text-ink-secondary mb-4">Register a new supply or packaging consumable</p>

            <form onSubmit={handleCreateItem} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-ink-secondary block mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ariel Oxy Liquid Detergent"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-brand-tint border border-line text-sm text-navy focus:outline-none focus:border-brand-light"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink-secondary block mb-1">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-brand-tint border border-line text-sm text-navy focus:outline-none focus:border-brand-light"
                  >
                    <option value="Detergent">Detergent</option>
                    <option value="Fabric Softener">Fabric Softener</option>
                    <option value="Plastic Bags">Plastic Bags</option>
                    <option value="Laundry Supplies">Laundry Supplies</option>
                    <option value="Other Supplies">Other Supplies</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-secondary block mb-1">Unit of Measure</label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-brand-tint border border-line text-sm text-navy focus:outline-none focus:border-brand-light"
                  >
                    <option value="liters">liters (L)</option>
                    <option value="kg">kilograms (kg)</option>
                    <option value="pcs">pieces (pcs)</option>
                    <option value="packs">packs</option>
                    <option value="bottles">bottles</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink-secondary block mb-1">Initial Quantity</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    placeholder="0.0"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-brand-tint border border-line text-sm text-navy focus:outline-none focus:border-brand-light"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-secondary block mb-1">Minimum Alert Level</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    placeholder="5.0"
                    value={newItemMinStock}
                    onChange={(e) => setNewItemMinStock(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-brand-tint border border-line text-sm text-navy focus:outline-none focus:border-brand-light"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-brand-tint hover:bg-brand-tintstrong text-navy font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-navy hover:bg-navy-hover text-white font-bold text-xs shadow-card transition"
                >
                  Save Supply Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
