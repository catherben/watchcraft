import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { buildManualItem } from '../utils/watchlist';
import Modal from './Modal';
import MultiSelectDropdown from './MultiSelectDropdown';
import StatusSelect from './StatusSelect';

const EMPTY_FORM = {
  title: '',
  type: 'tv',
  genre: [],
  mood: [],
  status: 'not started',
  recommendedBy: [],
  runtime: '',
  episodeLength: '',
  totalEpisodes: '',
};

// A number box that stores a number, or '' when it's empty.
const NumberField = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-sm font-medium mb-1">{label}</label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? '' : parseInt(e.target.value))}
      className="w-full border rounded-md px-3 py-2"
      placeholder={placeholder}
    />
  </div>
);

const AddItemForm = ({ tagOptions, onSubmit, onCancel, onOpenOmdbSearch }) => {
  const [form, setForm] = useState(EMPTY_FORM);

  const updateForm = (changes) => setForm((prev) => ({ ...prev, ...changes }));

  const handleSubmit = () => {
    if (!form.title) return;
    onSubmit(buildManualItem(form));
  };

  return (
    <Modal
      title="Add New Item"
      onClose={onCancel}
      maxWidth="28rem"
      closeOnBackdrop={false}
      headerAction={
        <button
          onClick={onOpenOmdbSearch}
          className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"
        >
          <Search className="h-3 w-3" />
          Search OMDB
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateForm({ title: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => updateForm({ type: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="tv">TV Show</option>
            <option value="movie">Movie</option>
          </select>
        </div>

        <MultiSelectDropdown
          label="Genres"
          options={tagOptions.genres}
          value={form.genre}
          onChange={(genre) => updateForm({ genre })}
          onAddCustom={tagOptions.addGenre}
          placeholder="Select genres..."
        />

        <MultiSelectDropdown
          label="Moods"
          options={tagOptions.moods}
          value={form.mood}
          onChange={(mood) => updateForm({ mood })}
          onAddCustom={tagOptions.addMood}
          placeholder="Select moods..."
        />

        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <StatusSelect value={form.status} onChange={(status) => updateForm({ status })} />
        </div>

        <MultiSelectDropdown
          label="Recommended By"
          options={tagOptions.recommenders}
          value={form.recommendedBy}
          onChange={(recommendedBy) => updateForm({ recommendedBy })}
          onAddCustom={tagOptions.addRecommender}
          placeholder="Select recommenders..."
        />

        {form.type === 'movie' ? (
          <NumberField
            label="Runtime (minutes)"
            value={form.runtime}
            onChange={(runtime) => updateForm({ runtime })}
            placeholder="120"
          />
        ) : (
          <>
            <NumberField
              label="Episode Length (minutes)"
              value={form.episodeLength}
              onChange={(episodeLength) => updateForm({ episodeLength })}
              placeholder="22"
            />
            <NumberField
              label="Total Episodes"
              value={form.totalEpisodes}
              onChange={(totalEpisodes) => updateForm({ totalEpisodes })}
              placeholder="100"
            />
          </>
        )}

        <div className="flex gap-2 pt-4">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Add Item
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddItemForm;
