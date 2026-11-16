import React from 'react';
import { STATUSES } from '../constants';

// Status dropdown. Pass allLabel (e.g. "All Statuses") to add a blank "everything" choice for filters.
const StatusSelect = ({ value, onChange, allLabel, className = 'w-full border rounded-md px-3 py-2' }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
    {allLabel && <option value="">{allLabel}</option>}
    {STATUSES.map((status) => (
      <option key={status.value} value={status.value}>
        {status.label}
      </option>
    ))}
  </select>
);

export default StatusSelect;
