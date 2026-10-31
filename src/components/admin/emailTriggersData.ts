export interface TriggerItem {
  id: string;
  name: string;
  triggerEvent: string;
  recipient: string;
  subject: string;
  status: 'Active';
}

export const AUTOMATED_TRIGGERS: TriggerItem[] = [
  {
    id: 'welcome',
    name: 'Sign-Up Welcome Greeting',
    triggerEvent: 'First account registration & profile initialization',
    recipient: 'Freelancer Email',
    subject: "Congrats You've Started Your Journey | CrestFlow",
    status: 'Active',
  },
  {
    id: 'milestone_100',
    name: '100 Days Milestone',
    triggerEvent: 'Freelancer completes 100 days worked',
    recipient: 'Freelancer Email',
    subject: 'Milestone Reached: 100 Days Freelancing Milestone | CrestFlow',
    status: 'Active',
  },
  {
    id: 'milestones_anniversary',
    name: '6 Months & 1 Year Anniversaries',
    triggerEvent: 'Career milestones (180 days, 365 days, and yearly)',
    recipient: 'Freelancer Email',
    subject: 'Milestone Reached: [Milestone Title] | CrestFlow',
    status: 'Active',
  },
  {
    id: 'due_today',
    name: 'Client Payment Due Today Alert',
    triggerEvent: 'Active client invoice or monthly retainer due date is today',
    recipient: 'Freelancer Email',
    subject: 'Payment Due Today: [Client Name] ([Amount])',
    status: 'Active',
  },
  {
    id: 'contact_auto_reply',
    name: 'Contact Form Auto-Reply',
    triggerEvent: 'Public Contact Us form submitted',
    recipient: 'Sender Email',
    subject: 'We Received Your Message | CrestFlow Support',
    status: 'Active',
  },
  {
    id: 'contact_admin_notice',
    name: 'Admin Contact Lead Alert',
    triggerEvent: 'Public Contact Us form submitted',
    recipient: 'support.crestflow@gmail.com',
    subject: 'New CrestFlow Support Request: [Subject]',
    status: 'Active',
  },
  {
    id: 'payment_receipt',
    name: 'Pro Subscription Receipt',
    triggerEvent: 'User completes ₹49/month or ₹499/year membership payment',
    recipient: 'Freelancer Email',
    subject: 'Payment Receipt: CrestFlow Pro Membership ([Plan])',
    status: 'Active',
  },
  {
    id: 'client_intake',
    name: 'Client Intake Lead Notification',
    triggerEvent: 'Prospective client completes freelancer public intake form',
    recipient: 'Freelancer Email',
    subject: 'New Client Project Request: [Prospect Name]',
    status: 'Active',
  },
];

