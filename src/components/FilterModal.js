import React from 'react';
import { EMPTY_FILTERS, WATCHING_ALONE } from '../constants';
import { getUniqueValues } from '../utils/watchlist';
import Modal from './Modal';
import RemovableTags from './RemovableTags';
import StatusSelect from './StatusSelect';

// Pick several values from a dropdown; each pick shows as a removable tag.
const MultiSelect = ({ label, options, value, onChange, placeholder }) => (
  <div>
    <label className="block text-sm font-medium mb-1">{label}</label>
    <div className="border rounded-md p-2 min-h-[40px] bg-white">
      <RemovableTags
        items={value}
        onRemove={(option) => onChange(value.filter((v) => v !== option))}
        className="mb-2"
      />
      <select
        value=""
        onChange={(e) => e.target.value && onChange([...value, e.target.value])}
        className="w-full text-sm bg-transparent border-none outline-none"
      >
        <option value="">{value.length === 0 ? placeholder : 'Add more...'}</option>
        {options
          .filter((option) => !value.includes(option))
          .map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
      </select>
    </div>
  </div>
);

const FilterModal = ({ filters, onChange, watchlist, shownCount, onClose }) => {
  const updateFilters = (changes) => onChange({ ...filters, ...changes });

  // "Watching alone" can't be combined with people:
  // picking it clears the people, and picking a person clears it.
  const setWatchingWith = (selected) => {
    const justPickedAlone = selected.includes(WATCHING_ALONE) && !filters.watchingWith.includes(WATCHING_ALONE);
    updateFilters({
      watchingWith: justPickedAlone ? [WATCHING_ALONE] : selected.filter((v) => v !== WATCHING_ALONE),
    });
  };

  return (
    <Modal title="Filter Your Watchlist" onClose={onClose} maxWidth="56rem">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={filters.type}
            onChange={(e) => updateFilters({ type: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            <option value="tv">TV Shows</option>
            <option value="movie">Movies</option>
          </select>
        </div>

        <MultiSelect
          label="Genre"
          options={getUniqueValues(watchlist, 'genre')}
          value={filters.genre}
          onChange={(genre) => updateFilters({ genre })}
          placeholder="Select genres..."
        />

        <MultiSelect
          label="Mood"
          options={getUniqueValues(watchlist, 'mood')}
          value={filters.mood}
          onChange={(mood) => updateFilters({ mood })}
          placeholder="Select moods..."
        />

        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <StatusSelect
            value={filters.status}
            onChange={(status) => updateFilters({ status })}
            allLabel="All Statuses"
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <MultiSelect
          label="Recommended By"
          options={getUniqueValues(watchlist, 'recommendedBy')}
          value={filters.recommendedBy}
          onChange={(recommendedBy) => updateFilters({ recommendedBy })}
          placeholder="Select recommenders..."
        />

        <MultiSelect
          label="Watching With"
          options={[WATCHING_ALONE, ...getUniqueValues(watchlist, 'watchingWith')]}
          value={filters.watchingWith}
          onChange={setWatchingWith}
          placeholder="Select viewing partners..."
        />

        <div>
          <label className="block text-sm font-medium mb-1">Max Length (minutes)</label>
          <input
            type="number"
            value={filters.maxLength}
            onChange={(e) => updateFilters({ maxLength: e.target.value })}
            placeholder="30, 120..."
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-between items-center">
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="text-sm text-blue-600 hover:text-blue-800 px-3 py-2 border border-blue-600 rounded-md hover:bg-blue-50"
        >
          Clear all filters
        </button>

        <div className="text-sm text-gray-600">
          Showing {shownCount} of {watchlist.length} items
        </div>

        <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Apply Filters
        </button>
      </div>
    </Modal>
  );
};

export default FilterModal;
