import React, { useState } from 'react';
import { Save, X, UserPlus, RefreshCw } from 'lucide-react';
import { WATCHED_STATUSES } from '../constants';
import { canReload, describeEpisodeData, describeLastUpdate, getEpisodesInSeason } from '../utils/episodes';
import { getPartnerProgressPercent, getProgressPercent, toEditForm } from '../utils/watchlist';
import Modal from './Modal';
import { ProgressBar, YOUR_BAR_COLOR, PARTNER_BAR_COLOR } from './ProgressBar';
import MultiSelectDropdown from './MultiSelectDropdown';
import RemovableTags from './RemovableTags';
import StatusSelect from './StatusSelect';

const EditingModal = ({ item, tagOptions, onSave, onReload, onClose }) => {
  const [form, setForm] = useState(() => toEditForm(item));
  const [newPartner, setNewPartner] = useState('');
  const [isReloading, setIsReloading] = useState(false);
  const [reloadError, setReloadError] = useState('');

  const episodesInSeason = getEpisodesInSeason(item, form.currentSeason);
  // Your progress with the unsaved changes in this window applied.
  const yourProgress = getProgressPercent({ ...item, ...form });

  // Fetches fresh numbers from OMDB. Only OMDB's data changes; what you've typed in this window stays.
  const handleReload = async () => {
    setIsReloading(true);
    setReloadError(await onReload(item));
    setIsReloading(false);
  };

  const updateForm = (changes) => setForm((prev) => ({ ...prev, ...changes }));

  // Changing who you're watching with also keeps the per-person progress in step:
  // new partners start at your current episode, removed partners lose their entry.
  const setWatchingWith = (watchingWith) => {
    const viewingProgress = {};
    watchingWith.forEach((partner) => {
      viewingProgress[partner] = form.viewingProgress[partner] || {
        season: form.currentSeason || 1,
        episode: form.currentEpisode || 1,
      };
    });
    updateForm({ watchingWith, viewingProgress });
  };

  const addPartner = () => {
    const name = newPartner.trim();
    if (!name || form.watchingWith.includes(name)) return;
    setWatchingWith([...form.watchingWith, name]);
    setNewPartner('');
  };

  const removePartner = (partner) => setWatchingWith(form.watchingWith.filter((p) => p !== partner));

  const setPartnerProgress = (partner, progress) =>
    updateForm({ viewingProgress: { ...form.viewingProgress, [partner]: progress } });

  const handleSave = async () => {
    const updates = { ...form };
    if (WATCHED_STATUSES.includes(form.status)) {
      updates.lastWatched = new Date().toISOString();
    }
    await onSave(item.id, updates);
    onClose();
  };

  return (
    <Modal title={`Edit "${item.title || 'Unknown'}"`} onClose={onClose}>
      <div className="space-y-4">
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

        <MultiSelectDropdown
          label="Moods"
          options={tagOptions.moods}
          value={form.mood}
          onChange={(mood) => updateForm({ mood })}
          onAddCustom={tagOptions.addMood}
          placeholder="Select moods..."
        />

        <div>
          <label className="block text-sm font-medium mb-1">Watching With</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newPartner}
              onChange={(e) => setNewPartner(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPartner()}
              placeholder="Add viewing partner"
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
          <RemovableTags items={form.watchingWith} onRemove={removePartner} />
        </div>

        {item.type === 'tv' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Your Current Season</label>
                <input
                  type="number"
                  value={form.currentSeason}
                  onChange={(e) => updateForm({ currentSeason: parseInt(e.target.value) || 1 })}
                  className="w-full border rounded-md px-3 py-2"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Your Current Episode</label>
                <input
                  type="number"
                  value={form.currentEpisode}
                  onChange={(e) => updateForm({ currentEpisode: parseInt(e.target.value) || 1 })}
                  className="w-full border rounded-md px-3 py-2"
                  min="1"
                />
              </div>
              {episodesInSeason !== null && (
                <p className="col-span-2 -mt-2 text-xs text-gray-500">
                  {episodesInSeason > 0
                    ? `Season ${form.currentSeason} has ${episodesInSeason} episode${episodesInSeason === 1 ? '' : 's'} so far`
                    : `No episodes of season ${form.currentSeason} have aired yet`}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Individual Progress Tracking</label>

              {/* Your bar. It moves as you change the status, season or episode above, before you save. */}
              {yourProgress !== null && (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded mb-2">
                  <span className="font-medium text-sm truncate" style={{ width: '6rem', flexShrink: 0 }}>
                    You
                  </span>
                  <ProgressBar percent={yourProgress} color={YOUR_BAR_COLOR} trackColor="#d1d5db" height={8} />
                  <span className="text-xs text-gray-600 text-right" style={{ width: '2.5rem', flexShrink: 0 }}>
                    {yourProgress}%
                  </span>
                </div>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {Object.entries(form.viewingProgress).map(([partner, progress]) => (
                  <div key={partner} className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="font-medium text-sm flex-1">{partner}:</span>
                    <span className="text-xs">S</span>
                    <input
                      type="number"
                      value={progress.season}
                      onChange={(e) =>
                        setPartnerProgress(partner, {
                          season: parseInt(e.target.value) || 1,
                          episode: parseInt(progress.episode) || 1,
                        })
                      }
                      className="w-16 border rounded px-2 py-1 text-sm"
                      min="1"
                    />
                    <span className="text-xs">E</span>
                    <input
                      type="number"
                      value={progress.episode}
                      onChange={(e) =>
                        setPartnerProgress(partner, {
                          season: parseInt(progress.season) || 1,
                          episode: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-16 border rounded px-2 py-1 text-sm"
                      min="1"
                    />
                    <button
                      type="button"
                      onClick={() => removePartner(partner)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    {getPartnerProgressPercent(item, progress) !== null && (
                      <div className="flex items-center gap-2" style={{ flexBasis: '100%' }}>
                        <ProgressBar
                          percent={getPartnerProgressPercent(item, progress)}
                          color={PARTNER_BAR_COLOR}
                          trackColor="#d1d5db"
                          height={8}
                        />
                        <span className="text-xs text-gray-600 text-right" style={{ width: '2.5rem', flexShrink: 0 }}>
                          {getPartnerProgressPercent(item, progress)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {form.watchingWith.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-2">
                    Add people to "Watching With" to track their progress
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {item.type === 'movie' && form.watchingWith.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Watched Status</label>
            <div className="space-y-2">
              {form.watchingWith.map((partner) => (
                <div key={partner} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="font-medium text-sm flex-1">{partner}:</span>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={form.viewingProgress[partner]?.watched || false}
                      onChange={(e) => setPartnerProgress(partner, { watched: e.target.checked })}
                      className="h-4 w-4"
                    />
                    Watched
                  </label>
                  <button
                    type="button"
                    onClick={() => removePartner(partner)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {canReload(item) && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-gray-700 min-w-0">
              <div>{describeEpisodeData(item)}</div>
              <div className="text-xs text-gray-500">{describeLastUpdate(item)}</div>
            </div>
            <button
              type="button"
              onClick={handleReload}
              disabled={isReloading}
              className="flex-shrink-0 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2 text-sm"
              title="Fetch the latest rating, poster and episode numbers from OMDB"
            >
              <RefreshCw className={`h-4 w-4 ${isReloading ? 'animate-spin' : ''}`} />
              {isReloading ? 'Refreshing...' : 'Refresh OMDB data'}
            </button>
          </div>
          {reloadError && <p className="mt-2 text-sm text-red-600">{reloadError}</p>}
        </div>
      )}

      <div className="flex gap-2 mt-6">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
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
    </Modal>
  );
};

export default EditingModal;
