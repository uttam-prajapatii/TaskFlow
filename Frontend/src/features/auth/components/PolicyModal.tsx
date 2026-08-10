import React from 'react';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';

interface PolicyModalProps {
  open: boolean;
  type: 'terms' | 'privacy' | null;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ open, type, onClose }) => {
  if (!open || !type) return null;

  const isTerms = type === 'terms';
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy';
  const lastUpdated = 'Last updated: January 15, 2026';

  return (
    <Modal open={open} onClose={onClose} width={540}>
      {/* Modal Header */}
      <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white dark:bg-neutral-900 z-10">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
          <p className="text-[11px] text-neutral-400 mt-0.5">{lastUpdated}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Modal Body / Scrollable Content */}
      <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans select-text">
        {isTerms ? (
          <>
            <section>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                1. Acceptance of Terms
              </h3>
              <p>
                By accessing or using TaskFlow ("the Service"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use the Service.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                2. User Accounts & Responsibilities
              </h3>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities conducted under your account. You agree to notify TaskFlow immediately of any unauthorized access or security breach.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                3. Acceptable Use Policy
              </h3>
              <p>
                You agree not to use TaskFlow to transmit unlawful material, distribute malware, engage in unauthorized automated data collection, or disrupt the performance and security of our infrastructure.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                4. Data Ownership & Intellectual Property
              </h3>
              <p>
                You retain full ownership rights to all project data, tasks, and media uploaded to TaskFlow. TaskFlow retains all intellectual property rights in the platform architecture, design system, and code.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                5. Termination & Service Availability
              </h3>
              <p>
                We reserve the right to suspend or terminate accounts that violate our terms. We strive for 99.9% platform availability but provide the service "as is" without implied warranties.
              </p>
            </section>
          </>
        ) : (
          <>
            <section>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                1. Information We Collect
              </h3>
              <p>
                We collect your full name, work email address, IP address, device metadata, and workspace content strictly to deliver and improve TaskFlow collaboration services.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                2. How We Use Your Data
              </h3>
              <p>
                Your personal data is used solely to authenticate your account, deliver real-time notifications, facilitate workspace collaboration, and maintain platform security.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                3. Data Security & Storage
              </h3>
              <p>
                We enforce enterprise-grade security including TLS 1.3 encryption in transit, bcrypt password hashing, and HttpOnly cookie session storage to protect your data.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                4. Third-Party Sharing
              </h3>
              <p>
                TaskFlow does not sell or rent your personal information to advertisers. We share data only with infrastructure providers (e.g. database hosting, email delivery) essential to running the Service.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                5. Your Privacy Rights
              </h3>
              <p>
                You have the right to request access to, correction of, or permanent deletion of your personal data at any time by contacting our support team or deleting your workspace.
              </p>
            </section>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/20 transition cursor-pointer"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

export default PolicyModal;
