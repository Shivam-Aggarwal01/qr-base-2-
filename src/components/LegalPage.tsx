import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Shield,
  FileText,
  Search,
  Printer,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  HelpCircle,
  Building,
} from 'lucide-react';

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
  eyebrow: string;
  description: string;
  summaryHighlights: { title: string; desc: string }[];
  sections: LegalSection[];
}

const EFFECTIVE_DATE = 'September 27, 2026';

const pageContent: Record<LegalPageKind, LegalPageContent> = {
  privacy: {
    title: 'Privacy Policy',
    eyebrow: 'Data Protection & Governance',
    description:
      'This Privacy Policy explains how the AICTE IDEA Lab Inventory Management System collects, uses, stores, and protects information when authorized users access the laboratory platform.',
    summaryHighlights: [
      {
        title: 'Authentication Only',
        desc: 'Google Sign-In is strictly used to identify authorized laboratory personnel and students. Passwords are never seen or stored.',
      },
      {
        title: 'Zero Advertising or Data Selling',
        desc: 'User information and activity records are strictly used for lab accountability and are never sold or shared with advertisers.',
      },
      {
        title: 'Institutional Equipment Records',
        desc: 'Equipment requests, checkouts, and returns are logged in an immutable audit ledger to protect public laboratory resources.',
      },
    ],
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
    eyebrow: 'Rules & User Conduct',
    description:
      'These Terms of Service govern authorized use of the AICTE IDEA Lab Inventory Management System for laboratory inventory, equipment tracking, requests, assignments, and operational records.',
    summaryHighlights: [
      {
        title: 'Authorized Personnel Only',
        desc: 'Access is limited to approved students, faculty, and lab managers. Credentials may never be shared or loaned.',
      },
      {
        title: 'Duty of Care for Equipment',
        desc: 'Users are personally accountable for borrowed tools and materials, requiring prompt return by stated deadlines.',
      },
      {
        title: 'QR & Inventory Integrity',
        desc: 'QR codes, serial numbers, and storage tags must not be altered, removed, or cloned under any circumstances.',
      },
    ],
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

export const LegalPage: React.FC<LegalPageProps> = ({ kind: initialKind, inAppShell = false }) => {
  const [activeTab, setActiveTab] = useState<LegalPageKind>(initialKind);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const navigate = useNavigate();

  const content = pageContent[activeTab];

  const handleTabSwitch = (newTab: LegalPageKind) => {
    setActiveTab(newTab);
    navigate(newTab === 'privacy' ? '/privacy' : '/terms', { replace: true });
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return content.sections;
    return content.sections.filter((section) => {
      const inHeading = section.heading.toLowerCase().includes(q);
      const inParagraphs = section.paragraphs?.some((p) => p.toLowerCase().includes(q));
      const inBullets = section.bullets?.some((b) => b.toLowerCase().includes(q));
      return inHeading || inParagraphs || inBullets;
    });
  }, [content.sections, searchQuery]);

  return (
    <div className={`flex-1 overflow-y-auto idea-bg ${inAppShell ? '' : 'min-h-screen'}`}>
      <Helmet>
        <title>{content.title} | AICTE IDEA Lab Inventory Management</title>
        <meta name="description" content={content.description} />
      </Helmet>

      {/* Standalone Top Bar if not inside App Shell */}
      {!inAppShell && (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[var(--color-idea-border)] px-4 sm:px-8 py-3.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="AICTE IDEA Lab" className="h-10 sm:h-12 w-auto object-contain" />
              <div>
                <span className="text-base sm:text-lg font-bold tracking-tight text-[var(--color-idea-text)]">
                  AICTE <span className="text-[var(--color-idea-blue)] font-normal">IDEA LAB</span>
                </span>
                <p className="text-[9px] sm:text-[10px] text-[var(--color-idea-muted)] tracking-wide uppercase">
                  Inventory Management System
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[var(--color-idea-text)] bg-white border border-[var(--color-idea-border)] rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[var(--color-idea-muted)]" />
                <span>Print</span>
              </button>
              <Link
                to="/"
                className="idea-button flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Portal</span>
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Unified Standard Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-idea-border)] pb-5 sm:pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-idea-blue)]">
                AICTE IDEA LAB · LEGAL & POLICIES
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-idea-text)]">
              {content.title}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[var(--color-idea-muted)] max-w-2xl leading-relaxed">
              {content.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {inAppShell && (
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[var(--color-idea-text)] bg-white border border-[var(--color-idea-border)] rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[var(--color-idea-muted)]" />
                <span>Print Copy</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="idea-card p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          {/* Segmented Tab Controls */}
          <div className="inline-flex p-1 bg-[var(--color-idea-light-grey)] rounded-xl border border-[var(--color-idea-border)] shrink-0">
            <button
              type="button"
              onClick={() => handleTabSwitch('privacy')}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-white text-[var(--color-idea-deep-blue)] shadow-sm'
                  : 'text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('terms')}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-white text-[var(--color-idea-deep-blue)] shadow-sm'
                  : 'text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Terms of Service</span>
            </button>
          </div>

          {/* Search within document */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policy sections, Google auth, rules..."
              className="idea-input w-full pl-9 pr-4 py-2 text-xs"
            />
          </div>

          {/* Effective Date Stamp */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-[var(--color-idea-muted)] shrink-0 font-medium">
            <Clock className="w-3.5 h-3.5 text-[var(--color-idea-blue)]" />
            <span>Effective: {EFFECTIVE_DATE}</span>
          </div>
        </div>

        {/* Key Takeaways Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {content.summaryHighlights.map((highlight, idx) => (
            <div
              key={idx}
              className="idea-card p-4 sm:p-5 flex flex-col justify-between hover:border-[var(--color-idea-blue)]/40 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-idea-blue)]/10 text-[var(--color-idea-blue)] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--color-idea-text)]">
                    {highlight.title}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--color-idea-muted)] leading-relaxed">
                    {highlight.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content Layout with Quick Jump */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Quick Index Sidebar (Desktop) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4">
            <div className="idea-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-idea-muted)] mb-3">
                Table of Contents
              </p>
              <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-2">
                {content.sections.map((section, idx) => (
                  <a
                    key={idx}
                    href={`#section-${idx}`}
                    className="block px-3 py-1.5 text-xs text-[var(--color-idea-muted)] hover:text-[var(--color-idea-deep-blue)] hover:bg-[var(--color-idea-light-grey)] rounded-lg transition-colors truncate"
                  >
                    {section.heading}
                  </a>
                ))}
              </nav>
            </div>

            <div className="idea-card p-4 bg-gradient-to-br from-[var(--color-idea-light-grey)] to-white border-[var(--color-idea-blue)]/20">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-idea-deep-blue)]">
                <Building className="w-4 h-4 text-[var(--color-idea-blue)]" />
                <span>AICTE IDEA Lab Directorate</span>
              </div>
              <p className="mt-2 text-xs text-[var(--color-idea-muted)] leading-relaxed">
                Operating strictly under institutional lab protocols for technical innovation and skill development.
              </p>
            </div>
          </div>

          {/* Policy Sections */}
          <div className="lg:col-span-8 space-y-4">
            {filteredSections.length === 0 ? (
              <div className="idea-card p-8 sm:p-12 text-center">
                <Search className="w-8 h-8 text-[var(--color-idea-muted)] mx-auto mb-3" />
                <p className="font-semibold text-sm text-[var(--color-idea-text)]">
                  No matching policy sections found
                </p>
                <p className="text-xs text-[var(--color-idea-muted)] mt-1">
                  Try searching for keywords like "Google", "equipment", "returns", or "security".
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-[var(--color-idea-blue)] bg-[var(--color-idea-blue)]/10 rounded-xl hover:bg-[var(--color-idea-blue)]/20 transition-all cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              filteredSections.map((section, idx) => {
                const sectionId = `section-${idx}`;
                return (
                  <article
                    id={sectionId}
                    key={section.heading}
                    className="idea-card p-5 sm:p-7 space-y-4 scroll-mt-24 transition-all"
                  >
                    <h2 className="text-base sm:text-lg font-bold text-[var(--color-idea-text)] flex items-center justify-between">
                      <span>{section.heading}</span>
                    </h2>

                    {section.paragraphs && (
                      <div className="space-y-3">
                        {section.paragraphs.map((p, pIdx) => (
                          <p key={pIdx} className="text-xs sm:text-sm text-[var(--color-idea-muted)] leading-relaxed">
                            {p}
                          </p>
                        ))}
                      </div>
                    )}

                    {section.bullets && (
                      <ul className="space-y-2 pt-2 border-t border-[var(--color-idea-border)]/60">
                        {section.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--color-idea-text)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-idea-blue)] shrink-0 mt-2" />
                            <span className="leading-relaxed">{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                );
              })
            )}

            {/* Bottom Support / Switch Box */}
            <div className="idea-card p-5 sm:p-6 bg-white border-[var(--color-idea-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[var(--color-idea-text)]">
                  Need clarification on lab policies or access?
                </p>
                <p className="text-xs text-[var(--color-idea-muted)] mt-0.5">
                  Contact your designated AICTE IDEA Lab Coordinator or Laboratory Assistant.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTabSwitch(activeTab === 'privacy' ? 'terms' : 'privacy')}
                className="idea-button shrink-0 flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
              >
                <span>Read {activeTab === 'privacy' ? 'Terms of Service' : 'Privacy Policy'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Unified Footer */}
      {!inAppShell && (
        <footer className="mt-12 border-t border-[var(--color-idea-border)] bg-white py-6 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-idea-muted)]">
            <p>© {new Date().getFullYear()} AICTE IDEA Lab Inventory Management System</p>
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => handleTabSwitch('privacy')}
                className="hover:text-[var(--color-idea-deep-blue)] cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('terms')}
                className="hover:text-[var(--color-idea-deep-blue)] cursor-pointer"
              >
                Terms of Service
              </button>
              <Link to="/" className="text-[var(--color-idea-blue)] font-semibold hover:underline">
                Portal Sign-in
              </Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
