import React from 'react';
import { Users, Star, Clock, Tag, Trash2, Edit3 } from 'lucide-react';
import { getLastAired } from '../utils/episodes';
import { formatLength, getPartnerProgressPercent, getProgressPercent, getStatusStyle } from '../utils/watchlist';
import { ProgressBar, ProgressRow, YOUR_BAR_COLOR, PARTNER_BAR_COLOR } from './ProgressBar';

// One show/movie tile on the main page. viewMode is 'grid' (full details) or 'compact'.
const WatchlistCard = ({ item, viewMode, onEdit, onDelete }) => {
  const isCompact = viewMode === 'compact';
  const progress = getProgressPercent(item);
  const progressLabel = progress !== null && <span>&nbsp;&nbsp;{progress}%</span>;
  const lastAired = getLastAired(item);
  const partnerProgress = Object.entries(item.viewingProgress || {});
  const moods = item.mood || [];
  const recommenders = item.recommendedBy || [];

  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'fit-content',
        minHeight: isCompact ? '150px' : '300px',
      }}
    >
      <div className="relative flex-shrink-0">
        <img
          src={item.poster}
          alt={item.title}
          className={`w-full object-cover ${isCompact ? 'h-20 max-h-20' : 'h-32 max-h-32'}`}
          style={{ height: isCompact ? '80px' : '128px', maxHeight: isCompact ? '80px' : '128px' }}
        />

        <div className={`absolute ${isCompact ? 'top-0.5 right-0.5' : 'top-1 right-1'}`}>
          <span
            className={`rounded-full font-semibold border-2 shadow-lg ${
              isCompact ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'
            }`}
            style={getStatusStyle(item.status)}
          >
            {isCompact ? item.status.slice(0, 3).toUpperCase() : item.status.toUpperCase()}
          </span>
        </div>

        <div className={`absolute flex gap-1 ${isCompact ? 'top-0.5 left-0.5' : 'top-1 left-1'}`}>
          <button
            onClick={() => onEdit(item)}
            className={`bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors ${
              isCompact ? 'p-0.5' : 'p-1'
            }`}
            title="Edit item"
          >
            <Edit3 className={isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className={`bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors ${
              isCompact ? 'p-0.5' : 'p-1'
            }`}
            title="Delete item"
          >
            <Trash2 className={isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          </button>
        </div>

        {item.type === 'tv' && !isCompact && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2">
            <div className="text-xs space-y-1">
              {/* Progress bars: you in green, the people you're watching with in blue */}
              <ProgressRow
                label="You"
                season={item.currentSeason || 1}
                episode={item.currentEpisode || 1}
                percent={progress}
                color={YOUR_BAR_COLOR}
                bold
              />

              {partnerProgress.slice(0, 2).map(([partner, partnerAt]) => (
                <ProgressRow
                  key={partner}
                  label={partner}
                  season={partnerAt.season || 1}
                  episode={partnerAt.episode || 1}
                  percent={getPartnerProgressPercent(item, partnerAt)}
                  color={PARTNER_BAR_COLOR}
                />
              ))}

              {partnerProgress.length > 2 && (
                <div className="text-xs opacity-75">+{partnerProgress.length - 2} more</div>
              )}

              {lastAired && (
                <div className="flex justify-between text-xs opacity-75 border-t border-gray-600 pt-1 mt-1">
                  <span>Last Aired:</span>
                  <span>S{lastAired.season}E{lastAired.episode}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {item.type === 'tv' && isCompact && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white px-1 py-0.5">
            <div className="text-xs text-center">
              S{item.currentSeason || 1}E{item.currentEpisode || 1}
              {progressLabel}
            </div>
            {progress !== null && <ProgressBar percent={progress} color={YOUR_BAR_COLOR} height={3} />}
          </div>
        )}
      </div>

      <div className={`${isCompact ? 'p-1.5' : 'p-4'} flex-grow flex flex-col`}>
        <h3
          className={`font-bold line-clamp-2 ${
            isCompact ? 'text-xs leading-tight mb-1 flex-grow' : 'text-lg mb-2'
          }`}
        >
          {item.title}
        </h3>

        {isCompact ? (
          item.imdbRating > 0 && (
            <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mt-auto">
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              <span>{item.imdbRating}</span>
            </div>
          )
        ) : (
          <>
            <div className="space-y-1 text-sm text-gray-600 flex-grow">
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span className="truncate">{(item.genre || []).join(', ')}</span>
              </div>

              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatLength(item)}</span>
              </div>

              {item.imdbRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{item.imdbRating}/10</span>
                </div>
              )}

              {recommenders.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span className="truncate">Rec. by {recommenders.slice(0, 2).join(', ')}</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {moods.slice(0, 3).map((mood) => (
                <span key={mood} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                  {mood}
                </span>
              ))}
              {moods.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                  +{moods.length - 3}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WatchlistCard;
