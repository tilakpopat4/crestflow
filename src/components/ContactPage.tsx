import React, { useState } from 'react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Please provide your name.';
    }
    if (!email.trim()) {
      newErrors.email = 'Please provide your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please provide a valid email address.';
    }
    if (!subject.trim()) {
      newErrors.subject = 'Please enter a subject.';
    }
    if (!message.trim()) {
      newErrors.message = 'Please enter your message.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/notify/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: name.trim(),
          senderEmail: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      setIsSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      console.warn('API submission failed, falling back to mailto:', err);
      const supportEmail = 'support.crestflow@gmail.com';
      const emailSubject = encodeURIComponent(`[CrestFlow Contact] ${subject.trim()}`);
      const emailBody = encodeURIComponent(
        `Name: ${name.trim()}\nEmail: ${email.trim()}\n\nMessage:\n${message.trim()}`
      );
      window.location.href = `mailto:${supportEmail}?subject=${emailSubject}&body=${emailBody}`;
      setSubmitError('Message forwarded to your mail client.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full py-8 md:py-12 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-[#F7F7F8] dark:text-[#F7F7F8] tracking-tight">
          Contact Us
        </h1>
        <p className="text-sm text-[#A1A1AA] dark:text-[#A1A1AA] mt-1 mb-8">
          Have a question, feedback, or need support with CrestFlow? Get in touch with our team.
        </p>

        <div className="space-y-8">
          {/* Contact Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1.5"
              >
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Your full name"
                className="w-full p-3 bg-[#131318] dark:bg-[#131318] text-[#F7F7F8] dark:text-[#F7F7F8] border border-[#2A2A33] dark:border-[#2A2A33] rounded-xl focus:border-[#2A2A33] dark:focus:border-[#2A2A33] outline-none text-sm placeholder:text-[#A1A1AA] dark:placeholder:text-[#A1A1AA]"
              />
              {errors.name && (
                <p className="text-xs text-[#E0002B] dark:text-[#F0607A] mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1.5"
              >
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="name@example.com"
                className="w-full p-3 bg-[#131318] dark:bg-[#131318] text-[#F7F7F8] dark:text-[#F7F7F8] border border-[#2A2A33] dark:border-[#2A2A33] rounded-xl focus:border-[#2A2A33] dark:focus:border-[#2A2A33] outline-none text-sm placeholder:text-[#A1A1AA] dark:placeholder:text-[#A1A1AA]"
              />
              {errors.email && (
                <p className="text-xs text-[#E0002B] dark:text-[#F0607A] mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="contact-subject"
                className="block text-sm font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1.5"
              >
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (errors.subject) setErrors((prev) => ({ ...prev, subject: '' }));
                }}
                placeholder="How can we help?"
                className="w-full p-3 bg-[#131318] dark:bg-[#131318] text-[#F7F7F8] dark:text-[#F7F7F8] border border-[#2A2A33] dark:border-[#2A2A33] rounded-xl focus:border-[#2A2A33] dark:focus:border-[#2A2A33] outline-none text-sm placeholder:text-[#A1A1AA] dark:placeholder:text-[#A1A1AA]"
              />
              {errors.subject && (
                <p className="text-xs text-[#E0002B] dark:text-[#F0607A] mt-1">{errors.subject}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="block text-sm font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1.5"
              >
                Message
              </label>
              <textarea
                id="contact-message"
                rows={5}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (errors.message) setErrors((prev) => ({ ...prev, message: '' }));
                }}
                placeholder="Describe your question or issue in detail..."
                className="w-full p-3 bg-[#131318] dark:bg-[#131318] text-[#F7F7F8] dark:text-[#F7F7F8] border border-[#2A2A33] dark:border-[#2A2A33] rounded-xl focus:border-[#2A2A33] dark:focus:border-[#2A2A33] outline-none text-sm placeholder:text-[#A1A1AA] dark:placeholder:text-[#A1A1AA]"
              />
              {errors.message && (
                <p className="text-xs text-[#E0002B] dark:text-[#F0607A] mt-1">{errors.message}</p>
              )}
            </div>

            {isSubmitted && (
              <div className="p-4 bg-[#131318] dark:bg-[#131318] border border-[#2A2A33] dark:border-[#2A2A33] rounded-lg text-sm text-[#F7F7F8] dark:text-[#F7F7F8]">
                <span className="font-semibold block mb-1">Message Sent</span>
                Thank you for contacting CrestFlow. We have sent a confirmation email to your inbox — our team will contact you within 48 hours.
              </div>
            )}

            {submitError && !isSubmitted && (
              <div className="p-3 bg-[#131318] dark:bg-[#131318] border border-[#2A2A33] dark:border-[#2A2A33] rounded-lg text-xs text-[#A1A1AA] dark:text-[#A1A1AA]">
                {submitError}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors border-none cursor-pointer"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>

          {/* Plain Text Details */}
          <div className="pt-6 border-t border-[#2A2A33] dark:border-[#2A2A33] space-y-4 text-xs text-[#A1A1AA] dark:text-[#A1A1AA]">
            <div>
              <span className="font-semibold text-[#A1A1AA] dark:text-[#A1A1AA] block mb-0.5">
                Product &amp; Company
              </span>
              <p className="text-[#F7F7F8] dark:text-[#F7F7F8] font-medium">CrestFlow</p>
              <p className="text-[#A1A1AA] dark:text-[#A1A1AA]">Operated by Tilak Popat Films</p>
            </div>

            <div>
              <span className="font-semibold text-[#A1A1AA] dark:text-[#A1A1AA] block mb-0.5">
                Contact &amp; Support Email
              </span>
              <a
                href="mailto:support.crestflow@gmail.com"
                className="text-text-primary underline font-medium"
              >
                support.crestflow@gmail.com
              </a>
            </div>

            <div>
              <span className="font-semibold text-[#A1A1AA] dark:text-[#A1A1AA] block mb-0.5">
                Response Time
              </span>
              <p className="text-[#F7F7F8] dark:text-[#F7F7F8]">24-48 working hours</p>
            </div>

            <div>
              <span className="font-semibold text-[#A1A1AA] dark:text-[#A1A1AA] block mb-0.5">
                Address
              </span>
              <p className="text-[#F7F7F8] dark:text-[#F7F7F8]">Uvarsad, Gandhinagar, Gujarat, INDIA.</p>
            </div>

            <div>
              <span className="font-semibold text-[#A1A1AA] dark:text-[#A1A1AA] block mb-0.5">
                Grievance Redressal
              </span>
              <p className="text-[#A1A1AA] dark:text-[#A1A1AA]">
                There is no separate Grievance Officer; all inquiries and grievances are handled directly by the Founder: <strong className="text-[#F7F7F8] dark:text-[#F7F7F8]">Tilak Popat</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
