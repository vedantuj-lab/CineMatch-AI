import React, { useState } from 'react';
import { Star, StarHalf, X } from 'lucide-react';

interface RatingStarsProps {
  value: number | null | undefined;
  onChange?: (rating: number) => void;
  onClear?: () => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  value,
  onChange,
  onClear,
  readOnly = false,
  size = 'md',
  showNumber = true,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const starSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base font-semibold',
  };

  const currentValue = hoverValue !== null ? hoverValue : (value || 0);

  const handleClick = (starIdx: number, isHalf: boolean) => {
    if (readOnly || !onChange) return;
    const rating = isHalf ? starIdx - 0.5 : starIdx;
    onChange(rating);
  };

  return (
    <div className="inline-flex items-center gap-1.5 select-none" onMouseLeave={() => !readOnly && setHoverValue(null)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFull = currentValue >= star;
          const isHalf = !isFull && currentValue >= star - 0.5;

          return (
            <div
              key={star}
              className={`relative ${readOnly ? '' : 'cursor-pointer hover:scale-110 transition-transform'}`}
            >
              {/* Left half clickable overlay for interactive mode */}
              {!readOnly && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1/2 z-10"
                  onMouseEnter={() => setHoverValue(star - 0.5)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick(star, true);
                  }}
                  title={`${star - 0.5} stars`}
                />
              )}
              {/* Right half clickable overlay for interactive mode */}
              {!readOnly && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-1/2 z-10"
                  onMouseEnter={() => setHoverValue(star)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick(star, false);
                  }}
                  title={`${star} stars`}
                />
              )}

              {isFull ? (
                <Star className={`${starSizes[size]} text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]`} />
              ) : isHalf ? (
                <StarHalf className={`${starSizes[size]} text-amber-400 fill-amber-400`} />
              ) : (
                <Star className={`${starSizes[size]} text-zinc-600 hover:text-zinc-500`} />
              )}
            </div>
          );
        })}
      </div>

      {showNumber && value !== undefined && value !== null && value > 0 && (
        <span className={`${textSizes[size]} text-amber-300 font-mono font-medium pl-0.5`}>
          {value.toFixed(1)}
        </span>
      )}

      {!readOnly && onClear && value && value > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="ml-1 p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
          title="Remove rating"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
