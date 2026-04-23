import { lyricEventBus } from '../utils/eventBus'

export default defineEventHandler((event) => {
  // Set headers for Server-Sent Events
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  // Create a stream
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  // Function to send data to the client
  const sendEvent = (eventName: string, data: any) => {
    writer.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  // Initial connection message
  sendEvent('connected', { status: 'ok' })

  // Listener for lyrics updates
  const onLyricsUpdated = (data: any) => {
    sendEvent('lyrics_updated', data)
  }

  // Subscribe to the event bus
  lyricEventBus.on('updated', onLyricsUpdated)

  // Cleanup when client disconnects
  event.node.req.on('close', () => {
    lyricEventBus.off('updated', onLyricsUpdated)
    writer.close()
  })

  // Keep the connection alive
  const keepAlive = setInterval(() => {
    writer.write(': keepalive\n\n')
  }, 15000)

  event.node.req.on('close', () => {
    clearInterval(keepAlive)
  })

  return readable
})
