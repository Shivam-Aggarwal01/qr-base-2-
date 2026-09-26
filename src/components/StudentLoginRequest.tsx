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
    <div className="mt-6 rounded-xl border border-idea-border bg-idea-background p-4 text-left">
      <p className="text-xs font-bold uppercase tracking-wider text-idea-muted">
        {isRejected ? 'Request declined' : 'Approval pending'}
      </p>
      <p className="mt-2 text-sm font-semibold text-idea-text">
        {isRejected
          ? 'An admin declined this student account request.'
          : 'Your student account request was sent to an admin.'}
      </p>
      {(name || email) && (
        <p className="mt-1 text-xs text-idea-muted break-all">
          {name ? `${name} · ` : ''}
          {email}
        </p>
      )}
      <p className="mt-3 text-xs text-idea-muted">
        {isRejected
          ? 'You cannot access the lab until an admin approves a new request.'
          : 'You can sign in again after an admin approves your account in User Directory.'}
      </p>
    </div>
  );
};
