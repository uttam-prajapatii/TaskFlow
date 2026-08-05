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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,12,10,0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        className="tf-modal-in"
        style={{
          background: 'var(--tf-card, #ffffff)',
          borderRadius: 18,
          width: '100%',
          maxWidth: width,
          maxHeight: '88vh',
          overflowY: 'auto',
          border: '1px solid var(--tf-border, #e5e7eb)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
