import { UserProfile } from '../types';

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
