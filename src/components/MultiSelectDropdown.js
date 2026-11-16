import React, { useState } from 'react';
import RemovableTags from './RemovableTags';

// Checkbox dropdown that also lets you type in a new custom value.
// onAddCustom (optional) is told about new values so they can be remembered for next time.
const MultiSelectDropdown = ({ label, options, value = [], onChange, placeholder, onAddCustom }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const removeOption = (option) => onChange(value.filter((v) => v !== option));

  const toggleOption = (option) => {
    if (value.includes(option)) {
      removeOption(option);
    } else {
      onChange([...value, option]);
    }
  };

  const addCustomValue = () => {
    const trimmed = customValue.trim();
    if (!trimmed || value.includes(trimmed)) return;

    onChange([...value, trimmed]);
    if (onAddCustom) onAddCustom(trimmed);
    setCustomValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomValue();
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full border rounded-md px-3 py-2 text-left bg-white flex items-center justify-between"
        >
          <span className="truncate">
            {value.length === 0 ? placeholder : `${value.length} selected`}
          </span>
          <span className="text-gray-400">▼</span>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2 border-b">
              <div className="flex gap-1">
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add custom..."
                  className="flex-1 border rounded px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={addCustomValue}
                  className="bg-blue-600 text-white px-2 py-1 rounded text-sm"
                >
                  Add
                </button>
              </div>
            </div>

            {options.map((option) => (
              <label key={option} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="mr-2"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <RemovableTags items={value} onRemove={removeOption} className="mt-2" />
    </div>
  );
};

export default MultiSelectDropdown;
