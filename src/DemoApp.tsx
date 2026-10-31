import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import QRCode from 'qrcode';
import {
  Activity,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FlaskConical,
  LayoutDashboard,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RequestStatus, UserRole } from './types/inventory';
import { QRScannerModal } from './components/QRScannerModal';

type DemoRole = Extract<UserRole, 'ADMIN' | 'INSTITUTION_MANAGER' | 'RESOURCE_OWNER' | 'STUDENT'>;
type DemoView = 'overview' | 'resources' | 'bookings' | 'activity';

interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: DemoRole;
}

interface DemoResource {
  id: string;
  name: string;
  category: string;
  description: string;
  location: string;
  ownerId: string;
  status: 'AVAILABLE' | 'ISSUED' | 'DAMAGED';
  qrCode: string;
  safety: string;
  approvalRequired: boolean;
}

interface DemoBooking {
  id: string;
  resourceId: string;
  userId: string;
  purpose: string;
  status: RequestStatus;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  initialCondition?: string;
  finalCondition?: string;
  damageReported?: boolean;
}

interface DemoEvent {
  id: string;
  label: string;
  detail: string;
  user: string;
  at: string;
}

interface DemoState {
  resources: DemoResource[];
  bookings: DemoBooking[];
  events: DemoEvent[];
  users: DemoUser[];
}

const DEMO_STORAGE_KEY = 'resource-sharing-hackathon-demo-v1';
const DEMO_PERSONAS: DemoUser[] = [
  { id: 'demo-student', name: 'Aarav Patel', email: 'aarav@student.demo', role: 'STUDENT' },
  { id: 'demo-owner', name: 'Maya Shah', email: 'maya@lab.demo', role: 'RESOURCE_OWNER' },
  { id: 'demo-manager', name: 'Rohan Mehta', email: 'rohan@institution.demo', role: 'INSTITUTION_MANAGER' },
  { id: 'demo-admin', name: 'Demo Administrator', email: 'admin@demo.lab', role: 'ADMIN' },
];

const roleLabels: Record<DemoRole, string> = {
  ADMIN: 'Administrator',
  INSTITUTION_MANAGER: 'Institution manager',
  RESOURCE_OWNER: 'Resource owner',
  STUDENT: 'Student',
};

const makeSeedState = (): DemoState => {
  const now = new Date();
  const start = new Date(now.getTime() + 5 * 60_000);
  const end = new Date(start.getTime() + 60 * 60_000);
  return {
    users: DEMO_PERSONAS,
    resources: [
      {
        id: 'resource-oscilloscope',
        name: 'Digital Oscilloscope',
        category: 'Testing instruments',
        description: 'Four-channel bench oscilloscope for electronics prototyping and signal analysis.',
        location: 'Electronics Lab · Bench 04',
        ownerId: 'demo-owner',
        status: 'AVAILABLE',
        qrCode: 'IDEA-OSC-204',
        safety: 'Inspect probes before use. Keep within rated voltage limits.',
        approvalRequired: true,
      },
      {
        id: 'resource-camera',
        name: 'Mirrorless Camera Kit',
        category: 'Cameras & media',
        description: 'Camera body, two lenses, battery, and tripod for documenting project work.',
        location: 'Media Studio · Equipment cabinet',
        ownerId: 'demo-owner',
        status: 'AVAILABLE',
        qrCode: 'IDEA-CAM-118',
        safety: 'Keep lens caps on when not in use. Return all kit components together.',
        approvalRequired: true,
      },
      {
        id: 'resource-projector',
        name: 'Portable 4K Projector',
        category: 'Classrooms',
        description: 'Portable projector with HDMI and USB-C inputs for student presentations.',
        location: 'Seminar Room · AV shelf',
        ownerId: 'demo-manager',
        status: 'AVAILABLE',
        qrCode: 'IDEA-AV-042',
        safety: 'Allow the lamp to cool before packing. Do not block ventilation.',
        approvalRequired: false,
      },
      {
        id: 'resource-printer',
        name: '3D Printer Workbench',
        category: 'Workshop tools',
        description: 'Supervised FDM printer station for rapid prototyping and design projects.',
        location: 'Innovation Workshop · Zone B',
        ownerId: 'demo-manager',
        status: 'AVAILABLE',
        qrCode: 'IDEA-3DP-009',
        safety: 'Safety induction required. Keep hands clear of the heated bed and nozzle.',
        approvalRequired: true,
      },
    ],
    bookings: [
      {
        id: 'booking-demo-001',
        resourceId: 'resource-oscilloscope',
        userId: 'demo-student',
        purpose: 'Validate the sensor board for our robotics project',
        status: 'PENDING',
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        createdAt: now.toISOString(),
      },
    ],
    events: [
      {
        id: 'event-demo-welcome',
        label: 'Hackathon demo is ready',
        detail: 'Try the student → owner → QR check-in → return journey.',
        user: 'Demo system',
        at: now.toISOString(),
      },
    ],
  };
};

function readDemoState(): DemoState {
  try {
    const saved = localStorage.getItem(DEMO_STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved) as DemoState;
      if (state.resources?.length && state.users?.length) return state;
    }
  } catch (error) {
    console.warn('Could not restore the browser demo session; starting fresh.', error);
  }
  return makeSeedState();
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function shortDateTime(value: string): string {
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function DemoApp() {
  const [state, setState] = useState<DemoState>(readDemoState);
  const [activeUserId, setActiveUserId] = useState('demo-student');
  const [view, setView] = useState<DemoView>('overview');
  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedAssetId, setScannedAssetId] = useState<string | null>(null);
  const [resourceDetailsOpen, setResourceDetailsOpen] = useState(false);
  const [condition, setCondition] = useState('');
  const [damageReported, setDamageReported] = useState(false);
  const [notice, setNotice] = useState('');
  const [bookingResourceId, setBookingResourceId] = useState<string | null>(null);
  const [bookingPurpose, setBookingPurpose] = useState('');
  const [resourceFormOpen, setResourceFormOpen] = useState(false);
  const [resourceName, setResourceName] = useState('');
  const [resourceCategory, setResourceCategory] = useState('Laboratory equipment');
  const [resourceLocation, setResourceLocation] = useState('');
  const [qrImage, setQrImage] = useState('');
  const activeUser = state.users.find((user) => user.id === activeUserId) ?? DEMO_PERSONAS[0];
  const scannedResource = state.resources.find((resource) => resource.id === scannedAssetId);

  useEffect(() => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Could not save this browser demo session.', error);
      setNotice('Browser storage is unavailable. Changes may not persist after refresh.');
    }
  }, [state]);

  useEffect(() => {
    if (!scannedResource) {
      setQrImage('');
      return;
    }
    let active = true;
    QRCode.toDataURL(scannedResource.qrCode, { width: 220, margin: 1 })
      .then((image) => {
        if (active) setQrImage(image);
      })
      .catch((error: unknown) => console.error('Could not generate the resource QR code.', error));
    return () => {
      active = false;
    };
  }, [scannedResource]);

  const activeBookings = state.bookings.filter((booking) =>
    ['PENDING', 'APPROVED', 'WAITLISTED', 'CHECKED_IN', 'RETURNED', 'UNDER_REVIEW', 'OVERDUE'].includes(
      booking.status
    )
  );
  const pendingCount = state.bookings.filter((booking) => booking.status === 'PENDING').length;
  const visibleResources = useMemo(
    () =>
      state.resources.filter((resource) =>
        `${resource.name} ${resource.category} ${resource.location}`.toLowerCase().includes(search.toLowerCase())
      ),
    [search, state.resources]
  );

  const logEvent = (label: string, detail: string, user = activeUser.name) => {
    setState((current) => ({
      ...current,
      events: [{ id: `event-${Date.now()}`, label, detail, user, at: new Date().toISOString() }, ...current.events],
    }));
    setNotice(label);
  };

  const createBooking = (resource: DemoResource) => {
    if (!bookingPurpose.trim()) {
      setNotice('Add a short purpose for your booking request.');
      return;
    }
    const startsAt = new Date(Date.now() + 5 * 60_000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
    const userBookings = state.bookings.filter(
      (booking) =>
        booking.userId === activeUser.id &&
        ['PENDING', 'APPROVED', 'WAITLISTED', 'CHECKED_IN', 'RETURNED', 'UNDER_REVIEW', 'OVERDUE'].includes(
          booking.status
        )
    );
    if (userBookings.length >= 3) {
      setNotice('Demo fair-use limit reached: a student can have up to three active bookings.');
      return;
    }
    const duplicate = userBookings.some(
      (booking) =>
        booking.resourceId === resource.id &&
        startsAt < new Date(booking.endsAt) &&
        endsAt > new Date(booking.startsAt)
    );
    if (duplicate) {
      setNotice('You already have an active booking request for this resource and time.');
      return;
    }
    const overlap = state.bookings.some(
      (booking) =>
        booking.resourceId === resource.id &&
        ['PENDING', 'APPROVED', 'WAITLISTED', 'CHECKED_IN', 'RETURNED', 'UNDER_REVIEW', 'OVERDUE'].includes(
          booking.status
        ) &&
        startsAt < new Date(booking.endsAt) &&
        endsAt > new Date(booking.startsAt)
    );
    const booking: DemoBooking = {
      id: `booking-${Date.now()}`,
      resourceId: resource.id,
      userId: activeUser.id,
      purpose: bookingPurpose.trim(),
      status: overlap ? 'WAITLISTED' : resource.approvalRequired ? 'PENDING' : 'APPROVED',
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      createdAt: new Date().toISOString(),
    };
    setState((current) => ({ ...current, bookings: [booking, ...current.bookings] }));
    setBookingResourceId(null);
    setBookingPurpose('');
    logEvent(
      overlap ? 'Added to waitlist' : 'Booking requested',
      `${activeUser.name} · ${resource.name} · ${booking.status}`,
      activeUser.name
    );
    setView('bookings');
  };

  const updateBookingStatus = (booking: DemoBooking, status: RequestStatus) => {
    if (status === 'APPROVED') {
      const overlap = state.bookings.some(
        (other) =>
          other.id !== booking.id &&
          other.resourceId === booking.resourceId &&
          ['APPROVED', 'CHECKED_IN', 'RETURNED', 'UNDER_REVIEW', 'OVERDUE'].includes(other.status) &&
          new Date(booking.startsAt) < new Date(other.endsAt) &&
          new Date(booking.endsAt) > new Date(other.startsAt)
      );
      if (overlap) {
        setNotice('That time conflicts with an approved booking. Keep this request waitlisted.');
        return;
      }
      const earlierWaitlist = state.bookings.some(
        (other) =>
          other.id !== booking.id &&
          other.resourceId === booking.resourceId &&
          other.status === 'WAITLISTED' &&
          other.createdAt < booking.createdAt &&
          new Date(booking.startsAt) < new Date(other.endsAt) &&
          new Date(booking.endsAt) > new Date(other.startsAt)
      );
      if (earlierWaitlist) {
        setNotice('An earlier request has priority for this time slot.');
        return;
      }
    }
    setState((current) => ({
      ...current,
      bookings: current.bookings.map((item) =>
        item.id === booking.id
          ? {
              ...item,
              status,
              ...(status === 'COMPLETED' ? { completedAt: new Date().toISOString() } : {}),
            }
          : item
      ),
      resources: current.resources.map((resource) =>
        resource.id === booking.resourceId && status === 'CHECKED_IN'
          ? { ...resource, status: 'ISSUED' }
          : resource.id === booking.resourceId && status === 'COMPLETED'
            ? { ...resource, status: booking.damageReported ? 'DAMAGED' : 'AVAILABLE' }
            : resource
      ),
    }));
    const labels: Partial<Record<RequestStatus, string>> = {
      APPROVED: 'Booking approved',
      REJECTED: 'Booking rejected',
      WAITLISTED: 'Booking waitlisted',
      CHECKED_IN: 'QR check-in complete',
      RETURNED: 'QR check-out recorded',
      COMPLETED: booking.damageReported ? 'Return verified · resource flagged for damage review' : 'Return verified',
      CANCELLED: 'Booking cancelled',
    };
    logEvent(labels[status] ?? `Booking ${status.toLowerCase()}`, `${booking.id} · ${getResource(booking.resourceId)?.name ?? 'Resource'}`);
  };

  const getResource = (resourceId: string) => state.resources.find((resource) => resource.id === resourceId);
  const getUser = (userId: string) => state.users.find((user) => user.id === userId);

  const handleScanResult = (code: string) => {
    setScannerOpen(false);
    const resource = state.resources.find(
      (item) => item.qrCode.toLowerCase() === code.trim().toLowerCase() || item.id === code.trim()
    );
    if (!resource) {
      setNotice(`No demo resource matches “${code}”. Try one of the printed QR codes below.`);
      return;
    }
    setScannedAssetId(resource.id);
    setResourceDetailsOpen(false);
    setView('bookings');
    setNotice(`Scanned ${resource.name}. Matching booking actions are shown below.`);
    setCondition('');
    setDamageReported(false);
  };

  const submitQrAction = (booking: DemoBooking, action: 'CHECK_IN' | 'CHECK_OUT') => {
    if (!condition.trim()) {
      setNotice('Record the resource condition before continuing.');
      return;
    }
    setState((current) => ({
      ...current,
      bookings: current.bookings.map((item) =>
        item.id === booking.id
          ? action === 'CHECK_IN'
            ? { ...item, status: 'CHECKED_IN', initialCondition: condition.trim() }
            : {
                ...item,
                status: 'RETURNED',
                finalCondition: condition.trim(),
                damageReported,
              }
          : item
      ),
      resources: current.resources.map((resource) =>
        resource.id === booking.resourceId
          ? { ...resource, status: action === 'CHECK_IN' ? 'ISSUED' : 'AVAILABLE' }
          : resource
      ),
    }));
    logEvent(
      action === 'CHECK_IN' ? 'QR check-in recorded' : 'QR check-out recorded',
      `${getResource(booking.resourceId)?.name} · condition: ${condition.trim()}`
    );
    setCondition('');
    setDamageReported(false);
  };

  const createResource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resourceName.trim() || !resourceLocation.trim()) return;
    const id = `resource-${Date.now()}`;
    const resource: DemoResource = {
      id,
      name: resourceName.trim(),
      category: resourceCategory,
      description: 'New resource listing. Add operating and safety details for your community.',
      location: resourceLocation.trim(),
      ownerId: activeUser.id,
      status: 'AVAILABLE',
      qrCode: `IDEA-${id.slice(-6).toUpperCase()}`,
      safety: 'Follow the resource owner’s safety instructions.',
      approvalRequired: true,
    };
    setState((current) => ({ ...current, resources: [resource, ...current.resources] }));
    setResourceFormOpen(false);
    setResourceName('');
    setResourceLocation('');
    logEvent('Resource published', `${resource.name} · QR ${resource.qrCode}`);
    setView('resources');
  };

  const resetDemo = () => {
    const fresh = makeSeedState();
    setState(fresh);
    setActiveUserId('demo-student');
    setView('overview');
    setScannedAssetId(null);
    setResourceDetailsOpen(false);
    setNotice('Demo reset to the guided student booking journey.');
  };

  const canManage = activeUser.role !== 'STUDENT';
  const dashboardStats: { label: string; value: number; icon: LucideIcon; helper: string }[] = [
    { label: 'Listed resources', value: state.resources.length, icon: FlaskConical, helper: 'Across labs and shared spaces' },
    {
      label: 'Available now',
      value: state.resources.filter((resource) => resource.status === 'AVAILABLE').length,
      icon: CheckCircle2,
      helper: 'Ready to request',
    },
    { label: 'Needs review', value: pendingCount, icon: Bell, helper: canManage ? 'Owner approval queue' : 'Your pending requests' },
    { label: 'Active bookings', value: activeBookings.length, icon: CalendarDays, helper: 'Across the demo workspace' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-white">
              <FlaskConical size={21} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">IDEA Lab · Resource Share</p>
              <p className="text-[11px] text-slate-500">Underused equipment, put to work</p>
            </div>
            <span className="ml-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Hackathon demo
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="sr-only" htmlFor="demo-persona">Switch demo persona</label>
            <select
              id="demo-persona"
              value={activeUser.id}
              onChange={(event) => {
                setActiveUserId(event.target.value);
                setScannedAssetId(null);
                setNotice(`Viewing as ${state.users.find((user) => user.id === event.target.value)?.name ?? 'demo user'}`);
              }}
              className="max-w-[155px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold sm:max-w-none sm:text-sm"
            >
              {state.users.map((user) => (
                <option key={user.id} value={user.id}>{user.name} · {roleLabels[user.role]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={resetDemo}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              title="Reset this browser's demo data"
            >
              <RotateCcw size={14} /><span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-8">
        <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
          <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 lg:flex-col lg:overflow-visible">
            {([
              ['overview', LayoutDashboard, 'Overview'],
              ['resources', FlaskConical, 'Discover resources'],
              ['bookings', CalendarDays, `Bookings${pendingCount ? ` · ${pendingCount}` : ''}`],
              ['activity', Activity, 'Activity & audit'],
            ] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                  view === id ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={17} />{label}
              </button>
            ))}
          </div>
          <div className="mt-4 hidden rounded-2xl border border-blue-100 bg-blue-50 p-4 lg:block">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-950"><ShieldCheck size={17} />Demo environment</div>
            <p className="mt-2 text-xs leading-relaxed text-blue-900/75">
              No sign-in required. Role switching and changes are simulated and saved only in this browser.
            </p>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{roleLabels[activeUser.role]} view</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {view === 'overview' ? `Welcome, ${activeUser.name.split(' ')[0]}` : view === 'resources' ? 'Discover resources' : view === 'bookings' ? 'Booking workspace' : 'Activity timeline'}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                {view === 'overview'
                  ? 'Book shared spaces and equipment, then complete every hand-off with QR.'
                  : view === 'resources'
                    ? 'Find equipment, review safety notes, and request a time slot.'
                    : view === 'bookings'
                      ? 'Requests, approvals, QR check-in/out, and verified returns in one place.'
                      : 'A transparent record of resource and booking actions in this demo.'}
              </p>
            </div>
            {view === 'resources' && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resources" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm sm:w-56" />
                </div>
                {canManage && (
                  <button type="button" onClick={() => setResourceFormOpen(true)} className="flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">
                    <Plus size={16} /> Add resource
                  </button>
                )}
              </div>
            )}
          </div>

          {notice && (
            <div role="status" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <span className="flex items-center gap-2"><CheckCircle2 size={17} />{notice}</span>
              <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={16} /></button>
            </div>
          )}

          {view === 'overview' && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {dashboardStats.map(({ label, value, icon: Icon, helper }) => (
                  <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">{label}</p>
                      <span className="rounded-xl bg-blue-50 p-2 text-blue-800"><Icon size={17} /></span>
                    </div>
                    <p className="mt-4 text-3xl font-bold">{value}</p>
                    <p className="mt-1 text-xs text-slate-500">{helper}</p>
                  </article>
                ))}
              </section>

              <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">Start a resource journey</h2>
                      <p className="mt-1 text-sm text-slate-500">Discover a resource or scan its QR label.</p>
                    </div>
                    <button type="button" onClick={() => setScannerOpen(true)} className="flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">
                      <QrCode size={17} /> Scan QR
                    </button>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {state.resources.slice(0, 4).map((resource) => (
                      <button key={resource.id} type="button" onClick={() => { setView('resources'); setSearch(resource.name); }} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50/40">
                        <span className="rounded-xl bg-slate-100 p-2.5 text-blue-900"><Wrench size={18} /></span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">{resource.name}</span>
                          <span className="mt-1 block truncate text-xs text-slate-500">{resource.location}</span>
                          <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${resource.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : resource.status === 'DAMAGED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{resource.status === 'AVAILABLE' ? 'Available' : resource.status === 'DAMAGED' ? 'Review needed' : 'In use'}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-900 bg-blue-950 p-5 text-white sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Guided walkthrough</p>
                  <h2 className="mt-2 text-xl font-bold">Student → owner → QR → return</h2>
                  <ol className="mt-5 space-y-3 text-sm text-blue-50/90">
                    <li className="flex gap-3"><span className="font-bold text-cyan-300">01</span> As Aarav, request the oscilloscope.</li>
                    <li className="flex gap-3"><span className="font-bold text-cyan-300">02</span> Switch to Maya and approve the booking.</li>
                    <li className="flex gap-3"><span className="font-bold text-cyan-300">03</span> Switch back, scan the QR, check in and out.</li>
                    <li className="flex gap-3"><span className="font-bold text-cyan-300">04</span> Return as Maya and verify the condition.</li>
                  </ol>
                  <button type="button" onClick={() => setView('bookings')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-950 hover:bg-blue-50">
                    Open booking queue <ArrowUpRight size={16} />
                  </button>
                </div>
              </section>

              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div><h2 className="text-lg font-bold">Recent activity</h2><p className="mt-1 text-sm text-slate-500">Audit trail for this demo workspace.</p></div>
                  <button type="button" onClick={() => setView('activity')} className="text-sm font-bold text-blue-800">View all</button>
                </div>
                <ActivityList events={state.events.slice(0, 4)} />
              </section>
            </>
          )}

          {view === 'resources' && (
            <>
              {canManage && (
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950">
                  <Users size={18} /><span>Owner mode: create listings and manage approvals. QR labels are generated for every resource.</span>
                  <button type="button" onClick={() => setResourceFormOpen(true)} className="ml-auto shrink-0 font-bold">Add one</button>
                </div>
              )}
              {visibleResources.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No resources match your search.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleResources.map((resource) => (
                    <article key={resource.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex h-32 items-end justify-between bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-700 p-5 text-white">
                        <div><p className="text-xs font-semibold text-blue-100">{resource.category}</p><h2 className="mt-1 text-lg font-bold">{resource.name}</h2></div>
                        <Wrench size={28} className="text-white/75" />
                      </div>
                      <div className="space-y-4 p-5">
                        <p className="min-h-10 text-sm leading-relaxed text-slate-600">{resource.description}</p>
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500"><span>{resource.location}</span><span className={`rounded-full px-2.5 py-1 font-bold ${resource.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : resource.status === 'DAMAGED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{resource.status === 'AVAILABLE' ? 'Available' : resource.status === 'DAMAGED' ? 'Under review' : 'In use'}</span></div>
                        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><strong className="text-slate-900">Safety:</strong> {resource.safety}</div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                          <button type="button" onClick={() => { setScannedAssetId(resource.id); setResourceDetailsOpen(true); setNotice(`QR details opened for ${resource.name}.`); }} className="inline-flex items-center gap-2 text-xs font-bold text-blue-800"><QrCode size={15} />{resource.qrCode}</button>
                          {activeUser.role === 'STUDENT' ? (
                            <button type="button" disabled={resource.status !== 'AVAILABLE'} onClick={() => setBookingResourceId(resource.id)} className="rounded-xl bg-blue-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">Request slot</button>
                          ) : (
                            <span className="text-xs text-slate-500">Owner: {getUser(resource.ownerId)?.name ?? 'Demo team'}</span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {view === 'bookings' && (
            <section className="space-y-4">
              {state.bookings.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No bookings yet. Browse resources to start a request.</div>}
              {state.bookings.map((booking) => {
                const resource = getResource(booking.resourceId);
                const borrower = getUser(booking.userId);
                const canReview = canManage && (resource?.ownerId === activeUser.id || activeUser.role === 'ADMIN' || activeUser.role === 'INSTITUTION_MANAGER');
                const isBorrower = activeUser.id === booking.userId;
                return (
                  <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${statusClass(booking.status)}`}>{booking.status.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-[11px] text-slate-400">{booking.id}</span>
                        </div>
                        <h2 className="mt-3 text-lg font-bold">{resource?.name ?? 'Resource'}</h2>
                        <p className="mt-1 text-sm text-slate-600">{booking.purpose}</p>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5"><Users size={14} />{borrower?.name ?? 'Student'}</span>
                          <span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{formatTime(booking.startsAt)} – {shortDateTime(booking.endsAt)}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canReview && ['PENDING', 'WAITLISTED'].includes(booking.status) && (
                          <>
                            <ActionButton onClick={() => updateBookingStatus(booking, 'APPROVED')} label="Approve" icon={<Check size={15} />} />
                            <ActionButton onClick={() => updateBookingStatus(booking, 'REJECTED')} label="Reject" icon={<X size={15} />} secondary />
                            <ActionButton onClick={() => updateBookingStatus(booking, 'WAITLISTED')} label="Waitlist" icon={<Clock3 size={15} />} secondary />
                          </>
                        )}
                        {isBorrower && ['APPROVED', 'CHECKED_IN'].includes(booking.status) && (
                          <ActionButton
                            onClick={() => setScannerOpen(true)}
                            label="Scan QR"
                            icon={<QrCode size={15} />}
                          />
                        )}
                        {canReview && ['RETURNED', 'UNDER_REVIEW'].includes(booking.status) && (
                          <ActionButton onClick={() => updateBookingStatus(booking, 'COMPLETED')} label="Verify return" icon={<ShieldCheck size={15} />} />
                        )}
                        {isBorrower && ['PENDING', 'APPROVED', 'WAITLISTED'].includes(booking.status) && (
                          <ActionButton onClick={() => updateBookingStatus(booking, 'CANCELLED')} label="Cancel" icon={<X size={15} />} secondary />
                        )}
                      </div>
                    </div>

                    {(booking.initialCondition || booking.finalCondition || booking.damageReported) && (
                      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                        {booking.initialCondition && <ConditionCard title="Before use" value={booking.initialCondition} />}
                        {booking.finalCondition && <ConditionCard title="After use" value={booking.finalCondition} />}
                        {booking.damageReported && <p className="sm:col-span-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-800">Damage/incident reported · review before return verification.</p>}
                      </div>
                    )}
                    {resource && scannedResource?.id === resource.id && isBorrower && ['APPROVED', 'CHECKED_IN'].includes(booking.status) && (
                      <div className="mt-5 grid gap-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 sm:grid-cols-[140px_minmax(0,1fr)]">
                        <div className="rounded-xl bg-white p-2 text-center">
                          {qrImage && <img src={qrImage} alt={`QR code ${resource.qrCode}`} className="mx-auto aspect-square w-full" />}
                          <p className="font-mono text-[10px] font-bold">{resource.qrCode}</p>
                        </div>
                        <form onSubmit={(event) => { event.preventDefault(); submitQrAction(booking, booking.status === 'APPROVED' ? 'CHECK_IN' : 'CHECK_OUT'); }} className="space-y-3">
                          <div><h3 className="font-bold">{booking.status === 'APPROVED' ? 'Booking-verified demo QR check-in' : 'Demo QR check-out'}</h3><p className="mt-1 text-xs text-slate-600">The QR identifies the resource; the selected demo student and booking determine the action.</p></div>
                          <label className="block text-xs font-semibold text-slate-700">Condition report<textarea required value={condition} onChange={(event) => setCondition(event.target.value)} rows={2} placeholder="Describe the resource condition" className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal" /></label>
                          {booking.status === 'CHECKED_IN' && <label className="flex items-center gap-2 text-xs font-semibold text-red-800"><input type="checkbox" checked={damageReported} onChange={(event) => setDamageReported(event.target.checked)} />Report damage or an incident</label>}
                          <button type="submit" className="rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">{booking.status === 'APPROVED' ? 'Check in' : 'Check out'}</button>
                        </form>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {view === 'activity' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-900"><Activity size={20} /></span><div><h2 className="font-bold">Audit timeline</h2><p className="text-xs text-slate-500">Every demo action includes a person and timestamp.</p></div></div>
              <ActivityList events={state.events} />
            </section>
          )}
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500">
        Hackathon demonstration · Demo activity is stored only in this browser and is not connected to production accounts.
      </footer>

      {bookingResourceId && (
        <Dialog title="Request a booking" onClose={() => setBookingResourceId(null)}>
          <form onSubmit={(event) => { event.preventDefault(); const resource = getResource(bookingResourceId); if (resource) createBooking(resource); }} className="space-y-4">
            <p className="text-sm text-slate-600">Request <strong>{getResource(bookingResourceId)?.name}</strong> for a one-hour slot. This demo schedules the slot shortly from now so you can complete check-in right away.</p>
            <label className="block text-xs font-bold text-slate-700">Purpose<textarea autoFocus required value={bookingPurpose} onChange={(event) => setBookingPurpose(event.target.value)} rows={3} placeholder="What are you working on?" className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" /></label>
            <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-950"><CalendarDays size={15} className="mr-1 inline" />{shortDateTime(new Date(Date.now() + 5 * 60_000).toISOString())} · 1 hour · approval follows resource policy</div>
            <button type="submit" className="w-full rounded-xl bg-blue-900 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800">Submit booking request</button>
          </form>
        </Dialog>
      )}

      {resourceFormOpen && (
        <Dialog title="Create a resource listing" onClose={() => setResourceFormOpen(false)}>
          <form onSubmit={createResource} className="space-y-4">
            <label className="block text-xs font-bold text-slate-700">Resource name<input required autoFocus value={resourceName} onChange={(event) => setResourceName(event.target.value)} placeholder="e.g. Thermal camera" className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" /></label>
            <label className="block text-xs font-bold text-slate-700">Category<select value={resourceCategory} onChange={(event) => setResourceCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal"><option>Laboratory equipment</option><option>Testing instruments</option><option>Cameras & media</option><option>Classrooms</option><option>Workshop tools</option><option>Computers</option></select></label>
            <label className="block text-xs font-bold text-slate-700">Location<input required value={resourceLocation} onChange={(event) => setResourceLocation(event.target.value)} placeholder="Building · room · storage area" className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" /></label>
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900"><QrCode size={15} className="mr-1 inline" />A unique demo QR label is generated when you publish.</div>
            <button type="submit" className="w-full rounded-xl bg-blue-900 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800">Publish resource</button>
          </form>
        </Dialog>
      )}

      <QRScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScanResult={handleScanResult} />
      {scannedResource && resourceDetailsOpen && (
        <Dialog title="Resource QR details" onClose={() => setScannedAssetId(null)}>
          <div className="grid gap-4 sm:grid-cols-[170px_minmax(0,1fr)]">
            <div className="rounded-xl border border-slate-100 bg-white p-3 text-center">{qrImage && <img src={qrImage} alt={`QR code ${scannedResource.qrCode}`} className="mx-auto w-full" />}<p className="mt-2 font-mono text-xs font-bold">{scannedResource.qrCode}</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-blue-800">{scannedResource.category}</p><h3 className="mt-1 text-lg font-bold">{scannedResource.name}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{scannedResource.description}</p><p className="mt-3 text-xs text-slate-500">{scannedResource.location}</p><p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-950"><strong>Safety:</strong> {scannedResource.safety}</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => { setResourceDetailsOpen(false); setView('resources'); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Browse bookings</button>
            {activeUser.role === 'STUDENT' && <button type="button" onClick={() => { setScannedAssetId(null); setResourceDetailsOpen(false); setBookingResourceId(scannedResource.id); }} className="rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white">Request this resource</button>}
          </div>
        </Dialog>
      )}
    </div>
  );
}

function statusClass(status: RequestStatus): string {
  if (status === 'APPROVED' || status === 'COMPLETED') return 'bg-emerald-100 text-emerald-800';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'bg-slate-100 text-slate-600';
  if (status === 'RETURNED' || status === 'UNDER_REVIEW' || status === 'OVERDUE') return 'bg-amber-100 text-amber-900';
  if (status === 'CHECKED_IN') return 'bg-blue-100 text-blue-800';
  return 'bg-violet-100 text-violet-800';
}

function ActionButton({
  onClick,
  label,
  icon,
  secondary = false,
}: {
  onClick: () => void;
  label: string;
  icon: ReactNode;
  secondary?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${secondary ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'bg-blue-900 text-white hover:bg-blue-800'}`}>
      {icon}{label}
    </button>
  );
}

function ConditionCard({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</p><p className="mt-1 text-xs text-slate-800">{value}</p></div>;
}

function ActivityList({ events }: { events: DemoEvent[] }) {
  return (
    <ol className="mt-5 divide-y divide-slate-100">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
          <span className="mt-0.5 rounded-full bg-blue-50 p-2 text-blue-800"><Activity size={15} /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold">{event.label}</p><p className="mt-0.5 text-xs text-slate-500">{event.detail}</p><p className="mt-1 text-[10px] text-slate-400">{event.user} · {formatTime(event.at)}</p></div>
        </li>
      ))}
    </ol>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
        {children}
      </section>
    </div>
  );
}
