import React from 'react';

const PROMPTS = [
  "We're stuck on our architecture approach",
  "Our solution feels too complex",
  'Help us prioritise features',
  "We're not sure about our tech choices",
];

/**
 * StarterPrompts — 4 clickable suggestion chips shown only when 0 messages in history.
 * Clicking a chip puts its text in the input and submits it immediately.
 */
export default function StarterPrompts({ onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {PROMPTS.map((prompt, idx) => (
        <button
          key={idx}
          id={`starter-prompt-${idx}`}
          onClick={() => onSelect(prompt)}
          className="px-4 py-2.5 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-700 dark:text-stone-300 font-medium hover:border-stone-900 dark:hover:border-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700 transition-all duration-200 hover:shadow-sm active:scale-95"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
