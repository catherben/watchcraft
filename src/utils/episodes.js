import { EPISODES_PER_SEASON, REFRESH_AFTER_HOURS } from '../constants';

// Everything to do with episode counts.
//
// Shows that have been loaded from OMDB store real numbers:
//   seasonEpisodeCounts: [10, 10, 8]   -> episodes aired in season 1, 2, 3
//   totalEpisodes:       28
//   lastAired:           { season: 3, episode: 8, date: '2026-01-12' }
//
// Shows without that (added manually, or not reloaded yet) fall back to the old
// estimate of 20 episodes per season.

const sum = (numbers) => numbers.reduce((total, n) => total + n, 0);

// Turns OMDB's episode lists into the numbers above.
// `seasons` is a list (one entry per season) of lists of { episode, released } where
// released is a Date or null. Returns null if OMDB had no episodes at all.
export const summarizeEpisodes = (seasons, today = new Date()) => {
  const all = seasons
    .flatMap((episodes, index) => episodes.map((ep) => ({ ...ep, season: index + 1 })))
    .sort((a, b) => a.season - b.season || a.episode - b.episode);
  if (all.length === 0) return null;

  // Find the newest episode that has actually aired. Everything listed after it is an
  // upcoming episode and isn't counted yet. (If OMDB has no usable dates, count everything.)
  let lastAiredIndex = -1;
  all.forEach((ep, index) => {
    if (ep.released && ep.released <= today) lastAiredIndex = index;
  });
  const aired = lastAiredIndex === -1 ? all : all.slice(0, lastAiredIndex + 1);
  const last = lastAiredIndex === -1 ? null : all[lastAiredIndex];

  // Use the highest episode number in each season, so a gap in OMDB's list doesn't shrink the count.
  const seasonEpisodeCounts = [];
  aired.forEach((ep) => {
    while (seasonEpisodeCounts.length < ep.season) seasonEpisodeCounts.push(0);
    seasonEpisodeCounts[ep.season - 1] = Math.max(seasonEpisodeCounts[ep.season - 1], ep.episode);
  });

  return {
    seasonEpisodeCounts,
    totalEpisodes: sum(seasonEpisodeCounts),
    lastAired: last && {
      season: last.season,
      episode: last.episode,
      date: last.released.toISOString().slice(0, 10),
    },
  };
};

// The episode fields to save on a show. Uses the real numbers when OMDB had them,
// otherwise the 20-per-season estimate.
export const episodeFields = (totalSeasons, episodeData) =>
  episodeData || { totalEpisodes: (totalSeasons || 1) * EPISODES_PER_SEASON };

export const hasRealEpisodeData = (item) =>
  Array.isArray(item.seasonEpisodeCounts) && item.seasonEpisodeCounts.length > 0;

// How many episodes you've seen in total if you're on this season and episode.
export const countEpisodesWatched = (item, season, episode) => {
  if (!hasRealEpisodeData(item)) return (season - 1) * EPISODES_PER_SEASON + episode;
  return sum(item.seasonEpisodeCounts.slice(0, season - 1)) + episode;
};

// Number of episodes in one season, or null if we don't know.
export const getEpisodesInSeason = (item, season) =>
  hasRealEpisodeData(item) ? item.seasonEpisodeCounts[season - 1] ?? null : null;

// The most recent episode: { season, episode, date }. date is null when it's only an estimate.
export const getLastAired = (item) => {
  if (item.lastAired) return item.lastAired;
  if (hasRealEpisodeData(item) || !item.totalEpisodes) return null;
  return {
    season: Math.ceil(item.totalEpisodes / EPISODES_PER_SEASON),
    episode: item.totalEpisodes % EPISODES_PER_SEASON || EPISODES_PER_SEASON,
    date: null,
  };
};

// Can this item be reloaded from OMDB at all? (Manually added items have no IMDb id.)
export const canReload = (item) => Boolean(item.imdbId);

// Should "Refresh OMDB" reload this one? Yes if it has never had real episode data,
// or if it's still running and hasn't been checked recently. Finished shows are left alone.
export const needsReload = (item, now = new Date()) => {
  if (item.type !== 'tv' || !canReload(item)) return false;
  if (!hasRealEpisodeData(item)) return true;
  if (item.seriesEnded) return false;
  if (!item.omdbUpdatedAt) return true;
  const hoursSinceUpdate = (now - new Date(item.omdbUpdatedAt)) / (1000 * 60 * 60);
  return hoursSinceUpdate >= REFRESH_AFTER_HOURS;
};

// Roughly how many OMDB requests reloading these items will use (one per show plus one per season).
export const estimateRequests = (items) => sum(items.map((item) => 1 + (item.totalSeasons || 1)));

const formatDate = (value, options = {}) =>
  new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', ...options });

// One-line summary for the edit window, e.g. "3 seasons · 28 episodes · last aired S3E8 (Jan 12, 2026)".
export const describeEpisodeData = (item) => {
  if (item.type !== 'tv') return item.imdbRating > 0 ? `IMDb rating ${item.imdbRating}/10` : 'No IMDb rating yet';
  if (!hasRealEpisodeData(item)) return `Episode count is an estimate (${EPISODES_PER_SEASON} per season)`;

  const seasons = item.seasonEpisodeCounts.length;
  const parts = [
    `${seasons} season${seasons === 1 ? '' : 's'}`,
    `${item.totalEpisodes} episode${item.totalEpisodes === 1 ? '' : 's'}`,
  ];
  if (item.lastAired) {
    const { season, episode, date } = item.lastAired;
    // The air date has no time of day, so read it as UTC to avoid it slipping back a day.
    parts.push(`last aired S${season}E${episode} (${formatDate(date, { timeZone: 'UTC' })})`);
  }
  if (item.seriesEnded) parts.push('ended');
  return parts.join(' · ');
};

export const describeLastUpdate = (item) =>
  item.omdbUpdatedAt ? `OMDB data loaded ${formatDate(item.omdbUpdatedAt)}` : 'OMDB data not refreshed yet';
