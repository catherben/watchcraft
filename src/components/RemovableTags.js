import React from 'react';

// A row of blue pills, each with a × to remove it.
const RemovableTags = ({ items, onRemove, className = '' }) => {
  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {items.map((item) => (
        <span
          key={item}
          className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"
        >
          {item}
          <button
            type="button"
            onClick={() => onRemove(item)}
            className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
};

export default RemovableTags;
