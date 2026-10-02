export type { User, UserRole, AccountRequest, AccountRequestStatus } from '../../shared/types/inventory';
export {
  isStudent,
  isAmbassador,
  isAdmin,
  canIssueInventory,
  canApproveRequests,
  canManageCatalog,
  canManageUsers,
  canReturnOrRepairItems,
} from '../../shared/lib';
export { isAdminAccount, resolveRoleFromEmail } from '../../shared/lib';
