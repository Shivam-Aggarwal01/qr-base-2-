import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

type LegalPageKind = 'privacy' | 'terms';

interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface LegalPageContent {
  title: string;
  eyebrow: string;
  description: string;
  sections: LegalSection[];
}

const EFFECTIVE_DATE = 'September 27, 2026';

const pageContent: Record<LegalPageKind, LegalPageContent> = {
  privacy: {
    title: 'Privacy Policy',
    eyebrow: 'AICTE IDEA Lab Inventory Management System',
    description:
      'This Privacy Policy explains how the AICTE IDEA Lab Inventory Management System collects, uses, stores, and protects information when authorized users access the system.',
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
          'The application does not request your Google password. Authentication is handled through Google and Firebase Authentication.',
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
    eyebrow: 'AICTE IDEA Lab Inventory Management System',
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
          'Report suspected unauthorized access to a laboratory administrator.',
          'Use the application only for legitimate laboratory or institutional purposes.',
        ],
      },
      {
        heading: '4. Inventory responsibilities',
        paragraphs: [
          'Users are expected to handle laboratory equipment responsibly and maintain accurate information when performing inventory-related actions.',
        ],
        bullets: [
          'Review equipment information before submitting a request.',
          'Record check-outs, returns, transfers, and other actions accurately.',
          'Return equipment according to applicable laboratory procedures.',
          'Report loss, damage, incorrect inventory information, or missing equipment promptly.',
          'Do not modify or remove inventory information without authorization.',
        ],
      },
      {
        heading: '5. QR codes and equipment identification',
        paragraphs: [
          'The application may use QR codes or similar identifiers to identify laboratory inventory items. These identifiers are intended for inventory management and operational purposes.',
          'Users must not intentionally alter, duplicate, misuse, or apply inventory identifiers to unrelated purposes in a way that could create inaccurate inventory records or interfere with laboratory operations.',
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
          'Information displayed by the application may contain errors, delays, synchronization issues, or information entered by users or imported from another source.',
          'Laboratory administrators may correct inventory information when necessary. Historical activity and audit records may be retained to maintain equipment accountability and operational history.',
          'The application should not be treated as the sole source of truth for safety-critical or legally significant decisions. Users should follow applicable laboratory procedures and instructions from authorized personnel.',
        ],
      },
      {
        heading: '8. Service availability',
        paragraphs: [
          'The application is provided for internal operational use. Features, integrations, and availability may change over time.',
          'Access may occasionally be interrupted because of maintenance, software updates, infrastructure issues, authentication provider outages, network problems, security measures, or circumstances outside the laboratory’s control.',
        ],
      },
      {
        heading: '9. Third-party services',
        paragraphs: [
          'The application may depend on third-party services, including Google and Firebase services, for authentication, data storage, hosting, or other technical functions.',
          'Use of those services may also be subject to the applicable terms, policies, and technical limitations of the respective service providers.',
        ],
      },
      {
        heading: '10. Suspension or termination',
        paragraphs: [
          'Access may be suspended or terminated if a user violates these terms, loses authorization to use the laboratory, misuses the application, or creates a security or operational risk.',
          'Suspension or termination of access does not necessarily delete historical inventory or audit records associated with the user when those records are required for laboratory operations, accountability, security, or institutional record keeping.',
        ],
      },
      {
        heading: '11. Changes to these terms',
        paragraphs: [
          'These Terms of Service may be updated when the application or its operational requirements change.',
          'The effective date displayed on this page identifies the current version. Continued authorized use of the application after an update constitutes use under the revised terms, subject to applicable institutional requirements.',
        ],
      },
      {
        heading: '12. Contact and incident reporting',
        paragraphs: [
          'Questions regarding these terms, account access, inventory records, equipment incidents, or suspected security issues should be directed to the administrator responsible for the AICTE IDEA Lab Inventory Management System through your institution’s normal support channel.',
        ],
      },
    ],
  },
};

export const LegalPage: FC<LegalPageProps> = ({ kind }) => {
  const content = pageContent[kind];
  const path = kind === 'privacy' ? '/privacy' : '/terms';
  const otherPath = kind === 'privacy' ? '/terms' : '/privacy';
  const otherLabel = kind === 'privacy' ? 'Terms of Service' : 'Privacy Policy';

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Helmet>
        <title>{content.title} | AICTE IDEA Lab Inventory Management</title>

        <meta name="description" content={content.description} />

        <meta name="robots" content="index, follow" />

        <link rel="canonical" href={`${window.location.origin}${path} `} />
      </Helmet>

      {/* Top navigation */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white shadow-sm">
              IL
            </div>

            <div className="leading-tight">
              <div className="text-sm font-bold text-slate-900">AICTE IDEA Lab</div>
              <div className="text-[11px] font-medium text-slate-500">Inventory Management System</div>
            </div>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Back to application
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Legal</div>

              <nav className="space-y-1" aria-label="Legal navigation">
                <Link
                  to="/privacy"
                  className={`block rounded - lg px - 3 py - 2.5 text - sm font - semibold transition ${
                    kind === 'privacy'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  } `}
                >
                  Privacy Policy
                </Link>

                <Link
                  to="/terms"
                  className={`block rounded - lg px - 3 py - 2.5 text - sm font - semibold transition ${
                    kind === 'terms'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  } `}
                >
                  Terms of Service
                </Link>
              </nav>

              <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Internal system
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  This application is intended for authorized laboratory users.
                </p>
              </div>
            </div>
          </aside>

          {/* Content */}
          <article className="min-w-0">
            {/* Hero */}
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                {content.eyebrow}
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{content.title}</h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{content.description}</p>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
                <span>Effective {EFFECTIVE_DATE}</span>

                <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

                <span>Internal institutional application</span>
              </div>
            </div>

            {/* Notice */}
            <div className="mt-10 max-w-3xl rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>

                <div>
                  <h2 className="text-sm font-bold text-blue-950">About this policy</h2>

                  <p className="mt-1.5 text-sm leading-6 text-blue-900/75">
                    This page describes the data practices and authorized use of this specific inventory management
                    application. It is not a general privacy policy for the institution.
                  </p>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="mt-10 max-w-3xl divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
              {content.sections.map((section) => (
                <section key={section.heading} className="px-6 py-7 sm:px-8 sm:py-8">
                  <h2 className="text-base font-bold tracking-tight text-slate-950 sm:text-lg">{section.heading}</h2>

                  {section.paragraphs && (
                    <div className="mt-3 space-y-3">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph} className="text-sm leading-7 text-slate-600">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}

                  {section.bullets && (
                    <ul className="mt-4 space-y-2.5">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3 text-sm leading-6 text-slate-600">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            {/* Bottom navigation */}
            <div className="mt-8 flex max-w-3xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="text-sm font-bold text-slate-900">Related legal document</p>

                <p className="mt-1 text-xs text-slate-500">
                  Review the {otherLabel.toLowerCase()} for additional information.
                </p>
              </div>

              <Link
                to={otherPath}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                View {otherLabel}
              </Link>
            </div>

            {/* Footer */}
            <footer className="mt-10 max-w-3xl border-t border-slate-200 pt-6">
              <div className="flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <p>© {new Date().getFullYear()} AICTE IDEA Lab Inventory Management System</p>

                <div className="flex gap-4">
                  <Link to="/privacy" className="hover:text-slate-900">
                    Privacy
                  </Link>

                  <Link to="/terms" className="hover:text-slate-900">
                    Terms
                  </Link>
                </div>
              </div>
            </footer>
          </article>
        </div>
      </main>
    </div>
  );
};
