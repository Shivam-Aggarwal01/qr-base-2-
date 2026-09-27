import React, { useState } from 'react';
import { Search, Trash2, Pencil, Check, X } from 'lucide-react';
import { User, Asset, CatalogItem, AccountRequest, Request } from '../types/inventory';

interface UsersViewProps {
  users: User[];
  assets: Asset[];
  catalogItems: CatalogItem[];
  requests: Request[];
  activeUser: User | null;
  userRole?: User['role'];
  onUpdateUserRole?: (userId: string, newRole: User['role']) => Promise<void>;
  onDeleteUser?: (userId: string) => Promise<void>;
  accountRequests?: AccountRequest[];
  onReviewAccountRequest?: (requestId: string, status: 'APPROVED' | 'REJECTED') => Promise<void>;
  onRefreshData: () => void;
}
type LoanGroup = {
  catalogItemId: string;
  quantity: number;
  assetCodes: string[];
};

const EDITABLE_ROLES: User['role'][] = ['STUDENT', 'STUDENT_LEAD', 'STUDENT_AMBASSADOR'];
const ACTIVE_ASSET_STATUSES = new Set([
  'ISSUED',
  'CHECKED_OUT',
  'CHECKED-OUT',
  'CHECKED OUT',
  'BORROWED',
  'ACTIVE',
  'OUT',
  'ASSIGNED',
]);

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  assets,
  catalogItems,
  requests,
  activeUser,
  userRole,
  onUpdateUserRole,
  onDeleteUser,
  accountRequests = [],
  onReviewAccountRequest,
}) => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [searchFilter, setSearchFilter] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<User['role']>('STUDENT');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const isAdmin = userRole === 'ADMIN';
  const pendingAccountRequests = accountRequests.filter((request) => request.status === 'PENDING');
  const searchQuery = searchFilter.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    if (!searchQuery) {
      return true;
    }
    return user.name.toLowerCase().includes(searchQuery) || user.email.toLowerCase().includes(searchQuery);
  });

  // ---------------------------------------------------------------------------
  // Role helpers
  // ---------------------------------------------------------------------------
  const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-[rgba(10,174,240,0.12)] text-[var(--color-idea-deep-blue)] border border-[var(--color-idea-blue)]/30';
      case 'STUDENT_AMBASSADOR':
        return 'bg-[rgba(133,180,64,0.12)] text-[#3d6b10] border border-[var(--color-idea-green)]/30';
      case 'STUDENT_LEAD':
        return 'bg-[rgba(255,202,8,0.15)] text-[#7a5e00] border border-[var(--color-idea-yellow)]/40';
      case 'STUDENT':
      default:
        return 'bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] border border-[var(--color-idea-border)]';
    }
  };

  const getRoleName = (role: User['role']) => {
    switch (role) {
      case 'ADMIN':
        return 'ADMIN';
      case 'STUDENT_AMBASSADOR':
        return 'STUDENT AMBASSADOR';
      case 'STUDENT_LEAD':
        return 'STUDENT LEAD';
      case 'STUDENT':
        return 'STUDENT';
      default:
        return (role as string).replace(/_/g, ' ');
    }
  };

  // ---------------------------------------------------------------------------
  // User editing
  // ---------------------------------------------------------------------------
  const startEditing = (user: User) => {
    if (user.role === 'ADMIN') {
      return;
    }
    setEditingUserId(user.id);
    setEditingRole(user.role);
  };
  const cancelEditing = () => {
    setEditingUserId(null);
    setEditingRole('STUDENT');
  };
  const saveRole = async (user: User) => {
    if (!onUpdateUserRole) {
      return;
    }
    if (user.role === 'ADMIN') {
      window.alert('Admin users cannot have their role changed.');
      return;
    }
    if (!EDITABLE_ROLES.includes(editingRole)) {
      window.alert('Invalid user role.');
      return;
    }
    if (editingRole === user.role) {
      cancelEditing();
      return;
    }
    try {
      setSavingUserId(user.id);
      await onUpdateUserRole(user.id, editingRole);
      cancelEditing();
    } catch (error) {
      console.error('Failed to update user role:', error);
    } finally {
      setSavingUserId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // User deletion
  // ---------------------------------------------------------------------------
  const handleDeleteUser = async (user: User) => {
    if (!onDeleteUser) {
      return;
    }
    if (user.id === activeUser?.id) {
      window.alert('You cannot delete your own account.');
      return;
    }
    if (user.role === 'ADMIN') {
      window.alert('Admin accounts cannot be removed from the directory.');
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to remove ${user.name}?`);
    if (!confirmed) {
      return;
    }
    try {
      await onDeleteUser(user.id);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  // ---------------------------------------------------------------------------
  // Account request review
  // ---------------------------------------------------------------------------
  const reviewRequest = async (request: AccountRequest, status: 'APPROVED' | 'REJECTED') => {
    if (!onReviewAccountRequest) {
      return;
    }
    const message =
      status === 'APPROVED'
        ? `Approve account for ${request.name}? They will be able to sign in as a student.`
        : `Decline account request for ${request.name}?`;
    if (!window.confirm(message)) {
      return;
    }
    try {
      setReviewingId(request.id);
      await onReviewAccountRequest(request.id, status);
    } catch (error) {
      console.error('Failed to review account request:', error);
      window.alert('Failed to update the account request.');
    } finally {
      setReviewingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Asset helpers
  // ---------------------------------------------------------------------------
  const isActiveAsset = (asset: Asset) => {
    const status = String(asset.status ?? '')
      .trim()
      .toUpperCase();
    return ACTIVE_ASSET_STATUSES.has(status);
  };
  const getUserLoans = (user: User): LoanGroup[] => {
    const loanGroups = new Map<string, LoanGroup>();
    const addLoan = (catalogItemId: string, quantity: number, assetCode?: string) => {
      if (!catalogItemId || quantity <= 0) {
        return;
      }
      const existing = loanGroups.get(catalogItemId);
      if (existing) {
        existing.quantity += quantity;
        if (assetCode) {
          existing.assetCodes.push(assetCode);
        }
        return;
      }
      loanGroups.set(catalogItemId, {
        catalogItemId,
        quantity,
        assetCodes: assetCode ? [assetCode] : [],
      });
    };
    // Physical assets currently assigned to the user.
    assets
      .filter((asset) => {
        const assignedUserId = String(asset.assigned_to_user_id ?? '').trim();
        return assignedUserId === String(user.id).trim() && isActiveAsset(asset);
      })
      .forEach((asset) => {
        const catalogItemId = String(asset.catalog_item_id ?? '').trim();
        addLoan(catalogItemId, 1, asset.asset_code ? String(asset.asset_code) : undefined);
      });

    // Reusable consumables/equipment issued through completed requests.
    requests
      .filter((request) => request.user_id === user.id && request.status === 'HANDED_OVER')
      .forEach((request) => {
        (request.items ?? [])
          .filter((item) => !item.asset_id && item.usage === 'REUSABLE')
          .forEach((item) => {
            const catalogItemId = String(item.catalog_item_id ?? '').trim();
            const quantity = Number(item.requested_qty) || 0;
            addLoan(catalogItemId, quantity);
          });
      });
    return Array.from(loanGroups.values());
  };

  const getCatalogItem = (catalogItemId: string) => {
    return catalogItems.find(
      (item) => String(item.id).trim() === catalogItemId || String(item.item_code).trim() === catalogItemId
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full idea-bg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
            Our Members
          </span>
          <h2 className="text-2xl font-bold text-[var(--color-idea-text)] tracking-tight mt-1">
            Student <span className="text-[var(--color-idea-blue)]">List</span>
          </h2>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.target.value)}
            placeholder="Search student..."
            className="idea-input pl-9 pr-4 py-2 text-xs"
          />
          <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Pending account requests */}
      {isAdmin && pendingAccountRequests.length > 0 && (
        <div className="idea-card p-5 mt-5 space-y-4">
          <div>
            <p className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
              Approval Requests
            </p>
            <h3 className="text-lg font-bold text-[var(--color-idea-text)] mt-1">Students waiting for approval</h3>
          </div>
          <div className="space-y-3">
            {pendingAccountRequests.map((request) => {
              const isReviewing = reviewingId === request.id;
              return (
                <div
                  key={request.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--color-idea-border)] p-4"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--color-idea-text)] truncate">{request.name}</p>
                    <p className="text-xs text-[var(--color-idea-muted)] truncate">{request.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isReviewing}
                      onClick={() => reviewRequest(request, 'REJECTED')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold idea-error cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={isReviewing}
                      onClick={() => reviewRequest(request, 'APPROVED')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--color-idea-blue)] text-white cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {filteredUsers.map((user) => {
          const userLoans = getUserLoans(user);
          const activeLoanCount = userLoans.reduce((total, loan) => total + loan.quantity, 0);
          const isEditing = editingUserId === user.id;
          const isSaving = savingUserId === user.id;
          const isCurrentUser = user.id === activeUser?.id;
          const isUserAdmin = user.role === 'ADMIN';
          return (
            <div key={user.id} className="idea-card p-6 flex flex-col justify-between space-y-4">
              {/* User details */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-[var(--color-idea-text)] text-base truncate">{user.name}</h3>
                    <p className="text-xs text-[var(--color-idea-muted)] mt-0.5 truncate">{user.email}</p>
                  </div>
                  {isEditing ? (
                    <select
                      value={editingRole}
                      onChange={(event) => setEditingRole(event.target.value as User['role'])}
                      className={`shrink-0 text-[10px] py-1.5 rounded-full font-bold uppercase tracking-wider outline-none cursor-pointer ${getRoleBadge(
                        editingRole
                      )}`}
                    >
                      {EDITABLE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {getRoleName(role)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${getRoleBadge(
                        user.role
                      )}`}
                    >
                      {getRoleName(user.role)}
                    </span>
                  )}
                </div>
                {/* Active loans */}
                <div className="pt-3 border-t border-[var(--color-idea-border)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[var(--color-idea-muted)] uppercase tracking-widest">
                      Items Assigned
                    </span>
                    <span className="text-xs font-bold font-mono text-[var(--color-idea-text)]">
                      {activeLoanCount} {activeLoanCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  {/* Loan list */}
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {userLoans.length === 0 ? (
                      <p className="text-xs text-[var(--color-idea-muted)] italic">No items assigned yet.</p>
                    ) : (
                      userLoans.map((loan) => {
                        const catalogItem = getCatalogItem(loan.catalogItemId);
                        return (
                          <div
                            key={loan.catalogItemId}
                            className="p-2.5 idea-gradient-soft border border-[var(--color-idea-blue)]/20 rounded-xl"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-bold text-[var(--color-idea-text)] truncate">
                                {catalogItem?.name ?? 'Unknown Item'}
                              </span>
                              <span className="shrink-0 min-w-[32px] text-center px-2 py-1 rounded-lg bg-[rgba(10,174,240,0.10)] text-[var(--color-idea-blue)] font-mono font-bold text-xs">
                                {loan.quantity}
                              </span>
                            </div>
                            {loan.assetCodes.length > 0 && (
                              <div className="mt-1.5 text-[10px] text-[var(--color-idea-muted)] font-mono">
                                {loan.assetCodes.join(' • ')}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              {/* Admin actions */}
              {isAdmin && (
                <div className="pt-3 border-t border-[var(--color-idea-border)] flex items-center justify-end gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--color-idea-muted)] hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveRole(user)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--color-idea-blue)] text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <>
                      {!isUserAdmin && (
                        <button
                          type="button"
                          onClick={() => startEditing(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--color-idea-blue)] border border-[var(--color-idea-blue)]/20 hover:bg-[rgba(10,174,240,0.08)] transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}
                      {!isCurrentUser && !isUserAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 idea-error rounded-xl text-xs font-bold transition-colors cursor-pointer hover:opacity-80"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredUsers.length === 0 && (
        <div className="idea-card p-10 text-center">
          <p className="text-sm font-bold text-[var(--color-idea-text)]">No users found</p>
          <p className="text-xs text-[var(--color-idea-muted)] mt-1">
            Try searching with a different name or user code.
          </p>
        </div>
      )}
    </div>
  );
};
