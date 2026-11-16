import React, { useState } from 'react';
import { Search, Download, Loader } from 'lucide-react';
import { useOmdbSearch } from '../hooks/useOmdbSearch';
import { placeholderPoster } from '../utils/watchlist';
import Modal from './Modal';

const OMDBSearchModal = ({ onAdd, onClose }) => {
  const [query, setQuery] = useState('');
  const { results, isSearching, searchedQuery, search } = useOmdbSearch();

  return (
    <Modal title="Search OMDB Database" onClose={onClose} maxWidth="56rem">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search(query)}
          placeholder="Search for movies or TV shows..."
          className="flex-1 border rounded-md px-3 py-2"
        />
        <button
          onClick={() => search(query)}
          disabled={isSearching}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isSearching ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </div>

      {isSearching && (
        <div className="text-center py-8">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Searching OMDB...</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((result) => (
            <div key={result.imdbID} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex gap-3">
                <img
                  src={result.Poster !== 'N/A' ? result.Poster : placeholderPoster(result.Title.slice(0, 3), '80x120')}
                  alt={result.Title}
                  className="w-16 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{result.Title}</h3>
                  <p className="text-xs text-gray-600 mb-1">{result.Year}</p>
                  <p className="text-xs text-gray-600 mb-2 capitalize">{result.Type}</p>
                  <button
                    onClick={() => onAdd(result)}
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

      {results.length === 0 && searchedQuery && !isSearching && (
        <div className="text-center py-8 text-gray-500">No results found for "{searchedQuery}"</div>
      )}
    </Modal>
  );
};

export default OMDBSearchModal;
