import React from 'react';
import type { AccountRequestStatus } from '../types/inventory';
import { Clock, AlertCircle } from 'lucide-react';

interface StudentLoginRequestProps {
  status: AccountRequestStatus;
  name?: string;
  email?: string;
}

export const StudentLoginRequest: React.FC<StudentLoginRequestProps> = ({ status, name, email }) => {
  const isRejected = status === 'REJECTED';

  const Icon = isRejected ? AlertCircle : Clock;
  const title = isRejected ? 'Registration declined' : 'Waiting for approval';
  const message = isRejected
    ? 'An administrator declined this request. Contact your lab in-charge for help.'
    : 'Your request is submitted. You can sign in once an administrator approves it.';

  return (
    <div
      role={isRejected ? 'alert' : 'status'}
      className={`mt-6 w-full rounded-2xl p-4 text-left ring-1 ring-inset sm:p-5 ${
        isRejected ? 'bg-red-50 text-red-950 ring-red-200/80' : 'bg-amber-50 text-amber-950 ring-amber-200/80'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            isRejected ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug tracking-tight">{title}</p>
          <p className="mt-1 text-[14px] leading-relaxed opacity-80">{message}</p>

          {(name || email) && (
            <div className={`mt-3.5 border-t pt-3 ${isRejected ? 'border-red-200/70' : 'border-amber-200/70'}`}>
              {name && <p className="truncate text-[14px] font-medium leading-snug">{name}</p>}
              {email && <p className="break-all text-[13px] leading-snug opacity-70">{email}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
