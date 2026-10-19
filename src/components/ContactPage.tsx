import React, { useState } from 'react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
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

    // Since no backend contact email service exists, wire directly to mailto: link
    const supportEmail = 'work.tilakpopatfilms@gmail.com';
    const emailSubject = encodeURIComponent(`[CrestFlow Contact] ${subject.trim()}`);
    const emailBody = encodeURIComponent(
      `Name: ${name.trim()}\nEmail: ${email.trim()}\n\nMessage:\n${message.trim()}`
    );
    window.location.href = `mailto:${supportEmail}?subject=${emailSubject}&body=${emailBody}`;
  };

  return (
    <div className="w-full py-8 md:py-12 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Contact Us
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-8">
          Have a question, feedback, or need support with CrestFlow? Get in touch with our team.
        </p>

        <div className="space-y-8">
          {/* Contact Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
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
                className="w-full p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {errors.name && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
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
                className="w-full p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {errors.email && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="contact-subject"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
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
                className="w-full p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {errors.subject && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.subject}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
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
                className="w-full p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {errors.message && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors border-none cursor-pointer"
              >
                Send Message
              </button>
            </div>
          </form>

          {/* Plain Text Details */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                Support Email
              </span>
              <a
                href="mailto:work.tilakpopatfilms@gmail.com"
                className="text-slate-900 dark:text-slate-100 hover:underline"
              >
                work.tilakpopatfilms@gmail.com
              </a>
            </div>

            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                Response Time
              </span>
              <p className="text-slate-900 dark:text-slate-100">We reply within 2 business days</p>
            </div>

            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                Business Details
              </span>
              <p className="text-slate-900 dark:text-slate-100">Tilak Popat Films</p>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">Gandhinagar, Gujarat, 382421</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
