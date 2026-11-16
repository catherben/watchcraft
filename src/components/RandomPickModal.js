import React from 'react';
import { Play, Users, Star, Clock, Tag, Shuffle } from 'lucide-react';
import { formatLength, getProgressPercent, getStatusStyle } from '../utils/watchlist';
import Modal from './Modal';
import { ProgressBar } from './ProgressBar';

const RandomPickModal = ({ item, onPickAnother, onClose }) => {
  const progress = getProgressPercent(item);
  const genres = item.genre || [];
  const moods = item.mood || [];
  const recommenders = item.recommendedBy || [];

  return (
    <Modal title="🎲 Random Pick!" onClose={onClose} maxWidth="28rem">
      <div className="flex gap-3 mb-3">
        <img
          src={item.poster}
          alt={item.title}
          className="w-20 h-28 object-cover rounded-lg shadow-md flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold mb-2 line-clamp-2">{item.title}</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 rounded-full text-xs font-medium" style={getStatusStyle(item.status)}>
                {item.status.toUpperCase()}
              </span>
              <span className="capitalize">{item.type}</span>
            </div>

            {genres.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{genres.slice(0, 3).join(', ')}</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span>{formatLength(item)}</span>
            </div>

            {item.imdbRating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                <span>{item.imdbRating}/10</span>
              </div>
            )}

            {item.type === 'tv' && (
              <div className="text-sm">
                Progress: S{item.currentSeason || 1}E{item.currentEpisode || 1}
                {progress !== null && (
                  <>
                    <span> ({progress}%)</span>
                    <div className="mt-1">
                      <ProgressBar percent={progress} trackColor="#e5e7eb" height={8} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {recommenders.length > 0 && (
        <div className="mb-3 text-sm text-gray-600">
          <Users className="h-3 w-3 inline mr-1" />
          Recommended by {recommenders.slice(0, 2).join(', ')}
        </div>
      )}

      {item.plot && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 line-clamp-3">{item.plot}</p>
        </div>
      )}

      {moods.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {moods.slice(0, 4).map((mood) => (
            <span key={mood} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              {mood}
            </span>
          ))}
          {moods.length > 4 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">+{moods.length - 4}</span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onPickAnother}
          className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-md hover:bg-purple-700 flex items-center justify-center gap-2 text-sm"
        >
          <Shuffle className="h-4 w-4" />
          Pick Another
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700 flex items-center justify-center gap-2 text-sm"
        >
          <Play className="h-4 w-4" />
          Let's Watch This!
        </button>
      </div>
    </Modal>
  );
};

export default RandomPickModal;
