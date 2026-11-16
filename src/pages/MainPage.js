import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, Play, Loader, Grid, List, QrCode, ArrowUpDown, Shuffle, RefreshCw, Gamepad2 } from 'lucide-react';
import {
  getAllWatchlistItems,
  addWatchlistItem,
  updateWatchlistItem,
  deleteWatchlistItem,
} from '../firebase/watchlistService';
import { EMPTY_FILTERS, OMDB_DAILY_LIMIT, SORT_OPTIONS } from '../constants';
import { estimateRequests, needsReload } from '../utils/episodes';
import { getOMDBDetails, getOMDBReload, isLimitError } from '../utils/omdb';
import { buildItemFromOMDB, filterItems, sortItems } from '../utils/watchlist';
import { useTagOptions } from '../hooks/useTagOptions';
import AddItemForm from '../components/AddItemForm';
import EditingModal from '../components/EditingModal';
import FilterModal from '../components/FilterModal';
import OMDBSearchModal from '../components/OMDBSearchModal';
import QRCodeModal from '../components/QRCodeModal';
import RandomPickModal from '../components/RandomPickModal';
import WatchlistCard from '../components/WatchlistCard';

const MainPage = () => {
  // The watchlist itself
  const [watchlist, setWatchlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // How the list is displayed
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState('alphabetical');
  const [viewMode, setViewMode] = useState('grid');

  // Which pop-up windows are open
  const [showAddForm, setShowAddForm] = useState(false);
  const [showOMDBSearch, setShowOMDBSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [randomPick, setRandomPick] = useState(null);

  // While "Refresh OMDB" is running: { done, total }. Otherwise null.
  const [reloadProgress, setReloadProgress] = useState(null);

  const tagOptions = useTagOptions();

  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        setWatchlist(await getAllWatchlistItems());
        setError(null);
      } catch (err) {
        console.error('Error loading watchlist:', err);
        setError('Failed to load watchlist. Please check your Firebase connection.');
      } finally {
        setIsLoading(false);
      }
    };

    loadWatchlist();
  }, []);

  // The list actually shown: filtered first, then sorted.
  const filteredList = useMemo(
    () => filterItems(watchlist, searchTerm, filters),
    [watchlist, searchTerm, filters]
  );
  const sortedList = useMemo(() => sortItems(filteredList, sortBy), [filteredList, sortBy]);

  const editingItem = watchlist.find((item) => item.id === editingId);

  // ---------- Actions ----------

  // Saves a new item, then opens the edit window for it. Returns true if it worked.
  const addItem = async (item) => {
    try {
      const id = await addWatchlistItem(item);
      setWatchlist((current) => [...current, { ...item, id }]);
      setEditingId(id);
      return true;
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item. Please try again.');
      return false;
    }
  };

  const handleAddFromOMDB = async (omdbResult) => {
    const details = await getOMDBDetails(omdbResult.imdbID);
    if (!details) return;
    if (await addItem(buildItemFromOMDB(details))) setShowOMDBSearch(false);
  };

  const handleAddManual = async (item) => {
    if (await addItem(item)) setShowAddForm(false);
  };

  const handleUpdateItem = async (id, updates) => {
    try {
      await updateWatchlistItem(id, updates);
      setWatchlist((current) => current.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    } catch (err) {
      console.error('Error updating item:', err);
      setError('Failed to update item. Please try again.');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteWatchlistItem(id);
      setWatchlist((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item. Please try again.');
    }
  };

  // Fetches fresh OMDB data for one item and saves it. Throws if anything goes wrong.
  const reloadItem = async (item) => {
    const updates = await getOMDBReload(item.imdbId);
    await updateWatchlistItem(item.id, updates);
    setWatchlist((current) => current.map((other) => (other.id === item.id ? { ...other, ...updates } : other)));
  };

  // The "Refresh OMDB data" button in the edit window. Returns an error message, or '' if it worked.
  const handleReloadItem = async (item) => {
    try {
      await reloadItem(item);
      return '';
    } catch (err) {
      console.error('Error reloading from OMDB:', err);
      return isLimitError(err)
        ? "OMDB's daily request limit has been reached. Try again tomorrow."
        : "Couldn't refresh from OMDB. Please try again.";
    }
  };

  // The "Refresh OMDB" button: reloads every show that needs it, one at a time.
  const handleReloadAll = async () => {
    const due = watchlist.filter((item) => needsReload(item));
    if (due.length === 0) {
      alert('All your shows are already up to date.');
      return;
    }

    const confirmed = window.confirm(
      `Refresh episode data for ${due.length} show${due.length === 1 ? '' : 's'}?\n\n` +
        `This uses about ${estimateRequests(due)} of the ${OMDB_DAILY_LIMIT} OMDB requests you get per day.`
    );
    if (!confirmed) return;

    let updated = 0;
    let failed = 0;
    let hitLimit = false;
    setReloadProgress({ done: 0, total: due.length });

    for (const item of due) {
      try {
        await reloadItem(item);
        updated += 1;
      } catch (err) {
        console.error(`Error reloading "${item.title}":`, err);
        if (isLimitError(err)) {
          hitLimit = true;
          break;
        }
        failed += 1;
      }
      setReloadProgress({ done: updated + failed, total: due.length });
    }

    setReloadProgress(null);
    alert(
      `Refreshed ${updated} of ${due.length} shows.` +
        (failed > 0 ? `\n${failed} couldn't be refreshed.` : '') +
        (hitLimit ? "\nOMDB's daily request limit was reached. Press Refresh OMDB again tomorrow to finish the rest." : '')
    );
  };

  const pickRandomItem = () => {
    if (sortedList.length === 0) {
      alert('No items to pick from! Try adjusting your filters.');
      return;
    }
    setRandomPick(sortedList[Math.floor(Math.random() * sortedList.length)]);
  };

  // ---------- Loading and error screens ----------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold mb-2">Loading WatchCraft...</h2>
          <p className="text-gray-600">Connecting to morphogenetic field</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ---------- Main screen ----------

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar: stays stuck to the top of the screen while the list scrolls under it */}
      <div className="sticky top-0 bg-white shadow-md border-b z-40">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h1 className="text-3xl font-bold text-gray-900">🎬🪄 WatchCraft</h1>
            <a
              href="/play"
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 text-sm"
              title="Go to PlayCraft, your video games"
            >
              <Gamepad2 className="h-4 w-4" />
              PlayCraft
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search titles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={pickRandomItem}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                title="Pick a random show/movie from your filtered list"
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
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowQRModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                title="Hi :)"
              >
                <QrCode className="h-4 w-4" />
                Share
              </button>

              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'compact' : 'grid')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                title={viewMode === 'grid' ? 'Switch to compact view' : 'Switch to grid view'}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                {viewMode === 'grid' ? 'Compact' : 'Grid'}
              </button>

              <button
                onClick={() => setShowOMDBSearch(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Search className="h-4 w-4" />
                Search OMDB
              </button>

              <button
                onClick={handleReloadAll}
                disabled={reloadProgress !== null}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-60"
                title="Fetch the latest episode numbers from OMDB for shows that are still running"
              >
                <RefreshCw className={`h-4 w-4 ${reloadProgress ? 'animate-spin' : ''}`} />
                {reloadProgress ? `Refreshing ${reloadProgress.done}/${reloadProgress.total}` : 'Refresh OMDB'}
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>

              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Manual
              </button>
            </div>
          </div>

          <p className="text-gray-600">
            Showing {sortedList.length} of {watchlist.length} items
          </p>
        </div>
      </div>

      {/* The watchlist */}
      <div>
        <div className="max-w-7xl mx-auto p-4">
          <div
            className="grid gap-3"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fit, minmax(${viewMode === 'grid' ? 200 : 120}px, 1fr))`,
              alignItems: 'stretch',
            }}
          >
            {sortedList.map((item) => (
              <WatchlistCard
                key={item.id}
                item={item}
                viewMode={viewMode}
                onEdit={(clicked) => setEditingId(clicked.id)}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>

          {sortedList.length === 0 && (
            <div className="text-center py-12">
              <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No items match your search criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Pop-up windows. Later ones in this list appear on top of earlier ones. */}
      {showAddForm && (
        <AddItemForm
          tagOptions={tagOptions}
          onSubmit={handleAddManual}
          onCancel={() => setShowAddForm(false)}
          onOpenOmdbSearch={() => setShowOMDBSearch(true)}
        />
      )}
      {showOMDBSearch && (
        <OMDBSearchModal onAdd={handleAddFromOMDB} onClose={() => setShowOMDBSearch(false)} />
      )}
      {showFilters && (
        <FilterModal
          filters={filters}
          onChange={setFilters}
          watchlist={watchlist}
          shownCount={filteredList.length}
          onClose={() => setShowFilters(false)}
        />
      )}
      {showQRModal && <QRCodeModal onClose={() => setShowQRModal(false)} />}
      {randomPick && (
        <RandomPickModal
          item={randomPick}
          onPickAnother={pickRandomItem}
          onClose={() => setRandomPick(null)}
        />
      )}
      {editingItem && (
        <EditingModal
          key={editingItem.id}
          item={editingItem}
          tagOptions={tagOptions}
          onSave={handleUpdateItem}
          onReload={handleReloadItem}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
};

export default MainPage;
