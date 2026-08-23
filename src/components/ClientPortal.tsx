import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { Client, Invoice, WorkItem, UserProfile } from '../types';
import Logo from './Logo';
import { 
  getPaymentStatusInfo, 
  calculateClientFinancials,
  generateUPIQrUrl,
  generateUPILink
} from '../lib/paymentUtils';
import { 
  LogOut, 
  Briefcase, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  ExternalLink, 
  Star, 
  Send, 
  Download, 
  Printer, 
  X, 
  Play, 
  Search, 
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Sparkles,
  QrCode
} from 'lucide-react';

interface ClientPortalProps {
  user: User;
  onLogout: () => void;
  onSwitchToFreelancer?: () => void;
}

export default function ClientPortal({ user, onLogout, onSwitchToFreelancer }: ClientPortalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [freelancerProfile, setFreelancerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'work' | 'invoices' | 'review'>('overview');
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [workStatusFilter, setWorkStatusFilter] = useState<'all' | 'Uninvoiced' | 'Invoiced'>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'Pending' | 'Paid'>('all');

  // Modal State
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // 1. Fetch Client records associated with this Google email (case-insensitive & trimmed)
  useEffect(() => {
    if (!user.email) {
      setLoading(false);
      return;
    }

    const userEmail = user.email.toLowerCase().trim();
    
    // Listen to clients collection and match user email
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const fetchedClients: Client[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Client;
        if (data.email && data.email.toLowerCase().trim() === userEmail) {
          fetchedClients.push({ id: docSnap.id, ...data });
        }
      });
      setClients(fetchedClients);
      if (fetchedClients.length > 0) {
        setSelectedClientId(prev => prev && fetchedClients.some(c => c.id === prev) ? prev : fetchedClients[0].id);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching client records:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.email]);

  const currentClient = clients.find(c => c.id === selectedClientId) || clients[0] || null;

  // 2. Fetch Freelancer Profile when client is selected
  useEffect(() => {
    if (!currentClient || !(currentClient as any).userId) {
      setFreelancerProfile(null);
      return;
    }

    const freelancerUid = (currentClient as any).userId;
    async function fetchFreelancer() {
      try {
        const profDoc = await getDoc(doc(db, 'profiles', freelancerUid));
        if (profDoc.exists()) {
          setFreelancerProfile(profDoc.data() as UserProfile);
        }
      } catch (err) {
        console.error("Error fetching freelancer profile:", err);
      }
    }
    fetchFreelancer();
  }, [currentClient]);

  // 3. Fetch Invoices and Work Items for the selected client
  useEffect(() => {
    if (!currentClient) {
      setInvoices([]);
      setWorkItems([]);
      return;
    }

    const invQuery = query(collection(db, 'invoices'), where('clientId', '==', currentClient.id));
    const unsubInvoices = onSnapshot(invQuery, (snap) => {
      const list: Invoice[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Invoice));
      list.sort((a, b) => b.date - a.date);
      setInvoices(list);
    }, (err) => {
      console.error("Error fetching invoices:", err);
    });

    const workQuery = query(collection(db, 'workItems'), where('clientId', '==', currentClient.id));
    const unsubWork = onSnapshot(workQuery, (snap) => {
      const list: WorkItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as WorkItem));
      list.sort((a, b) => b.date - a.date);
      setWorkItems(list);
    }, (err) => {
      console.error("Error fetching work items:", err);
    });

    return () => {
      unsubInvoices();
      unsubWork();
    };
  }, [currentClient?.id]);

  // Financial calculations
  const financials = currentClient ? calculateClientFinancials(currentClient.id, invoices, workItems) : null;
  const paymentStatus = currentClient ? getPaymentStatusInfo(currentClient, invoices, workItems) : null;

  const totalQuantityDelivered = workItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalInvoicedAmount = (financials?.paidTotal || 0) + (financials?.pendingInvoiceTotal || 0);
  const totalPaidAmount = financials?.paidTotal || 0;
  const totalPendingBalance = financials?.totalPendingAmount || 0;

  // Submit Review Handler
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient || !reviewText.trim()) return;

    setIsSubmittingReview(true);
    try {
      const reviewRef = doc(collection(db, 'reviews'));
      const reviewData = {
        id: reviewRef.id,
        userId: (currentClient as any).userId || '',
        clientId: currentClient.id,
        clientName: currentClient.name,
        rating: reviewRating,
        feedbackText: reviewText.trim(),
        createdAt: Date.now()
      };

      await setDoc(reviewRef, reviewData);
      setReviewSuccess(true);
      setReviewText('');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to submit review: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If no client profile is linked to this Google account
  if (clients.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <UserCheck size={28} />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">No Client Account Linked</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              We couldn't find any client projects associated with your Google email:
            </p>
            <div className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-mono text-indigo-600 break-all font-semibold">
              {user.email}
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Please contact your freelancer to ensure they have entered this email in your client profile on CrestFlow.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={onLogout}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered lists
  const filteredWork = workItems.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = workStatusFilter === 'all' || item.status === workStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInvoices = invoices.filter(inv => {
    const matchesStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
    return matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Logo className="w-8 h-8 rounded-xl shadow-xs" />
              <span className="text-lg font-extrabold text-slate-900 tracking-tight">CrestFlow</span>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-bold rounded-full uppercase tracking-wider">
              Client Portal
            </span>
          </div>

          {/* Center / Freelancer Info Badge */}
          {freelancerProfile && (
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-full text-xs text-slate-600">
              <Sparkles size={13} className="text-indigo-600" />
              <span>Freelancer: <strong className="text-slate-900">{freelancerProfile.name}</strong></span>
              <span className="text-slate-300">•</span>
              <span className="text-indigo-600 font-medium">{freelancerProfile.professionalTitle}</span>
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Multi-client switcher if client has accounts with multiple freelancers */}
            {clients.length > 1 && (
              <select
                value={selectedClientId || ''}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}



            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-4 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Briefcase size={14} />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('work')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'work'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers size={14} />
            Work Log ({workItems.length})
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'invoices'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={14} />
            Invoices ({invoices.length})
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'review'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Star size={14} />
            Rate & Review
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">

        {/* Client Greeting Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{currentClient?.name}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Logged in as <span className="font-semibold text-slate-700">{user.email}</span> • Client Portal
            </p>
          </div>

          {freelancerProfile && (
            <div className="flex items-center gap-3 bg-indigo-50/70 border border-indigo-100 p-3 rounded-2xl">
              <div className="w-10 h-10 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center text-sm shadow-xs">
                {freelancerProfile.name.charAt(0)}
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900">{freelancerProfile.name}</div>
                <div className="text-indigo-600 font-medium">{freelancerProfile.professionalTitle}</div>
                <div className="text-slate-400 text-[10px]">{freelancerProfile.phone}</div>
              </div>
            </div>
          )}
        </div>

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Payment Cycle Alert Banner */}
            {paymentStatus && (
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
                paymentStatus.isNotificationRequired
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-start gap-3">
                  {paymentStatus.isNotificationRequired ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold text-sm">
                      {paymentStatus.isNotificationRequired 
                        ? `Payment Cycle Alert: ${paymentStatus.notificationMessage || paymentStatus.label}`
                        : `Payment Cycle Status: Up to Date`}
                    </div>
                    <div className="text-xs mt-0.5 opacity-80">
                      Standard payment cycle is 30 days. Last recorded payment: {currentClient?.lastPaymentDate ? new Date(currentClient.lastPaymentDate).toLocaleDateString() : 'N/A'}.
                    </div>
                  </div>
                </div>

                <div className="text-xs font-semibold px-3 py-1.5 bg-white/80 rounded-xl border shrink-0 text-center">
                  {paymentStatus.daysRemaining >= 0 
                    ? `${paymentStatus.daysRemaining} days remaining in cycle` 
                    : `Delayed by ${Math.abs(paymentStatus.daysRemaining)} days`}
                </div>
              </div>
            )}

            {/* Financial & Work Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Work Delivered</span>
                <div className="text-2xl font-extrabold text-slate-900">{totalQuantityDelivered} Units</div>
                <p className="text-[11px] text-slate-400">Total videos / reels produced</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
                <div className="text-2xl font-extrabold text-slate-900">₹{totalInvoicedAmount.toLocaleString('en-IN')}</div>
                <p className="text-[11px] text-slate-400">Across {invoices.length} invoices</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Paid</span>
                <div className="text-2xl font-extrabold text-emerald-600">₹{totalPaidAmount.toLocaleString('en-IN')}</div>
                <p className="text-[11px] text-slate-400">Completed payments</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Balance</span>
                <div className={`text-2xl font-extrabold ${totalPendingBalance > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  ₹{totalPendingBalance.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-400">Due for pending invoices</p>
              </div>
            </div>

            {/* Recent Work Log Snapshot */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Layers size={16} className="text-indigo-600" />
                  Recent Work Delivered
                </h3>
                <button
                  onClick={() => setActiveTab('work')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  View Full Log <ArrowRight size={13} />
                </button>
              </div>

              {workItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No work items logged yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {workItems.slice(0, 5).map(item => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-900">{item.description}</div>
                        <div className="text-slate-400">{new Date(item.date).toLocaleDateString()} • Qty: {item.quantity}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'Invoiced' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.status}
                        </span>
                        {item.videoUrl && (
                          <a
                            href={item.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            title="View Video Link"
                          >
                            <Play size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 2. WORK LOG TAB */}
        {activeTab === 'work' && (
          <div className="space-y-4">
            
            {/* Search & Status Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search work descriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                {(['all', 'Uninvoiced', 'Invoiced'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setWorkStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex-1 sm:flex-initial ${
                      workStatusFilter === status
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {status === 'all' ? 'All Work' : status}
                  </button>
                ))}
              </div>
            </div>

            {/* Work Items Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              {filteredWork.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No work items matching your criteria.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Description</th>
                        <th className="py-3.5 px-4">Qty</th>
                        <th className="py-3.5 px-4">Rate</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Links</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredWork.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">
                            {item.description}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">
                            ₹{item.rate.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'Invoiced' 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {item.videoUrl ? (
                              <a
                                href={item.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-colors"
                              >
                                <Play size={11} />
                                Preview
                              </a>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 3. INVOICES TAB */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            
            {/* Filter Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {(['all', 'Pending', 'Paid'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setInvoiceStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      invoiceStatusFilter === status
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {status === 'all' ? 'All Invoices' : status}
                  </button>
                ))}
              </div>
            </div>

            {/* Invoices Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInvoices.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
                  No invoices found.
                </div>
              ) : (
                filteredInvoices.map(inv => (
                  <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-indigo-200 transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-400">{new Date(inv.date).toLocaleDateString()}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {inv.status}
                        </span>
                      </div>

                      <div className="text-xl font-extrabold text-slate-900">
                        ₹{inv.totalAmount.toLocaleString('en-IN')}
                      </div>

                      <p className="text-xs text-slate-500">
                        Contains {inv.reels?.length || 0} line item(s)
                      </p>
                    </div>

                    <button
                      onClick={() => setViewInvoice(inv)}
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={13} />
                      View Invoice Details
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* 4. REVIEW TAB */}
        {activeTab === 'review' && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Star size={24} className="fill-amber-400" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Rate & Review Your Experience</h2>
              <p className="text-xs text-slate-500">
                Your feedback helps {freelancerProfile?.name || 'your freelancer'} improve their editing services and workflow.
              </p>
            </div>

            {reviewSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-emerald-900 text-sm">Thank You for Your Review!</h3>
                <p className="text-xs text-emerald-700">Your feedback has been submitted successfully.</p>
                <button
                  onClick={() => setReviewSuccess(false)}
                  className="mt-2 text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  Submit Another Review
                </button>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Your Rating</label>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        <Star 
                          size={28} 
                          className={star <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Feedback / Testimonial *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Share your thoughts on turnaround time, video quality, and communication..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full p-3.5 text-xs border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingReview ? (
                    'Submitting Review...'
                  ) : (
                    <>
                      <Send size={13} />
                      Submit Review
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

      </main>

      {/* Invoice Detail Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Logo className="w-7 h-7 rounded-lg" />
                <span className="font-extrabold text-slate-900 text-base">Invoice Details</span>
              </div>
              <button
                onClick={() => setViewInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Invoice Header */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Billed To:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{currentClient?.name}</div>
                <div className="text-slate-500">{user.email}</div>
              </div>

              <div className="text-right">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Invoice Date:</span>
                <div className="font-mono text-slate-900 font-semibold mt-0.5">{new Date(viewInvoice.date).toLocaleDateString()}</div>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  viewInvoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}>
                  {viewInvoice.status}
                </span>
              </div>
            </div>

            {/* Line items list */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Rate</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewInvoice.reels?.map((reel, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{reel.title}</td>
                      <td className="py-2.5 px-3 text-slate-600">{reel.quantity}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">₹{reel.rate}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 text-right">
                        ₹{(reel.quantity * reel.rate).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
              {viewInvoice.discountAmount && viewInvoice.discountAmount > 0 ? (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-₹{viewInvoice.discountAmount}</span>
                </div>
              ) : null}
              {viewInvoice.extraCostAmount && viewInvoice.extraCostAmount > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Extra Costs ({viewInvoice.extraCostDescription || 'Additional'}):</span>
                  <span>+₹{viewInvoice.extraCostAmount}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Amount:</span>
                <span>₹{viewInvoice.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* UPI Payment Option if Pending */}
            {viewInvoice.status === 'Pending' && freelancerProfile?.upiId && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 bg-white p-1 rounded-xl border border-slate-200 shrink-0 flex items-center justify-center">
                  <img
                    src={generateUPIQrUrl(freelancerProfile.upiId, freelancerProfile.name, viewInvoice.totalAmount)}
                    alt="UPI Payment QR"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="text-xs font-bold text-slate-900">Scan & Pay via any UPI App</div>
                  <div className="text-[11px] text-slate-500 font-mono">UPI ID: {freelancerProfile.upiId}</div>
                  <a
                    href={generateUPILink(freelancerProfile.upiId, freelancerProfile.name, viewInvoice.totalAmount)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <QrCode size={13} /> Pay with UPI App
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={13} /> Print Invoice
              </button>
              <button
                type="button"
                onClick={() => setViewInvoice(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
