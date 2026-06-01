import React from 'react';

/**
 * TypingIndicator — Three pulsing dots shown while the AI mentor is generating a response.
 * Appears for ~1.5 seconds before the actual reply arrives.
 */
export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      {/* AI avatar */}
      <div className="w-7 h-7 rounded-full bg-stone-900 dark:bg-stone-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
        AI
      </div>
      <div className="bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-stone-400 dark:bg-stone-500 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-stone-400 dark:bg-stone-500 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-stone-400 dark:bg-stone-500 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
