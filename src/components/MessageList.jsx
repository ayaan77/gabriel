import { Icons } from './Icons';
import { MessageContent, ThinkingBlock } from './MessageContent';
import { CouncilPanel } from './CouncilPanel';

/**
 * MessageList — renders the conversation message feed.
 *
 * Handles:
 * - User and assistant message bubbles
 * - Thinking blocks (chain-of-thought reasoning)
 * - Council results panel (when council mode is active)
 * - Per-message action buttons (bookmark, copy)
 * - Typing indicator while loading
 *
 * @param {object} props
 * @param {Array<object>} props.messages - Filtered list of messages to display
 * @param {boolean} props.loading - Whether AI is currently generating a response
 * @param {string|number|null} props.copiedMsgId - ID of the message that was recently copied
 * @param {Function} props.copyMessage - Copies a message to clipboard
 * @param {Function} props.toggleBookmark - Toggles bookmark state on a message
 * @param {object|null} props.councilResults - Council deliberation results object
 */
export function MessageList({
    messages,
    loading,
    copiedMsgId,
    copyMessage,
    toggleBookmark,
    councilResults,
}) {
    return (
        <>
            {messages.map((msg, i) => (
                <div key={msg.id || i} className={`message ${msg.role}`}>
                    {msg.role === 'assistant' && (
                        <div className="message-avatar">
                            <Icons.Wand />
                        </div>
                    )}

                    <div className="message-bubble">
                        {msg.thinking && <ThinkingBlock content={msg.thinking} />}

                        <MessageContent text={msg.content} />

                        {msg.isCouncilResult && councilResults && (
                            <CouncilPanel results={councilResults} onClose={() => { }} />
                        )}

                        <div className="msg-actions">
                            <button
                                className="msg-action-btn"
                                onClick={() => toggleBookmark(msg.id)}
                                title={msg.bookmarked ? 'Unbookmark' : 'Bookmark'}
                            >
                                <Icons.Star filled={msg.bookmarked} />
                            </button>
                            <button
                                className="msg-action-btn"
                                onClick={() => copyMessage(msg.content, i)}
                                title="Copy"
                            >
                                {copiedMsgId === i ? <Icons.Check /> : <Icons.Copy />}
                            </button>
                        </div>
                    </div>

                    {msg.role === 'user' && (
                        <div className="message-avatar" style={{ background: 'var(--text-primary)', border: 'none' }}>
                            <Icons.User />
                        </div>
                    )}
                </div>
            ))}

            {loading && (
                <div className="message assistant">
                    <div className="message-avatar"><Icons.Wand /></div>
                    <div className="message-bubble" style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
