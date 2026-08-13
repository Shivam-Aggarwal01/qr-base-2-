import React, { useState } from 'react';
import { History, Download, Search, Filter, QrCode } from 'lucide-react';
import { InventoryTransaction, CatalogItem, Asset, Location, User, TransactionType } from '../types/inventory';

interface ActivityViewProps {
  transactions: InventoryTransaction[];
  catalogItems: CatalogItem[];
  assets: Asset[];
  locations: Location[];
  users: User[];
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({
  transactions,
  catalogItems,
  assets,
  locations,
  users,
  onOpenQRGenerator
}) => {
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const filteredTxs = transactions.filter((tx) => {
    if (typeFilter !== 'ALL' && tx.transaction_type !== typeFilter) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const asset = assets.find((a) => a.id === tx.asset_id);
      const cat = catalogItems.find((c) => c.id === (tx.catalog_item_id || asset?.catalog_item_id));
      const user = users.find((u) => u.id === tx.issued_to_user_id || u.id === tx.processed_by_user_id);
      if (
        !cat?.name.toLowerCase().includes(q) &&
        !asset?.asset_code.toLowerCase().includes(q) &&
        !user?.name.toLowerCase().includes(q) &&
        !tx.remarks?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Type', 'Item/Asset Code', 'Item Name', 'Quantity', 'From Location', 'To Location', 'User', 'Processed By', 'Remarks', 'Timestamp'];
    const rows = filteredTxs.map((tx) => {
      const asset = assets.find((a) => a.id === tx.asset_id);
      const cat = catalogItems.find((c) => c.id === (tx.catalog_item_id || asset?.catalog_item_id));
      const fromLoc = locations.find((l) => l.id === tx.from_location_id)?.name || '';
      const toLoc = locations.find((l) => l.id === tx.to_location_id)?.name || '';
      const user = users.find((u) => u.id === tx.issued_to_user_id)?.name || '';
      const processedBy = users.find((u) => u.id === tx.processed_by_user_id)?.name || '';

      return [
        tx.id,
        tx.transaction_type,
        asset?.asset_code || cat?.item_code || '',
        `"${cat?.name || ''}"`,
        tx.quantity,
        `"${fromLoc}"`,
        `"${toLoc}"`,
        `"${user}"`,
        `"${processedBy}"`,
        `"${tx.remarks || ''}"`,
        tx.created_at
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lab_inventory_transactions_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBadgeClass = (type: TransactionType) => {
    switch (type) {
      case 'RECEIVE':
        return 'bg-purple-50 text-purple-700';
      case 'ISSUE':
        return 'bg-blue-50 text-blue-700';
      case 'RETURN':
        return 'bg-emerald-50 text-emerald-700';
      case 'DAMAGE':
        return 'bg-amber-50 text-amber-700';
      case 'DISPOSAL':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Activity & Audit Movements</h2>
          <p className="text-xs text-slate-500">
            Immutable audit log of all physical inventory movements, assignments, returns, and stock adjustments
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" /> Export Audit Log (CSV)
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto w-full md:w-auto">
          {(['ALL', 'RECEIVE', 'ISSUE', 'RETURN', 'MOVE', 'DAMAGE', 'ADJUSTMENT'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                typeFilter === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search transaction logs..."
            className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs w-full outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action Type</th>
                <th className="px-6 py-4">Item / Asset Code</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Location / User Movement</th>
                <th className="px-6 py-4">Remarks / Processed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTxs.map((tx) => {
                const asset = assets.find((a) => a.id === tx.asset_id);
                const cat = catalogItems.find((c) => c.id === (tx.catalog_item_id || asset?.catalog_item_id));
                const fromLoc = locations.find((l) => l.id === tx.from_location_id);
                const toLoc = locations.find((l) => l.id === tx.to_location_id);
                const user = users.find((u) => u.id === tx.issued_to_user_id);
                const processor = users.find((u) => u.id === tx.processed_by_user_id);

                const code = asset?.asset_code || cat?.item_code || 'N/A';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-slate-500 font-medium whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${getBadgeClass(tx.transaction_type)}`}>
                        {tx.transaction_type}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{cat?.name}</p>
                        <p className="text-xs font-mono font-bold text-blue-600">{code}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-800">
                      {tx.quantity} {cat?.unit || 'pcs'}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-700 font-medium">
                      {fromLoc && toLoc ? (
                        <span>
                          {fromLoc.name} → {toLoc.name}
                        </span>
                      ) : toLoc ? (
                        <span>Stored at: {toLoc.name}</span>
                      ) : user ? (
                        <span className="text-blue-700 font-bold">Assigned to: {user.name}</span>
                      ) : fromLoc ? (
                        <span>From: {fromLoc.name}</span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      <p className="font-medium text-slate-700">{tx.remarks || '—'}</p>
                      {processor && <p className="text-[10px] text-slate-400">By: {processor.name}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
