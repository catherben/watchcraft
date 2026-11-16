import { useState } from 'react';
import { MOOD_OPTIONS, GENRE_OPTIONS, RECOMMENDER_OPTIONS } from '../constants';

// A list of custom values that is remembered in this browser (localStorage).
const useStoredList = (storageKey) => {
  const [list, setList] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });

  const add = (value) => {
    if (!value || list.includes(value)) return;
    const updated = [...list, value];
    setList(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  return [list, add];
};

// The dropdown choices for recommenders, moods and genres:
// the built-in lists plus anything custom you've added before.
export const useTagOptions = () => {
  const [customRecommenders, addRecommender] = useStoredList('customRecommenders');
  const [customMoods, addMood] = useStoredList('customMoods');
  const [customGenres, addGenre] = useStoredList('customGenres');

  return {
    recommenders: [...RECOMMENDER_OPTIONS, ...customRecommenders],
    moods: [...MOOD_OPTIONS, ...customMoods],
    genres: [...GENRE_OPTIONS, ...customGenres],
    addRecommender,
    addMood,
    addGenre,
  };
};
