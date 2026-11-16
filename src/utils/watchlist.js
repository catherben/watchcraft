import { EPISODES_PER_SEASON, STATUSES, WATCHING_ALONE } from '../constants';
import { countEpisodesWatched, episodeFields } from './episodes';

// ---------- Display helpers ----------

export const placeholderPoster = (text, size = '150x225') =>
  `https://via.placeholder.com/${size}/607D8B/white?text=${encodeURIComponent(text)}`;

const DEFAULT_STATUS_STYLE = { backgroundColor: '#6b7280', color: 'white', borderColor: '#4b5563' };

export const getStatusStyle = (status) => {
  const match = STATUSES.find((s) => s.value === status);
  if (!match) return DEFAULT_STATUS_STYLE;
  return { backgroundColor: match.backgroundColor, color: 'white', borderColor: match.borderColor };
};

export const formatRuntime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

export const formatLength = (item) =>
  item.type === 'movie' ? formatRuntime(item.runtime) : `${item.episodeLength}min episodes`;

// ---------- Progress ----------

// How far through a TV show a given season and episode is, 0-100 (not rounded).
// Null for movies or unknown episode counts.
const exactProgressAt = (item, season, episode) => {
  if (item.type !== 'tv' || !item.totalEpisodes) return null;
  const episodesWatched = countEpisodesWatched(item, parseInt(season) || 1, parseInt(episode) || 1);
  return Math.max(0, Math.min((episodesWatched / item.totalEpisodes) * 100, 100));
};

// How far through a TV show you are. The status wins at the two ends:
// "not started" is always 0% and "completed" is always 100%.
const getExactProgress = (item) => {
  const progress = exactProgressAt(item, item.currentSeason, item.currentEpisode);
  if (progress === null) return null;
  if (item.status === 'completed') return 100;
  if (item.status === 'not started') return 0;
  return progress;
};

// Same thing as a whole number for display, or null if there's nothing to show.
export const getProgressPercent = (item) => {
  const progress = getExactProgress(item);
  return progress === null ? null : Math.round(progress);
};

// The same for someone you're watching with. partnerAt is their { season, episode }.
export const getPartnerProgressPercent = (item, partnerAt) => {
  const progress = exactProgressAt(item, partnerAt?.season, partnerAt?.episode);
  return progress === null ? null : Math.round(progress);
};

// ---------- Building new items ----------

// Fields every new item starts with, however it was added.
const newItemDefaults = () => ({
  mood: [],
  status: 'not started',
  recommendedBy: [],
  watchingWith: [],
  lastWatched: null,
  watchDates: [],
  currentSeason: 1,
  currentEpisode: 1,
  viewingProgress: {},
  dateAdded: new Date().toISOString(),
});

// Turns OMDB details into a watchlist item. `extra` overrides any of the defaults.
export const buildItemFromOMDB = ({ episodeData, ...details }, extra = {}) => {
  const isTv = details.type === 'tv';
  return {
    ...details,
    ...newItemDefaults(),
    ...(isTv ? episodeFields(details.totalSeasons, episodeData) : { totalEpisodes: null }),
    episodeLength: isTv ? details.runtime : null,
    runtime: isTv ? null : details.runtime,
    omdbUpdatedAt: new Date().toISOString(),
    ...extra,
  };
};

// Turns the "Add Manual" form into a watchlist item.
export const buildManualItem = (form) => ({
  ...newItemDefaults(),
  ...form,
  poster: placeholderPoster(form.title),
  imdbId: null,
});

// The parts of an item the edit window can change.
export const toEditForm = (item) => ({
  status: item.status,
  recommendedBy: item.recommendedBy || [],
  mood: item.mood || [],
  watchingWith: item.watchingWith || [],
  currentSeason: item.currentSeason || 1,
  currentEpisode: item.currentEpisode || 1,
  viewingProgress: item.viewingProgress || {},
});

// ---------- Filtering ----------

const hasAll = (itemValues, selected) => selected.every((v) => (itemValues || []).includes(v));
const hasAny = (itemValues, selected) => (itemValues || []).some((v) => selected.includes(v));

export const filterItems = (items, searchTerm, filters) => {
  const search = searchTerm.toLowerCase();
  const maxLength = parseInt(filters.maxLength);

  return items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search);
    // Genre, recommender and watching-with: the item must have ALL the selected values.
    const matchesGenre = hasAll(item.genre, filters.genre);
    const matchesRecommender = hasAll(item.recommendedBy, filters.recommendedBy);
    // "Watching alone" matches items whose Watching With is blank.
    const matchesWatchingWith = filters.watchingWith.includes(WATCHING_ALONE)
      ? (item.watchingWith || []).length === 0
      : hasAll(item.watchingWith, filters.watchingWith);
    // Mood: the item must have AT LEAST ONE of the selected moods.
    const matchesMood = filters.mood.length === 0 || hasAny(item.mood, filters.mood);
    const matchesStatus = !filters.status || item.status === filters.status;
    const matchesType = !filters.type || item.type === filters.type;
    const matchesLength =
      !filters.maxLength ||
      (item.runtime && item.runtime <= maxLength) ||
      (item.episodeLength && item.episodeLength <= maxLength);

    return (
      matchesSearch && matchesGenre && matchesMood && matchesStatus &&
      matchesRecommender && matchesWatchingWith && matchesType && matchesLength
    );
  });
};

// Every distinct value used in a list field (e.g. all genres on the watchlist), sorted A-Z.
export const getUniqueValues = (items, field) => {
  const values = new Set();
  items.forEach((item) => {
    const itemValues = item[field];
    if (Array.isArray(itemValues)) itemValues.forEach((value) => values.add(value));
  });
  return Array.from(values).sort();
};

// ---------- Sorting ----------

// When something last aired. Movies use their release year. Shows use the real date of the
// newest episode when OMDB gave us one; otherwise it's estimated at one year per 20 episodes.
const estimateLastAired = (item) => {
  if (item.type === 'movie') return new Date(item.releaseYear, 0, 1);
  if (item.lastAired?.date) return new Date(item.lastAired.date);
  const yearsRunning = Math.ceil((item.totalEpisodes || EPISODES_PER_SEASON) / EPISODES_PER_SEASON);
  return new Date(item.releaseYear + yearsRunning, 0, 1);
};

const sortProgress = (item) => getExactProgress(item) ?? (item.status === 'completed' ? 100 : 0);

const COMPARERS = {
  alphabetical: (a, b) => a.title.localeCompare(b.title),

  'recently-added': (a, b) =>
    new Date(b.dateAdded || b.recommendationDate || 0) - new Date(a.dateAdded || a.recommendationDate || 0),

  'last-watched': (a, b) => {
    // "Not started" items go to the bottom.
    if (a.status === 'not started' && b.status !== 'not started') return 1;
    if (b.status === 'not started' && a.status !== 'not started') return -1;
    return new Date(b.lastWatched || 0) - new Date(a.lastWatched || 0);
  },

  'last-aired': (a, b) => estimateLastAired(b) - estimateLastAired(a),

  rating: (a, b) => (b.imdbRating || 0) - (a.imdbRating || 0),

  progress: (a, b) => sortProgress(b) - sortProgress(a),
};

export const sortItems = (items, sortBy) => {
  const compare = COMPARERS[sortBy];
  return compare ? [...items].sort(compare) : [...items];
};
