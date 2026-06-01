import React from 'react';

/**
 * ChatBubble — A single message in the mentor chat.
 * User messages: right-aligned, light blue.
 * Mentor messages: left-aligned, white with label, thumbs-down feedback icon.
 */
export default function ChatBubble({ role, content, timestamp, onFeedback }) {
  const isUser = role === 'user';

  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-stone-900 dark:bg-stone-700 text-white'
        }`}
      >
        {isUser ? 'Y' : 'AI'}
      </div>

      <div className={`max-w-[75%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Label (mentor only) */}
        {!isUser && (
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide ml-1">
            AI Mentor
          </p>
        )}

        {/* Bubble */}
        <div
          className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed group ${
            isUser
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 rounded-br-sm'
              : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-100 dark:border-stone-700 rounded-bl-sm'
          }`}
        >
          {content}

          {/* Thumbs down (mentor messages only) */}
          {!isUser && onFeedback && (
            <button
              onClick={onFeedback}
              title="This response wasn't helpful"
              className="absolute bottom-1.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="material-symbols-outlined text-stone-300 hover:text-red-400 text-[14px] transition-colors">
                thumb_down
              </span>
            </button>
          )}
        </div>

        {/* Timestamp */}
        {time && (
          <p className={`text-[10px] text-stone-400 ${isUser ? 'text-right mr-1' : 'ml-1'}`}>
            {time}
          </p>
        )}
      </div>
    </div>
  );
}
