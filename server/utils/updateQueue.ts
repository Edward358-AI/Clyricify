export const lyricUpdateQueue = {
  queue: [] as { id: string, name: string, artist: string }[],
  isProcessing: false,
  
  push(song: { id: string, name: string, artist: string }) {
    // Only local legacy DB items shouldn't be background updated
    if (song.id.startsWith('local_')) return;
    
    // Don't add if already in queue
    if (!this.queue.some(s => s.id === song.id)) {
      this.queue.push(song);
      this.process();
    }
  },
  
  async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    while(this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          console.log(`[Background Queue] Processing update for ${task.id}...`);
          // Use internal fetch to trigger a force refresh without re-queueing
          await $fetch('/api/lyrics', {
            params: {
              id: task.id,
              name: task.name,
              artist: task.artist,
              forceRefresh: 'true',
              isBackground: 'true'
            }
          });
        } catch (e) {
          console.error(`[Background Queue] Failed for ${task.id}:`, e);
        }
        // 2 second delay between api calls to respect rate limits
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    this.isProcessing = false;
  }
};
