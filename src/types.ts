export interface SubClient {
  id: string;
  name: string;
  code?: string;
  notes?: string;
  logoUrl?: string;
  instagram?: string;
  email?: string;
  phone?: string;
  clientFrom?: string; // e.g. YYYY-MM
  workExperience?: string;
  createdAt?: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  logoUrl?: string;
  instagram?: string;
  clientFrom?: string; // e.g. YYYY-MM
  workExperience?: string;
  defaultRate: number;
  onSiteShootRate?: number;
  websiteMakingRate?: number;
  lastPaymentDate?: number; // timestamp in ms of previous payment date
  paymentCycleDays?: number; // default 30 days
  emailRemindersEnabled?: boolean; // toggle for overdue payment email reminders
  notes?: string;
  createdAt: number;
  subClients?: SubClient[]; // List of sub-clients belonging to this client
}

export interface Reel {
  id: string;
  title: string;
  quantity: number;
  rate: number;
  subClientId?: string;
  subClientName?: string;
  videoUrl?: string;
}

export interface WorkItem {
  id: string;
  clientId: string;
  subClientId?: string;
  subClientName?: string;
  description: string;
  quantity: number;
  rate: number;
  date: number;
  status: 'Uninvoiced' | 'Invoiced';
  invoiceId?: string;
  videoUrl?: string;
  createdAt: number;
}

export interface Invoice {
  id: string;
  date: number;
  clientId: string;
  clientName: string;
  reels: Reel[];
  totalAmount: number;
  status: 'Pending' | 'Paid';
  discountAmount?: number;
  discountDescription?: string;
  extraCostAmount?: number;
  extraCostDescription?: string;
  lastPaymentDate?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  upiId: string;
  professionalTitle: string;
  servicesDescription: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  geminiApiKey?: string;
  createdAt: number;
}

export interface StickyNote {
  id: string;
  clientId: string; // client ID, or 'general' / '' for general notes
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple';
  createdAt: number;
  updatedAt?: number;
  userId?: string;
}

export interface ClientReview {
  id: string;
  clientId?: string;
  clientName: string;
  rating: number; // 1 to 5 stars
  feedbackText: string;
  projectName?: string; // Optional project title
  userId: string; // Freelancer's user ID (owner)
  createdAt: number;
}

export interface ServiceRequest {
  id: string;
  userId: string; // Freelancer's UID (userId so useFirestore can filter it)
  clientName: string; // Company / Client Name
  contactName: string; // Person Name
  contactPhone: string;
  contactEmail: string;
  projectDetails: string;
  instagram?: string;
  proposedRate?: number;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}
