import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * ChatBox Component
 * Displays chat messages and allows sending new ones.
 */
export default function ChatBox({ messages, onSend }) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle sending a message
  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    onSend(newMessage.trim());
    setNewMessage('');
  };

  return (
    <div style={containerStyle}>
      {/* Messages List */}
      <div style={messagesContainerStyle}>
        {messages.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>No messages yet</p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              style={{
                ...messageStyle,
                alignSelf: msg.isOwn ? 'flex-end' : 'flex-start',
                backgroundColor: msg.isOwn ? '#007bff' : '#e5e5ea',
                color: msg.isOwn ? '#fff' : '#000',
              }}
            >
              <div style={{ fontSize: '0.8em', opacity: 0.7 }}>
                {msg.sender}
              </div>
              <div>{msg.content}</div>
              <div style={{ fontSize: '0.7em', opacity: 0.6, textAlign: 'right' }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} style={inputContainerStyle}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle}>
          Send
        </button>
      </form>
    </div>
  );
}

// Prop validation
ChatBox.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      sender: PropTypes.string.isRequired,
      content: PropTypes.string.isRequired,
      timestamp: PropTypes.string.isRequired,
      isOwn: PropTypes.bool, // true if the message is from the current user
    })
  ).isRequired,
  onSend: PropTypes.func.isRequired, // Called with message text when sending
};

// Styles
const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  border: '1px solid #ccc',
  borderRadius: '8px',
  overflow: 'hidden',
};

const messagesContainerStyle = {
  flex: 1,
  padding: '10px',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  backgroundColor: '#f9f9f9',
};

const messageStyle = {
  maxWidth: '70%',
  padding: '8px',
  borderRadius: '8px',
  marginBottom: '8px',
  wordBreak: 'break-word',
};

const inputContainerStyle = {
  display: 'flex',
  borderTop: '1px solid #ccc',
};

const inputStyle = {
  flex: 1,
  padding: '10px',
  border: 'none',
  outline: 'none',
  fontSize: '14px',
};

const buttonStyle = {
  padding: '10px 15px',
  border: 'none',
  backgroundColor: '#007bff',
  color: '#fff',
  cursor: 'pointer',
};

