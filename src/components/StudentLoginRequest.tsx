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

  return (
    <div
      className={`mt-5 rounded-xl border p-4 text-left ${
        isRejected ? 'bg-red-50/80 border-red-200 text-red-900' : 'bg-amber-50/80 border-amber-200 text-amber-900'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {isRejected ? (
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        ) : (
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold">{isRejected ? 'Registration Declined' : 'Approval Pending'}</p>
          <p className="mt-1 text-xs opacity-90 leading-relaxed">
            {isRejected
              ? 'An administrator has declined this registration request. Please contact the lab in-charge.'
              : 'Your registration request has been submitted and is awaiting administrator verification.'}
          </p>
          {(name || email) && (
            <p className="mt-2 font-mono text-[11px] opacity-75 break-all">
              {name ? `${name} · ` : ''}
              {email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
