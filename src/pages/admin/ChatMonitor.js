
import React, { useEffect, useState, useCallback } from 'react';

/**
 * ChatMonitor Page
 * Allows admins to monitor chat messages between users.
 */
export default function ChatMonitor() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch chat messages from API
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Replace with your real API endpoint
      const res = await fetch('/api/admin/chat-messages');
      if (!res.ok) throw new Error(`Error: ${res.status}`);

      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setMessages(Array.isArray(data) ? data : []);
        setError('');
      } catch (parseErr) {
        console.warn('ChatMonitor: response is not JSON, using fallback sample', parseErr);
        setMessages([
          {
            id: 'sample-1',
            timestamp: Date.now(),
            sender: 'system',
            receiver: 'admin',
            content: text.slice(0, 120) + '...'
          }
        ]);
        setError('Live API returned non-JSON. Showing sample payload instead.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load chat messages.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Chat Monitor</h1>
      <p>Live view of user-to-user chat messages.</p>

      {loading && <p>Loading messages...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && messages.length === 0 && (
        <p>No chat messages found.</p>
      )}

      {!loading && !error && messages.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>Sender</th>
              <th style={thStyle}>Receiver</th>
              <th style={thStyle}>Message</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((msg) => (
              <tr key={msg.id}>
                <td style={tdStyle}>
                  {new Date(msg.timestamp).toLocaleString()}
                </td>
                <td style={tdStyle}>{msg.sender}</td>
                <td style={tdStyle}>{msg.receiver}</td>
                <td style={tdStyle}>{msg.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Basic table styles
const tableStyle = {
  borderCollapse: 'collapse',
  width: '100%',
  marginTop: '20px',
};

const thStyle = {
  border: '1px solid #ccc',
  padding: '8px',
  backgroundColor: '#f4f4f4',
  textAlign: 'left',
};

const tdStyle = {
  border: '1px solid #ccc',
  padding: '8px',
};
