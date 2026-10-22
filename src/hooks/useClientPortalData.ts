/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Client, Invoice, WorkItem, UserProfile } from '../types';
import { calculateClientFinancials, getPaymentStatusInfo } from '../lib/paymentUtils';

/**
 * Custom hook encapsulating data subscriptions, profile lookups,
 * and review submissions for the Client Portal.
 */
export function useClientPortalData(user: User | null) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [freelancerProfile, setFreelancerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);

  // Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [existingReview, setExistingReview] = useState<{ rating: number; feedbackText: string; createdAt: number } | null>(null);
  const [checkingReview, setCheckingReview] = useState(false);

  // 1. Fetch Client records associated with this Google email
  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const userEmail = user.email.toLowerCase().trim();
    const clientQuery = query(collection(db, 'clients'), where('email', '==', userEmail));
    const unsubscribe = onSnapshot(
      clientQuery,
      (snapshot) => {
        const fetchedClients: Client[] = [];
        snapshot.forEach((docSnap) => {
          fetchedClients.push({ id: docSnap.id, ...(docSnap.data() as Client) });
        });
        setClients(fetchedClients);
        if (fetchedClients.length > 0) {
          setSelectedClientId((prev) => (prev && fetchedClients.some((c) => c.id === prev) ? prev : fetchedClients[0].id));
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching client records:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.email]);

  const currentClient = clients.find((c) => c.id === selectedClientId) || clients[0] || null;

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
        console.error('Error fetching freelancer profile:', err);
      }
    }
    fetchFreelancer();
  }, [currentClient]);

  // 3. Fetch Invoices and Work Items for the client by clientEmail
  useEffect(() => {
    if (!user?.email || !currentClient) {
      setInvoices([]);
      setWorkItems([]);
      return;
    }

    const userEmail = user.email.toLowerCase().trim();
    const invQuery = query(collection(db, 'invoices'), where('clientEmail', '==', userEmail));
    const unsubInvoices = onSnapshot(
      invQuery,
      (snap) => {
        const list: Invoice[] = [];
        snap.forEach((d) => {
          const data = { id: d.id, ...d.data() } as Invoice;
          if (!currentClient || data.clientId === currentClient.id) {
            list.push(data);
          }
        });
        list.sort((a, b) => b.date - a.date);
        setInvoices(list);
      },
      (err) => {
        console.error('Error fetching invoices:', err);
      }
    );

    const workQuery = query(collection(db, 'workItems'), where('clientEmail', '==', userEmail));
    const unsubWork = onSnapshot(
      workQuery,
      (snap) => {
        const list: WorkItem[] = [];
        snap.forEach((d) => {
          const data = { id: d.id, ...d.data() } as WorkItem;
          if (!currentClient || data.clientId === currentClient.id) {
            list.push(data);
          }
        });
        list.sort((a, b) => b.date - a.date);
        setWorkItems(list);
      },
      (err) => {
        console.error('Error fetching work items:', err);
      }
    );

    return () => {
      unsubInvoices();
      unsubWork();
    };
  }, [user?.email, currentClient]);

  // Financial calculations
  const financials = currentClient ? calculateClientFinancials(currentClient.id, invoices, workItems) : null;
  const paymentStatus = currentClient ? getPaymentStatusInfo(currentClient, invoices, workItems) : null;

  const totalQuantityDelivered = workItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalInvoicedAmount = (financials?.paidTotal || 0) + (financials?.pendingInvoiceTotal || 0);
  const totalPaidAmount = financials?.paidTotal || 0;
  const totalPendingBalance = financials?.totalPendingAmount || 0;

  // Check if this client already submitted a review
  useEffect(() => {
    if (!currentClient) {
      setExistingReview(null);
      return;
    }
    setCheckingReview(true);
    const q = query(collection(db, 'reviews'), where('clientId', '==', currentClient.id));
    getDocs(q)
      .then((snap) => {
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setExistingReview({ rating: data.rating, feedbackText: data.feedbackText, createdAt: data.createdAt });
        } else {
          setExistingReview(null);
        }
      })
      .catch(console.error)
      .finally(() => setCheckingReview(false));
  }, [currentClient?.id]);

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
        createdAt: Date.now(),
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

  return {
    clients,
    selectedClientId,
    setSelectedClientId,
    currentClient,
    freelancerProfile,
    loading,
    invoices,
    workItems,
    paymentStatus,
    totalQuantityDelivered,
    totalInvoicedAmount,
    totalPaidAmount,
    totalPendingBalance,
    reviewRating,
    setReviewRating,
    reviewText,
    setReviewText,
    isSubmittingReview,
    reviewSuccess,
    existingReview,
    checkingReview,
    handleReviewSubmit,
  };
}
