import React, { useState } from 'react';

/**
 * StarRating — 5 interactive stars with hover and click behavior.
 * - Hover: fills stars up to hovered position in amber
 * - Click: locks rating; clicking same star resets to 0
 */
export default function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Overall impression rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            id={`star-${star}`}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(value === star ? 0 : star)}
            className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
          >
            <span
              className={`material-symbols-outlined text-[28px] transition-colors duration-100 ${
                filled ? 'text-amber-400' : 'text-stone-200 hover:text-amber-200'
              }`}
              style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}` }}
            >
              star
            </span>
          </button>
        );
      })}
    </div>
  );
}
