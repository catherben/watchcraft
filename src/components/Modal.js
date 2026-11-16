import React from 'react';

// The dark backdrop + white box used by every pop-up window in the app.
// - maxWidth: how wide the box may get, e.g. '28rem' (small), '42rem' (medium), '56rem' (large)
// - closeOnBackdrop: clicking outside the box closes it (turn off for forms you could lose typing in)
// - headerAction: replaces the × button in the top-right corner
//
// The positioning is written as inline styles on purpose: the pop-up must sit on top of
// the page even if the Tailwind classes don't load, so don't swap these for class names.
const backdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 9999,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
};

const boxStyle = {
  backgroundColor: 'white',
  borderRadius: '8px',
  padding: '1.5rem',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

const Modal = ({
  title,
  onClose,
  maxWidth = '42rem',
  closeOnBackdrop = true,
  headerAction,
  children,
}) => (
  <div style={backdropStyle} onClick={closeOnBackdrop ? onClose : undefined}>
    <div style={{ ...boxStyle, maxWidth }} onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="text-xl font-bold">{title}</h2>
        {headerAction || (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 leading-none"
            style={{ fontSize: '1.5rem', lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
      {children}
    </div>
  </div>
);

export default Modal;
