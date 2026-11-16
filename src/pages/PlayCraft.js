import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, Play, Users, Star, Clock, Tag, Download, Loader, Trash2, Edit3, Save, X, Grid, List, UserPlus, ArrowUpDown, Shuffle, Gamepad2, Tv, Monitor } from 'lucide-react';
import { getAllGames, addGame, updateGame, deleteGame } from '../firebase/gamesService';
import { RECOMMENDER_OPTIONS } from '../constants';

// ---------------------------------------------------------------------------
// PlayCraft - the video game side of WatchCraft. Lives at /play.
// Game data comes from RAWG (https://rawg.io), the games equivalent of OMDB.
// ---------------------------------------------------------------------------

const RAWG_API_KEY = '18000b467e494f53b8acab121dfc430a';
const RAWG_BASE_URL = 'https://api.rawg.io/api';

// Filter option for games with nobody listed under "Playing With"
const PLAYING_ALONE = 'Playing alone';

const STATUS_OPTIONS = [
  { value: 'not started', label: 'Not Started', color: '#64748b', border: '#475569' },
  { value: 'currently playing', label: 'Currently Playing', color: '#22c55e', border: '#16a34a' },
  { value: 'currently replaying', label: 'Currently Replaying', color: '#14b8a6', border: '#0f766e' },
  { value: 'on hold', label: 'On Hold', color: '#eab308', border: '#ca8a04' },
  { value: 'completed', label: 'Completed', color: '#1f2937', border: '#111827' },
  { value: 'to replay', label: 'To Replay', color: '#f97316', border: '#ea580c' }
];

const MOOD_OPTIONS = [
  'Relaxing', 'Cozy', 'Chill', 'Funny', 'Challenging', 'Intense', 'Competitive',
  'Story-rich', 'Emotional', 'Spooky', 'Dark', 'Mysterious', 'Epic', 'Adventurous',
  'Nostalgic', 'Thought-provoking', 'Quick session', 'Long haul'
];

// Same people as WatchCraft (the list lives in constants.js). Custom names added on either page are shared.
const BASE_RECOMMENDER_OPTIONS = RECOMMENDER_OPTIONS;

const EMPTY_FILTERS = {
  genre: [],
  mood: [],
  status: '',
  platform: '',
  recommendedBy: [],
  playingWith: [],
  maxLength: ''
};

const YOUR_BAR_COLOR = '#22c55e';     // green
const PARTNER_BAR_COLOR = '#60a5fa';  // blue

// --- Helpers ---------------------------------------------------------------

const loadSavedList = (key) => {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
};

const clampPercent = (value) => Math.max(0, Math.min(Math.round(Number(value) || 0), 100));

// Your progress: status wins at the two ends (not started = 0%, completed = 100%)
const getGameProgress = (game) => {
  if (game.status === 'completed') return 100;
  if (game.status === 'not started') return 0;
  return clampPercent(game.progress);
};

const getStatusStyle = (status) => {
  const match = STATUS_OPTIONS.find(option => option.value === status);
  return {
    backgroundColor: match ? match.color : '#6b7280',
    borderColor: match ? match.border : '#4b5563',
    color: 'white'
  };
};

// Turn a RAWG game record into the shape PlayCraft stores
const mapRawgGame = (data) => ({
  title: data.name || 'Untitled',
  rawgId: data.id || null,
  slug: data.slug || null,
  poster: data.background_image || null,
  genre: (data.genres || []).map(g => g.name).filter(Boolean),
  platforms: (data.platforms || []).map(p => (p.platform ? p.platform.name : null)).filter(Boolean),
  released: data.released || null,
  releaseYear: data.released ? parseInt(data.released.slice(0, 4)) || null : null,
  rating: data.rating || 0,               // RAWG player rating, out of 5
  metacritic: data.metacritic || null,    // out of 100
  averagePlaytime: data.playtime || null, // average hours, per RAWG
  description: data.description_raw || '',
  developers: (data.developers || []).map(d => d.name).filter(Boolean)
});

const describePlatforms = (game) => {
  if (game.playingOn) return game.playingOn;
  const platforms = game.platforms || [];
  if (platforms.length === 0) return '';
  return platforms.slice(0, 3).join(', ') + (platforms.length > 3 ? ` +${platforms.length - 3}` : '');
};

// --- Small shared pieces ---------------------------------------------------

const ProgressBar = ({ percent, color = YOUR_BAR_COLOR, trackColor = 'rgba(255, 255, 255, 0.3)', height = 6 }) => {
  const safePercent = clampPercent(percent);
  return (
    <div
      role="progressbar"
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ flex: 1, minWidth: 0, height, borderRadius: 9999, backgroundColor: trackColor, overflow: 'hidden' }}
    >
      <div
        style={{ width: `${safePercent}%`, height: '100%', borderRadius: 9999, backgroundColor: color, transition: 'width 0.3s ease' }}
      />
    </div>
  );
};

// One line on a card: name, bar, percent
const ProgressRow = ({ label, percent, color, bold }) => (
  <div className="flex items-center gap-2" title={`${label}: ${percent}% played`}>
    <span
      className={`truncate ${bold ? 'font-semibold' : 'opacity-90'}`}
      style={{ width: '3.5rem', flexShrink: 0 }}
    >
      {label}
    </span>
    <ProgressBar percent={percent} color={color} />
    <span style={{ flexShrink: 0, width: '2.25rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{percent}%</span>
  </div>
);

// Cover art, with a plain fallback when a game has no image
const Cover = ({ game, height, className = '' }) => {
  const [failed, setFailed] = useState(false);
  if (!game.poster || failed) {
    return (
      <div
        className={`w-full flex items-center justify-center bg-gray-300 text-gray-500 ${className}`}
        style={{ height }}
      >
        <Gamepad2 className="h-8 w-8" />
      </div>
    );
  }
  return (
    <img
      src={game.poster}
      alt={game.title}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`w-full object-cover ${className}`}
      style={{ height }}
    />
  );
};

const ModalShell = ({ title, onClose, maxWidth = '42rem', children }) => (
  <div
    className="fixed inset-0 flex items-center justify-center p-4"
    style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    onClick={onClose}
  >
    <div
      className="bg-white rounded-lg p-6 w-full overflow-y-auto shadow-2xl"
      style={{ maxWidth, maxHeight: '90vh' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4 gap-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      {children}
    </div>
  </div>
);

const RawgCredit = ({ className = '' }) => (
  <p className={`text-xs text-gray-500 ${className}`}>
    Game data and images from{' '}
    <a href="https://rawg.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
      RAWG
    </a>
  </p>
);

// Dropdown with checkboxes and an "add custom" box (used in the edit window)
const MultiSelectDropdown = ({ label, options, value = [], onChange, placeholder, onAddCustom }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const toggleOption = (option) => {
    onChange(value.includes(option) ? value.filter(v => v !== option) : [...value, option]);
  };

  const addCustomValue = () => {
    const trimmed = customValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      if (onAddCustom) onAddCustom(trimmed);
    }
    setCustomValue('');
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border rounded-md px-3 py-2 text-left bg-white flex items-center justify-between"
      >
        <span className="truncate">{value.length === 0 ? placeholder : `${value.length} selected`}</span>
        <span className="text-gray-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {onAddCustom && (
            <div className="p-2 border-b flex gap-1">
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomValue();
                  }
                }}
                placeholder="Add custom..."
                className="flex-1 border rounded px-2 py-1 text-sm"
              />
              <button type="button" onClick={addCustomValue} className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
                Add
              </button>
            </div>
          )}
          {options.map(option => (
            <label key={option} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={value.includes(option)} onChange={() => toggleOption(option)} className="mr-2" />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {value.map(item => (
            <span key={item} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              {item}
              <button
                type="button"
                onClick={() => toggleOption(item)}
                className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// Tag-style multi-select used in the filter window
const FilterMultiSelect = ({ label, options, value, onChange, placeholder }) => (
  <div>
    <label className="block text-sm font-medium mb-1">{label}</label>
    <div className="border rounded-md p-2 bg-white" style={{ minHeight: '40px' }}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {value.map(item => (
            <span key={item} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              {item}
              <button
                type="button"
                onClick={() => onChange(value.filter(v => v !== item))}
                className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) onChange([...value, e.target.value]);
        }}
        className="w-full text-sm bg-transparent border-none outline-none"
      >
        <option value="">{value.length === 0 ? placeholder : 'Add more...'}</option>
        {options.filter(option => !value.includes(option)).map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  </div>
);

// --- Search RAWG and add a game --------------------------------------------

const GameSearchModal = ({ existingRawgIds, onAdd, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [addingId, setAddingId] = useState(null);

  const handleSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(
        `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(trimmed)}&page_size=12`
      );
      if (!response.ok) {
        throw new Error(`RAWG answered with status ${response.status}`);
      }
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error searching RAWG:', error);
      setResults([]);
      setSearchError('Could not search RAWG. Check the API key and your connection, then try again.');
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const handleAdd = async (result) => {
    setAddingId(result.id);
    try {
      await onAdd(result);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <ModalShell title="Search for a game" onClose={onClose} maxWidth="56rem">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search for video games..."
          className="flex-1 border rounded-md px-3 py-2"
          autoFocus
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isSearching ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </div>
      <RawgCredit className="mb-4" />

      {searchError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{searchError}</div>
      )}

      {isSearching && (
        <div className="text-center py-8">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Searching RAWG...</p>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map(result => {
            const alreadyAdded = existingRawgIds.includes(result.id);
            const platforms = (result.platforms || []).map(p => (p.platform ? p.platform.name : null)).filter(Boolean);
            return (
              <div key={result.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <Cover game={{ poster: result.background_image, title: result.name }} height="96px" />
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{result.name}</h3>
                  <p className="text-xs text-gray-600 mb-1">{result.released ? result.released.slice(0, 4) : 'Release date unknown'}</p>
                  <p className="text-xs text-gray-600 mb-2 truncate">{platforms.slice(0, 4).join(', ')}</p>
                  {alreadyAdded ? (
                    <div className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded text-center">Already on your list</div>
                  ) : (
                    <button
                      onClick={() => handleAdd(result)}
                      disabled={addingId !== null}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {addingId === result.id ? <Loader className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      Add to PlayCraft
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isSearching && hasSearched && !searchError && results.length === 0 && (
        <div className="text-center py-8 text-gray-500">No results found for "{searchQuery}"</div>
      )}
    </ModalShell>
  );
};

// --- Add a game by hand ----------------------------------------------------

const ManualAddModal = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({ title: '', genres: '', platforms: '', averagePlaytime: '' });

  const splitList = (text) => text.split(',').map(part => part.trim()).filter(Boolean);

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onAdd({
      title: form.title.trim(),
      rawgId: null,
      slug: null,
      poster: null,
      genre: splitList(form.genres),
      platforms: splitList(form.platforms),
      released: null,
      releaseYear: null,
      rating: 0,
      metacritic: null,
      averagePlaytime: form.averagePlaytime === '' ? null : Number(form.averagePlaytime) || null,
      description: '',
      developers: []
    });
  };

  return (
    <ModalShell title="Add a game manually" onClose={onClose} maxWidth="28rem">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Genres (separate with commas)</label>
          <input
            type="text"
            value={form.genres}
            onChange={(e) => setForm({ ...form, genres: e.target.value })}
            placeholder="RPG, Adventure"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Platforms (separate with commas)</label>
          <input
            type="text"
            value={form.platforms}
            onChange={(e) => setForm({ ...form, platforms: e.target.value })}
            placeholder="PC, Nintendo Switch"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Approximate length (hours)</label>
          <input
            type="number"
            min="0"
            value={form.averagePlaytime}
            onChange={(e) => setForm({ ...form, averagePlaytime: e.target.value })}
            placeholder="20"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleSubmit} className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
            Add Game
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400">
            Cancel
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

// --- Edit a game -----------------------------------------------------------

const EditGameModal = ({ game, recommenderOptions, moodOptions, onAddCustomRecommender, onAddCustomMood, onSave, onClose }) => {
  const [form, setForm] = useState({
    status: game.status || 'not started',
    recommendedBy: game.recommendedBy || [],
    mood: game.mood || [],
    playingWith: game.playingWith || [],
    playingOn: game.playingOn || '',
    progress: clampPercent(game.progress),
    hoursPlayed: game.hoursPlayed === null || game.hoursPlayed === undefined ? '' : game.hoursPlayed,
    partnerProgress: game.partnerProgress || {}
  });
  const [newPartner, setNewPartner] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const yourPercent = getGameProgress(form);

  const addPartner = () => {
    const trimmed = newPartner.trim();
    if (trimmed && !form.playingWith.includes(trimmed)) {
      setForm({
        ...form,
        playingWith: [...form.playingWith, trimmed],
        partnerProgress: { ...form.partnerProgress, [trimmed]: 0 }
      });
    }
    setNewPartner('');
  };

  const removePartner = (partner) => {
    const remaining = { ...form.partnerProgress };
    delete remaining[partner];
    setForm({
      ...form,
      playingWith: form.playingWith.filter(p => p !== partner),
      partnerProgress: remaining
    });
  };

  const handleSave = async () => {
    // Only keep progress for people still listed under "Playing With"
    const partnerProgress = {};
    form.playingWith.forEach(partner => {
      partnerProgress[partner] = clampPercent(form.partnerProgress[partner]);
    });

    const updates = {
      status: form.status,
      recommendedBy: form.recommendedBy,
      mood: form.mood,
      playingWith: form.playingWith,
      playingOn: form.playingOn,
      progress: clampPercent(form.progress),
      hoursPlayed: form.hoursPlayed === '' ? null : Number(form.hoursPlayed) || 0,
      partnerProgress
    };

    if (['currently playing', 'currently replaying', 'completed'].includes(form.status)) {
      updates.lastPlayed = new Date().toISOString();
    }

    setIsSaving(true);
    try {
      await onSave(updates);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell title={`Edit "${game.title}"`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Playing On</label>
            <select
              value={form.playingOn}
              onChange={(e) => setForm({ ...form, playingOn: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">Not decided</option>
              {(game.platforms || []).map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Your Progress</label>
          <div className="flex items-center gap-3 p-2 bg-green-50 rounded">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={form.progress}
              onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
              className="flex-1"
              style={{ accentColor: YOUR_BAR_COLOR }}
            />
            <span className="text-sm font-medium text-right" style={{ width: '3rem' }}>{yourPercent}%</span>
          </div>
          {form.status === 'not started' && form.progress > 0 && (
            <p className="text-xs text-gray-500 mt-1">Shows as 0% while the status is "Not Started".</p>
          )}
          {form.status === 'completed' && form.progress < 100 && (
            <p className="text-xs text-gray-500 mt-1">Shows as 100% while the status is "Completed".</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Hours Played (optional)</label>
          <input
            type="number"
            min="0"
            value={form.hoursPlayed}
            onChange={(e) => setForm({ ...form, hoursPlayed: e.target.value })}
            placeholder={game.averagePlaytime ? `Average is about ${game.averagePlaytime}h` : 'e.g. 12'}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <MultiSelectDropdown
          label="Recommended By"
          options={recommenderOptions}
          value={form.recommendedBy}
          onChange={(value) => setForm({ ...form, recommendedBy: value })}
          onAddCustom={onAddCustomRecommender}
          placeholder="Select recommenders..."
        />

        <MultiSelectDropdown
          label="Moods"
          options={moodOptions}
          value={form.mood}
          onChange={(value) => setForm({ ...form, mood: value })}
          onAddCustom={onAddCustomMood}
          placeholder="Select moods..."
        />

        <div>
          <label className="block text-sm font-medium mb-1">Playing With</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newPartner}
              onChange={(e) => setNewPartner(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPartner()}
              placeholder="Add someone you're playing with"
              className="flex-1 border rounded-md px-3 py-2"
            />
            <button
              type="button"
              onClick={addPartner}
              className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 flex items-center gap-1"
            >
              <UserPlus className="h-4 w-4" />
              Add
            </button>
          </div>

          {form.playingWith.length === 0 ? (
            <p className="text-sm text-gray-500">Leave blank if you're playing alone.</p>
          ) : (
            <div className="space-y-2">
              {form.playingWith.map(partner => (
                <div key={partner} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="font-medium text-sm truncate" style={{ width: '6rem', flexShrink: 0 }}>{partner}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={clampPercent(form.partnerProgress[partner])}
                    onChange={(e) => setForm({
                      ...form,
                      partnerProgress: { ...form.partnerProgress, [partner]: Number(e.target.value) }
                    })}
                    className="flex-1"
                    style={{ accentColor: PARTNER_BAR_COLOR, minWidth: 0 }}
                  />
                  <span className="text-xs text-gray-600 text-right" style={{ width: '2.5rem', flexShrink: 0 }}>
                    {clampPercent(form.partnerProgress[partner])}%
                  </span>
                  <button
                    type="button"
                    onClick={() => removePartner(partner)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title={`Remove ${partner}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 flex items-center justify-center gap-2"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </ModalShell>
  );
};

// --- Filters ---------------------------------------------------------------

const FilterModal = ({ games, filters, setFilters, shownCount, onClose }) => {
  const uniqueValues = (field) => {
    const values = new Set();
    games.forEach(game => (Array.isArray(game[field]) ? game[field] : []).forEach(value => values.add(value)));
    return Array.from(values).sort();
  };

  const uniquePlatforms = useMemo(() => {
    const values = new Set();
    games.forEach(game => {
      (game.platforms || []).forEach(platform => values.add(platform));
      if (game.playingOn) values.add(game.playingOn);
    });
    return Array.from(values).sort();
  }, [games]);

  return (
    <ModalShell title="Filter Your Games" onClose={onClose} maxWidth="56rem">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Platform</label>
          <select
            value={filters.platform}
            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Platforms</option>
            {uniquePlatforms.map(platform => (
              <option key={platform} value={platform}>{platform}</option>
            ))}
          </select>
        </div>

        <FilterMultiSelect
          label="Genre"
          options={uniqueValues('genre')}
          value={filters.genre}
          onChange={(value) => setFilters({ ...filters, genre: value })}
          placeholder="Select genres..."
        />

        <FilterMultiSelect
          label="Mood"
          options={uniqueValues('mood')}
          value={filters.mood}
          onChange={(value) => setFilters({ ...filters, mood: value })}
          placeholder="Select moods..."
        />

        <FilterMultiSelect
          label="Recommended By"
          options={uniqueValues('recommendedBy')}
          value={filters.recommendedBy}
          onChange={(value) => setFilters({ ...filters, recommendedBy: value })}
          placeholder="Select recommenders..."
        />

        <FilterMultiSelect
          label="Playing With"
          options={[PLAYING_ALONE, ...uniqueValues('playingWith')]}
          value={filters.playingWith}
          onChange={(value) => {
            // "Playing alone" can't be combined with people:
            // picking it clears the people, picking a person clears it
            const justPickedAlone = value.includes(PLAYING_ALONE) && !filters.playingWith.includes(PLAYING_ALONE);
            const next = justPickedAlone ? [PLAYING_ALONE] : value.filter(v => v !== PLAYING_ALONE);
            setFilters({ ...filters, playingWith: next });
          }}
          placeholder="Select people..."
        />

        <div>
          <label className="block text-sm font-medium mb-1">Max Length (hours)</label>
          <input
            type="number"
            min="0"
            value={filters.maxLength}
            onChange={(e) => setFilters({ ...filters, maxLength: e.target.value })}
            placeholder="10, 40..."
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-between items-center flex-wrap">
        <button
          onClick={() => setFilters(EMPTY_FILTERS)}
          className="text-sm text-blue-600 hover:text-blue-800 px-3 py-2 border border-blue-600 rounded-md hover:bg-blue-50"
        >
          Clear all filters
        </button>
        <div className="text-sm text-gray-600">Showing {shownCount} of {games.length} games</div>
        <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Apply Filters
        </button>
      </div>
    </ModalShell>
  );
};

// --- Random pick -----------------------------------------------------------

const RandomPickModal = ({ game, onPickAnother, onClose }) => (
  <ModalShell title="🎲 Random Pick!" onClose={onClose} maxWidth="28rem">
    <Cover game={game} height="160px" className="rounded-lg mb-3" />
    <h3 className="text-lg font-bold mb-2">{game.title}</h3>

    <div className="space-y-1 text-sm text-gray-600 mb-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-1 rounded-full text-xs font-medium" style={getStatusStyle(game.status)}>
          {(game.status || '').toUpperCase()}
        </span>
        {game.releaseYear && <span>{game.releaseYear}</span>}
      </div>

      {(game.genre || []).length > 0 && (
        <div className="flex items-center gap-1">
          <Tag className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{game.genre.slice(0, 3).join(', ')}</span>
        </div>
      )}

      {describePlatforms(game) && (
        <div className="flex items-center gap-1">
          <Monitor className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{describePlatforms(game)}</span>
        </div>
      )}

      {game.averagePlaytime ? (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span>About {game.averagePlaytime}h to play</span>
        </div>
      ) : null}

      {game.rating ? (
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
          <span>{game.rating}/5{game.metacritic ? ` · Metacritic ${game.metacritic}` : ''}</span>
        </div>
      ) : null}

      <div>
        Progress: {getGameProgress(game)}%
        <div className="mt-1">
          <ProgressBar percent={getGameProgress(game)} trackColor="#e5e7eb" height={8} />
        </div>
      </div>
    </div>

    {(game.recommendedBy || []).length > 0 && (
      <div className="mb-3 text-sm text-gray-600">
        <Users className="h-3 w-3 inline mr-1" />
        Recommended by {game.recommendedBy.slice(0, 2).join(', ')}
      </div>
    )}

    {game.description && (
      <div className="mb-3 p-2 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700 line-clamp-3">{game.description}</p>
      </div>
    )}

    <div className="flex gap-2">
      <button
        onClick={onPickAnother}
        className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-md hover:bg-purple-700 flex items-center justify-center gap-2 text-sm"
      >
        <Shuffle className="h-4 w-4" />
        Pick Another
      </button>
      <button
        onClick={onClose}
        className="flex-1 bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700 flex items-center justify-center gap-2 text-sm"
      >
        <Play className="h-4 w-4" />
        Let's Play This!
      </button>
    </div>
  </ModalShell>
);

// --- The page --------------------------------------------------------------

const PlayCraft = () => {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState('alphabetical');
  const [viewMode, setViewMode] = useState('grid');
  const [showSearch, setShowSearch] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [randomPick, setRandomPick] = useState(null);

  // Custom recommenders are shared with WatchCraft; game moods are kept separately
  const [customRecommenders, setCustomRecommenders] = useState(() => loadSavedList('customRecommenders'));
  const [customMoods, setCustomMoods] = useState(() => loadSavedList('customGameMoods'));

  const recommenderOptions = [...BASE_RECOMMENDER_OPTIONS, ...customRecommenders];
  const moodOptions = [...MOOD_OPTIONS, ...customMoods];

  const addCustomRecommender = (value) => {
    if (value && !recommenderOptions.includes(value)) {
      const updated = [...customRecommenders, value];
      setCustomRecommenders(updated);
      localStorage.setItem('customRecommenders', JSON.stringify(updated));
    }
  };

  const addCustomMood = (value) => {
    if (value && !moodOptions.includes(value)) {
      const updated = [...customMoods, value];
      setCustomMoods(updated);
      localStorage.setItem('customGameMoods', JSON.stringify(updated));
    }
  };

  useEffect(() => {
    document.title = 'PlayCraft';
    const loadGames = async () => {
      try {
        setIsLoading(true);
        setGames(await getAllGames());
        setError(null);
      } catch (err) {
        console.error('Error loading games:', err);
        setError('Failed to load your games. Please check your Firebase connection (and that the "games" collection is allowed in your Firestore rules).');
      } finally {
        setIsLoading(false);
      }
    };
    loadGames();
  }, []);

  // Save a new game, then open the edit window for it (same flow as WatchCraft)
  const saveNewGame = async (details) => {
    const newGame = {
      ...details,
      mood: [],
      status: 'not started',
      recommendedBy: [],
      playingWith: [],
      playingOn: '',
      progress: 0,
      hoursPlayed: null,
      partnerProgress: {},
      lastPlayed: null,
      dateAdded: new Date().toISOString()
    };
    const id = await addGame(newGame);
    setGames(current => [...current, { ...newGame, id }]);
    return id;
  };

  const addFromRawg = async (result) => {
    try {
      // The search result has most fields; the detail call adds description and developers
      let details = mapRawgGame(result);
      try {
        const response = await fetch(`${RAWG_BASE_URL}/games/${result.id}?key=${RAWG_API_KEY}`);
        if (response.ok) {
          details = mapRawgGame(await response.json());
        }
      } catch (detailError) {
        console.error('Could not load full RAWG details, using search result instead:', detailError);
      }

      const id = await saveNewGame(details);
      setShowSearch(false);
      setEditingId(id);
    } catch (err) {
      console.error('Error adding game from RAWG:', err);
      alert('Failed to add that game. Please try again.');
    }
  };

  const addManually = async (details) => {
    try {
      const id = await saveNewGame(details);
      setShowManualAdd(false);
      setEditingId(id);
    } catch (err) {
      console.error('Error adding game manually:', err);
      alert('Failed to add that game. Please try again.');
    }
  };

  const handleUpdateGame = async (id, updates) => {
    try {
      await updateGame(id, updates);
      setGames(current => current.map(game => (game.id === id ? { ...game, ...updates } : game)));
      setEditingId(null);
    } catch (err) {
      console.error('Error updating game:', err);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleDeleteGame = async (id) => {
    if (!window.confirm('Are you sure you want to delete this game?')) return;
    try {
      await deleteGame(id);
      setGames(current => current.filter(game => game.id !== id));
    } catch (err) {
      console.error('Error deleting game:', err);
      alert('Failed to delete that game. Please try again.');
    }
  };

  // Filter, then sort
  const visibleGames = useMemo(() => {
    const filtered = games.filter(game => {
      const matchesSearch = (game.title || '').toLowerCase().includes(searchTerm.toLowerCase());

      // Genre: game must have ALL selected genres
      const matchesGenre = filters.genre.length === 0 ||
        filters.genre.every(selected => (game.genre || []).includes(selected));

      // Mood: game must have at least one selected mood
      const matchesMood = filters.mood.length === 0 ||
        (game.mood || []).some(mood => filters.mood.includes(mood));

      const matchesStatus = !filters.status || game.status === filters.status;

      // Platform: if you've chosen what you're playing it on, only that platform counts
      const gamePlatforms = game.playingOn ? [game.playingOn] : (game.platforms || []);
      const matchesPlatform = !filters.platform || gamePlatforms.includes(filters.platform);

      const matchesRecommender = filters.recommendedBy.length === 0 ||
        filters.recommendedBy.every(selected => (game.recommendedBy || []).includes(selected));

      // "Playing alone" matches games whose "Playing With" is blank
      const partners = game.playingWith || [];
      const matchesPlayingWith = filters.playingWith.length === 0 ||
        (filters.playingWith.includes(PLAYING_ALONE)
          ? partners.length === 0
          : filters.playingWith.every(selected => partners.includes(selected)));

      const matchesLength = !filters.maxLength ||
        (game.averagePlaytime && game.averagePlaytime <= Number(filters.maxLength));

      return matchesSearch && matchesGenre && matchesMood && matchesStatus && matchesPlatform &&
        matchesRecommender && matchesPlayingWith && matchesLength;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'recently-added':
        return sorted.sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
      case 'last-played':
        return sorted.sort((a, b) => {
          if (a.status === 'not started' && b.status !== 'not started') return 1;
          if (b.status === 'not started' && a.status !== 'not started') return -1;
          return new Date(b.lastPlayed || 0) - new Date(a.lastPlayed || 0);
        });
      case 'release':
        return sorted.sort((a, b) => new Date(b.released || 0) - new Date(a.released || 0));
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'progress':
        return sorted.sort((a, b) => getGameProgress(b) - getGameProgress(a));
      case 'shortest':
        // Games with no known length go to the bottom
        return sorted.sort((a, b) => (a.averagePlaytime || Infinity) - (b.averagePlaytime || Infinity));
      case 'alphabetical':
      default:
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
  }, [games, searchTerm, filters, sortBy]);

  const pickRandomGame = () => {
    if (visibleGames.length === 0) {
      alert('No games to pick from! Try adjusting your filters.');
      return;
    }
    setRandomPick(visibleGames[Math.floor(Math.random() * visibleGames.length)]);
  };

  const activeFilterCount =
    filters.genre.length + filters.mood.length + filters.recommendedBy.length + filters.playingWith.length +
    (filters.status ? 1 : 0) + (filters.platform ? 1 : 0) + (filters.maxLength ? 1 : 0);

  const editingGame = editingId ? games.find(game => game.id === editingId) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold mb-2">Loading PlayCraft...</h2>
          <p className="text-gray-600">Blowing on the cartridge</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span>{error}</span>
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Retry
            </button>
            <a href="/" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
              Back to WatchCraft
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar - sticks to the top while scrolling */}
      <div className="sticky top-0 bg-white shadow-md border-b" style={{ zIndex: 40 }}>
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h1 className="text-3xl font-bold text-gray-900">🎮🪄 PlayCraft</h1>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 text-sm"
              title="Go to WatchCraft, your shows and movies"
            >
              <Tv className="h-4 w-4" />
              WatchCraft
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search your games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={pickRandomGame}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                title="Pick a random game from your filtered list"
              >
                <Shuffle className="h-4 w-4" />
                Random
              </button>

              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-2">
                <ArrowUpDown className="h-4 w-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border-none outline-none bg-transparent text-sm"
                >
                  <option value="alphabetical">A-Z</option>
                  <option value="recently-added">Recently Added</option>
                  <option value="last-played">Last Played</option>
                  <option value="release">Newest Release</option>
                  <option value="rating">Rating</option>
                  <option value="progress">Progress</option>
                  <option value="shortest">Shortest First</option>
                </select>
              </div>

              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'compact' : 'grid')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                title={viewMode === 'grid' ? 'Switch to compact view' : 'Switch to grid view'}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                {viewMode === 'grid' ? 'Compact' : 'Grid'}
              </button>

              <button
                onClick={() => setShowSearch(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Search className="h-4 w-4" />
                Search Games
              </button>

              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <Filter className="h-4 w-4" />
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>

              <button
                onClick={() => setShowManualAdd(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Manual
              </button>
            </div>
          </div>

          <p className="text-gray-600">Showing {visibleGames.length} of {games.length} games</p>
        </div>
      </div>

      {/* Game cards */}
      <div className="max-w-7xl mx-auto p-4">
        <div
          style={{
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: viewMode === 'grid'
              ? 'repeat(auto-fill, minmax(200px, 1fr))'
              : 'repeat(auto-fill, minmax(120px, 1fr))',
            alignItems: 'stretch'
          }}
        >
          {visibleGames.map(game => {
            const percent = getGameProgress(game);
            const partners = Object.entries(game.partnerProgress || {});
            const showProgress = percent > 0 || partners.length > 0;
            const isCompact = viewMode === 'compact';

            return (
              <div key={game.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                <div className="relative flex-shrink-0">
                  <Cover game={game} height={isCompact ? '80px' : '128px'} />

                  <div className="absolute" style={{ top: isCompact ? 2 : 4, right: isCompact ? 2 : 4 }}>
                    <span
                      className={`rounded-full font-semibold border-2 shadow-lg ${isCompact ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'}`}
                      style={getStatusStyle(game.status)}
                    >
                      {isCompact ? (game.status || '').slice(0, 3).toUpperCase() : (game.status || '').toUpperCase()}
                    </span>
                  </div>

                  <div className="absolute flex gap-1" style={{ top: isCompact ? 2 : 4, left: isCompact ? 2 : 4 }}>
                    <button
                      onClick={() => setEditingId(game.id)}
                      className={`bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors ${isCompact ? 'p-0.5' : 'p-1'}`}
                      title="Edit game"
                    >
                      <Edit3 className={isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                    </button>
                    <button
                      onClick={() => handleDeleteGame(game.id)}
                      className={`bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors ${isCompact ? 'p-0.5' : 'p-1'}`}
                      title="Delete game"
                    >
                      <Trash2 className={isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                    </button>
                  </div>

                  {/* Progress bars: you in green, people you're playing with in blue */}
                  {showProgress && !isCompact && (
                    <div className="absolute bottom-0 left-0 right-0 text-white p-2" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
                      <div className="text-xs space-y-1">
                        <ProgressRow label="You" percent={percent} color={YOUR_BAR_COLOR} bold />
                        {partners.slice(0, 2).map(([partner, partnerPercent]) => (
                          <ProgressRow key={partner} label={partner} percent={clampPercent(partnerPercent)} color={PARTNER_BAR_COLOR} />
                        ))}
                        {partners.length > 2 && <div className="opacity-75">+{partners.length - 2} more</div>}
                      </div>
                    </div>
                  )}

                  {showProgress && isCompact && (
                    <div className="absolute bottom-0 left-0 right-0 text-white px-1 py-0.5" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
                      <div className="text-xs text-center">{percent}%</div>
                      <ProgressBar percent={percent} color={YOUR_BAR_COLOR} height={3} />
                    </div>
                  )}
                </div>

                <div className={`${isCompact ? 'p-1.5' : 'p-4'} flex-grow flex flex-col`}>
                  <h3 className={`font-bold line-clamp-2 ${isCompact ? 'text-xs leading-tight mb-1 flex-grow' : 'text-lg mb-2'}`}>
                    {game.title}
                  </h3>

                  {!isCompact && (
                    <div className="space-y-1 text-sm text-gray-600 flex-grow">
                      {(game.genre || []).length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{game.genre.join(', ')}</span>
                        </div>
                      )}

                      {describePlatforms(game) && (
                        <div className="flex items-center gap-1">
                          <Monitor className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{describePlatforms(game)}</span>
                        </div>
                      )}

                      {(game.averagePlaytime || game.hoursPlayed) ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {game.hoursPlayed ? `${game.hoursPlayed}h played` : ''}
                            {game.hoursPlayed && game.averagePlaytime ? ' · ' : ''}
                            {game.averagePlaytime ? `about ${game.averagePlaytime}h long` : ''}
                          </span>
                        </div>
                      ) : null}

                      {game.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                          <span>{game.rating}/5{game.metacritic ? ` · MC ${game.metacritic}` : ''}</span>
                        </div>
                      ) : null}

                      {(game.recommendedBy || []).length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">Rec. by {game.recommendedBy.slice(0, 2).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {isCompact && game.rating ? (
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mt-auto">
                      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                      <span>{game.rating}</span>
                    </div>
                  ) : null}

                  {!isCompact && (game.mood || []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {game.mood.slice(0, 3).map(mood => (
                        <span key={mood} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{mood}</span>
                      ))}
                      {game.mood.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">+{game.mood.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {visibleGames.length === 0 && (
          <div className="text-center py-12">
            <Gamepad2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {games.length === 0
                ? 'No games yet. Use "Search Games" to add your first one.'
                : 'No games match your search criteria'}
            </p>
          </div>
        )}

        <RawgCredit className="text-center mt-8" />
      </div>

      {showSearch && (
        <GameSearchModal
          existingRawgIds={games.map(game => game.rawgId).filter(Boolean)}
          onAdd={addFromRawg}
          onClose={() => setShowSearch(false)}
        />
      )}
      {showManualAdd && <ManualAddModal onAdd={addManually} onClose={() => setShowManualAdd(false)} />}
      {showFilters && (
        <FilterModal
          games={games}
          filters={filters}
          setFilters={setFilters}
          shownCount={visibleGames.length}
          onClose={() => setShowFilters(false)}
        />
      )}
      {randomPick && (
        <RandomPickModal game={randomPick} onPickAnother={pickRandomGame} onClose={() => setRandomPick(null)} />
      )}
      {editingGame && (
        <EditGameModal
          key={editingGame.id}
          game={editingGame}
          recommenderOptions={recommenderOptions}
          moodOptions={moodOptions}
          onAddCustomRecommender={addCustomRecommender}
          onAddCustomMood={addCustomMood}
          onSave={(updates) => handleUpdateGame(editingGame.id, updates)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
};

export default PlayCraft;
