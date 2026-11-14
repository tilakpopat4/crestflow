import React from 'react';

/**
 * WorkflowIllustration renders the exact freelance deliverable-to-invoice
 * process flow diagram from the design reference:
 * Project Idea (Lightbulb) -> Deliverable documents & review cards -> Final Invoices.
 */
export const WorkflowIllustration: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`w-full max-w-lg select-none ${className}`}>
      <img
        src="/workflow-diagram.svg"
        alt="Idea to Invoice Workflow Diagram"
        className="w-full h-auto select-none pointer-events-none drop-shadow-sm"
        loading="eager"
        decoding="async"
      />
    </div>
  );
};
