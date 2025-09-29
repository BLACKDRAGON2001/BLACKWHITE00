// Voice Control System for AudioPlayer
class VoiceControlSystem {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.buttons = {}; // Store buttons by ID
    this.originalButtonText = "START VOICE CONTROL";
    this.activeButtonText = "STOP VOICE CONTROL";
    this.permissionGranted = false; // Track permission status
    this.permissionChecked = false; // Track if we've checked permission
    this.mediaStream = null; // Store the media stream to properly close it
    
    // Voice commands mapping to player methods
    this.commands = {
      'play': () => this.executePlayerCommand('playMusic'),
      'pause': () => this.executePlayerCommand('pauseMusic'),
      'stop': () => this.executePlayerCommand('pauseMusic'),
      'next': () => this.executePlayerCommand('changeMusic', [1]),
      'previous': () => this.executePlayerCommand('changeMusic', [-1]),
      'skip': () => this.executePlayerCommand('changeMusic', [1]),
      'back': () => this.executePlayerCommand('changeMusic', [-1]),
      'dark mode': () => this.executePlayerCommand('toggleDarkMode'),
      'darkmode': () => this.executePlayerCommand('toggleDarkMode'),
      'light mode': () => this.executePlayerCommand('toggleDarkMode'),
      'lightmode': () => this.executePlayerCommand('toggleDarkMode'),
      'open list': () => this.executePlayerCommand('toggleMusicList'),
      'show list': () => this.executePlayerCommand('toggleMusicList'),
      'music list': () => this.executePlayerCommand('toggleMusicList'),
      'close list': () => this.executePlayerCommand('closeMusicList'),
      'hide list': () => this.executePlayerCommand('closeMusicList'),
      'shuffle': () => this.handleShuffleCommand(),
      'repeat': () => this.handleRepeatCommand(),
      'normal': () => this.handleNormalCommand(),
      'logout': () => this.handleLogout(),
      'log out': () => this.handleLogout(),
      'sign out': () => this.handleLogout()
    };
    
    this.injectButtonStyles()
    this.initialize();
  }

  async initialize() {
    // Check for Web Speech API support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Web Speech API not supported in this browser');
      this.disableVoiceControl();
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure speech recognition
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    // Set up event listeners
    this.recognition.onstart = () => {
      console.log('Voice recognition started');
      this.updateButtonState(true);
    };

    this.recognition.onend = () => {
      console.log('Voice recognition ended');
      if (this.isListening) {
        // Restart recognition if we're supposed to be listening
        setTimeout(() => {
          if (this.isListening) {
            this.startListening();
          }
        }, 100);
      } else {
        this.updateButtonState(false);
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('Voice recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        // These are common and not critical errors
        return;
      }
      if (event.error === 'not-allowed') {
        this.permissionGranted = false;
        alert('Microphone access denied. Please allow microphone access to use voice control.');
        this.stopListening();
      }
    };

    this.recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.toLowerCase().trim();
        console.log('Voice command received:', transcript);
        this.processCommand(transcript);
      }
    };

    // Check microphone permission once during initialization
    await this.checkMicrophonePermission();
    
    this.setupButtons();
  }

  injectButtonStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .PABox .PABoxButton {
        width: 100%;
        background-color: white;
        font-size: 10px;
        font-family: monospace;
        color: black;
        border: none;
        padding: 8px;
        margin-top: 10px;
        border-radius: 8px;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }

  createVoiceControlBox(containerId, buttonId) {
    // Find the target container (wrapper)
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container ${containerId} not found`);
      return null;
    }
  
    // Create PABox div
    const paBox = document.createElement('div');
    paBox.className = 'PABox';
    
    // Create voice control button
    const voiceBtn = document.createElement('button');
    voiceBtn.id = buttonId;
    voiceBtn.className = 'PABoxButton';
    voiceBtn.textContent = this.originalButtonText;
    
    // Append button to PABox
    paBox.appendChild(voiceBtn);
    
    // Append PABox to container
    container.appendChild(paBox);
    
    return voiceBtn;
  }

  async checkMicrophonePermission() {
    if (this.permissionChecked) {
      return this.permissionGranted;
    }

    try {
      // Check current permission status
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      
      if (permissionStatus.state === 'granted') {
        this.permissionGranted = true;
        console.log('Microphone permission already granted');
      } else if (permissionStatus.state === 'denied') {
        this.permissionGranted = false;
        console.log('Microphone permission denied');
      } else {
        // Permission state is 'prompt' - we'll ask when needed
        this.permissionGranted = false;
        console.log('Microphone permission not yet requested');
      }

      // Listen for permission changes
      permissionStatus.onchange = () => {
        this.permissionGranted = permissionStatus.state === 'granted';
        console.log('Microphone permission changed:', permissionStatus.state);
        
        if (!this.permissionGranted && this.isListening) {
          this.stopListening();
        }
      };

      this.permissionChecked = true;
      return this.permissionGranted;
      
    } catch (error) {
      // Fallback for browsers that don't support permissions API
      console.log('Permissions API not supported, will request permission when needed');
      this.permissionChecked = true;
      return false;
    }
  }

  async requestMicrophonePermission() {
    try {
      // Request microphone access and store the stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.permissionGranted = true;
      console.log('Microphone permission granted');
      return true;
    } catch (error) {
      this.permissionGranted = false;
      console.error('Microphone permission denied:', error);
      alert('Microphone access is required for voice control. Please allow microphone access and try again.');
      return false;
    }
  }

  setupButtons() {
    // Create voice control boxes dynamically
    const homeWrapper = document.getElementById('wrapper');
    const disguiseWrapper = document.getElementById('wrapper2');
    
    if (homeWrapper) {
      const homeVoiceBtn = this.createVoiceControlBox('wrapper', 'voiceBtn');
      if (homeVoiceBtn) {
        this.buttons.voiceBtn = {
          element: homeVoiceBtn,
          playerId: 'home',
          originalText: this.originalButtonText
        };
        
        homeVoiceBtn.addEventListener('click', () => {
          if (this.isListening) {
            this.stopListening();
          } else {
            this.startListening();
          }
        });
        
        console.log('Home voice control button created and initialized');
      }
    }
    
    if (disguiseWrapper) {
      const disguiseVoiceBtn = this.createVoiceControlBox('wrapper2', 'voiceBtn2');
      if (disguiseVoiceBtn) {
        this.buttons.voiceBtn2 = {
          element: disguiseVoiceBtn,
          playerId: 'disguise',
          originalText: this.originalButtonText
        };
        
        disguiseVoiceBtn.addEventListener('click', () => {
          if (this.isListening) {
            this.stopListening();
          } else {
            this.startListening();
          }
        });
        
        console.log('Disguise voice control button created and initialized');
      }
    }
    
    const buttonCount = Object.keys(this.buttons).length;
    if (buttonCount === 0) {
      console.warn('No voice control containers found. Make sure elements with IDs "wrapper" and/or "wrapper2" exist.');
    } else {
      console.log(`Created and initialized ${buttonCount} voice control button(s)`);
    }
  }

  /**
   * Get the current repeat mode from the active player
   * @returns {string} 'normal', 'repeat', or 'shuffle'
   */
  getCurrentRepeatMode() {
    const activePlayer = this.getActivePlayer();
    if (!activePlayer || !activePlayer.repeatBtn) {
      return 'normal';
    }

    const repeatBtnText = activePlayer.repeatBtn.textContent;
    switch (repeatBtnText) {
      case 'repeat':
        return 'normal'; // When button shows 'repeat', we're in normal mode
      case 'repeat_one':
        return 'repeat'; // When button shows 'repeat_one', we're in repeat mode
      case 'shuffle':
        return 'shuffle'; // When button shows 'shuffle', we're in shuffle mode
      default:
        return 'normal';
    }
  }

  /**
   * Handle shuffle voice command
   * If normal mode -> call handleRepeat twice to reach shuffle
   * If repeat mode -> call handleRepeat once to reach shuffle
   * If already shuffle -> do nothing
   */
  handleShuffleCommand() {
    const currentMode = this.getCurrentRepeatMode();
    console.log(`Current mode: ${currentMode}, switching to shuffle`);

    switch (currentMode) {
      case 'normal':
        // Normal -> Repeat -> Shuffle (2 calls)
        this.executePlayerCommand('handleRepeat');
        setTimeout(() => this.executePlayerCommand('handleRepeat'), 100);
        break;
      case 'repeat':
        // Repeat -> Shuffle (1 call)
        this.executePlayerCommand('handleRepeat');
        break;
      case 'shuffle':
        // Already in shuffle, do nothing
        console.log('Already in shuffle mode');
        break;
    }
  }

  /**
   * Handle repeat voice command
   * If normal mode -> call handleRepeat once to reach repeat
   * If shuffle mode -> call handleRepeat twice to reach repeat (shuffle -> normal -> repeat)
   * If already repeat -> do nothing
   */
  handleRepeatCommand() {
    const currentMode = this.getCurrentRepeatMode();
    console.log(`Current mode: ${currentMode}, switching to repeat`);

    switch (currentMode) {
      case 'normal':
        // Normal -> Repeat (1 call)
        this.executePlayerCommand('handleRepeat');
        break;
      case 'shuffle':
        // Shuffle -> Normal -> Repeat (2 calls)
        this.executePlayerCommand('handleRepeat');
        setTimeout(() => this.executePlayerCommand('handleRepeat'), 100);
        break;
      case 'repeat':
        // Already in repeat, do nothing
        console.log('Already in repeat mode');
        break;
    }
  }

  /**
   * Handle normal voice command
   * If shuffle mode -> call handleRepeat once to reach normal
   * If repeat mode -> call handleRepeat twice to reach normal (repeat -> shuffle -> normal)
   * If already normal -> do nothing
   */
  handleNormalCommand() {
    const currentMode = this.getCurrentRepeatMode();
    console.log(`Current mode: ${currentMode}, switching to normal`);

    switch (currentMode) {
      case 'shuffle':
        // Shuffle -> Normal (1 call)
        this.executePlayerCommand('handleRepeat');
        break;
      case 'repeat':
        // Repeat -> Shuffle -> Normal (2 calls)
        this.executePlayerCommand('handleRepeat');
        setTimeout(() => this.executePlayerCommand('handleRepeat'), 100);
        break;
      case 'normal':
        // Already in normal, do nothing
        console.log('Already in normal mode');
        break;
    }
  }

  async startListening() {
    if (!this.recognition) {
      console.warn('Speech recognition not available');
      return;
    }

    // Check if we already have permission
    if (!this.permissionGranted) {
      // Only request permission if we don't have it
      const granted = await this.requestMicrophonePermission();
      if (!granted) {
        return;
      }
    }

    try {
      this.isListening = true;
      this.recognition.start();
      console.log('Voice control started');
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      this.isListening = false;
      
      // If we get an error, the permission might have been revoked
      if (error.name === 'NotAllowedError') {
        this.permissionGranted = false;
        alert('Microphone access was denied. Please allow microphone access in your browser settings.');
      }
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      this.recognition.stop();
    }
    
    // Properly close the microphone stream
    this.closeMicrophoneStream();
    
    this.updateButtonState(false);
    console.log('Voice control stopped');
  }

  closeMicrophoneStream() {
    if (this.mediaStream) {
      // Stop all tracks in the media stream
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
        console.log('Microphone track stopped');
      });
      this.mediaStream = null;
    }
  }

  updateButtonState(listening) {
    // Update all available buttons
    Object.values(this.buttons).forEach(buttonInfo => {
      const button = buttonInfo.element;
      button.textContent = listening ? this.activeButtonText : buttonInfo.originalText;
      button.style.opacity = listening ? '0.8' : '1';
    });
  }

  processCommand(transcript) {
    // Remove common filler words and normalize
    const cleanTranscript = transcript
      .replace(/\b(please|could you|can you|hey|ok|okay)\b/gi, '')
      .trim();
    
    // Check for song index commands (e.g., "go to song 5", "play number 10")
    const indexMatch = cleanTranscript.match(/(?:go to|play|song)\s*(?:song\s*)?(?:number\s*)?(\d+)/i);
    if (indexMatch) {
      const songIndex = parseInt(indexMatch[1], 10);
      this.goToSongIndex(songIndex);
      return;
    }

    // Check for song name commands (e.g., "play shape of you", "go to dancing queen")
    const songNameMatch = cleanTranscript.match(/(?:play|go to)\s+(.+)/i);
    if (songNameMatch) {
      const songName = songNameMatch[1].trim();
      // Don't treat simple commands as song names
      if (!this.isSimpleCommand(songName)) {
        this.goToSongByName(songName);
        return;
      }
    }
    
    // Check for exact matches first
    if (this.commands[cleanTranscript]) {
      this.commands[cleanTranscript]();
      return;
    }

    // Check for partial matches
    for (const command in this.commands) {
      if (cleanTranscript.includes(command)) {
        console.log(`Executing command: ${command}`);
        this.commands[command]();
        return;
      }
    }

    // Check for common variations
    this.checkVariations(cleanTranscript);
  }

  isSimpleCommand(text) {
    // List of simple commands that shouldn't be treated as song names
    const simpleCommands = [
      'next', 'previous', 'pause', 'stop', 'play', 'back', 'skip',
      'dark mode', 'light mode', 'open list', 'close list', 'shuffle', 
      'repeat', 'normal', 'logout', 'list', 'music'
    ];
    
    return simpleCommands.some(cmd => text.toLowerCase().includes(cmd));
  }

  goToSongIndex(index) {
    try {
      const activePlayer = this.getActivePlayer();
      if (!activePlayer || !activePlayer.musicSource) {
        console.warn('No active player found');
        return;
      }

      const totalSongs = activePlayer.musicSource.length;
      
      if (index < 1 || index > totalSongs) {
        console.log(`Song index ${index} is out of range. Available songs: 1-${totalSongs}`);
        return;
      }

      // Set the music index and load the song
      activePlayer.musicIndex = index;
      activePlayer.loadMusic(index);
      activePlayer.playMusic();
      activePlayer.resetVideoSize();
      
      console.log(`Navigated to song ${index}: ${activePlayer.musicSource[index - 1]?.name || 'Unknown'}`);
    } catch (error) {
      console.error('Error navigating to song index:', error);
    }
  }

  goToSongByName(searchTerm) {
    try {
      const activePlayer = this.getActivePlayer();
      if (!activePlayer || !activePlayer.musicSource) {
        console.warn('No active player found');
        return;
      }

      const searchTermLower = searchTerm.toLowerCase();
      let foundIndex = -1;
      let foundSong = null;

      // First try exact name match
      activePlayer.musicSource.forEach((song, index) => {
        if (song && song.name && song.name.toLowerCase() === searchTermLower) {
          foundIndex = index + 1; // Convert to 1-based index
          foundSong = song;
        }
      });

      // If no exact match, try partial name match
      if (foundIndex === -1) {
        activePlayer.musicSource.forEach((song, index) => {
          if (song && song.name && song.name.toLowerCase().includes(searchTermLower)) {
            foundIndex = index + 1; // Convert to 1-based index
            foundSong = song;
          }
        });
      }

      // If still no match, try artist name match
      if (foundIndex === -1) {
        activePlayer.musicSource.forEach((song, index) => {
          if (song && song.artist && song.artist.toLowerCase().includes(searchTermLower)) {
            foundIndex = index + 1; // Convert to 1-based index
            foundSong = song;
          }
        });
      }

      if (foundIndex !== -1 && foundSong) {
        // Navigate to the found song
        activePlayer.musicIndex = foundIndex;
        activePlayer.loadMusic(foundIndex);
        activePlayer.playMusic();
        activePlayer.resetVideoSize();
        
        console.log(`Found and playing: "${foundSong.name}" by ${foundSong.artist} (Song #${foundIndex})`);
      } else {
        console.log(`Song "${searchTerm}" not found in playlist`);
      }
    } catch (error) {
      console.error('Error searching for song:', error);
    }
  }

  checkVariations(transcript) {
    // Handle variations and synonyms
    if (transcript.includes('turn on dark') || transcript.includes('enable dark')) {
      this.executePlayerCommand('toggleDarkMode');
    } else if (transcript.includes('turn off dark') || transcript.includes('disable dark') || 
               transcript.includes('turn on light') || transcript.includes('enable light')) {
      this.executePlayerCommand('toggleDarkMode');
    } else if (transcript.includes('start playing') || transcript.includes('resume')) {
      this.executePlayerCommand('playMusic');
    } else if (transcript.includes('stop playing') || transcript.includes('halt')) {
      this.executePlayerCommand('pauseMusic');
    } else if (transcript.includes('next song') || transcript.includes('forward')) {
      this.executePlayerCommand('changeMusic', [1]);
    } else if (transcript.includes('previous song') || transcript.includes('go back')) {
      this.executePlayerCommand('changeMusic', [-1]);
    } else if (transcript.includes('show music') || transcript.includes('display list')) {
      this.executePlayerCommand('toggleMusicList');
    } else if (transcript.includes('shuffle mode') || transcript.includes('enable shuffle')) {
      this.handleShuffleCommand();
    } else if (transcript.includes('repeat mode') || transcript.includes('enable repeat')) {
      this.handleRepeatCommand();
    } else if (transcript.includes('normal mode') || transcript.includes('disable shuffle') || 
               transcript.includes('disable repeat')) {
      this.handleNormalCommand();
    } else {
      console.log('Command not recognized:', transcript);
    }
  }

  executePlayerCommand(methodName, args = []) {
    try {
      // Try to find the appropriate player instance
      const homePlayer = window.homePlayer;
      const disguisePlayer = window.disguisePlayer;
      
      // Determine which player is currently active
      const homePage = document.getElementById('HomePage');
      const disguisePage = document.getElementById('DisguisePage');
      
      let activePlayer = null;
      
      if (homePage && homePage.style.display !== 'none') {
        activePlayer = homePlayer;
      } else if (disguisePage && disguisePage.style.display !== 'none') {
        activePlayer = disguisePlayer;
      } else {
        // Default to home player
        activePlayer = homePlayer;
      }

      if (activePlayer && typeof activePlayer[methodName] === 'function') {
        activePlayer[methodName](...args);
        console.log(`Executed ${methodName} on active player`);
      } else {
        console.warn(`Method ${methodName} not found on active player`);
      }
    } catch (error) {
      console.error(`Error executing player command ${methodName}:`, error);
    }
  }

  getActivePlayer() {
    // Determine which player is currently active
    const homePage = document.getElementById('HomePage');
    const disguisePage = document.getElementById('DisguisePage');
    
    if (homePage && homePage.style.display !== 'none') {
      return window.homePlayer;
    } else if (disguisePage && disguisePage.style.display !== 'none') {
      return window.disguisePlayer;
    } else {
      // Default to home player if can't determine
      return window.homePlayer;
    }
  }

  handleLogout() {
    // Stop voice control and close microphone before logout
    this.stopListening();
    
    // Execute logout function
    if (typeof window.handleLogout === 'function') {
      window.handleLogout(true, 'Voice command logout');
    } else {
      console.warn('Logout function not available');
    }
  }

  disableVoiceControl() {
    Object.values(this.buttons).forEach(buttonInfo => {
      const button = buttonInfo.element;
      button.textContent = "VOICE CONTROL NOT SUPPORTED";
      button.disabled = true;
      button.style.opacity = '0.5';
    });
  }

  // Public methods for external control
  destroy() {
    this.stopListening();
    
    // Ensure microphone is properly closed
    this.closeMicrophoneStream();
    
    // Clean up event listeners for each button
    Object.values(this.buttons).forEach(buttonInfo => {
      const button = buttonInfo.element;
      // Remove all click event listeners by cloning the element
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
    });
    
    this.buttons = {};
    this.recognition = null;
  }

  isActive() {
    return this.isListening;
  }

  // New method to check permission status
  hasPermission() {
    return this.permissionGranted;
  }
}

// Initialize voice control when DOM is loaded
// Initialize voice control when DOM is loaded OR when manually called
function initializeVoiceControlSystem() {
  if (!window.voiceControl) {
    console.log('Creating VoiceControlSystem instance...');
    window.voiceControl = new VoiceControlSystem();
  }
}

// Auto-initialize if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeVoiceControlSystem, 1000);
  });
} else {
  // DOM is already loaded, initialize immediately
  setTimeout(initializeVoiceControlSystem, 100);
}

// Expose initialization function for manual calling
window.initializeVoiceControlSystem = initializeVoiceControlSystem;

// Ensure voice control is stopped on logout
document.addEventListener('DOMContentLoaded', function() {
  // Override the logout function to include voice control cleanup
  const originalHandleLogout = window.handleLogout;
  if (originalHandleLogout) {
    window.handleLogout = function(...args) {
      // Stop voice control and close microphone before logout
      if (window.voiceControl) {
        if (window.voiceControl.isActive()) {
          window.voiceControl.stopListening();
        }
        // Ensure microphone stream is closed
        window.voiceControl.closeMicrophoneStream();
      }
      // Call original logout function
      return originalHandleLogout.apply(this, args);
    };
  }
});

// Also handle page unload/refresh to ensure microphone is released
window.addEventListener('beforeunload', function() {
  if (window.voiceControl) {
    window.voiceControl.stopListening();
    window.voiceControl.closeMicrophoneStream();
  }
});

// Handle visibility change (tab switching) to pause voice control
document.addEventListener('visibilitychange', function() {
  if (window.voiceControl && window.voiceControl.isActive()) {
    if (document.hidden) {
      // Tab is hidden, pause voice control
      window.voiceControl.stopListening();
      console.log('Voice control paused - tab hidden');
    }
    // Note: We don't auto-resume when tab becomes visible to avoid unexpected behavior
  }
});