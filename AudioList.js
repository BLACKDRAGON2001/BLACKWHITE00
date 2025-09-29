// Replace the entire AudioList.js content with this:

// Global variables to store loaded music data
let allMusic = [];
let ReducedMusic = [];

// Function to load JSON music data
async function loadMusicData() {
  try {
    console.log('Loading music data from JSON files...');
    
    // Load main music list
    const allMusicResponse = await fetch('music-data/allMusic.json');
    if (!allMusicResponse.ok) {
      throw new Error(`Failed to load allMusic.json: ${allMusicResponse.status}`);
    }
    allMusic = await allMusicResponse.json();
    
    // Load reduced music list
    const reducedMusicResponse = await fetch('music-data/ReducedMusic.json');
    if (!reducedMusicResponse.ok) {
      throw new Error(`Failed to load ReducedMusic.json: ${reducedMusicResponse.status}`);
    }
    ReducedMusic = await reducedMusicResponse.json();
    
    console.log(`Successfully loaded ${allMusic.length} songs in main list and ${ReducedMusic.length} songs in reduced list`);
    
    // Set global references
    window.allMusic = allMusic;
    window.ReducedMusic = ReducedMusic;
    
    return true;
  } catch (error) {
    console.error('Error loading music data:', error);
    
    // Fallback: create minimal music arrays to prevent crashes
    allMusic = [{
      name: "Default Song",
      artist: "Default Artist",
      src: "default",
      coverType: "Images"
    }];
    ReducedMusic = [...allMusic];
    
    window.allMusic = allMusic;
    window.ReducedMusic = ReducedMusic;
    
    return false;
  }
}

// Initialize music data when the script loads
loadMusicData();

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadMusicData, allMusic, ReducedMusic };
}