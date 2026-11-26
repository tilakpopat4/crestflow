import { Client, WorkItem, Invoice, ServiceRequest, ClientReview } from '../types';

const now = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

export const SAMPLE_PAYEE_NAME = 'Aarav Mehta (Sample Studio)';
export const SAMPLE_UPI_ID = 'crestflow.demo@okicici';

export const SAMPLE_CLIENTS: Client[] = [
  {
    id: 'sample-client-1',
    name: 'Studio Craft Media',
    phone: '+91 98201 44120',
    email: 'billing@studiocraft.sample',
    currency: 'INR',
    paymentBasis: 'per_reel',
    defaultRate: 2500,
    onSiteShootRate: 6000,
    websiteMakingRate: 15000,
    revisionsIncluded: 2,
    emailRemindersEnabled: true,
    notes: 'Sample client showing retainer & deliverable tracking.',
    createdAt: now - 45 * DAY_MS,
    updatedAt: now - 2 * DAY_MS,
    subClients: [
      { id: 'sample-sub-1', name: 'Apex Fitness', code: 'APX' },
      { id: 'sample-sub-2', name: 'Kala Roasters', code: 'KAL' },
    ],
  },
];

export const SAMPLE_WORK_ITEMS: WorkItem[] = [
  {
    id: 'sample-work-1',
    clientId: 'sample-client-1',
    clientEmail: 'billing@studiocraft.sample',
    subClientId: 'sample-sub-1',
    subClientName: 'Apex Fitness',
    description: 'Sample data: Product launch reel (60s edit + captions)',
    quantity: 1,
    rate: 2500,
    date: now - 3 * DAY_MS,
    status: 'Uninvoiced',
    approvalStatus: 'approved',
    revisionCount: 1,
    createdAt: now - 3 * DAY_MS,
  },
  {
    id: 'sample-work-2',
    clientId: 'sample-client-1',
    clientEmail: 'billing@studiocraft.sample',
    subClientId: 'sample-sub-2',
    subClientName: 'Kala Roasters',
    description: 'Sample data: Cafe BTS vertical cut + color grade',
    quantity: 2,
    rate: 2500,
    date: now - 9 * DAY_MS,
    status: 'Invoiced',
    invoiceId: 'sample-inv-pending',
    approvalStatus: 'pending_review',
    createdAt: now - 9 * DAY_MS,
  },
  {
    id: 'sample-work-3',
    clientId: 'sample-client-1',
    clientEmail: 'billing@studiocraft.sample',
    description: 'Sample data: Campaign launch 3-reel bundle',
    quantity: 4,
    rate: 2500,
    date: now - 24 * DAY_MS,
    status: 'Invoiced',
    invoiceId: 'sample-inv-paid',
    approvalStatus: 'approved',
    createdAt: now - 24 * DAY_MS,
  },
];

export const SAMPLE_INVOICES: Invoice[] = [
  {
    id: 'sample-inv-pending',
    invoiceNumber: 'INV-SAMPLE-002',
    date: now - 4 * DAY_MS,
    clientId: 'sample-client-1',
    clientEmail: 'billing@studiocraft.sample',
    clientName: 'Studio Craft Media',
    reels: [
      {
        id: 'sample-r-1',
        title: 'Sample data: Cafe BTS vertical cut (Kala Roasters)',
        quantity: 2,
        rate: 2500,
        subClientName: 'Kala Roasters',
      },
      {
        id: 'sample-r-2',
        title: 'Sample data: Sound design & motion titles',
        quantity: 1,
        rate: 1500,
      },
    ],
    totalAmount: 6500,
    status: 'Pending',
    linkedWorkItemIds: ['sample-work-2'],
    payeeName: SAMPLE_PAYEE_NAME,
    payeeUpiId: SAMPLE_UPI_ID,
  },
  {
    id: 'sample-inv-paid',
    invoiceNumber: 'INV-SAMPLE-001',
    date: now - 22 * DAY_MS,
    lastPaymentDate: now - 19 * DAY_MS,
    clientId: 'sample-client-1',
    clientEmail: 'billing@studiocraft.sample',
    clientName: 'Studio Craft Media',
    reels: [
      {
        id: 'sample-r-3',
        title: 'Sample data: Campaign launch 3-reel bundle',
        quantity: 4,
        rate: 2500,
      },
    ],
    totalAmount: 10000,
    status: 'Paid',
    linkedWorkItemIds: ['sample-work-3'],
    payeeName: SAMPLE_PAYEE_NAME,
    payeeUpiId: SAMPLE_UPI_ID,
  },
];

export const SAMPLE_REVIEWS: ClientReview[] = [
  {
    id: 'sample-review-1',
    clientName: 'Studio Craft Media (Sample)',
    rating: 5,
    feedbackText: 'Sample data: Crisp pacing, fast revisions, and clean UPI invoice checkout.',
    projectName: 'Campaign Launch Reels',
    userId: 'sample',
    isApproved: true,
    isPublic: true,
    createdAt: now - 15 * DAY_MS,
  },
];

export const SAMPLE_SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 'sample-req-1',
    userId: 'sample',
    clientName: 'Orbit SaaS (Sample Lead)',
    contactName: 'Riya Nair',
    contactPhone: '+91 98112 77801',
    contactEmail: 'riya@orbitsaas.sample',
    projectDetails: 'Sample data: Looking for 8 product demo reels per month.',
    proposedRate: 3000,
    status: 'pending',
    createdAt: now - 1 * DAY_MS,
  },
];
