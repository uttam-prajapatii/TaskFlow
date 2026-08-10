import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, children, width = 480 }) => {
  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[3px]"
    >
      <div
        className="tf-modal-in relative w-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-2xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[88vh]"
        style={{
          maxWidth: width,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
