import React, { useState } from "react";
import { Search, Trash2, Pencil, Check, X } from "lucide-react";
import {
  User,
  Asset,
  CatalogItem,
  AccountRequest,
} from "../types/inventory";
import { isAdminAccount } from "../services/roleConfig";

interface UsersViewProps {
  users: User[];
  assets: Asset[];
  catalogItems: CatalogItem[];
  activeUser: User | null;
  onUpdateUserRole?: (
    userId: string,
    newRole: User["role"],
  ) => Promise<void>;
  onDeleteUser?: (userId: string) => Promise<void>;
  accountRequests?: AccountRequest[];
  onReviewAccountRequest?: (
    requestId: string,
    status: "APPROVED" | "REJECTED",
  ) => Promise<void>;
  onRefreshData: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  assets,
  catalogItems,
  activeUser,
  onUpdateUserRole,
  onDeleteUser,
  accountRequests = [],
  onReviewAccountRequest,
}) => {
  // =========================================================
  // STATE
  // =========================================================

  const [searchFilter, setSearchFilter] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] =
    useState<User["role"]>("STUDENT");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // =========================================================
  // ACCOUNT REQUESTS
  // =========================================================

  const pendingAccountRequests = accountRequests.filter(
    (request) => request.status === "PENDING",
  );

  // =========================================================
  // USERS
  // =========================================================

  const filteredUsers = users.filter((user) => {
    const query = searchFilter.trim().toLowerCase();

    if (!query) return true;

    return (
      user.name.toLowerCase().includes(query) ||
      user.user_code.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  const isAdmin = isAdminAccount(
    activeUser?.email,
    activeUser?.role,
  );

  // =========================================================
  // ROLE HELPERS
  // =========================================================

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-[rgba(10,174,240,0.12)] text-[var(--color-idea-deep-blue)] border border-[var(--color-idea-blue)]/30";

      case "STUDENT_AMBASSADOR":
        return "bg-[rgba(133,180,64,0.12)] text-[#3d6b10] border border-[var(--color-idea-green)]/30";

      case "STUDENT_LEAD":
        return "bg-[rgba(255,202,8,0.15)] text-[#7a5e00] border border-[var(--color-idea-yellow)]/40";

      case "STUDENT":
      default:
        return "bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] border border-[var(--color-idea-border)]";
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "ADMIN";

      case "STUDENT_AMBASSADOR":
        return "STUDENT AMBASSADOR";

      case "STUDENT_LEAD":
        return "STUDENT LEAD";

      case "STUDENT":
        return "STUDENT";

      default:
        return role.replace(/_/g, " ");
    }
  };

  // =========================================================
  // EDIT USER
  // =========================================================

  const startEditing = (user: User) => {
    if (user.role === "ADMIN") return;

    setEditingUserId(user.id);
    setEditingRole(user.role || "STUDENT");
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditingRole("STUDENT");
  };

  const saveRole = async (user: User) => {
    if (!onUpdateUserRole) return;

    if (editingRole === "ADMIN") {
      alert("Users cannot be promoted to Admin.");
      return;
    }

    if (user.role === "ADMIN") {
      alert("Admin users cannot have their position changed.");
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
      console.error(
        "Failed to update user position:",
        error,
      );
    } finally {
      setSavingUserId(null);
    }
  };

  // =========================================================
  // DELETE USER
  // =========================================================

  const handleDeleteUser = async (user: User) => {
    if (!onDeleteUser) return;

    if (user.id === activeUser?.id) {
      alert("You cannot delete your own account.");
      return;
    }

    if (isAdminAccount(user.email, user.role)) {
      alert(
        "Admin accounts cannot be removed from the directory.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove ${user.name}?`,
    );

    if (!confirmed) return;

    try {
      await onDeleteUser(user.id);
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  // =========================================================
  // REVIEW ACCOUNT REQUEST
  // =========================================================

  const reviewRequest = async (
    request: AccountRequest,
    status: "APPROVED" | "REJECTED",
  ) => {
    if (!onReviewAccountRequest) return;

    const confirmed = window.confirm(
      status === "APPROVED"
        ? `Approve account for ${request.name}? They will be able to sign in as a student.`
        : `Decline account request for ${request.name}?`,
    );

    if (!confirmed) return;

    try {
      setReviewingId(request.id);

      await onReviewAccountRequest(
        request.id,
        status,
      );
    } catch (error) {
      console.error(
        "Failed to review account request:",
        error,
      );

      alert("Failed to update the account request.");
    } finally {
      setReviewingId(null);
    }
  };

  // =========================================================
  // ACTIVE ASSET CHECK
  // =========================================================
  //
  // Your old code only accepted:
  //
  //     status === "ISSUED"
  //
  // This version accepts several common active statuses.
  //
  // =========================================================

  const isActiveAsset = (asset: Asset) => {
    const status = String(asset.status || "")
      .trim()
      .toUpperCase();

    const activeStatuses = [
      "ISSUED",
      "CHECKED_OUT",
      "CHECKED-OUT",
      "CHECKED OUT",
      "BORROWED",
      "ACTIVE",
      "OUT",
      "ASSIGNED",
    ];

    return activeStatuses.includes(status);
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto max-w-7xl mx-auto w-full idea-bg">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
            Our Members
          </span>

          <h2 className="text-2xl font-bold text-[var(--color-idea-text)] tracking-tight mt-1">
            Student{" "}
            <span className="text-[var(--color-idea-blue)]">
              Records
            </span>
          </h2>

          <p className="text-xs text-[var(--color-idea-muted)] mt-1">
            Admins, Student Ambassadors, Student Leads and Students
          </p>
        </div>

        {/* SEARCH */}

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchFilter}
            onChange={(event) =>
              setSearchFilter(event.target.value)
            }
            placeholder="Search student or code..."
            className="idea-input pl-9 pr-4 py-2 text-xs"
          />

          <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-2.5" />
        </div>
      </div>

      {/* =====================================================
          PENDING ACCOUNT REQUESTS
      ====================================================== */}

      {isAdmin && pendingAccountRequests.length > 0 && (
        <div className="idea-card p-5 space-y-4">
          <div>
            <p className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
              Access requests
            </p>

            <h3 className="text-lg font-bold text-[var(--color-idea-text)] mt-1">
              Students waiting for approval
            </h3>
          </div>

          <div className="space-y-3">
            {pendingAccountRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--color-idea-border)] p-4"
              >
                <div className="min-w-0">
                  <p className="font-bold text-[var(--color-idea-text)] truncate">
                    {request.name}
                  </p>

                  <p className="text-xs text-[var(--color-idea-muted)] truncate">
                    {request.email}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={
                      reviewingId === request.id
                    }
                    onClick={() =>
                      reviewRequest(
                        request,
                        "REJECTED",
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold idea-error cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </button>

                  <button
                    type="button"
                    disabled={
                      reviewingId === request.id
                    }
                    onClick={() =>
                      reviewRequest(
                        request,
                        "APPROVED",
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--color-idea-blue)] text-white cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================
          USER COUNT
      ====================================================== */}

      <div className="text-xs text-[var(--color-idea-muted)]">
        Showing{" "}
        <span className="font-bold text-[var(--color-idea-text)]">
          {filteredUsers.length}
        </span>{" "}
        members
      </div>

      {/* =====================================================
          USER GRID
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {filteredUsers.map((user) => {

          // ---------------------------------------------------
          // FIND ALL ACTIVE ASSETS BELONGING TO THIS USER
          // ---------------------------------------------------

          const userLoans = assets.filter((asset) => {

            const assignedUserId = String(
              asset.assigned_to_user_id ?? "",
            ).trim();

            const currentUserId = String(
              user.id ?? "",
            ).trim();

            const belongsToUser =
              assignedUserId !== "" &&
              assignedUserId === currentUserId;

            const active =
              isActiveAsset(asset);

            return belongsToUser && active;
          });

          // ---------------------------------------------------
          // GROUP SAME CATALOG ITEMS
          // ---------------------------------------------------

          const groupedLoans = Object.values(
            userLoans.reduce(
              (
                groups,
                asset,
              ) => {

                const catalogId = String(
                  asset.catalog_item_id ?? "",
                ).trim();

                if (!catalogId) {
                  return groups;
                }

                if (!groups[catalogId]) {
                  groups[catalogId] = {
                    catalogItemId: catalogId,
                    quantity: 0,
                    assetCodes: [],
                  };
                }

                groups[catalogId].quantity += 1;

                if (asset.asset_code) {
                  groups[catalogId].assetCodes.push(
                    asset.asset_code,
                  );
                }

                return groups;
              },
              {} as Record<
                string,
                {
                  catalogItemId: string;
                  quantity: number;
                  assetCodes: string[];
                }
              >,
            ),
          );

          const isEditing =
            editingUserId === user.id;

          const isSaving =
            savingUserId === user.id;

          const isCurrentUser =
            user.id === activeUser?.id;

          const isUserAdmin =
            isAdminAccount(
              user.email,
              user.role,
            );

          return (
            <div
              key={user.id}
              className="idea-card p-6 flex flex-col justify-between space-y-4"
            >

              {/* =================================================
                  USER DETAILS
              ================================================== */}

              <div className="space-y-3">

                <div className="flex items-start justify-between gap-3">

                  <div className="min-w-0">

                    <h3 className="font-bold text-[var(--color-idea-text)] text-base truncate">
                      {user.name}
                    </h3>

                    <p className="text-xs font-mono font-bold text-[var(--color-idea-blue)] mt-0.5">
                      {user.user_code}
                    </p>

                    <p className="text-xs text-[var(--color-idea-muted)] mt-0.5 truncate">
                      {user.email}
                    </p>

                  </div>

                  {/* ROLE */}

                  {isEditing ? (

                    <select
                      value={editingRole}
                      onChange={(event) =>
                        setEditingRole(
                          event.target.value as User["role"],
                        )
                      }
                      className={`shrink-0 text-[10px] px-2.5 py-1.5 rounded-full font-bold uppercase tracking-wider outline-none cursor-pointer ${getRoleBadge(
                        editingRole,
                      )}`}
                    >

                      <option value="STUDENT">
                        STUDENT
                      </option>

                      <option value="STUDENT_LEAD">
                        STUDENT LEAD
                      </option>

                      <option value="STUDENT_AMBASSADOR">
                        STUDENT AMBASSADOR
                      </option>

                    </select>

                  ) : (

                    <span
                      className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${getRoleBadge(
                        user.role,
                      )}`}
                    >
                      {getRoleName(user.role)}
                    </span>

                  )}

                </div>

                {/* =================================================
                    ACTIVE LOANS
                ================================================== */}

                <div className="pt-3 border-t border-[var(--color-idea-border)]">

                  <div className="flex items-center justify-between mb-2">

                    <span className="text-xs font-bold text-[var(--color-idea-muted)] uppercase tracking-widest">
                      Active Loans
                    </span>

                    <span className="text-xs font-bold font-mono text-[var(--color-idea-text)]">
                      {userLoans.length}{" "}
                      {userLoans.length === 1
                        ? "item"
                        : "items"}
                    </span>

                  </div>

                  {/* =================================================
                      ITEM LIST
                  ================================================== */}

                  <div className="space-y-1.5 max-h-36 overflow-y-auto">

                    {groupedLoans.length === 0 ? (

                      <p className="text-xs text-[var(--color-idea-muted)] italic">
                        No equipment currently checked out.
                      </p>

                    ) : (

                      groupedLoans.map((loan) => {

                        const catalogItem =
                          catalogItems.find(
                            (item) =>
                              String(item.id).trim() ===
                              String(
                                loan.catalogItemId,
                              ).trim(),
                          );

                        return (
                          <div
                            key={
                              loan.catalogItemId
                            }
                            className="p-2.5 idea-gradient-soft border border-[var(--color-idea-blue)]/20 rounded-xl"
                          >

                            <div className="flex items-center justify-between gap-3">

                              {/* ITEM NAME */}

                              <span className="font-bold text-[var(--color-idea-text)] truncate">
                                {catalogItem?.name ||
                                  "Unknown Item"}
                              </span>

                              {/* NUMBER */}

                              <span className="shrink-0 min-w-[32px] text-center px-2 py-1 rounded-lg bg-[rgba(10,174,240,0.10)] text-[var(--color-idea-blue)] font-mono font-bold text-xs">
                                {loan.quantity}
                              </span>

                            </div>

                            {/* ASSET NUMBERS */}

                            {loan.assetCodes.length > 0 && (
                              <div className="mt-1.5 text-[10px] text-[var(--color-idea-muted)] font-mono">
                                {loan.assetCodes.join(
                                  " • ",
                                )}
                              </div>
                            )}

                          </div>
                        );
                      })
                    )}

                  </div>
                </div>

              </div>

              {/* =================================================
                  FOOTER ACTIONS
              ================================================== */}

              {isAdmin && (

                <div className="pt-3 border-t border-[var(--color-idea-border)] flex items-center justify-end gap-2">

                  {isEditing ? (

                    <>
                      {/* CANCEL */}

                      <button
                        type="button"
                        onClick={
                          cancelEditing
                        }
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--color-idea-muted)] hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>

                      {/* SAVE */}

                      <button
                        type="button"
                        onClick={() =>
                          saveRole(user)
                        }
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--color-idea-blue)] text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />

                        {isSaving
                          ? "Saving..."
                          : "Save"}
                      </button>
                    </>

                  ) : (

                    <>

                      {/* EDIT */}

                      {!isUserAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            startEditing(user)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--color-idea-blue)] border border-[var(--color-idea-blue)]/20 hover:bg-[rgba(10,174,240,0.08)] transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}

                      {/* DELETE */}

                      {!isCurrentUser &&
                        !isUserAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteUser(
                                user,
                              )
                            }
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

      {/* =====================================================
          NO USERS
      ====================================================== */}

      {filteredUsers.length === 0 && (

        <div className="idea-card p-10 text-center">

          <p className="text-sm font-bold text-[var(--color-idea-text)]">
            No users found
          </p>

          <p className="text-xs text-[var(--color-idea-muted)] mt-1">
            Try searching with a different name or user code.
          </p>

        </div>

      )}

    </div>
  );
};