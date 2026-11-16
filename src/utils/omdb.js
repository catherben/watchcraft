import { OMDB_API_KEY, DEFAULT_EPISODE_LENGTH } from '../constants';
import { episodeFields, summarizeEpisodes } from './episodes';
import { placeholderPoster } from './watchlist';

const OMDB_URL = 'https://www.omdbapi.com/';

// What OMDB says when the free key's daily allowance (1,000 requests) is used up.
const LIMIT_MESSAGE = 'Request limit reached!';
export const isLimitError = (error) => error?.message === LIMIT_MESSAGE;

// Calls OMDB. Throws an error (with OMDB's own message) if OMDB says no.
const omdbFetch = async (params) => {
  const query = new URLSearchParams({ ...params, apikey: OMDB_API_KEY });
  const response = await fetch(`${OMDB_URL}?${query}`);
  const data = await response.json();
  if (data.Response !== 'True') throw new Error(data.Error || 'OMDB request failed');
  return data;
};

// Search by title. Always returns a list (empty if nothing was found or the request failed).
export const searchOMDB = async (title) => {
  try {
    const data = await omdbFetch({ s: title });
    return data.Search || [];
  } catch (error) {
    if (error.message !== 'Movie not found!') console.error('Error searching OMDB:', error);
    return [];
  }
};

const parseDate = (text) => {
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Real episode numbers for a show: asks OMDB for each season's episode list.
// Returns null if OMDB has no episode lists for it.
const fetchEpisodeData = async (imdbID, totalSeasons) => {
  const seasonNumbers = Array.from({ length: totalSeasons }, (_, index) => index + 1);

  const seasons = await Promise.all(
    seasonNumbers.map(async (season) => {
      try {
        const data = await omdbFetch({ i: imdbID, Season: season });
        return (data.Episodes || [])
          .map((ep) => ({ episode: parseInt(ep.Episode), released: parseDate(ep.Released) }))
          .filter((ep) => ep.episode > 0);
      } catch (error) {
        // Out of requests: give up, so we don't save half a show. A missing season is fine.
        if (isLimitError(error)) throw error;
        return [];
      }
    })
  );

  return summarizeEpisodes(seasons);
};

// OMDB's answer for one title, converted to WatchCraft's field names.
const toDetails = (data) => {
  const isMovie = data.Type === 'movie';
  return {
    title: data.Title,
    type: isMovie ? 'movie' : 'tv',
    genre: data.Genre ? data.Genre.split(', ') : [],
    runtime: parseInt(data.Runtime) || (isMovie ? 0 : DEFAULT_EPISODE_LENGTH),
    releaseYear: parseInt(data.Year) || new Date().getFullYear(),
    poster: data.Poster !== 'N/A' ? data.Poster : placeholderPoster(data.Title),
    imdbId: data.imdbID,
    plot: data.Plot,
    director: data.Director,
    actors: data.Actors,
    imdbRating: parseFloat(data.imdbRating) || 0,
    totalSeasons: isMovie ? null : parseInt(data.totalSeasons) || 1,
    // OMDB writes a finished show's years as "2011–2019" and a running one as "2022–".
    seriesEnded: isMovie ? null : /\d{4}\D+\d{4}/.test(data.Year || ''),
  };
};

// Full details for adding a new title, including real episode numbers for shows
// (as `episodeData`). Returns null on failure.
export const getOMDBDetails = async (imdbID) => {
  try {
    const details = toDetails(await omdbFetch({ i: imdbID }));
    const episodeData =
      details.type === 'tv' ? await fetchEpisodeData(imdbID, details.totalSeasons) : null;
    return { ...details, episodeData };
  } catch (error) {
    console.error('Error fetching OMDB details:', error);
    return null;
  }
};

// The fields to overwrite when reloading an existing item from OMDB: rating, poster,
// and for shows the season and episode numbers. Your own data (status, progress, moods,
// who recommended it...) is never touched. Throws if OMDB can't be reached.
export const getOMDBReload = async (imdbID) => {
  const data = await omdbFetch({ i: imdbID });
  const details = toDetails(data);

  const updates = {
    imdbRating: details.imdbRating,
    omdbUpdatedAt: new Date().toISOString(),
  };
  if (data.Poster !== 'N/A') updates.poster = data.Poster;

  if (details.type === 'tv') {
    const episodeData = await fetchEpisodeData(imdbID, details.totalSeasons);
    Object.assign(updates, {
      totalSeasons: details.totalSeasons,
      seriesEnded: details.seriesEnded,
      ...episodeFields(details.totalSeasons, episodeData),
    });
  }

  return updates;
};
