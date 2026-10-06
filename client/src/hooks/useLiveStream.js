import { useState, useEffect, useRef } from 'react';

// Resolve API URL: check explicit env vars (VITE_API_URL or VITE_API_BASE_URL),
// or connect to Render backend if running on Vercel/external domain, or relative for same-origin
const configuredUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

function resolveApiBaseUrl() {
  if (configuredUrl && configuredUrl !== 'http://localhost:5000') {
    return configuredUrl;
  }
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app')) {
    return 'https://veridoc-y2st.onrender.com';
  }
  return import.meta.env.PROD ? '' : 'http://localhost:5000';
}

const API_URL = resolveApiBaseUrl();

export function useLiveStream() {
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef(null);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('veridoc_token');
    if (!token) return;

    let isMounted = true;

    function connectSSE() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const streamUrl = `${API_URL}/api/live/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
        console.log('[SSE] Connected to live evidence stream');
      };

      es.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'unread_count') {
            setUnreadCount(data.count || (data.payload && data.payload.count) || 0);
          } else if (data.type === 'new_update') {
            window.dispatchEvent(new CustomEvent('veridoc-new-update', { detail: data.payload }));
          } else if (data.type === 'notification') {
            setUnreadCount((c) => c + 1);
            window.dispatchEvent(new CustomEvent('veridoc-new-notification', { detail: data.payload }));
          }
        } catch (err) {
          console.warn('[SSE] Parse error:', err);
        }
      };

      es.onerror = () => {
        if (!isMounted) return;
        setIsConnected(false);
        es.close();

        // Reconnect attempt after 5 seconds
        setTimeout(() => {
          if (isMounted) connectSSE();
        }, 5000);
      };
    }

    connectSSE();

    // Fallback polling every 60 seconds if SSE is down
    pollTimerRef.current = setInterval(async () => {
      if (!eventSourceRef.current || eventSourceRef.current.readyState !== EventSource.OPEN) {
        try {
          const res = await fetch(`${API_URL}/api/evidence/notifications`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (isMounted && typeof data.unreadCount === 'number') {
              setUnreadCount(data.unreadCount);
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }, 60000);

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  return { isConnected, unreadCount, setUnreadCount };
}

export default useLiveStream;
