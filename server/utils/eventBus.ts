import { EventEmitter } from 'events'

// Global event bus for server-side events
export const lyricEventBus = new EventEmitter()

// Increase max listeners if needed
lyricEventBus.setMaxListeners(100)
