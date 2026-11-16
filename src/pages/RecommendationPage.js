import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader, X, UserPlus, Send, UserCircle } from 'lucide-react';
import { getAllWatchlistItems, addWatchlistItem, updateWatchlistItem } from '../firebase/watchlistService';
import { STARTED_STATUSES } from '../constants';
import { getOMDBDetails } from '../utils/omdb';
import { buildItemFromOMDB, placeholderPoster } from '../utils/watchlist';
import { useOmdbSearch } from '../hooks/useOmdbSearch';

const NAME_STORAGE_KEY = 'recommenderName';

// First screen: ask who is recommending.
const NamePrompt = ({ onSubmit }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🎬🪄</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">WatchCraft</h1>
          <p className="text-gray-600">Recommend something to watch!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">What's your name?</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 text-lg font-medium"
          >
            Continue
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

// One search result, with a button that depends on whether it's already on the watchlist.
const SearchResultCard = ({ result, existingItem, recommenderName, onRecommend, onWatchTogether }) => {
  const isAlreadyWatching = existingItem && STARTED_STATUSES.includes(existingItem.status);
  const isOnWatchlist = existingItem && existingItem.status === 'not started';
  const isWatchingTogether = (existingItem?.watchingWith || []).includes(recommenderName);

  let action;
  if (isAlreadyWatching) {
    action = (
      <div className="bg-purple-100 text-purple-800 px-3 py-2 rounded text-sm font-medium text-center">
        ✨ Already {existingItem.status === 'completed' ? 'watched' : 'watching'}!
      </div>
    );
  } else if (isOnWatchlist) {
    action = (
      <div className="space-y-2">
        <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded text-sm text-center">
          📋 Already on watchlist!
        </div>
        {isWatchingTogether ? (
          <div className="text-center text-xs text-green-600 font-medium">✓ You're set to watch together!</div>
        ) : (
          <button
            onClick={() => onWatchTogether(existingItem)}
            className="w-full text-sm bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 flex items-center justify-center gap-1"
          >
            <UserPlus className="h-4 w-4" />
            Watch Together?
          </button>
        )}
      </div>
    );
  } else {
    action = (
      <button
        onClick={() => onRecommend(result)}
        className="w-full text-sm bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 flex items-center justify-center gap-1"
      >
        <Plus className="h-4 w-4" />
        Recommend This
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex gap-3">
        <img
          src={result.Poster !== 'N/A' ? result.Poster : placeholderPoster(result.Title.slice(0, 3), '80x120')}
          alt={result.Title}
          className="w-20 h-28 object-cover rounded"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1 line-clamp-2">{result.Title}</h3>
          <p className="text-xs text-gray-600 mb-1">{result.Year}</p>
          <p className="text-xs text-gray-600 mb-3 capitalize">{result.Type}</p>
          {action}
        </div>
      </div>
    </div>
  );
};

const RecommendationPage = () => {
  // The name is remembered for this browser tab, so a refresh doesn't ask again.
  const [recommenderName, setRecommenderName] = useState(
    () => sessionStorage.getItem(NAME_STORAGE_KEY) || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [watchTogether, setWatchTogether] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [existingItems, setExistingItems] = useState([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);

  const { results, isSearching, searchedQuery, search, reset: resetSearch } = useOmdbSearch();

  const refreshExistingItems = async () => setExistingItems(await getAllWatchlistItems());

  // Load the current watchlist so we can spot things that are already on it.
  useEffect(() => {
    getAllWatchlistItems()
      .then(setExistingItems)
      .catch((error) => console.error('Error loading watchlist:', error))
      .finally(() => setIsLoadingWatchlist(false));
  }, []);

  const handleNameSubmit = (name) => {
    sessionStorage.setItem(NAME_STORAGE_KEY, name);
    setRecommenderName(name);
  };

  const handleResetName = () => {
    sessionStorage.removeItem(NAME_STORAGE_KEY);
    setRecommenderName('');
    setSearchQuery('');
    resetSearch();
  };

  const handleAddRecommendation = async (result) => {
    try {
      const details = await getOMDBDetails(result.imdbID);
      if (!details) return;

      await addWatchlistItem(
        buildItemFromOMDB(details, {
          recommendedBy: [recommenderName],
          watchingWith: watchTogether ? [recommenderName] : [],
          addedViaRecommendation: true,
          recommendationDate: new Date().toISOString(),
        })
      );

      const isFirstRecommendation = recentlyAdded.length === 0;
      setRecentlyAdded((current) => [...current, details.title]);
      await refreshExistingItems();

      // Only the first one gets a pop-up; after that the green "Successfully Added" list is enough.
      if (isFirstRecommendation) {
        setTimeout(() => {
          alert(`Added "${details.title}" to WatchCraft! ${watchTogether ? 'Marked to watch together!' : ''}`);
        }, 100);
      }
    } catch (error) {
      console.error('Error adding recommendation:', error);
      alert('Failed to add recommendation. Please try again.');
    }
  };

  const handleAddToWatchTogether = async (existingItem) => {
    const withMyName = (names = []) => (names.includes(recommenderName) ? names : [...names, recommenderName]);

    try {
      await updateWatchlistItem(existingItem.id, {
        recommendedBy: withMyName(existingItem.recommendedBy),
        watchingWith: withMyName(existingItem.watchingWith),
      });
      await refreshExistingItems();
      alert(`Great! You've been added to watch "${existingItem.title}" together!`);
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update. Please try again.');
    }
  };

  if (!recommenderName) {
    return <NamePrompt onSubmit={handleNameSubmit} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">🎬🪄 Recommend to WatchCraft</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <UserCircle className="h-4 w-4" />
                <span>{recommenderName}</span>
              </div>
              <button
                onClick={handleResetName}
                className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-300 flex items-center gap-1"
                title="Change your name or let someone else recommend"
              >
                <X className="h-3 w-3" />
                Reset Name
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="watchTogether"
              checked={watchTogether}
              onChange={(e) => setWatchTogether(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="watchTogether" className="text-sm text-gray-700">
              I want to watch new recommendations together
            </label>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for movies or TV shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search(searchQuery)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => search(searchQuery)}
              disabled={isSearching || isLoadingWatchlist}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSearching ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {recentlyAdded.length > 0 && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✅ Successfully Added:</h3>
            <ul className="space-y-1">
              {recentlyAdded.map((title, index) => (
                <li key={index} className="text-green-700">• {title}</li>
              ))}
            </ul>
          </div>
        )}

        {isSearching && (
          <div className="text-center py-12">
            <Loader className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Searching...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result) => (
              <SearchResultCard
                key={result.imdbID}
                result={result}
                existingItem={existingItems.find((item) => item.imdbId === result.imdbID)}
                recommenderName={recommenderName}
                onRecommend={handleAddRecommendation}
                onWatchTogether={handleAddToWatchTogether}
              />
            ))}
          </div>
        )}

        {results.length === 0 && !isSearching && searchedQuery && (
          <div className="text-center py-12 text-gray-500">
            <p>No results found for "{searchedQuery}"</p>
            <p className="text-sm mt-2">Try searching with different keywords</p>
          </div>
        )}

        {results.length === 0 && !isSearching && !searchedQuery && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Search for something to recommend</h2>
            <p className="text-gray-500">Find movies or TV shows you think would be enjoyed!</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 right-4">
        <a
          href="/"
          className="bg-gray-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
        >
          ← Back to WatchCraft
        </a>
      </div>
    </div>
  );
};

export default RecommendationPage;
