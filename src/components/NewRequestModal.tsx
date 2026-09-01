import React, { useEffect, useState } from "react";
import { X, Plus, Trash2, Send, Package } from "lucide-react";
import {
  Asset,
  CatalogItem,
  RequestLineDraft,
  User,
} from "../types/inventory";
import { createRequestFirestore } from "../services/firebaseCollections";
import confetti from "canvas-confetti";

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: User;
  catalogItems: CatalogItem[];
  assets: Asset[];
  onRefreshData: () => void;
  initialItems?: RequestLineDraft[];
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  catalogItems,
  assets,
  onRefreshData,
  initialItems,
}) => {
  const [purpose, setPurpose] = useState("");
  const [remarks, setRemarks] = useState("");

  const availableAssets = assets.filter((asset) => asset.status === "AVAILABLE");

  const getInitialItems = (): RequestLineDraft[] => {
    if (initialItems && initialItems.length > 0) return initialItems;
    return [
      {
        kind: "CATALOG",
        catalog_item_id: catalogItems[0]?.id || "",
        requested_qty: 1,
      },
    ];
  };

  const [requestItems, setRequestItems] =
    useState<RequestLineDraft[]>(getInitialItems());

  useEffect(() => {
    if (!isOpen) return;
    setPurpose("");
    setRemarks("");
    setRequestItems(getInitialItems());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialItems, catalogItems, assets]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setRequestItems([
      ...requestItems,
      {
        kind: "CATALOG",
        catalog_item_id: catalogItems[0]?.id || "",
        requested_qty: 1,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (requestItems.length === 1) return;
    setRequestItems(requestItems.filter((_, idx) => idx !== index));
  };

  const handleKindChange = (index: number, kind: RequestLineDraft["kind"]) => {
    const updated = [...requestItems];
    if (kind === "ASSET") {
      updated[index] = {
        kind: "ASSET",
        asset_id: availableAssets[0]?.id || "",
        catalog_item_id:
          availableAssets[0]?.catalog_item_id || catalogItems[0]?.id,
        requested_qty: 1,
      };
    } else {
      updated[index] = {
        kind: "CATALOG",
        catalog_item_id: catalogItems[0]?.id || "",
        requested_qty: 1,
      };
    }
    setRequestItems(updated);
  };

  const handleItemChange = (
    index: number,
    field: "catalog_item_id" | "asset_id" | "requested_qty",
    value: string | number,
  ) => {
    const updated = [...requestItems];
    const current = { ...updated[index] };
    if (field === "requested_qty") {
      current.requested_qty = Number(value) || 1;
    } else if (field === "asset_id") {
      const asset = assets.find((item) => item.id === value);
      current.asset_id = String(value);
      current.catalog_item_id = asset?.catalog_item_id;
      current.requested_qty = 1;
    } else {
      current.catalog_item_id = String(value);
    }
    updated[index] = current;
    setRequestItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) return alert("Please enter project purpose");

    const invalidCatalog = requestItems.some(
      (item) =>
        item.kind !== "ASSET" &&
        (!item.catalog_item_id || item.requested_qty <= 0),
    );
    const invalidAsset = requestItems.some(
      (item) => item.kind === "ASSET" && !item.asset_id,
    );
    if (invalidCatalog || invalidAsset) {
      return alert("Please select valid items or available assets.");
    }

    const requestNumber = `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      await createRequestFirestore({
        request_number: requestNumber,
        user_id: activeUser.id,
        purpose,
        status: "PENDING",
        remarks: remarks || "",
        items: requestItems.map((item, idx) => {
          const line: Record<string, unknown> = {
            id: `reqi-${Date.now()}-${idx}`,
            request_id: requestNumber,
            kind: item.kind,
            requested_qty: item.kind === "ASSET" ? 1 : item.requested_qty,
          };
          if (item.catalog_item_id) line.catalog_item_id = item.catalog_item_id;
          if (item.kind === "ASSET" && item.asset_id) line.asset_id = item.asset_id;
          return line;
        }),
      });

      confetti({ particleCount: 30, spread: 50 });
      onRefreshData();
      onClose();
    } catch (error: any) {
      console.error("Request creation failed:", error);
      alert(
        error?.message ||
          "Request could not be created. Please check your Firebase permissions and login session.",
      );
    }
  };

  const assetLabel = (asset: Asset) => {
    const catalog = catalogItems.find(
      (item) =>
        item.id === asset.catalog_item_id ||
        item.item_code === asset.catalog_item_id,
    );
    return `${asset.asset_code}${catalog ? ` · ${catalog.name}` : ""}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">New Request</h3>
              <p className="text-[10px] text-slate-400">
                Request catalog items or a specific tracked asset
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700">
              Student / Requestor
            </label>
            <div className="mt-1 p-2.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-800 flex justify-between items-center">
              <span>
                {activeUser.name} ({activeUser.user_code})
              </span>
              <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-md uppercase">
                {activeUser.role}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">
              Project / Lab Purpose
            </label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Capstone IoT Wireless Sensor Mesh"
              className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">
                Requested items and assets
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-blue-600 font-bold hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add line
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {requestItems.map((item, idx) => (
                <div key={idx} className="space-y-2 rounded-xl border border-slate-200 p-2">
                  <div className="flex gap-2">
                    <select
                      value={item.kind}
                      onChange={(event) =>
                        handleKindChange(
                          idx,
                          event.target.value as RequestLineDraft["kind"],
                        )
                      }
                      className="w-28 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                    >
                      <option value="CATALOG">Item</option>
                      <option value="ASSET">Asset</option>
                    </select>
                    {item.kind === "ASSET" ? (
                      <select
                        value={item.asset_id || ""}
                        onChange={(event) =>
                          handleItemChange(idx, "asset_id", event.target.value)
                        }
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select asset</option>
                        {availableAssets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {assetLabel(asset)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={item.catalog_item_id || ""}
                        onChange={(event) =>
                          handleItemChange(
                            idx,
                            "catalog_item_id",
                            event.target.value,
                          )
                        }
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {catalogItems.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.type} - {cat.item_code})
                          </option>
                        ))}
                      </select>
                    )}
                    {requestItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {item.kind === "ASSET" ? (
                    <p className="text-[10px] text-slate-400 px-1">
                      Individually tracked. Quantity is always 1.
                    </p>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      value={item.requested_qty}
                      onChange={(event) =>
                        handleItemChange(
                          idx,
                          "requested_qty",
                          Number(event.target.value),
                        )
                      }
                      className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none text-center"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">
              Remarks / Deadline (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Needed for Friday lab demonstration"
              className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-200 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" /> Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
