import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export type LegalPageKind = 'privacy' | 'terms';

export interface LegalPageProps {
  kind: LegalPageKind;
  inAppShell?: boolean;
}

interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface LegalPageContent {
  title: string;
  description: string;
  sections: LegalSection[];
}

const EFFECTIVE_DATE = 'September 27, 2026';

const pageContent: Record<LegalPageKind, LegalPageContent> = {
  privacy: {
    title: 'Privacy Policy',
    description:
      'This Privacy Policy explains how the AICTE IDEA Lab Inventory Management System collects, uses, stores, and protects information when authorized users access the laboratory platform.',
    sections: [
      {
        heading: '1. About this application',
        paragraphs: [
          'The AICTE IDEA Lab Inventory Management System is an internal web application used to manage laboratory inventory and equipment. It supports authorized lab users with activities such as viewing inventory, requesting equipment, approving requests, assigning equipment, recording check-outs and returns, and maintaining operational records.',
          'The application is intended for authorized users of the laboratory. Access may be restricted by the laboratory administrator based on institutional requirements and the user’s role.',
        ],
      },
      {
        heading: '2. Information we collect',
        paragraphs: [
          'When you sign in using Google Sign-In, the application receives the basic Google account information made available through the authentication process. Depending on the Google authentication configuration, this may include your name, email address, profile picture, and a unique Google account identifier associated with your Firebase Authentication account.',
          'The application does not request your Google password. Authentication is handled securely through Google and Firebase Authentication.',
          'The application may also create an internal user profile containing information necessary to operate the inventory system, such as your assigned role, account status, and identifiers required to associate your activity with your account.',
        ],
        bullets: [
          'Name and basic profile information provided through Google Sign-In.',
          'Email address associated with the authenticated account.',
          'Profile image, where provided by the authentication provider.',
          'Firebase Authentication user identifier.',
          'Application role and account status assigned by an authorized administrator.',
          'Inventory and operational activity generated while using the system.',
        ],
      },
      {
        heading: '3. Inventory and activity information',
        paragraphs: [
          'Because this application manages physical laboratory equipment, it may store information associated with inventory operations performed by an authenticated user.',
          'This can include equipment requests, approvals, assignments, check-outs, returns, transfers, inventory changes, timestamps, and audit records. These records are used to maintain accountability and help laboratory administrators understand the history of equipment-related actions.',
          'QR codes may be used to identify inventory items. A QR code used by this application is an inventory identifier and does not contain your Google password or authentication credentials.',
        ],
      },
      {
        heading: '4. How we use information',
        paragraphs: [
          'Information collected by the application is used only for operating and securing the internal inventory management system and for the purposes described in this policy.',
        ],
        bullets: [
          'Authenticate authorized users.',
          'Create and maintain user accounts within the application.',
          'Determine application access based on assigned roles and account status.',
          'Manage laboratory inventory and equipment records.',
          'Process equipment requests, approvals, assignments, check-outs, and returns.',
          'Maintain an audit trail of inventory-related activity.',
          'Protect laboratory equipment, records, and application resources.',
          'Investigate suspected unauthorized access or misuse.',
          'Maintain and improve the reliability and security of the application.',
        ],
      },
      {
        heading: '5. Google user data',
        paragraphs: [
          'The application uses Google account information obtained through Google Sign-In to authenticate users and associate an authenticated identity with an internal laboratory account.',
          'Google user data is not used for advertising, targeted advertising, or unrelated profiling. It is not sold to third parties.',
          'Google user data is used only to provide the authentication and application functionality described in this Privacy Policy. Access to Google account information is limited to the information necessary for the application’s authentication and account-management functionality.',
        ],
      },
      {
        heading: '6. Storage and service providers',
        paragraphs: [
          'The application uses Firebase services provided by Google to support authentication and application data storage. Depending on the enabled Firebase services, application data may be stored using services such as Firebase Authentication and Cloud Firestore.',
          'Firebase services process data on behalf of the application according to the applicable Google and Firebase terms and policies. Firebase documents security measures including encryption of data in transit and, for several Firebase services including Firebase Authentication and Cloud Firestore, encryption of data at rest.',
        ],
      },
      {
        heading: '7. Data sharing',
        paragraphs: [
          'We do not sell personal information or Google user data.',
          'Information may be processed by service providers that are necessary to operate the application, such as Firebase services used for authentication and data storage. Information may also be disclosed to authorized laboratory or institutional administrators when necessary to operate the laboratory, maintain accountability, investigate incidents, or comply with applicable legal or institutional requirements.',
          'The application does not intentionally share Google user data with unrelated third parties for advertising or marketing purposes.',
        ],
      },
      {
        heading: '8. Access control and security',
        paragraphs: [
          'Access to the application is controlled through authentication and application-level authorization. Firestore security rules and application permissions are used to restrict access to protected data and operations.',
          'Reasonable technical and organizational measures are used to protect application data. However, no internet-connected service can guarantee absolute security. Users are responsible for protecting their Google account, avoiding account sharing, and reporting suspected unauthorized access or security issues to the laboratory administrator.',
        ],
      },
      {
        heading: '9. Data retention',
        paragraphs: [
          'User account information and inventory activity may be retained for as long as reasonably necessary for laboratory operations, equipment accountability, security, and audit purposes.',
          'Because inventory history can be required to establish the chain of custody or operational history of laboratory equipment, some activity records may be retained after a user’s application access has been suspended or removed.',
          'An authorized laboratory administrator may correct or remove information when appropriate and consistent with operational, security, and record-keeping requirements.',
        ],
      },
      {
        heading: '10. Your choices and requests',
        paragraphs: [
          'You may request clarification about the information associated with your application account or request correction of inaccurate account information through the laboratory administrator.',
          'If you no longer have authorization to use the system, your access may be disabled. Removal of an account does not necessarily result in deletion of historical inventory records when those records are required for laboratory accountability or audit purposes.',
        ],
      },
      {
        heading: '11. Children and unauthorized use',
        paragraphs: [
          'This application is an internal institutional system and is not designed as a public consumer service for children. Access is limited to users authorized by the laboratory or institution.',
        ],
      },
      {
        heading: '12. Changes to this Privacy Policy',
        paragraphs: [
          'This Privacy Policy may be updated when the application, authentication configuration, data practices, or institutional requirements change.',
          'Material changes will be reflected by updating the effective date shown on this page. Users should periodically review this page to understand the current data practices of the application.',
        ],
      },
      {
        heading: '13. Contact',
        paragraphs: [
          'For questions about this Privacy Policy, account information, data correction, deletion requests, or suspected unauthorized access, contact the administrator responsible for the AICTE IDEA Lab Inventory Management System through your institution’s normal support channel.',
        ],
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    description:
      'These Terms of Service govern authorized use of the AICTE IDEA Lab Inventory Management System for laboratory inventory, equipment tracking, requests, assignments, and operational records.',
    sections: [
      {
        heading: '1. About the service',
        paragraphs: [
          'The AICTE IDEA Lab Inventory Management System is an internal application designed to help authorized laboratory users manage physical inventory and equipment.',
          'The service may provide functionality for inventory records, equipment identification, requests, approvals, assignments, check-outs, returns, transfers, audit history, and related administrative operations.',
        ],
      },
      {
        heading: '2. Eligibility and authorized access',
        paragraphs: [
          'Use of the application is restricted to students, staff, administrators, and other individuals who have been authorized by the laboratory or institution.',
          'You must sign in using an account that you are authorized to use. Administrators may approve, restrict, suspend, or revoke access based on institutional requirements, security considerations, or laboratory procedures.',
        ],
      },
      {
        heading: '3. Account responsibilities',
        paragraphs: [
          'You are responsible for maintaining the security of the account you use to access the application.',
        ],
        bullets: [
          'Do not share your account or authentication session with another person.',
          'Do not attempt to access another user’s account.',
          'Do not provide false information when requesting or using access.',
          'Report suspected unauthorized access to a laboratory administrator immediately.',
          'Use the application only for legitimate laboratory or institutional educational purposes.',
        ],
      },
      {
        heading: '4. Inventory responsibilities',
        paragraphs: [
          'Users are expected to handle laboratory equipment responsibly and maintain accurate information when performing inventory-related actions.',
        ],
        bullets: [
          'Review equipment information before submitting a material request.',
          'Record check-outs, returns, transfers, and other actions accurately.',
          'Return equipment promptly according to applicable laboratory procedures and return deadlines.',
          'Report loss, damage, incorrect inventory information, or missing equipment immediately to staff.',
          'Do not modify or remove inventory information without authorization.',
        ],
      },
      {
        heading: '5. QR codes and equipment identification',
        paragraphs: [
          'The application uses QR codes and serial barcodes to track laboratory inventory items across workbenches and shelves.',
          'Users must not intentionally alter, duplicate, remove, or apply inventory identifiers to unrelated items. Tampering with equipment tags constitutes a serious breach of laboratory discipline.',
        ],
      },
      {
        heading: '6. Acceptable use',
        paragraphs: ['You agree to use the application in a lawful, authorized, and responsible manner.'],
        bullets: [
          'Do not bypass authentication or authorization controls.',
          'Do not attempt to access data belonging to users or equipment for which you are not authorized.',
          'Do not intentionally interfere with the availability or operation of the service.',
          'Do not upload malicious software, scripts, or other harmful content.',
          'Do not attempt to discover, exploit, or abuse security vulnerabilities.',
          'Do not falsify inventory activity or audit information.',
          'Do not use application data for an unauthorized purpose.',
        ],
      },
      {
        heading: '7. Inventory records and audit history',
        paragraphs: [
          'Information displayed by the application represents real laboratory hardware. Laboratory administrators may audit or correct inventory counts when necessary.',
          'Historical activity and audit records are permanently retained in the ledger to maintain equipment custody chains.',
          'The application should be used alongside physical lab protocols and direct instructions from the Lab In-Charge or Faculty Coordinator.',
        ],
      },
      {
        heading: '8. Service availability',
        paragraphs: [
          'The application is provided for internal operational use. Features, integrations, and availability may change over time.',
          'Access may occasionally be interrupted for scheduled maintenance, updates, or infrastructure upgrades.',
        ],
      },
      {
        heading: '9. Third-party services',
        paragraphs: [
          'The application depends on Google and Firebase services for authentication, database storage, and hosting.',
          'Use of those services is also subject to the standard Google and Firebase service agreements.',
        ],
      },
      {
        heading: '10. Suspension or termination',
        paragraphs: [
          'Access may be suspended or revoked immediately if a user violates these terms, misuses equipment, fails to return borrowed assets, or poses an operational safety risk.',
          'Termination of access does not relieve a user of the obligation to return physical equipment or address reported damages.',
        ],
      },
      {
        heading: '11. Changes to these terms',
        paragraphs: [
          'These Terms of Service may be updated periodically. The effective date displayed indicates the active version.',
          'Continued use of the IDEA Lab inventory portal represents acceptance of the active guidelines.',
        ],
      },
      {
        heading: '12. Contact and grievances',
        paragraphs: [
          'For questions or escalation regarding these terms, contact the AICTE IDEA Lab Faculty In-Charge or Student Lead through your campus administrative office.',
        ],
      },
    ],
  },
};

export const LegalPage: React.FC<LegalPageProps> = ({ kind, inAppShell = false }) => {
  const content = pageContent[kind];
  const navigate = useNavigate();

  return (
    <div className={`flex-1 bg-white ${inAppShell ? 'overflow-y-auto' : 'min-h-screen'}`}>
      <Helmet>
        <title>{content.title} | AICTE IDEA Lab Inventory Management</title>
        <meta name="description" content={content.description} />
      </Helmet>

      {!inAppShell && (
        <header className="px-6 py-5 border-b border-[var(--color-idea-border)] flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <Link to="/" className="text-[13px] font-semibold tracking-tight text-[var(--color-idea-text)] uppercase">
            Inventory Portal
          </Link>
          <div className="flex gap-6">
            <button
              onClick={() => navigate('/privacy')}
              className={`text-xs transition-colors ${kind === 'privacy' ? 'text-[var(--color-idea-text)] font-semibold' : 'text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]'}`}
            >
              Privacy
            </button>
            <button
              onClick={() => navigate('/terms')}
              className={`text-xs transition-colors ${kind === 'terms' ? 'text-[var(--color-idea-text)] font-semibold' : 'text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]'}`}
            >
              Terms
            </button>
          </div>
        </header>
      )}

      <main className="max-w-3xl mx-auto w-full px-6 py-12 md:py-24 space-y-16">
        <header className="space-y-6">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-[var(--color-idea-text)] leading-tight">
            {content.title}
          </h1>
          <p className="text-sm md:text-base text-[var(--color-idea-muted)] leading-relaxed max-w-xl">
            {content.description}
          </p>
          <p className="text-xs font-mono text-[var(--color-idea-muted)]">Effective Date: {EFFECTIVE_DATE}</p>
        </header>

        <div className="space-y-12">
          {content.sections.map((section, idx) => (
            <section key={idx} className="space-y-4">
              <h2 className="text-sm font-semibold tracking-wider text-[var(--color-idea-text)] uppercase">
                {section.heading}
              </h2>
              {section.paragraphs && (
                <div className="space-y-4">
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className="text-[13px] md:text-sm text-[var(--color-idea-muted)] leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              )}
              {section.bullets && (
                <ul className="list-disc list-inside space-y-2 mt-4">
                  {section.bullets.map((b, bIdx) => (
                    <li
                      key={bIdx}
                      className="text-[13px] md:text-sm text-[var(--color-idea-muted)] leading-relaxed marker:text-[var(--color-idea-border)]"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>

      {!inAppShell && (
        <footer className="border-t border-[var(--color-idea-border)] py-8 px-6 text-center">
          <p className="text-[11px] text-[var(--color-idea-muted)] uppercase tracking-widest">
            © {new Date().getFullYear()} AICTE IDEA Lab
          </p>
        </footer>
      )}
    </div>
  );
};
