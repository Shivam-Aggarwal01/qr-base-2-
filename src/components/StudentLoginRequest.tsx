import React from 'react';
import type { AccountRequestStatus } from '../types/inventory';

interface StudentLoginRequestProps {
  status: AccountRequestStatus;
  name?: string;
  email?: string;
}

export const StudentLoginRequest: React.FC<StudentLoginRequestProps> = ({ status, name, email }) => {
  const isRejected = status === 'REJECTED';

  return (
    <div
      className={`mt-6 rounded-xl border-l-4 bg-idea-background p-4 text-left ${
        isRejected ? 'border-l-idea-red' : 'border-l-idea-yellow'
      }`}
    >
      <p className="text-sm font-semibold text-idea-text">{isRejected ? 'Request declined' : 'Approval pending'}</p>
      <p className="mt-1 text-sm text-idea-muted">
        {isRejected
          ? 'An admin declined this student account request.'
          : 'Your student account request was sent to an admin.'}
      </p>
      {(name || email) && (
        <p className="mt-2 text-xs text-idea-muted break-all">
          {name ? `${name} · ` : ''}
          {email}
        </p>
      )}
      <p className="mt-3 text-xs text-idea-muted">
        {isRejected
          ? 'You cannot access the lab until an admin approves your request.'
          : 'You can sign in again after an admin approves your account.'}
      </p>
    </div>
  );
};
