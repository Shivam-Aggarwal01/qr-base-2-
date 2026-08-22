import React, { useState } from "react";
import { History, Download, Search } from "lucide-react";
import {
  InventoryTransaction,
  CatalogItem,
  Asset,
  Location,
  User,
  TransactionType,
} from "../types/inventory";

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
  onOpenQRGenerator,
}) => {
  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL");
  const [searchFilter, setSearchFilter] = useState("");

  const filteredTxs = transactions.filter((tx) => {
    if (typeFilter !== "ALL" && tx.transaction_type !== typeFilter)
      return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const asset = assets.find((a) => a.id === tx.asset_id);
      const cat = catalogItems.find(
        (c) =>
          c.id === (tx.catalog_item_id || asset?.catalog_item_id) ||
          c.item_code === (tx.catalog_item_id || asset?.catalog_item_id),
      );
      const user = users.find(
        (u) =>
          u.id === tx.issued_to_user_id || u.id === tx.processed_by_user_id,
      );
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
    const headers = [
      "Transaction ID",
      "Type",
      "Item/Asset Code",
      "Item Name",
      "Quantity",
      "From Location",
      "To Location",
      "User",
      "Processed By",
      "Remarks",
      "Timestamp",
    ];
    const rows = filteredTxs.map((tx) => {
      const asset = assets.find((a) => a.id === tx.asset_id);
      const cat = catalogItems.find(
        (c) =>
          c.id === (tx.catalog_item_id || asset?.catalog_item_id) ||
          c.item_code === (tx.catalog_item_id || asset?.catalog_item_id),
      );
      const fromLoc =
        locations.find((l) => l.id === tx.from_location_id)?.name || "";
      const toLoc =
        locations.find((l) => l.id === tx.to_location_id)?.name || "";
      const user = users.find((u) => u.id === tx.issued_to_user_id)?.name || "";
      const processedBy =
        users.find((u) => u.id === tx.processed_by_user_id)?.name || "";

      return [
        tx.id,
        tx.transaction_type,
        asset?.asset_code || cat?.item_code || "",
        `"${cat?.name || ""}"`,
        tx.quantity,
        `"${fromLoc}"`,
        `"${toLoc}"`,
        `"${user}"`,
        `"${processedBy}"`,
        `"${tx.remarks || ""}"`,
        tx.created_at,
      ].join(",");
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `lab_inventory_transactions_${new Date().toISOString().substring(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBadgeClass = (type: TransactionType) => {
    switch (type) {
      case "RECEIVE":
        return "idea-info";
      case "ISSUE":
        return "bg-[rgba(10,174,240,0.12)] text-[var(--color-idea-deep-blue)] border border-[var(--color-idea-blue)]/30";
      case "RETURN":
        return "idea-success";
      case "DAMAGE":
        return "idea-warning";
      case "DISPOSAL":
        return "idea-error";
      default:
        return "bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] border border-[var(--color-idea-border)]";
    }
  };

  const TYPE_TABS = [
    "ALL",
    "RECEIVE",
    "ISSUE",
    "RETURN",
    "MOVE",
    "DAMAGE",
    "ADJUSTMENT",
  ] as const;

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto max-w-7xl mx-auto w-full idea-bg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
            AUDIT TRAIL
          </span>
          <h2 className="text-2xl font-bold text-[var(--color-idea-text)] tracking-tight mt-1">
            Activity &amp;{" "}
            <span className="text-[var(--color-idea-blue)]">Audit Log</span>
          </h2>
          <p className="text-xs text-[var(--color-idea-muted)] mt-1">
            Immutable audit log of all physical inventory movements,
            assignments, returns, and stock adjustments
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="idea-button flex items-center gap-2 px-5 py-2.5 text-xs font-semibold cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" /> Export Audit Log (CSV)
        </button>
      </div>

      {/* Toolbar */}
      <div className="idea-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 bg-[var(--color-idea-light-grey)] p-1.5 rounded-2xl overflow-x-auto w-full md:w-auto">
          {TYPE_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                typeFilter === t
                  ? "bg-white text-[var(--color-idea-blue)] shadow-sm"
                  : "text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]"
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
            className="idea-input pl-9 pr-4 py-2 text-xs"
          />
          <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="idea-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-[var(--color-idea-muted)] uppercase tracking-widest border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action Type</th>
                <th className="px-6 py-4">Item / Asset Code</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Location / User Movement</th>
                <th className="px-6 py-4">Remarks / Processed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-idea-border)]">
              {filteredTxs.map((tx) => {
                const asset = assets.find((a) => a.id === tx.asset_id);
                const cat = catalogItems.find(
                  (c) =>
                    c.id === (tx.catalog_item_id || asset?.catalog_item_id) ||
                    c.item_code ===
                      (tx.catalog_item_id || asset?.catalog_item_id),
                );
                const fromLoc = locations.find(
                  (l) => l.id === tx.from_location_id,
                );
                const toLoc = locations.find((l) => l.id === tx.to_location_id);
                const user = users.find((u) => u.id === tx.issued_to_user_id);
                const processor = users.find(
                  (u) => u.id === tx.processed_by_user_id,
                );

                const code = asset?.asset_code || cat?.item_code || "N/A";

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-[var(--color-idea-light-grey)] transition-colors"
                  >
                    <td className="px-6 py-4 text-xs font-mono text-[var(--color-idea-muted)] font-medium whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${getBadgeClass(tx.transaction_type)}`}
                      >
                        {tx.transaction_type}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-[var(--color-idea-text)]">
                          {cat?.name}
                        </p>
                        <p className="text-xs font-mono font-bold text-[var(--color-idea-blue)]">
                          {code}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs font-mono font-bold text-[var(--color-idea-text)]">
                      {tx.quantity} {cat?.unit || "pcs"}
                    </td>

                    <td className="px-6 py-4 text-xs text-[var(--color-idea-text)] font-medium">
                      {fromLoc && toLoc ? (
                        <span>
                          {fromLoc.name} → {toLoc.name}
                        </span>
                      ) : toLoc ? (
                        <span>Stored at: {toLoc.name}</span>
                      ) : user ? (
                        <span className="text-[var(--color-idea-blue)] font-bold">
                          Assigned to: {user.name}
                        </span>
                      ) : fromLoc ? (
                        <span>From: {fromLoc.name}</span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-[var(--color-idea-muted)]">
                      <p className="font-medium text-[var(--color-idea-text)]">
                        {tx.remarks || "—"}
                      </p>
                      {processor && (
                        <p className="text-[10px] text-[var(--color-idea-muted)]">
                          By: {processor.name}
                        </p>
                      )}
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
