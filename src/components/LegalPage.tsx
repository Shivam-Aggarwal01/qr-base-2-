import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

type LegalPageKind = 'privacy' | 'terms';

interface LegalPageProps {
    kind: LegalPageKind;
}

const pageContent: Record<LegalPageKind, {
    title: string;
    intro: string;
    sections: Array<{ heading: string; paragraphs: string[] }>;
}> = {
    privacy: {
        title: 'Privacy Policy',
        intro: 'This policy explains how the AICTE IDEA Lab Inventory Management System handles information when authorized lab users access and use the internal system.',
        sections: [
            {
                heading: 'Information we collect',
                paragraphs: [
                    'When you sign in with Google, the system receives basic account information such as your name, email address, profile image, and Google account identifier. We also store the access role and account status assigned by a lab administrator.',
                    'The system stores inventory records and operational activity associated with your use of the lab, including requests, approvals, assignments, check-outs, returns, and audit history. QR codes identify inventory records and do not contain your Google password.',
                ],
            },
            {
                heading: 'How we use information',
                paragraphs: [
                    'Information is used to authenticate users, manage access, operate the inventory workflow, process requests, communicate account status, maintain an audit trail, and protect the lab’s equipment and data.',
                    'We do not use information in this internal system for advertising or sell it to third parties.',
                ],
            },
            {
                heading: 'Service providers and storage',
                paragraphs: [
                    'Authentication and application data are handled through Firebase services configured for this system. Those providers may process information on our behalf under their own terms and privacy practices.',
                    'Access is limited through authentication, application roles, and Firestore security rules. No online system can guarantee absolute security, so users should protect their Google account and report suspected unauthorized access promptly.',
                ],
            },
            {
                heading: 'Retention and your choices',
                paragraphs: [
                    'Inventory and activity records may be retained for as long as needed for lab operations, accountability, and audit purposes. Account and operational data may be corrected or removed by an authorized lab administrator when appropriate.',
                    'For questions, corrections, or deletion requests, contact the administrator responsible for the AICTE IDEA Lab Inventory Management System through your institution’s normal support channel.',
                ],
            },
            {
                heading: 'Changes to this policy',
                paragraphs: [
                    'This policy may be updated when the system or its data practices change. The effective date below will be updated with material revisions.',
                ],
            },
        ],
    },
    terms: {
        title: 'Terms of Service',
        intro: 'These terms govern authorized use of the AICTE IDEA Lab Inventory Management System, an internal tool for managing lab inventory, equipment, locations, requests, and activity.',
        sections: [
            {
                heading: 'Authorized use',
                paragraphs: [
                    'Access is limited to students, staff, administrators, and other people approved by the lab. You must use your own approved Google account and provide accurate information when requesting access.',
                    'Administrators may approve, restrict, suspend, or remove access at their discretion to protect the lab and its inventory.',
                ],
            },
            {
                heading: 'User responsibilities',
                paragraphs: [
                    'Keep your account secure, review inventory details before submitting requests, and record check-outs, returns, transfers, and other actions accurately. Do not share accounts, bypass access controls, alter records without authorization, or scan and use QR codes for an unrelated purpose.',
                    'You are responsible for equipment assigned to you and must promptly report loss, damage, incorrect records, or suspected unauthorized activity to a lab administrator.',
                ],
            },
            {
                heading: 'System records and availability',
                paragraphs: [
                    'The system’s records support lab operations and accountability but may contain mistakes, delays, or data imported from another source. Administrators may correct records and maintain audit history as needed.',
                    'The system is provided for internal operational use. Availability, integrations, and features may change, and access may be interrupted for maintenance, security, or circumstances outside the lab’s control.',
                ],
            },
            {
                heading: 'Prohibited conduct',
                paragraphs: [
                    'You may not use the system to access another person’s account, interfere with the service, upload malicious content, attempt to discover or exploit vulnerabilities, falsify inventory activity, or use data for an unauthorized purpose.',
                ],
            },
            {
                heading: 'Suspension and termination',
                paragraphs: [
                    'Access may be suspended or terminated if you violate these terms, lose authorization to use the lab, or create a security or operational risk. Records may remain available to administrators when needed for inventory and audit purposes.',
                ],
            },
            {
                heading: 'Changes and contact',
                paragraphs: [
                    'These terms may be updated as the system evolves. Continued use after an update means you accept the revised terms. Contact the administrator responsible for the AICTE IDEA Lab Inventory Management System with questions or incident reports.',
                ],
            },
        ],
    },
};

export const LegalPage: FC<LegalPageProps> = ({ kind }) => {
    const content = pageContent[kind];
    const path = kind === 'privacy' ? '/privacy' : '/terms';

    return (
        <div className="min-h-screen overflow-y-auto bg-idea-background text-idea-text">
            <Helmet>
                <title>{content.title} | AICTE Inventory Management</title>
                <meta name="description" content={content.intro} />
                <link rel="canonical" href={`${window.location.origin}${path}`} />
            </Helmet>
            <header className="border-b border-idea-border bg-white">
                <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
                    <Link to="/" className="text-sm font-bold tracking-tight text-idea-text">
                        AICTE IDEA Lab
                    </Link>
                    <Link to="/" className="text-sm font-semibold text-idea-deep-blue hover:text-idea-blue">
                        Back to sign in
                    </Link>
                </div>
            </header>
            <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
                <div className="max-w-3xl">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-idea-blue">Internal system</p>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{content.title}</h1>
                    <p className="mt-5 text-base leading-7 text-idea-muted">{content.intro}</p>
                    <p className="mt-4 text-xs font-medium uppercase tracking-wide text-idea-muted">Effective September 27, 2026</p>
                </div>
                <div className="mt-12 space-y-10 border-t border-idea-border pt-10">
                    {content.sections.map((section) => (
                        <section key={section.heading}>
                            <h2 className="text-lg font-bold text-idea-text">{section.heading}</h2>
                            <div className="mt-3 space-y-3 text-sm leading-7 text-idea-muted">
                                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                            </div>
                        </section>
                    ))}
                </div>
                <nav aria-label="Legal pages" className="mt-12 flex gap-5 border-t border-idea-border pt-6 text-sm font-semibold">
                    <Link to="/privacy" className={kind === 'privacy' ? 'text-idea-text' : 'text-idea-muted hover:text-idea-text'}>Privacy Policy</Link>
                    <Link to="/terms" className={kind === 'terms' ? 'text-idea-text' : 'text-idea-muted hover:text-idea-text'}>Terms of Service</Link>
                </nav>
            </main>
        </div>
    );
};
