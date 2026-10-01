import React, { useState } from 'react';
import { Search, Pencil, Trash2, Check, X } from 'lucide-react';
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
type LoanGroup = { catalogItemId: string; quantity: number; assetCodes: string[] };
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
  const [searchFilter, setSearchFilter] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<User['role']>('STUDENT');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const isAdmin = userRole === 'ADMIN';
  const pendingAccountRequests = accountRequests.filter((request) => request.status === 'PENDING');
  const searchQuery = searchFilter.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    return user.name.toLowerCase().includes(searchQuery) || user.email.toLowerCase().includes(searchQuery);
  });
  const getRoleName = (role: User['role']) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'STUDENT_AMBASSADOR':
        return 'Student Ambassador';
      case 'STUDENT_LEAD':
        return 'Student Lead';
      case 'STUDENT':
        return 'Student';
      default:
        return String(role).replace(/_/g, ' ');
    }
  };
  const getRoleBadge = (role: User['role']) => {
    if (role === 'ADMIN') {
      return 'bg-[var(--color-idea-deep-blue)] text-white border-[var(--color-idea-deep-blue)]';
    }
    return 'bg-[var(--color-idea-light-grey)] text-[var(--color-idea-text)] border-[var(--color-idea-border)]';
  };
  const startEditing = (user: User) => {
    if (user.role === 'ADMIN') return;
    setEditingUserId(user.id);
    setEditingRole(user.role);
  };
  const cancelEditing = () => {
    setEditingUserId(null);
    setEditingRole('STUDENT');
  };
  const saveRole = async (user: User) => {
    if (!onUpdateUserRole) return;
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
  const handleDeleteUser = async (user: User) => {
    if (!onDeleteUser) return;
    if (user.id === activeUser?.id) {
      window.alert('You cannot delete your own account.');
      return;
    }
    if (user.role === 'ADMIN') {
      window.alert('Admin accounts cannot be removed from the directory.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${user.name}?`)) {
      return;
    }
    try {
      await onDeleteUser(user.id);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };
  const reviewRequest = async (request: AccountRequest, status: 'APPROVED' | 'REJECTED') => {
    if (!onReviewAccountRequest) return;
    const message =
      status === 'APPROVED' ? `Approve account for ${request.name}?` : `Decline account request for ${request.name}?`;
    if (!window.confirm(message)) return;
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
  const isActiveAsset = (asset: Asset) =>
    ACTIVE_ASSET_STATUSES.has(
      String(asset.status ?? '')
        .trim()
        .toUpperCase()
    );
  const getUserLoans = (user: User): LoanGroup[] => {
    const loanGroups = new Map<string, LoanGroup>();
    const addLoan = (catalogItemId: string, quantity: number, assetCode?: string) => {
      if (!catalogItemId || quantity <= 0) return;
      const existing = loanGroups.get(catalogItemId);
      if (existing) {
        existing.quantity += quantity;
        if (assetCode) {
          existing.assetCodes.push(assetCode);
        }
        return;
      }
      loanGroups.set(catalogItemId, { catalogItemId, quantity, assetCodes: assetCode ? [assetCode] : [] });
    };
    assets
      .filter(
        (asset) => String(asset.assigned_to_user_id ?? '').trim() === String(user.id).trim() && isActiveAsset(asset)
      )
      .forEach((asset) =>
        addLoan(String(asset.catalog_item_id ?? '').trim(), 1, asset.asset_code ? String(asset.asset_code) : undefined)
      );
    requests
      .filter((request) => request.user_id === user.id && request.status === 'HANDED_OVER')
      .forEach((request) => {
        (request.items ?? [])
          .filter((item) => !item.asset_id && item.usage === 'REUSABLE')
          .forEach((item) => addLoan(String(item.catalog_item_id ?? '').trim(), Number(item.requested_qty) || 0));
      });
    return Array.from(loanGroups.values());
  };
  const getCatalogItem = (catalogItemId: string) =>
    catalogItems.find(
      (item) => String(item.id).trim() === catalogItemId || String(item.item_code).trim() === catalogItemId
    );
  return (
    <div className="flex-1 overflow-y-auto idea-bg">
      {' '}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {' '}
        {/* Header */}{' '}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          {' '}
          <div>
            {' '}
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-idea-text)]">
              {' '}
              Directory{' '}
            </h1>{' '}
            <p className="mt-1.5 text-sm text-[var(--color-idea-muted)]">
              {' '}
              Manage laboratory members, roles, and access.{' '}
            </p>{' '}
          </div>{' '}
          <div className="relative w-full lg:w-80">
            {' '}
            <Search className=" absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-idea-muted)] pointer-events-none " />{' '}
            <input
              type="text"
              value={searchFilter}
              onChange={(event) => setSearchFilter(event.target.value)}
              placeholder="Search members..."
              className=" w-full pl-9 pr-4 py-2.5 bg-white border border-[var(--color-idea-border)] rounded-xl text-sm text-[var(--color-idea-text)] placeholder:text-[var(--color-idea-muted)] outline-none transition focus:border-[var(--color-idea-blue)] focus:ring-2 focus:ring-[var(--color-idea-blue)]/10 "
            />{' '}
          </div>{' '}
        </div>{' '}
        {/* Pending Account Requests */}{' '}
        {isAdmin && pendingAccountRequests.length > 0 && (
          <section className=" bg-white border border-[var(--color-idea-border)] rounded-2xl overflow-hidden ">
            {' '}
            <div className="px-5 py-4 border-b border-[var(--color-idea-border)]">
              {' '}
              <div className="flex items-center justify-between gap-3">
                {' '}
                <div>
                  {' '}
                  <h2 className="text-sm font-semibold text-[var(--color-idea-text)]"> Pending Approvals </h2>{' '}
                  <p className="mt-0.5 text-xs text-[var(--color-idea-muted)]">
                    {' '}
                    Review requests for new laboratory members.{' '}
                  </p>{' '}
                </div>{' '}
                <span className=" min-w-7 h-7 px-2 rounded-lg flex items-center justify-center bg-[var(--color-idea-light-grey)] border border-[var(--color-idea-border)] text-xs font-semibold text-[var(--color-idea-text)] ">
                  {' '}
                  {pendingAccountRequests.length}{' '}
                </span>{' '}
              </div>{' '}
            </div>{' '}
            <div className="divide-y divide-[var(--color-idea-border)]">
              {' '}
              {pendingAccountRequests.map((request) => {
                const isReviewing = reviewingId === request.id;
                return (
                  <div
                    key={request.id}
                    className=" px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 "
                  >
                    {' '}
                    <div className="min-w-0">
                      {' '}
                      <p className="text-sm font-medium text-[var(--color-idea-text)] truncate">
                        {' '}
                        {request.name}{' '}
                      </p>{' '}
                      <p className="mt-0.5 text-xs text-[var(--color-idea-muted)] truncate"> {request.email} </p>{' '}
                    </div>{' '}
                    <div className="flex items-center gap-2 shrink-0">
                      {' '}
                      <button
                        type="button"
                        disabled={isReviewing}
                        onClick={() => reviewRequest(request, 'REJECTED')}
                        className=" inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-idea-border)] bg-white text-xs font-medium text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] transition-colors disabled:opacity-50 "
                      >
                        {' '}
                        <X className="w-3.5 h-3.5" /> Decline{' '}
                      </button>{' '}
                      <button
                        type="button"
                        disabled={isReviewing}
                        onClick={() => reviewRequest(request, 'APPROVED')}
                        className=" inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-idea-blue)] text-white text-xs font-medium hover:brightness-95 transition disabled:opacity-50 "
                      >
                        {' '}
                        <Check className="w-3.5 h-3.5" /> Approve{' '}
                      </button>{' '}
                    </div>{' '}
                  </div>
                );
              })}{' '}
            </div>{' '}
          </section>
        )}{' '}
        {/* User Cards */}{' '}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {' '}
          {filteredUsers.map((user) => {
            const userLoans = getUserLoans(user);
            const activeLoanCount = userLoans.reduce((total, loan) => total + loan.quantity, 0);
            const isEditing = editingUserId === user.id;
            const isSaving = savingUserId === user.id;
            const isCurrentUser = user.id === activeUser?.id;
            const isUserAdmin = user.role === 'ADMIN';
            return (
              <article
                key={user.id}
                className=" bg-white border border-[var(--color-idea-border)] rounded-2xl overflow-hidden transition hover:border-[var(--color-idea-blue)]/40 hover:shadow-sm "
              >
                {' '}
                {/* User Header */}{' '}
                <div className="p-5">
                  {' '}
                  <div className="flex items-start justify-between gap-3">
                    {' '}
                    <div className="min-w-0">
                      {' '}
                      <h3 className="text-sm font-semibold text-[var(--color-idea-text)] truncate">
                        {' '}
                        {user.name}{' '}
                      </h3>{' '}
                      <p className="mt-1 text-xs text-[var(--color-idea-muted)] truncate"> {user.email} </p>{' '}
                    </div>{' '}
                    {isEditing ? (
                      <select
                        value={editingRole}
                        onChange={(event) => setEditingRole(event.target.value as User['role'])}
                        className=" shrink-0 max-w-[145px] px-2.5 py-1.5 rounded-lg bg-white border border-[var(--color-idea-border)] text-[11px] font-medium text-[var(--color-idea-text)] outline-none focus:border-[var(--color-idea-blue)] "
                      >
                        {' '}
                        {EDITABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {' '}
                            {getRoleName(role)}{' '}
                          </option>
                        ))}{' '}
                      </select>
                    ) : (
                      <span
                        className={` shrink-0 px-2.5 py-1 rounded-lg border text-[10px] font-medium whitespace-nowrap ${getRoleBadge(user.role)} `}
                      >
                        {' '}
                        {getRoleName(user.role)}{' '}
                      </span>
                    )}{' '}
                  </div>{' '}
                </div>{' '}
                {/* Assigned Items */}{' '}
                <div className="px-5 pb-5">
                  {' '}
                  <div className="border-t border-[var(--color-idea-border)] pt-4">
                    {' '}
                    <div className="flex items-center justify-between mb-3">
                      {' '}
                      <span className="text-[10px] font-semibold text-[var(--color-idea-muted)] uppercase tracking-wider">
                        {' '}
                        Assigned Items{' '}
                      </span>{' '}
                      <span className="text-xs font-semibold text-[var(--color-idea-text)]">
                        {' '}
                        {activeLoanCount}{' '}
                      </span>{' '}
                    </div>{' '}
                    {userLoans.length === 0 ? (
                      <div className="py-3 px-3 rounded-xl bg-[var(--color-idea-light-grey)]/50">
                        {' '}
                        <p className="text-xs text-[var(--color-idea-muted)]"> No equipment assigned </p>{' '}
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {' '}
                        {userLoans.map((loan) => {
                          const catalogItem = getCatalogItem(loan.catalogItemId);
                          return (
                            <div
                              key={loan.catalogItemId}
                              className=" flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[var(--color-idea-light-grey)]/50 "
                            >
                              {' '}
                              <span className="text-xs font-medium text-[var(--color-idea-text)] truncate">
                                {' '}
                                {catalogItem?.name ?? 'Unknown Item'}{' '}
                              </span>{' '}
                              <span className="shrink-0 text-xs font-semibold text-[var(--color-idea-muted)]">
                                {' '}
                                {loan.quantity}×{' '}
                              </span>{' '}
                            </div>
                          );
                        })}{' '}
                      </div>
                    )}{' '}
                  </div>{' '}
                </div>{' '}
                {/* Actions */}{' '}
                {isAdmin && (
                  <div className=" px-5 py-3.5 border-t border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/30 ">
                    {' '}
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-2">
                        {' '}
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className=" inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-idea-border)] bg-white text-xs font-medium text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] transition-colors disabled:opacity-50 "
                        >
                          {' '}
                          <X className="w-3.5 h-3.5" /> Cancel{' '}
                        </button>{' '}
                        <button
                          type="button"
                          onClick={() => saveRole(user)}
                          disabled={isSaving}
                          className=" inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-idea-blue)] text-white text-xs font-medium hover:brightness-95 transition disabled:opacity-50 "
                        >
                          {' '}
                          <Check className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save'}{' '}
                        </button>{' '}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        {' '}
                        <span className="text-[10px] text-[var(--color-idea-muted)]">
                          {' '}
                          {isCurrentUser ? 'Current account' : isUserAdmin ? 'Administrator' : 'Member'}{' '}
                        </span>{' '}
                        <div className="flex items-center gap-2">
                          {' '}
                          {!isUserAdmin && (
                            <button
                              type="button"
                              onClick={() => startEditing(user)}
                              className=" inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-idea-border)] bg-white text-xs font-medium text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] transition-colors "
                            >
                              {' '}
                              <Pencil className="w-3.5 h-3.5" /> Edit{' '}
                            </button>
                          )}{' '}
                          {!isCurrentUser && !isUserAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className=" inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-white text-xs font-medium text-[var(--color-idea-red)] hover:bg-red-50 transition-colors "
                            >
                              {' '}
                              <Trash2 className="w-3.5 h-3.5" /> Remove{' '}
                            </button>
                          )}{' '}
                        </div>{' '}
                      </div>
                    )}{' '}
                  </div>
                )}{' '}
              </article>
            );
          })}{' '}
        </div>{' '}
        {/* Empty State */}{' '}
        {filteredUsers.length === 0 && (
          <div className=" bg-white border border-[var(--color-idea-border)] rounded-2xl py-14 px-6 text-center ">
            {' '}
            <div className=" w-10 h-10 mx-auto rounded-xl bg-[var(--color-idea-light-grey)] flex items-center justify-center mb-3 ">
              {' '}
              <Search className="w-5 h-5 text-[var(--color-idea-muted)]" />{' '}
            </div>{' '}
            <p className="text-sm font-semibold text-[var(--color-idea-text)]"> No members found </p>{' '}
            <p className="mt-1 text-xs text-[var(--color-idea-muted)]"> Try a different name or email. </p>{' '}
          </div>
        )}{' '}
      </div>{' '}
    </div>
  );
};
