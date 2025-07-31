import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Play, Users, Star, Clock, Tag, Download, Loader, Trash2, Edit3, Save, X, Grid, List, UserPlus, Share2, QrCode, Send, UserCircle } from 'lucide-react';
import { 
  getAllWatchlistItems, 
  addWatchlistItem, 
  updateWatchlistItem, 
  deleteWatchlistItem
} from './firebase/watchlistService';

// Simple routing based on URL path
const getCurrentPage = () => {
  const path = window.location.pathname;
  if (path === '/recommend') return 'recommend';
  return 'main';
};

// Recommendation Page Component
const RecommendationPage = () => {
  const [recommenderName, setRecommenderName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [watchTogether, setWatchTogether] = useState(false);
  const [existingItems, setExistingItems] = useState([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);
  
  const OMDB_API_KEY = 'cca39492';

  // Load existing watchlist on mount
  useEffect(() => {
    const loadExistingItems = async () => {
      try {
        setIsLoadingWatchlist(true);
        const items = await getAllWatchlistItems();
        setExistingItems(items);
      } catch (error) {
        console.error('Error loading watchlist:', error);
      } finally {
        setIsLoadingWatchlist(false);
      }
    };
    
    loadExistingItems();
  }, []);

  // Check if an item already exists in the watchlist
  const checkExistingItem = (imdbID) => {
    return existingItems.find(item => item.imdbId === imdbID);
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (recommenderName.trim()) {
      setShowNamePrompt(false);
      // Store name in session
      sessionStorage.setItem('recommenderName', recommenderName.trim());
    }
  };

  const searchOMDB = async (query) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${OMDB_API_KEY}`);
      const data = await response.json();
      
      if (data.Response === "True") {
        setSearchResults(data.Search || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching OMDB:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const getOMDBDetails = async (imdbID) => {
    try {
      const response = await fetch(`https://www.omdbapi.com/?i=${imdbID}&apikey=${OMDB_API_KEY}`);
      const data = await response.json();
      
      if (data.Response === "True") {
        return {
          title: data.Title,
          type: data.Type === 'movie' ? 'movie' : 'tv',
          genre: data.Genre ? data.Genre.split(', ') : [],
          runtime: data.Type === 'movie' ? parseInt(data.Runtime) || 0 : parseInt(data.Runtime) || 22,
          releaseYear: parseInt(data.Year) || new Date().getFullYear(),
          poster: data.Poster !== 'N/A' ? data.Poster : `https://via.placeholder.com/150x225/607D8B/white?text=${data.Title.replace(' ', '+')}`,
          imdbId: data.imdbID,
          plot: data.Plot,
          director: data.Director,
          actors: data.Actors,
          imdbRating: parseFloat(data.imdbRating) || 0,
          totalSeasons: data.Type !== 'movie' ? parseInt(data.totalSeasons) || 1 : null
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching OMDB details:', error);
      return null;
    }
  };

  const handleAddRecommendation = async (omdbItem) => {
    try {
      const details = await getOMDBDetails(omdbItem.imdbID);
      if (details) {
        const newItem = {
          ...details,
          mood: [],
          status: 'not started',
          recommendedBy: [recommenderName],
          watchingWith: watchTogether ? [recommenderName] : [],
          lastWatched: null,
          watchDates: [],
          totalEpisodes: details.type === 'tv' ? (details.totalSeasons * 20) : null,
          episodeLength: details.type === 'tv' ? details.runtime : null,
          runtime: details.type === 'movie' ? details.runtime : null,
          currentSeason: 1,
          currentEpisode: 1,
          viewingProgress: {},
          addedViaRecommendation: true,
          recommendationDate: new Date().toISOString()
        };
        
        await addWatchlistItem(newItem);
        setRecentlyAdded([...recentlyAdded, details.title]);
        
        // Update existing items list
        const updatedItems = await getAllWatchlistItems();
        setExistingItems(updatedItems);
        
        // Show success message
        setTimeout(() => {
          if (recentlyAdded.length === 0) {
            alert(`Added "${details.title}" to Watchlist! ${watchTogether ? 'Marked to watch together!' : ''}`);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error adding recommendation:', error);
      alert('Failed to add recommendation. Please try again.');
    }
  };

  const handleAddToWatchTogether = async (existingItem) => {
    try {
      const updatedRecommendedBy = existingItem.recommendedBy || [];
      if (!updatedRecommendedBy.includes(recommenderName)) {
        updatedRecommendedBy.push(recommenderName);
      }
      
      const updatedWatchingWith = existingItem.watchingWith || [];
      if (!updatedWatchingWith.includes(recommenderName)) {
        updatedWatchingWith.push(recommenderName);
      }
      
      await updateWatchlistItem(existingItem.id, {
        recommendedBy: updatedRecommendedBy,
        watchingWith: updatedWatchingWith
      });
      
      // Update local state
      const updatedItems = await getAllWatchlistItems();
      setExistingItems(updatedItems);
      
      alert(`Great! You've been added to watch "${existingItem.title}" together!`);
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update. Please try again.');
    }
  };

  // Check for stored name on mount
  useEffect(() => {
    const storedName = sessionStorage.getItem('recommenderName');
    if (storedName) {
      setRecommenderName(storedName);
      setShowNamePrompt(false);
    }
  }, []);

  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">🎬</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">WatchCraft</h1>
            <p className="text-gray-600">Recommend something you want Noah to watch!</p>
          </div>
          
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What's your name?
              </label>
              <input
                type="text"
                value={recommenderName}
                onChange={(e) => setRecommenderName(e.target.value)}
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
  }

  const renderSearchResultItem = (item) => {
    const existingItem = checkExistingItem(item.imdbID);
    const isAlreadyWatching = existingItem && ['currently watching', 'currently rewatching', 'to rewatch', 'on hold', 'completed'].includes(existingItem.status);
    const isOnWatchlist = existingItem && existingItem.status === 'not started';
    const isAlreadyWatchingWith = existingItem && existingItem.watchingWith && existingItem.watchingWith.includes(recommenderName);

    return (
      <div key={item.imdbID} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
        <div className="flex gap-3">
          <img
            src={item.Poster !== 'N/A' ? item.Poster : `https://via.placeholder.com/80x120/607D8B/white?text=${item.Title.slice(0,3)}`}
            alt={item.Title}
            className="w-20 h-28 object-cover rounded"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1 line-clamp-2">{item.Title}</h3>
            <p className="text-xs text-gray-600 mb-1">{item.Year}</p>
            <p className="text-xs text-gray-600 mb-3 capitalize">{item.Type}</p>
            
            {isAlreadyWatching ? (
              <div className="bg-purple-100 text-purple-800 px-3 py-2 rounded text-sm font-medium text-center">
                ✨ Already {existingItem.status === 'completed' ? 'watched' : 'watching'}!
              </div>
            ) : isOnWatchlist ? (
              <div className="space-y-2">
                <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded text-sm text-center">
                  📋 Already on watchlist!
                </div>
                {!isAlreadyWatchingWith && (
                  <button
                    onClick={() => handleAddToWatchTogether(existingItem)}
                    className="w-full text-sm bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 flex items-center justify-center gap-1"
                  >
                    <UserPlus className="h-4 w-4" />
                    Want to Watch Together?
                  </button>
                )}
                {isAlreadyWatchingWith && (
                  <div className="text-center text-xs text-green-600 font-medium">
                    ✓ You're set to watch together!
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => handleAddRecommendation(item)}
                className="w-full text-sm bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 flex items-center justify-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Recommend This
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">🎬 Recommend to Noah</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <UserCircle className="h-4 w-4" />
              {recommenderName}
            </div>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
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
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for movies or TV shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchOMDB(searchQuery)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => searchOMDB(searchQuery)}
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

        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map(renderSearchResultItem)}
          </div>
        )}

        {searchResults.length === 0 && searchQuery && !isSearching && (
          <div className="text-center py-12 text-gray-500">
            <p>No results found for "{searchQuery}"</p>
            <p className="text-sm mt-2">Try searching with different keywords</p>
          </div>
        )}

        {!searchQuery && searchResults.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Search for something to recommend</h2>
            <p className="text-gray-500">Find movies or TV shows you think Noah would enjoy!</p>
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

const WatchCraftApp = () => {
  const [currentPage, setCurrentPage] = useState(getCurrentPage());

  // Listen for navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getCurrentPage());
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Render the appropriate page
  if (currentPage === 'recommend') {
    return <RecommendationPage />;
  }

  return <MainWatchCraftApp />;
};

// Main WatchCraft app as separate component
const MainWatchCraftApp = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [omdbResults, setOmdbResults] = useState([]);
  const [isSearchingOMDB, setIsSearchingOMDB] = useState(false);
  const [showOMDBSearch, setShowOMDBSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [showQRModal, setShowQRModal] = useState(false);
  
  const OMDB_API_KEY = 'cca39492';
  
  const [filters, setFilters] = useState({
    genre: [],
    mood: [],
    status: '',
    recommendedBy: [],
    watchingWith: [],
    maxLength: '',
    type: ''
  });

  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        setIsLoading(true);
        const items = await getAllWatchlistItems();
        setWatchlist(items);
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

  const searchOMDB = async (title) => {
    setIsSearchingOMDB(true);
    try {
      const response = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}`);
      const data = await response.json();
      
      if (data.Response === "True") {
        setOmdbResults(data.Search || []);
      } else {
        setOmdbResults([]);
      }
    } catch (error) {
      console.error('Error searching OMDB:', error);
      setOmdbResults([]);
    } finally {
      setIsSearchingOMDB(false);
    }
  };

  const getOMDBDetails = async (imdbID) => {
    try {
      const response = await fetch(`https://www.omdbapi.com/?i=${imdbID}&apikey=${OMDB_API_KEY}`);
      const data = await response.json();
      
      if (data.Response === "True") {
        return {
          title: data.Title,
          type: data.Type === 'movie' ? 'movie' : 'tv',
          genre: data.Genre ? data.Genre.split(', ') : [],
          runtime: data.Type === 'movie' ? parseInt(data.Runtime) || 0 : parseInt(data.Runtime) || 22,
          releaseYear: parseInt(data.Year) || new Date().getFullYear(),
          poster: data.Poster !== 'N/A' ? data.Poster : `https://via.placeholder.com/150x225/607D8B/white?text=${data.Title.replace(' ', '+')}`,
          imdbId: data.imdbID,
          plot: data.Plot,
          director: data.Director,
          actors: data.Actors,
          imdbRating: parseFloat(data.imdbRating) || 0,
          totalSeasons: data.Type !== 'movie' ? parseInt(data.totalSeasons) || 1 : null
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching OMDB details:', error);
      return null;
    }
  };

  const addFromOMDB = async (omdbItem) => {
    try {
      const details = await getOMDBDetails(omdbItem.imdbID);
      if (details) {
        const newItem = {
          ...details,
          mood: [],
          status: 'not started',
          recommendedBy: [],
          watchingWith: [],
          lastWatched: null,
          watchDates: [],
          totalEpisodes: details.type === 'tv' ? (details.totalSeasons * 20) : null,
          episodeLength: details.type === 'tv' ? details.runtime : null,
          runtime: details.type === 'movie' ? details.runtime : null,
          currentSeason: 1,
          currentEpisode: 1,
          viewingProgress: {}
        };
        
        const id = await addWatchlistItem(newItem);
        const itemWithId = { ...newItem, id };
        setWatchlist([...watchlist, itemWithId]);
        setShowOMDBSearch(false);
        setOmdbResults([]);
      }
    } catch (error) {
      console.error('Error adding item from OMDB:', error);
      setError('Failed to add item. Please try again.');
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteWatchlistItem(id);
        setWatchlist(watchlist.filter(item => item.id !== id));
      } catch (error) {
        console.error('Error deleting item:', error);
        setError('Failed to delete item. Please try again.');
      }
    }
  };

  const handleUpdateItem = async (id, updates) => {
    try {
      await updateWatchlistItem(id, updates);
      setWatchlist(watchlist.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
    } catch (error) {
      console.error('Error updating item:', error);
      setError('Failed to update item. Please try again.');
    }
  };

  const startEditing = (item) => {
    setEditingItem({
      id: item.id,
      status: item.status,
      recommendedBy: item.recommendedBy || [],
      mood: item.mood || [],
      watchingWith: item.watchingWith || [],
      currentSeason: item.currentSeason || 1,
      currentEpisode: item.currentEpisode || 1,
      viewingProgress: item.viewingProgress || {}
    });
  };

  const cancelEditing = () => {
    setEditingItem(null);
  };

  useEffect(() => {
    let filtered = watchlist.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Multi-select genre filtering - item must have ALL selected genres (AND logic)
      const matchesGenre = filters.genre.length === 0 || 
        filters.genre.every(selectedGenre => (item.genre || []).includes(selectedGenre));
      
      // Multi-select mood filtering - item must have at least one selected mood (OR logic)
      const matchesMood = filters.mood.length === 0 || 
        (item.mood || []).some(m => filters.mood.includes(m));
      
      const matchesStatus = !filters.status || item.status === filters.status;
      
      // Multi-select recommended by filtering - item must have ALL selected recommenders (AND logic)
      const matchesRecommender = filters.recommendedBy.length === 0 || 
        filters.recommendedBy.every(selectedRecommender => (item.recommendedBy || []).includes(selectedRecommender));
      
      // Multi-select watching with filtering - item must have ALL selected partners (AND logic)
      const matchesWatchingWith = filters.watchingWith.length === 0 || 
        filters.watchingWith.every(selectedPartner => (item.watchingWith || []).includes(selectedPartner));
      
      const matchesType = !filters.type || item.type === filters.type;
      const matchesLength = !filters.maxLength || (item.runtime && item.runtime <= parseInt(filters.maxLength)) || (item.episodeLength && item.episodeLength <= parseInt(filters.maxLength));
      
      return matchesSearch && matchesGenre && matchesMood && matchesStatus && matchesRecommender && matchesWatchingWith && matchesType && matchesLength;
    });
    
    setFilteredList(filtered);
  }, [watchlist, searchTerm, filters]);

  const getStatusStyle = (status) => {
    switch(status) {
      case 'not started': 
        return {
          backgroundColor: '#64748b',
          color: 'white',
          borderColor: '#475569'
        };
      case 'currently watching': 
        return {
          backgroundColor: '#22c55e',
          color: 'white',
          borderColor: '#16a34a'
        };
      case 'currently rewatching': 
        return {
          backgroundColor: '#14b8a6',
          color: 'white',
          borderColor: '#0f766e'
        };
      case 'on hold': 
        return {
          backgroundColor: '#eab308',
          color: 'white',
          borderColor: '#ca8a04'
        };
      case 'completed': 
        return {
          backgroundColor: '#1f2937',
          color: 'white',
          borderColor: '#111827'
        };
      case 'to rewatch': 
        return {
          backgroundColor: '#f97316',
          color: 'white',
          borderColor: '#ea580c'
        };
      default: 
        return {
          backgroundColor: '#6b7280',
          color: 'white',
          borderColor: '#4b5563'
        };
    }
  };

  const formatRuntime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getMainProgress = (item) => {
    if (item.type === 'tv' && item.totalEpisodes) {
      const totalWatched = (item.currentSeason - 1) * 20 + item.currentEpisode;
      return Math.min(Math.round((totalWatched / item.totalEpisodes) * 100), 100);
    }
    return null;
  };

  const TagInput = ({ value = [], onChange, placeholder }) => {
    const [inputValue, setInputValue] = useState('');
    
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (inputValue.trim()) {
          const newValue = [...value, inputValue.trim()];
          onChange(newValue);
          setInputValue('');
        }
      }
    };

    const removeTag = (indexToRemove) => {
      const newValue = value.filter((_, index) => index !== indexToRemove);
      onChange(newValue);
    };

    return (
      <div className="border rounded-md p-2 min-h-[40px] flex flex-wrap gap-1 items-center">
        {value.map((tag, index) => (
          <span
            key={index}
            className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] outline-none text-sm"
        />
      </div>
    );
  };

  const EditingModal = ({ item }) => {
    const [localEditForm, setLocalEditForm] = useState({
      status: editingItem.status,
      recommendedBy: editingItem.recommendedBy,
      mood: editingItem.mood,
      watchingWith: editingItem.watchingWith,
      currentSeason: editingItem.currentSeason,
      currentEpisode: editingItem.currentEpisode,
      viewingProgress: editingItem.viewingProgress
    });

    const [newPartner, setNewPartner] = useState('');

    const addViewingPartner = () => {
      if (newPartner.trim()) {
        const newProgress = {
          ...localEditForm.viewingProgress,
          [newPartner]: { season: 1, episode: 1 }
        };
        setLocalEditForm({
          ...localEditForm,
          viewingProgress: newProgress
        });
        setNewPartner('');
      }
    };

    const updatePartnerProgress = (partner, season, episode) => {
      const newProgress = {
        ...localEditForm.viewingProgress,
        [partner]: { season: parseInt(season) || 1, episode: parseInt(episode) || 1 }
      };
      setLocalEditForm({
        ...localEditForm,
        viewingProgress: newProgress
      });
    };

    const removePartner = (partner) => {
      const newProgress = { ...localEditForm.viewingProgress };
      delete newProgress[partner];
      setLocalEditForm({
        ...localEditForm,
        viewingProgress: newProgress
      });
    };

    const handleSave = async () => {
      try {
        await handleUpdateItem(editingItem.id, {
          status: localEditForm.status,
          recommendedBy: localEditForm.recommendedBy,
          mood: localEditForm.mood,
          watchingWith: localEditForm.watchingWith,
          currentSeason: localEditForm.currentSeason,
          currentEpisode: localEditForm.currentEpisode,
          viewingProgress: localEditForm.viewingProgress
        });
        setEditingItem(null);
      } catch (error) {
        console.error('Error saving:', error);
        setError('Failed to save changes. Please try again.');
      }
    };

    return (
      <div 
        className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center p-4"
        style={{
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
          padding: '1rem'
        }}
        onClick={cancelEditing}
      >
        <div 
          className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '42rem',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Edit "{item?.title || 'Unknown'}"</h2>
            <button
              onClick={cancelEditing}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              style={{ fontSize: '1.5rem', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={localEditForm.status}
                onChange={(e) => setLocalEditForm({...localEditForm, status: e.target.value})}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="not started">Not Started</option>
                <option value="currently watching">Currently Watching</option>
                <option value="currently rewatching">Currently Rewatching</option>
                <option value="on hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="to rewatch">To Rewatch</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Recommended By</label>
              <TagInput
                value={localEditForm.recommendedBy}
                onChange={(value) => setLocalEditForm({...localEditForm, recommendedBy: value})}
                placeholder="Add people who recommended this (press Enter or comma to add)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Moods</label>
              <TagInput
                value={localEditForm.mood}
                onChange={(value) => setLocalEditForm({...localEditForm, mood: value})}
                placeholder="Add moods (Happy, Tense, etc.)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Watching With</label>
              <TagInput
                value={localEditForm.watchingWith}
                onChange={(value) => setLocalEditForm({...localEditForm, watchingWith: value})}
                placeholder="Add viewing partners"
              />
            </div>

            {item?.type === 'tv' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Your Current Season</label>
                    <input
                      type="number"
                      value={localEditForm.currentSeason}
                      onChange={(e) => setLocalEditForm({...localEditForm, currentSeason: parseInt(e.target.value) || 1})}
                      className="w-full border rounded-md px-3 py-2"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Your Current Episode</label>
                    <input
                      type="number"
                      value={localEditForm.currentEpisode}
                      onChange={(e) => setLocalEditForm({...localEditForm, currentEpisode: parseInt(e.target.value) || 1})}
                      className="w-full border rounded-md px-3 py-2"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Individual Progress Tracking</label>
                  
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newPartner}
                      onChange={(e) => setNewPartner(e.target.value)}
                      placeholder="Add viewing partner"
                      className="flex-1 border rounded-md px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={addViewingPartner}
                      className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 flex items-center gap-1"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add
                    </button>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {Object.entries(localEditForm.viewingProgress).map(([partner, progress]) => (
                      <div key={partner} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="font-medium text-sm flex-1">{partner}:</span>
                        <span className="text-xs">S</span>
                        <input
                          type="number"
                          value={progress.season}
                          onChange={(e) => updatePartnerProgress(partner, e.target.value, progress.episode)}
                          className="w-16 border rounded px-2 py-1 text-sm"
                          min="1"
                        />
                        <span className="text-xs">E</span>
                        <input
                          type="number"
                          value={progress.episode}
                          onChange={(e) => updatePartnerProgress(partner, progress.season, e.target.value)}
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
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

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
              onClick={cancelEditing}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const OMDBSearchModal = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = () => {
      if (searchQuery.trim()) {
        searchOMDB(searchQuery.trim());
      }
    };

    const handleClose = () => {
      setShowOMDBSearch(false);
      setOmdbResults([]);
    };

    return (
      <div 
        className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center p-4"
        style={{
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
          padding: '1rem'
        }}
        onClick={handleClose}
      >
        <div 
          className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '56rem',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Search OMDB Database</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              style={{ fontSize: '1.5rem', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for movies or TV shows..."
              className="flex-1 border rounded-md px-3 py-2"
            />
            <button
              onClick={handleSearch}
              disabled={isSearchingOMDB}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSearchingOMDB ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </div>

          {isSearchingOMDB && (
            <div className="text-center py-8">
              <Loader className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Searching OMDB...</p>
            </div>
          )}

          {omdbResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {omdbResults.map((item) => (
                <div key={item.imdbID} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex gap-3">
                    <img
                      src={item.Poster !== 'N/A' ? item.Poster : `https://via.placeholder.com/80x120/607D8B/white?text=${item.Title.slice(0,3)}`}
                      alt={item.Title}
                      className="w-16 h-24 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">{item.Title}</h3>
                      <p className="text-xs text-gray-600 mb-1">{item.Year}</p>
                      <p className="text-xs text-gray-600 mb-2 capitalize">{item.Type}</p>
                      <button
                        onClick={() => addFromOMDB(item)}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Add to Watchlist
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {omdbResults.length === 0 && searchQuery && !isSearchingOMDB && (
            <div className="text-center py-8 text-gray-500">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    );
  };

  const AddItemForm = () => {
    const [newItem, setNewItem] = useState({
      title: '',
      type: 'tv',
      genre: [],
      mood: [],
      status: 'not started',
      recommendedBy: [],
      runtime: '',
      episodeLength: '',
      totalEpisodes: ''
    });

    const handleSubmit = async () => {
      if (!newItem.title) return;
      
      try {
        const item = {
          ...newItem,
          watchingWith: [],
          lastWatched: null,
          watchDates: [],
          poster: `https://via.placeholder.com/150x225/607D8B/white?text=${newItem.title.replace(' ', '+')}`,
          imdbId: null,
          currentSeason: 1,
          currentEpisode: 1,
          viewingProgress: {}
        };
        
        const id = await addWatchlistItem(item);
        const itemWithId = { ...item, id };
        setWatchlist([...watchlist, itemWithId]);
        setShowAddForm(false);
        setNewItem({
          title: '',
          type: 'tv',
          genre: [],
          mood: [],
          status: 'not started',
          recommendedBy: [],
          runtime: '',
          episodeLength: '',
          totalEpisodes: ''
        });
      } catch (error) {
        console.error('Error adding manual item:', error);
        setError('Failed to add item. Please try again.');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Add New Item</h2>
            <button
              onClick={() => setShowOMDBSearch(true)}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"
            >
              <Search className="h-3 w-3" />
              Search OMDB
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={newItem.title}
                onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                className="w-full border rounded-md px-3 py-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={newItem.type}
                onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="tv">TV Show</option>
                <option value="movie">Movie</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Genres</label>
              <TagInput
                value={newItem.genre}
                onChange={(value) => setNewItem({...newItem, genre: value})}
                placeholder="Add genres (Comedy, Drama, etc.)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Moods</label>
              <TagInput
                value={newItem.mood}
                onChange={(value) => setNewItem({...newItem, mood: value})}
                placeholder="Add moods (Happy, Relaxing, etc.)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={newItem.status}
                onChange={(e) => setNewItem({...newItem, status: e.target.value})}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="not started">Not Started</option>
                <option value="currently watching">Currently Watching</option>
                <option value="currently rewatching">Currently Rewatching</option>
                <option value="on hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="to rewatch">To Rewatch</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Recommended By</label>
              <TagInput
                value={newItem.recommendedBy}
                onChange={(value) => setNewItem({...newItem, recommendedBy: value})}
                placeholder="Add people who recommended this"
              />
            </div>

            {newItem.type === 'movie' ? (
              <div>
                <label className="block text-sm font-medium mb-1">Runtime (minutes)</label>
                <input
                  type="number"
                  value={newItem.runtime}
                  onChange={(e) => setNewItem({...newItem, runtime: parseInt(e.target.value)})}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="120"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Episode Length (minutes)</label>
                  <input
                    type="number"
                    value={newItem.episodeLength}
                    onChange={(e) => setNewItem({...newItem, episodeLength: parseInt(e.target.value)})}
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="22"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total Episodes</label>
                  <input
                    type="number"
                    value={newItem.totalEpisodes}
                    onChange={(e) => setNewItem({...newItem, totalEpisodes: parseInt(e.target.value)})}
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="100"
                  />
                </div>
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
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // NEW: FilterModal component - wraps FilterPanel in a modal
  const FilterModal = () => {
    // Extract unique values from watchlist for dropdowns
    const getUniqueValues = (field) => {
      const values = new Set();
      watchlist.forEach(item => {
        const itemValues = item[field] || [];
        if (Array.isArray(itemValues)) {
          itemValues.forEach(value => values.add(value));
        }
      });
      return Array.from(values).sort();
    };

    const uniqueGenres = getUniqueValues('genre');
    const uniqueMoods = getUniqueValues('mood');
    const uniqueRecommenders = getUniqueValues('recommendedBy');
    const uniqueWatchingWith = getUniqueValues('watchingWith');

    // Multi-select component
    const MultiSelect = ({ label, options, value, onChange, placeholder }) => {
      const toggleOption = (option) => {
        if (value.includes(option)) {
          onChange(value.filter(v => v !== option));
        } else {
          onChange([...value, option]);
        }
      };

      const removeOption = (option) => {
        onChange(value.filter(v => v !== option));
      };

      return (
        <div>
          <label className="block text-sm font-medium mb-1">{label}</label>
          <div className="border rounded-md p-2 min-h-[40px] bg-white">
            {/* Selected items display */}
            {value.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {value.map(item => (
                  <span
                    key={item}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeOption(item)}
                      className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Dropdown */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  toggleOption(e.target.value);
                  e.target.value = ''; // Reset select
                }
              }}
              className="w-full text-sm bg-transparent border-none outline-none"
              value=""
            >
              <option value="">{value.length === 0 ? placeholder : `Add more...`}</option>
              {options
                .filter(option => !value.includes(option))
                .map(option => (
                  <option key={option} value={option}>{option}</option>
                ))
              }
            </select>
          </div>
        </div>
      );
    };

    const handleClose = () => {
      setShowFilters(false);
    };

    return (
      <div 
        className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center p-4"
        style={{
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
          padding: '1rem'
        }}
        onClick={handleClose}
      >
        <div 
          className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '56rem',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Filter Your Watchlist</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              style={{ fontSize: '1.5rem', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="tv">TV Shows</option>
                <option value="movie">Movies</option>
              </select>
            </div>

            <MultiSelect
              label="Genre"
              options={uniqueGenres}
              value={filters.genre}
              onChange={(value) => setFilters({...filters, genre: value})}
              placeholder="Select genres..."
            />

            <MultiSelect
              label="Mood"
              options={uniqueMoods}
              value={filters.mood}
              onChange={(value) => setFilters({...filters, mood: value})}
              placeholder="Select moods..."
            />

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="not started">Not Started</option>
                <option value="currently watching">Currently Watching</option>
                <option value="currently rewatching">Currently Rewatching</option>
                <option value="on hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="to rewatch">To Rewatch</option>
              </select>
            </div>

            <MultiSelect
              label="Recommended By"
              options={uniqueRecommenders}
              value={filters.recommendedBy}
              onChange={(value) => setFilters({...filters, recommendedBy: value})}
              placeholder="Select recommenders..."
            />

            <MultiSelect
              label="Watching With"
              options={uniqueWatchingWith}
              value={filters.watchingWith}
              onChange={(value) => setFilters({...filters, watchingWith: value})}
              placeholder="Select viewing partners..."
            />

            <div>
              <label className="block text-sm font-medium mb-1">Max Length (minutes)</label>
              <input
                type="number"
                value={filters.maxLength}
                onChange={(e) => setFilters({...filters, maxLength: e.target.value})}
                placeholder="30, 120..."
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          
          <div className="flex gap-3 justify-between items-center">
            <button
              onClick={() => setFilters({
                genre: [],
                mood: [],
                status: '',
                recommendedBy: [],
                watchingWith: [],
                maxLength: '',
                type: ''
              })}
              className="text-sm text-blue-600 hover:text-blue-800 px-3 py-2 border border-blue-600 rounded-md hover:bg-blue-50"
            >
              Clear all filters
            </button>
            
            <div className="text-sm text-gray-600">
              Showing {filteredList.length} of {watchlist.length} items
            </div>
            
            <button
              onClick={handleClose}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    );
  };

  const FilterPanel = () => {
    // Extract unique values from watchlist for dropdowns
    const getUniqueValues = (field) => {
      const values = new Set();
      watchlist.forEach(item => {
        const itemValues = item[field] || [];
        if (Array.isArray(itemValues)) {
          itemValues.forEach(value => values.add(value));
        }
      });
      return Array.from(values).sort();
    };

    const uniqueGenres = getUniqueValues('genre');
    const uniqueMoods = getUniqueValues('mood');
    const uniqueRecommenders = getUniqueValues('recommendedBy');

    // Multi-select component
    const MultiSelect = ({ label, options, value, onChange, placeholder }) => {
      const toggleOption = (option) => {
        if (value.includes(option)) {
          onChange(value.filter(v => v !== option));
        } else {
          onChange([...value, option]);
        }
      };

      const removeOption = (option) => {
        onChange(value.filter(v => v !== option));
      };

      return (
        <div>
          <label className="block text-sm font-medium mb-1">{label}</label>
          <div className="border rounded-md p-2 min-h-[40px] bg-white">
            {/* Selected items display */}
            {value.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {value.map(item => (
                  <span
                    key={item}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeOption(item)}
                      className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Dropdown */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  toggleOption(e.target.value);
                  e.target.value = ''; // Reset select
                }
              }}
              className="w-full text-sm bg-transparent border-none outline-none"
              value=""
            >
              <option value="">{value.length === 0 ? placeholder : `Add more...`}</option>
              {options
                .filter(option => !value.includes(option))
                .map(option => (
                  <option key={option} value={option}>{option}</option>
                ))
              }
            </select>
          </div>
        </div>
      );
    };

    return (
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="tv">TV Shows</option>
              <option value="movie">Movies</option>
            </select>
          </div>

          <MultiSelect
            label="Genre"
            options={uniqueGenres}
            value={filters.genre}
            onChange={(value) => setFilters({...filters, genre: value})}
            placeholder="Select genres..."
          />

          <MultiSelect
            label="Mood"
            options={uniqueMoods}
            value={filters.mood}
            onChange={(value) => setFilters({...filters, mood: value})}
            placeholder="Select moods..."
          />

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="not started">Not Started</option>
              <option value="currently watching">Currently Watching</option>
              <option value="currently rewatching">Currently Rewatching</option>
              <option value="on hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="to rewatch">To Rewatch</option>
            </select>
          </div>

          <MultiSelect
            label="Recommended By"
            options={uniqueRecommenders}
            value={filters.recommendedBy}
            onChange={(value) => setFilters({...filters, recommendedBy: value})}
            placeholder="Select recommenders..."
          />

          <div>
            <label className="block text-sm font-medium mb-1">Max Length (minutes)</label>
            <input
              type="number"
              value={filters.maxLength}
              onChange={(e) => setFilters({...filters, maxLength: e.target.value})}
              placeholder="30, 120..."
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
        
        <button
          onClick={() => setFilters({
            genre: [],
            mood: [],
            status: '',
            recommendedBy: [],
            watchingWith: '',
            maxLength: '',
            type: ''
          })}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800"
        >
          Clear all filters
        </button>
      </div>
    );
  };

  // QR Code Modal Component
  const QRCodeModal = () => {
    const recommendUrl = 'https://watchcraft-phi.vercel.app/recommend';
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(recommendUrl)}`;
    
    return (
      <div 
        className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center p-4"
        style={{
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
          padding: '1rem'
        }}
        onClick={() => setShowQRModal(false)}
      >
        <div 
          className="bg-white rounded-lg p-6 w-full max-w-md"
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '28rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Share WatchCraft</h2>
            <button
              onClick={() => setShowQRModal(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              style={{ fontSize: '1.5rem', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          
          <div className="text-center">
            <div className="bg-gray-50 p-6 rounded-lg mb-4">
              <img 
                src={qrCodeUrl} 
                alt="WatchCraft QR Code" 
                className="mx-auto"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            
            <h3 className="font-semibold text-lg mb-2">🎬 Recommend Shows & Movies!</h3>
            <p className="text-gray-600 text-sm mb-4">
              Scan to add your recommendations to Noah's Watchlist 
            </p>
            
            <div className="space-y-3">
              <a
                href={qrCodeUrl}
                download="watchcraft-recommendations-qr.png"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download QR Code
              </a>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(recommendUrl);
                  alert('Recommendation link copied to clipboard!');
                }}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 flex items-center justify-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Copy Recommendation Link
              </button>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>Perfect for:</strong> Enter your name as "anonymous" if you don't want to take credit for your recommendation(s)
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Toolbar */}
      <div 
        className="fixed top-0 left-0 right-0 bg-white shadow-md border-b z-40"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          backgroundColor: 'white',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid #e5e7eb'
        }}
      >
        <div className="max-w-7xl mx-auto p-4">
          {/* App Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🎬 WatchCraft</h1>
          
          {/* Controls Row */}
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
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowQRModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                title="Hi :) Welcome to my app - Noah"
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
          
          {/* Item Count */}
          <p className="text-gray-600">
            Showing {filteredList.length} of {watchlist.length} items
          </p>
        </div>
      </div>

      {/* Main Content - with top padding to account for fixed toolbar */}
      <div style={{ paddingTop: '220px' }}>
        <div className="max-w-7xl mx-auto p-4">
          <div 
            className={`grid gap-3`}
            style={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'grid' 
                ? 'repeat(auto-fit, minmax(200px, 1fr))' 
                : 'repeat(auto-fit, minmax(120px, 1fr))',
              alignItems: 'stretch'
            }}
          >
            {filteredList.map(item => (
              <div 
                key={item.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: 'fit-content',
                  minHeight: viewMode === 'grid' ? '300px' : '150px'
                }}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={item.poster}
                    alt={item.title}
                    className={`w-full object-cover ${
                      viewMode === 'grid' ? 'h-32 max-h-32' : 'h-20 max-h-20'
                    }`}
                    style={{
                      height: viewMode === 'grid' ? '128px' : '80px',
                      maxHeight: viewMode === 'grid' ? '128px' : '80px'
                    }}
                  />
                  <div className={`absolute top-1 right-1 ${viewMode === 'compact' ? 'top-0.5 right-0.5' : ''}`}>
                    <span 
                      className={`px-3 py-1.5 rounded-full font-semibold border-2 shadow-lg ${
                        viewMode === 'compact' ? 'text-xs px-2 py-1' : 'text-sm'
                      }`}
                      style={getStatusStyle(item.status)}
                    >
                      {viewMode === 'compact' ? item.status.slice(0, 3).toUpperCase() : item.status.toUpperCase()}
                    </span>
                  </div>
                  <div className={`absolute top-1 left-1 flex gap-1 ${viewMode === 'compact' ? 'top-0.5 left-0.5' : ''}`}>
                    <button
                      onClick={() => startEditing(item)}
                      className={`bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors ${
                        viewMode === 'compact' ? 'p-0.5' : 'p-1'
                      }`}
                      title="Edit item"
                    >
                      <Edit3 className={`${viewMode === 'compact' ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className={`bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors ${
                        viewMode === 'compact' ? 'p-0.5' : 'p-1'
                      }`}
                      title="Delete item"
                    >
                      <Trash2 className={`${viewMode === 'compact' ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
                    </button>
                  </div>
                  
                  {item.type === 'tv' && viewMode === 'grid' && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                      <div className="text-xs space-y-1">
                        {/* Your progress */}
                        <div className="flex justify-between items-center mb-1">
                          <span>You: S{item.currentSeason || 1}E{item.currentEpisode || 1}</span>
                          {getMainProgress(item) && <span>&nbsp;&nbsp;{getMainProgress(item)}%</span>}
                        </div>
                        
                        {/* Partner progress */}
                        {Object.entries(item.viewingProgress || {}).slice(0, 2).map(([partner, progress]) => (
                          <div key={partner} className="flex justify-between text-xs opacity-90">
                            <span>{partner}:</span>
                            <span>S{progress.season}E{progress.episode}</span>
                          </div>
                        ))}
                        
                        {/* Last aired episode */}
                        {item.totalEpisodes && (
                          <div className="flex justify-between text-xs opacity-75 border-t border-gray-600 pt-1 mt-1">
                            <span>Last Aired:</span>
                            <span>S{Math.ceil(item.totalEpisodes / 20)}E{item.totalEpisodes % 20 || 20}</span>
                          </div>
                        )}
                        
                        {Object.keys(item.viewingProgress || {}).length > 2 && (
                          <div className="text-xs opacity-75">+{Object.keys(item.viewingProgress).length - 2} more</div>
                        )}
                      </div>
                    </div>
                  )}

                  {item.type === 'tv' && viewMode === 'compact' && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white px-1 py-0.5">
                      <div className="text-xs text-center">
                        S{item.currentSeason || 1}E{item.currentEpisode || 1}
                        {getMainProgress(item) && <span>&nbsp;&nbsp;{getMainProgress(item)}%</span>}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className={`${viewMode === 'compact' ? 'p-1.5' : 'p-4'} flex-grow flex flex-col`}>
                  <h3 className={`font-bold line-clamp-2 ${
                    viewMode === 'compact' ? 'text-xs leading-tight mb-1 flex-grow' : 'text-lg mb-2'
                  }`}>{item.title}</h3>
                  
                  {viewMode === 'grid' && (
                    <div className="space-y-1 text-sm text-gray-600 flex-grow">
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        <span className="truncate">{(item.genre || []).join(', ')}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {item.type === 'movie' 
                            ? formatRuntime(item.runtime)
                            : `${item.episodeLength}min episodes`
                          }
                        </span>
                      </div>
                      
                      {item.imdbRating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{item.imdbRating}/10</span>
                        </div>
                      )}
                      
                      {item.recommendedBy && item.recommendedBy.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span className="truncate">Rec. by {item.recommendedBy.slice(0, 2).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {viewMode === 'compact' && item.imdbRating && (
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mt-auto">
                      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                      <span>{item.imdbRating}</span>
                    </div>
                  )}
                  
                  {viewMode === 'grid' && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(item.mood || []).slice(0, 3).map(mood => (
                        <span key={mood} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {mood}
                        </span>
                      ))}
                      {(item.mood || []).length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          +{(item.mood || []).length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredList.length === 0 && (
            <div className="text-center py-12">
              <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No items match your search criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* All modals are properly positioned with fixed positioning and z-index */}
      {showAddForm && <AddItemForm />}
      {showOMDBSearch && <OMDBSearchModal />}
      {showFilters && <FilterModal />}
      {showQRModal && <QRCodeModal />}
      {editingItem && <EditingModal item={watchlist.find(item => item.id === editingItem.id)} />}
    </div>
  );
};

export default WatchCraftApp;