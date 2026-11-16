import { useState } from 'react';
import { searchOMDB } from '../utils/omdb';

// Search state shared by the recommend page and the "Search OMDB" window.
export const useOmdbSearch = () => {
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  // The last query that actually finished searching (used for the "no results" message).
  const [searchedQuery, setSearchedQuery] = useState('');

  const search = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setResults(await searchOMDB(trimmed));
    setSearchedQuery(trimmed);
    setIsSearching(false);
  };

  const reset = () => {
    setResults([]);
    setSearchedQuery('');
  };

  return { results, isSearching, searchedQuery, search, reset };
};
