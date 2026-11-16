// Everything that is "just a setting" lives here, so there is one place to change it.

export const OMDB_API_KEY = 'cca39492';
export const RECOMMEND_URL = 'https://watchcraft-phi.vercel.app/recommend';

// Fallback for shows without real episode numbers from OMDB (e.g. added manually):
// the app assumes 20 episodes per season.
export const EPISODES_PER_SEASON = 20;
export const DEFAULT_EPISODE_LENGTH = 22;

// "Refresh OMDB" skips shows that were reloaded from OMDB less than this many hours ago.
export const REFRESH_AFTER_HOURS = 24;
// The free OMDB key allows this many requests per day.
export const OMDB_DAILY_LIMIT = 1000;

// One entry per status: the stored value, the label shown in dropdowns, and the badge colours.
export const STATUSES = [
  { value: 'not started', label: 'Not Started', backgroundColor: '#64748b', borderColor: '#475569' },
  { value: 'currently watching', label: 'Currently Watching', backgroundColor: '#22c55e', borderColor: '#16a34a' },
  { value: 'currently rewatching', label: 'Currently Rewatching', backgroundColor: '#14b8a6', borderColor: '#0f766e' },
  { value: 'on hold', label: 'On Hold', backgroundColor: '#eab308', borderColor: '#ca8a04' },
  { value: 'completed', label: 'Completed', backgroundColor: '#1f2937', borderColor: '#111827' },
  { value: 'to rewatch', label: 'To Rewatch', backgroundColor: '#f97316', borderColor: '#ea580c' },
];

// Saving an item with one of these statuses updates its "last watched" date.
export const WATCHED_STATUSES = ['currently watching', 'currently rewatching', 'completed'];

// On the recommend page these show "Already watching/watched" instead of "Already on watchlist".
export const STARTED_STATUSES = ['currently watching', 'currently rewatching', 'to rewatch', 'on hold', 'completed'];

export const SORT_OPTIONS = [
  { value: 'alphabetical', label: 'A-Z' },
  { value: 'recently-added', label: 'Recently Added' },
  { value: 'last-watched', label: 'Last Watched' },
  { value: 'last-aired', label: 'Last Aired' },
  { value: 'rating', label: 'Rating' },
  { value: 'progress', label: 'Progress' },
];

export const MOOD_OPTIONS = [
  'Happy', 'Sad', 'Exciting', 'Relaxing', 'Funny', 'Serious',
  'Romantic', 'Thrilling', 'Mysterious', 'Dark', 'Lighthearted',
  'Thought-provoking', 'Inspiring', 'Suspenseful', 'Nostalgic',
  'Adventurous', 'Emotional', 'Intense', 'Chill', 'Epic',
];

export const GENRE_OPTIONS = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Science Fiction',
  'Thriller', 'Western', 'Biography', 'Family', 'History', 'Music',
  'Musical', 'Sport', 'War', 'Superhero', 'Noir', 'Satire',
];

export const RECOMMENDER_OPTIONS = [
  'Dad', 'Mom', 'Christine', 'Rachel', 'Déa', 'Emily', 'Mal',
  'Aunt Melanie', 'Chris', 'SocialMedia', 'Maria',
];

// The "Watching With" filter choice that matches items with nobody listed under Watching With.
export const WATCHING_ALONE = 'Watching alone';

export const EMPTY_FILTERS = {
  genre: [],
  mood: [],
  status: '',
  recommendedBy: [],
  watchingWith: [],
  maxLength: '',
  type: '',
};
