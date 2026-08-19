import React, { useState } from 'react';
import { Search, QrCode } from 'lucide-react';
import { User, Asset, CatalogItem } from '../types/inventory';

interface UsersViewProps {
  users: User[];
  assets: Asset[];
  catalogItems: CatalogItem[];
  onOpenQRGenerator: (
    code: string,
    title: string,
    subtitle?: string
  ) => void;
  onRefreshData: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  assets,
  catalogItems,
  onOpenQRGenerator,
  onRefreshData,
}) => {
  const [searchFilter, setSearchFilter] = useState('');

  const filteredUsers = users.filter((u) => {
    if (searchFilter) {
      const q = searchFilter.toLowerCase();

      if (
        !u.name.toLowerCase().includes(q) &&
        !u.user_code.toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700';

      case 'STUDENT_AMBASSADOR':
        return 'bg-blue-100 text-blue-700';

      case 'STUDENT_LEAD':
        return 'bg-amber-100 text-amber-700';

      case 'STUDENT':
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getRoleName = (role: string) => {
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
        return role.replace(/_/g, ' ');
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto max-w-7xl mx-auto w-full">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Lab User Directory
          </h2>

          <p className="text-xs text-slate-500">
            Students, student leads, ambassadors, and lab supervisors
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">

          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search student or code..."
            className="
              pl-9
              pr-4
              py-2
              bg-white
              border
              border-slate-200
              rounded-xl
              text-xs
              w-full
              outline-none
              focus:ring-2
              focus:ring-blue-500
              shadow-sm
            "
          />

          <Search
            className="
              w-4
              h-4
              text-slate-400
              absolute
              left-3
              top-2.5
            "
          />

        </div>
      </div>

      {/* User Count */}
      <div className="text-xs text-slate-500">
        Showing{' '}
        <span className="font-bold text-slate-900">
          {filteredUsers.length}
        </span>{' '}
        users
      </div>

      {/* User Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {filteredUsers.map((u) => {

          const userLoans = assets.filter(
            (a) =>
              a.assigned_to_user_id === u.id &&
              a.status === 'ISSUED'
          );

          return (
            <div
              key={u.id}
              className="
                bg-white
                rounded-3xl
                border
                border-slate-200
                shadow-sm
                p-6
                flex
                flex-col
                justify-between
                hover:border-blue-200
                transition-all
                space-y-4
              "
            >

              {/* User Details */}
              <div className="space-y-3">

                <div className="flex items-start justify-between">

                  <div>

                    <h3 className="font-bold text-slate-900 text-base">
                      {u.name}
                    </h3>

                    <p className="text-xs font-mono font-bold text-blue-600">
                      {u.user_code}
                    </p>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {u.email}
                    </p>

                  </div>

                  {/* Role */}
                  <span
                    className={`
                      text-[10px]
                      px-2.5
                      py-1
                      rounded-full
                      font-bold
                      uppercase
                      tracking-wider
                      ${getRoleBadge(u.role)}
                    `}
                  >
                    {getRoleName(u.role)}
                  </span>

                </div>

                {/* Active Loans */}
                <div className="pt-3 border-t border-slate-100">

                  <div className="flex items-center justify-between mb-2">

                    <span
                      className="
                        text-xs
                        font-bold
                        text-slate-400
                        uppercase
                        tracking-widest
                      "
                    >
                      Active Loans
                    </span>

                    <span
                      className="
                        text-xs
                        font-bold
                        font-mono
                        text-slate-900
                      "
                    >
                      {userLoans.length} items
                    </span>

                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto">

                    {userLoans.length === 0 ? (

                      <p className="text-xs text-slate-400 italic">
                        No equipment currently checked out.
                      </p>

                    ) : (

                      userLoans.map((a) => {

                        const cat = catalogItems.find(
                          (c) => c.id === a.catalog_item_id
                        );

                        return (
                          <div
                            key={a.id}
                            className="
                              p-2
                              bg-blue-50/60
                              border
                              border-blue-100
                              rounded-xl
                              flex
                              items-center
                              justify-between
                              text-xs
                            "
                          >

                            <span className="font-bold text-slate-800">
                              {cat?.name || 'Unknown Item'}
                            </span>

                            <span
                              className="
                                font-mono
                                text-blue-600
                                text-[11px]
                                font-bold
                              "
                            >
                              {a.asset_code}
                            </span>

                          </div>
                        );
                      })
                    )}

                  </div>
                </div>

              </div>

              {/* QR Button */}
              <div className="pt-3 border-t border-slate-100 text-right">

                <button
                  type="button"
                  onClick={() =>
                    onOpenQRGenerator(
                      u.user_code,
                      u.name,
                      `Role: ${getRoleName(u.role)}`
                    )
                  }
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    px-3
                    py-1.5
                    bg-slate-100
                    hover:bg-slate-900
                    text-slate-700
                    hover:text-white
                    rounded-xl
                    text-xs
                    font-bold
                    transition-colors
                    cursor-pointer
                  "
                >
                  <QrCode className="w-3.5 h-3.5" />

                  Print User ID QR
                </button>

              </div>

            </div>
          );
        })}

      </div>

      {/* No Users */}
      {filteredUsers.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">

          <p className="text-sm font-bold text-slate-700">
            No users found
          </p>

          <p className="text-xs text-slate-400 mt-1">
            Try searching with a different name or user code.
          </p>

        </div>
      )}

    </div>
  );
};