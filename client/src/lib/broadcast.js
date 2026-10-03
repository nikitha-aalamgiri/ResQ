/**
 * Cross-window real-time event bus
 * Ensures instant (0ms) state synchronization between Citizen and Responder windows
 * in addition to Supabase Realtime channels and background polling.
 */

let channel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('resq_floodwatch_events');
  }
} catch (err) {
  console.warn('BroadcastChannel not supported in this environment');
}

export function broadcastSOSEvent(eventData) {
  try {
    if (channel) {
      channel.postMessage({ ...eventData, timestamp: Date.now() });
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        'resq_event_trigger',
        JSON.stringify({ ...eventData, _t: Date.now() })
      );
    }
  } catch (err) {
    // Silent fail
  }
}

export function onSOSEvent(handler) {
  if (typeof window === 'undefined') return () => {};

  const handleBroadcast = (evt) => {
    if (evt && evt.data) {
      handler(evt.data);
    }
  };

  const handleStorage = (evt) => {
    if (evt.key === 'resq_event_trigger' && evt.newValue) {
      try {
        const parsed = JSON.parse(evt.newValue);
        handler(parsed);
      } catch (err) {
        // Silent fail
      }
    }
  };

  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }
  window.addEventListener('storage', handleStorage);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('storage', handleStorage);
  };
}
