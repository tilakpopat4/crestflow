import { doc, collection, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ServiceRequest } from '../types';

export function buildWhatsAppLeadUrl(
  profile: UserProfile,
  lead: {
    clientName: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    proposedRate?: string;
    projectDetails: string;
  }
): string | null {
  if (!profile.phone) return null;
  const cleanPhone = profile.phone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const msg = `Hi ${profile.name},\n\nI've submitted my Onboarding Request for *${lead.clientName.trim()}*.\n\n*Contact:* ${lead.contactName.trim()} (${lead.contactPhone.trim()})\n*Email:* ${lead.contactEmail.trim()}${
    lead.proposedRate ? `\n*Proposed Rate:* ₹${lead.proposedRate}/reel` : ''
  }\n\n*Project Details:*\n${lead.projectDetails.trim()}\n\nLooking forward to working with you!`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
}

export interface SubmitServiceRequestParams {
  profile: UserProfile;
  clientName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  instagram?: string;
  proposedRate?: string;
  projectDetails: string;
  currentUser: { uid: string; email?: string | null };
}

export async function submitOnboardingServiceRequest(params: SubmitServiceRequestParams): Promise<{
  requestId: string;
  waUrl: string | null;
}> {
  const {
    profile,
    clientName,
    contactName,
    contactPhone,
    contactEmail,
    instagram,
    proposedRate,
    projectDetails,
    currentUser,
  } = params;

  const targetUid = profile.userId || profile.id;
  const reqRef = doc(collection(db, 'serviceRequests'));

  const newRequest: ServiceRequest = {
    id: reqRef.id,
    userId: targetUid,
    clientName: clientName.trim(),
    contactName: contactName.trim(),
    contactPhone: contactPhone.trim(),
    contactEmail: contactEmail.trim(),
    projectDetails: projectDetails.trim(),
    status: 'pending',
    createdAt: Date.now(),
    submittedByUid: currentUser.uid,
    submittedByEmail: currentUser.email || contactEmail.trim(),
  };

  if (instagram?.trim()) newRequest.instagram = instagram.trim();
  if (proposedRate && !isNaN(Number(proposedRate))) {
    newRequest.proposedRate = Number(proposedRate);
  }

  await setDoc(reqRef, newRequest);

  // Automated lead email notification to the freelancer (non-blocking)
  fetch('/api/notify/new-client-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      freelancerId: targetUid,
      requestId: reqRef.id,
      clientName: clientName.trim(),
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      instagram: instagram?.trim() || undefined,
      proposedRate: proposedRate && !isNaN(Number(proposedRate)) ? Number(proposedRate) : undefined,
      projectDetails: projectDetails.trim(),
    }),
  }).catch((notifyErr) => console.warn('Automated lead email notification failed:', notifyErr));

  const waUrl = buildWhatsAppLeadUrl(profile, {
    clientName,
    contactName,
    contactPhone,
    contactEmail,
    proposedRate,
    projectDetails,
  });

  return { requestId: reqRef.id, waUrl };
}
