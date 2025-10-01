// AudioPlayer00.js - Standalone audio player that optionally uses MediaManager
/*document.getElementById("title").addEventListener("click", function() {
  // Clean up players instead of just pausing
  if (typeof cleanupPlayers === 'function') {
    cleanupPlayers();
  }
  
  // Clear HomePage player state
  localStorage.removeItem("musicIndex");
  localStorage.removeItem("isMusicPaused");
  
  // Existing logout logic
  document.getElementById("HomePage").style.display = "none";
  document.getElementById("LoginPage").style.display = "block";
  localStorage.removeItem("LoginTime");
  document.body.style.backgroundColor = "white";
  clearInputFields();
  window.location.reload();
});

document.getElementById("title2").addEventListener("click", function() {
  // Clean up players instead of just pausing
  if (typeof cleanupPlayers === 'function') {
    cleanupPlayers();
  }
  
  // Clear DisguisePage player state
  localStorage.removeItem("musicIndex2");
  localStorage.removeItem("isMusicPaused2");
  
  // Existing logout logic
  document.getElementById("DisguisePage").style.display = "none";
  document.getElementById("LoginPage").style.display = "block";
  localStorage.removeItem("LoginTime");
  document.body.style.backgroundColor = "white";
  clearInputFields();
  window.location.reload();
});*/

function pauseAudio() {
  const audio = document.getElementById('main-audio');
  audio.pause();
};

function pauseAudio2() {
  const audio = document.getElementById('main-audio2');
  audio.pause();
};

class TrieNode {
  constructor() {
    this.children = {};
    this.musicIndices = new Set(); // Store indices of songs that match this prefix
    this.isEndOfWord = false;
  }
}

class SearchTrie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word, musicIndex) {
    let node = this.root;
    const cleanWord = word.toLowerCase().replace(/<[^>]*>/g, '').trim();
    
    for (let i = 0; i < cleanWord.length; i++) {
      const char = cleanWord[i];
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
      node.musicIndices.add(musicIndex);
    }
    node.isEndOfWord = true;
  }

  searchPrefix(prefix) {
    let node = this.root;
    const cleanPrefix = prefix.toLowerCase().replace(/<[^>]*>/g, '').trim();
    
    for (let i = 0; i < cleanPrefix.length; i++) {
      const char = cleanPrefix[i];
      if (!node.children[char]) {
        return new Set(); // No matches found
      }
      node = node.characters[char];
    }
    
    return node.musicIndices;
  }
}

class MusicPlayer {
  constructor(suffix = '') {
    if (!localStorage.getItem(`musicIndex${suffix}`)) {
      this.musicIndex = 1;
      localStorage.setItem(`musicIndex${suffix}`, 1);
    }
    
    // Configure suffix and folders
    this.suffix = suffix;
    this.audioFolder = 'MainAssets/Audios/';
    this.audioBucketUrl = 'https://r2-asset-proxy.mcvities755.workers.dev/account2/audios/';

    // Initialize MediaManager if available
    this.mediaManager = this.initializeMediaManager(suffix);

    // Element selectors
    this.wrapper = document.querySelector(`#wrapper${suffix}`);
    this.musicName = this.wrapper.querySelector(".song-details .name");
    this.musicArtist = this.wrapper.querySelector(".song-details .artist");
    this.playPauseBtn = this.wrapper.querySelector(".play-pause");
    this.prevBtn = this.wrapper.querySelector(`#prev${suffix}`);
    this.nextBtn = this.wrapper.querySelector(`#next${suffix}`);
    this.mainAudio = this.wrapper.querySelector(`#main-audio${suffix}`);
    this.progressArea = this.wrapper.querySelector(".progress-area");
    this.progressBar = this.progressArea.querySelector(".progress-bar");
    this.musicList = this.wrapper.querySelector(".music-list");
    this.moreMusicBtn = this.wrapper.querySelector(`#more-music${suffix}`);
    this.closeMoreMusicBtn = this.musicList.querySelector(`#close${suffix}`);
    this.modeToggle = document.getElementById(`modeToggle${suffix}`);
    this.muteButton = document.getElementById(`muteButton${suffix}`);
    this.header = this.wrapper.querySelector(".row");
    this.ulTag = this.wrapper.querySelector("ul");
    this.repeatBtn = this.wrapper.querySelector(`#repeat-plist${suffix}`);

    // Cover area - only used when MediaManager is NOT available
    this.coverArea = this.wrapper.querySelector(".img-area");

    // Player state
    this.musicIndex = 1;
    this.isMusicPaused = true;
    this.musicSource = suffix === '2' ? 
      (window.ReducedMusic || []) : 
      (window.allMusic || []);

    // Add safety check and reload capability
    if (this.musicSource.length === 0) {
      console.warn('Music source is empty, attempting to reload data...');
      this.loadMusicDataIfNeeded();
    }
    
    this.originalOrder = [...this.musicSource];
    this.shuffledOrder = [];
    this.isMuted = false;
    this.isInitializing = true;

    this.lastProgressUpdate = 0;
    this.progressThrottle = 16; // ~60fps max
    this.progressRAF = null;
    this.lastProgressValue = -1;

    this.isDragging = false;

    this.searchField = this.wrapper.querySelector('.search-field');
    this.isSearching = false;
    this.filteredMusic = [];

    this.forceRender = false;

    this.r2Available = true;
    this.preShuffleIndex = 1;

    this.errorCounts = {};
    this.lastErrorTime = {};
    this.ERROR_THROTTLE_TIME = 5000; // 5 seconds
    this.MAX_ERRORS_PER_TYPE = 3;

    // Virtualization properties
    this.ROW_HEIGHT = 60; // Height of each music list item in pixels
    this.BUFFER = 20; // Buffer items above/below viewport
    this.lastRenderStart = -1;
    this.lastRenderEnd = -1;
    this.renderTicking = false;

    // Search optimization properties
    this.searchCache = new Map();
    this.lastQuery = '';
    this.lastResults = [];
    this.nameTrie = new SearchTrie();
    this.artistTrie = new SearchTrie();
    this.indexCache = new Map();

    this.searchTimeout = null;
    this.renderFrame = null;

    this.cachedProgressRect = null;
    this.lastRectCache = 0;
    this.lastTimeUpdate = 0;
    this.timeUpdateThrottle = 200; 

    this.userScrolling = false;
    this.scrollTimeout = null;
    this.lastAutoScrollTime = 0;
    
    this.initialize();
  }

  // Initialize MediaManager if available, but don't fail if it's not
  initializeMediaManager(suffix) {
    try {
      // Check if MediaManager is available
      if (typeof MediaManager !== 'undefined') {
        // Try to get existing instance first
        const existingManager = suffix === '2' ? window.disguiseMediaManager : window.homeMediaManager;
        if (existingManager) {
          return existingManager;
        }
        
        // Create new instance if needed
        const manager = new MediaManager(suffix);
        if (suffix === '2') {
          window.disguiseMediaManager = manager;
        } else {
          window.homeMediaManager = manager;
        }
        return manager;
      }
    } catch (error) {
      console.warn('MediaManager initialization failed, audio player will work without media features:', error);
    }
    return null;
  }

  // Safe method to call MediaManager functions
  callMediaManager(method, ...args) {
    try {
      if (this.mediaManager && typeof this.mediaManager[method] === 'function') {
        return this.mediaManager[method](...args);
      }
    } catch (error) {
      console.warn(`MediaManager.${method} failed:`, error);
    }
    return null;
  }

  // Simple fallback when MediaManager is not available - just show a placeholder
  showCoverPlaceholder() {
    if (!this.coverArea || this.mediaManager) return;

    this.coverArea.innerHTML = '';
    const placeholder = document.createElement('div');
    const isDarkMode = this.wrapper.classList.contains("dark-mode");
    placeholder.style.cssText = `
      width: 100%;
      height: 100%;
      background-color: ${isDarkMode ? 'black' : 'white'};
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: inherit;
      min-height: 380px;
      color: ${isDarkMode ? 'black' : 'white'};
      font-size: 14px;
      text-align: center;
    `;
    placeholder.textContent = 'Audio Only Mode';
    this.coverArea.appendChild(placeholder);
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  initialize() {
    this.setupEventListeners();
    this.loadPersistedState();
    this.populateMusicList(this.originalOrder);
    this.updatePlayingSong();
    this.setupResizeObserver();
    this.initializeSearchOptimization();
    
    // Add enhanced progress bar functionality
    this.initializeEnhancedProgressBar();
    
    // Show placeholder only if no MediaManager
    if (!this.mediaManager) {
      this.showCoverPlaceholder();
    }
    
    setTimeout(() => {
      this.isInitializing = false;
    }, 100)
  }

  initializeEnhancedProgressBar() {
    // Set up dragging functionality with optimized event handling
    this.setupProgressBarDragging();
    
    // Use passive event listeners where possible
    this.progressArea.addEventListener('mouseenter', this.handleProgressHover.bind(this), { passive: true });
    this.progressArea.addEventListener('mouseleave', this.handleProgressLeave.bind(this), { passive: true });
    
    // Optimized click handling with throttling
    this.progressArea.addEventListener("click", this.handleProgressClickThrottled.bind(this));
  }

  handleProgressHover() {
    // Cache the transition style to avoid repeated style calculations
    if (!this.progressBarHoverStyle) {
      this.progressBarHoverStyle = 'width 0.1s ease';
    }
    this.progressBar.style.transition = this.progressBarHoverStyle;
  }

  handleProgressLeave() {
    // Cache the transition style
    if (!this.progressBarLeaveStyle) {
      this.progressBarLeaveStyle = 'width 0.05s ease';
    }
    this.progressBar.style.transition = this.progressBarLeaveStyle;
  }

  handleProgressClickThrottled(e) {
    // Throttle click events to prevent rapid firing
    const now = performance.now();
    if (now - this.lastProgressUpdate < 50) return; // Max 20 clicks per second
    
    this.lastProgressUpdate = now;
    this.handleProgressClick(e);
  }

  forceListRender() {
    this.forceRender = true;
    this.renderVisibleItems();
  }

  setupEventListeners() {
    // Control events
    this.playPauseBtn.addEventListener("click", () => this.togglePlayPause());
    this.prevBtn.addEventListener("click", () => this.changeMusic(-1));
    this.nextBtn.addEventListener("click", () => this.changeMusic(1));
    this.progressArea.addEventListener("click", (e) => this.handleProgressClick(e));
    this.moreMusicBtn.addEventListener("click", () => this.toggleMusicList());
    this.closeMoreMusicBtn.addEventListener("click", () => this.closeMusicList());
    this.modeToggle.addEventListener("click", () => this.toggleDarkMode());
    this.muteButton.addEventListener("click", () => this.handleMute());
    this.repeatBtn.addEventListener("click", () => this.handleRepeat());

    // Media events
    this.mainAudio.addEventListener("timeupdate", (e) => this.updateProgress(e));
    this.mainAudio.addEventListener("ended", () => this.handleSongEnd());
    this.mainAudio.addEventListener("pause", () => this.handleAudioPause());
    this.mainAudio.addEventListener("play", () => this.handleAudioPlay());

    // Virtualized scroll event
    this.ulTag.addEventListener("scroll", () => this.handleVirtualizedScroll(), { passive: true });

    // Add this after the existing virtualized scroll event listener in setupEventListeners
    this.ulTag.addEventListener("scroll", () => {
      // Detect user scrolling vs programmatic scrolling
      this.userScrolling = true;
      
      // Clear existing timeout
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      
      // Reset user scrolling flag after they stop scrolling
      this.scrollTimeout = setTimeout(() => {
        this.userScrolling = false;
      }, 1500); // Allow auto-scroll again after 1.5 seconds of no manual scrolling
    }, { passive: true });

    if (this.searchField) {
      this.searchField.addEventListener('input', (e) => this.handleSearch(e));
    }
  }

  handleVirtualizedScroll() {
    if (!this.renderTicking) {
      requestAnimationFrame(() => {
        this.renderVisibleItems();
        this.renderTicking = false;
      });
      this.renderTicking = true;
    }
  }

  throttledLog(type, message, src = '') {
    const key = `${type}_${src}`;
    const now = Date.now();
    
    // Initialize counters if needed
    if (!this.errorCounts[key]) {
      this.errorCounts[key] = 0;
      this.lastErrorTime[key] = 0;
    }
    
    // Check if enough time has passed or if we haven't hit the limit
    if (now - this.lastErrorTime[key] > this.ERROR_THROTTLE_TIME) {
      this.errorCounts[key] = 0; // Reset counter
    }
    
    if (this.errorCounts[key] < this.MAX_ERRORS_PER_TYPE) {
      console.warn(message);
      this.errorCounts[key]++;
      this.lastErrorTime[key] = now;
    } else if (this.errorCounts[key] === this.MAX_ERRORS_PER_TYPE) {
      console.warn(`${message} (Further similar errors will be suppressed for 5 seconds)`);
      this.errorCounts[key]++;
      this.lastErrorTime[key] = now;
    }
  }

  loadPersistedState() {
    const storedMusicIndex = localStorage.getItem(`musicIndex${this.suffix}`);
    if (storedMusicIndex) {
      const parsedIndex = parseInt(storedMusicIndex, 10);
      if (parsedIndex >= 1 && parsedIndex <= this.musicSource.length) {
        this.musicIndex = parsedIndex;
      } else {
        this.musicIndex = 1;
        localStorage.setItem(`musicIndex${this.suffix}`, 1);
      }
      
      this.loadMusic(this.musicIndex);
      
      // Don't auto-play on mobile or when page loads
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const wasPaused = localStorage.getItem(`isMusicPaused${this.suffix}`) !== "false";
      
      if (!isMobile && !wasPaused) {
        // Only try to resume on desktop and if it was previously playing
        console.log("Desktop - ready to resume playback");
        // Don't auto-play even on desktop - let user initiate
      }
    } else {
      this.musicIndex = 1;
      this.loadMusic(this.musicIndex);
    }
  }

  async loadMusicDataIfNeeded() {
    if (this.musicSource.length === 0) {
      try {
        await loadMusicData();
        this.musicSource = this.suffix === '2' ? 
          (window.ReducedMusic || []) : 
          (window.allMusic || []);
        
        if (this.musicSource.length > 0) {
          this.originalOrder = [...this.musicSource];
          this.populateMusicList(this.originalOrder);
          this.updatePlayingSong();
          console.log('Music data reloaded successfully');
        }
      } catch (error) {
        console.error('Failed to reload music data:', error);
      }
    }
  }

  loadMusic(index) {
    const music = this.isShuffleMode ?
      this.shuffledOrder[index - 1] :
      this.musicSource[index - 1];

    this.musicName.textContent = music.name;
    this.musicArtist.textContent = music.artist;

    // Load media content using MediaManager if available, otherwise show placeholder
    if (this.mediaManager) {
      this.callMediaManager('loadMediaContent', music, index);
    } else {
      this.showCoverPlaceholder();
    }

    // Use backup fallback only for the first song (index 1)
    if (index === 1) {
      this.setInitialAudioSource(music.src);
    } else {
      this.setAudioSourceWithFallback(music.src);
    }

    localStorage.setItem(`musicIndex${this.suffix}`, index);
    this.updatePlayingSong();
    
    // NEW: Update video override mute state when loading new music
    this.callMediaManager('refreshVideoOverrideMuteState');

    if (this.musicList.classList.contains("show")) {
      setTimeout(() => {
        this.scrollToCurrentSong();
      }, 200);
    }
  }

  setAudioSourceWithFallback(src) {
    const r2AudioSrc = `${this.audioBucketUrl}${src}.mp3`;
    const localAudioSrc = `${this.audioFolder}${src}.mp3`;
    const uploadAudioSrc = `Upload/${src}.mp3`; // New upload folder fallback
    
    // Clear any previous event listeners
    this.mainAudio.onerror = null;
    this.mainAudio.onloadeddata = null;
    
    // Try R2 first
    this.mainAudio.src = r2AudioSrc;
    
    // Set up error handling for audio with proper loading wait
    const handleAudioError = () => {
      console.warn(`Audio failed to load from R2: ${r2AudioSrc}, trying local: ${localAudioSrc}`);
      this.mainAudio.src = localAudioSrc;
      
      // Wait for local to load or fail
      this.mainAudio.onloadeddata = () => {
        console.log(`Audio loaded successfully from local: ${localAudioSrc}`);
        this.mainAudio.onloadeddata = null;
      };
      
      // Add upload folder fallback
      this.mainAudio.onerror = () => {
        console.warn(`Audio failed to load from local: ${localAudioSrc}, trying upload: ${uploadAudioSrc}`);
        this.mainAudio.src = uploadAudioSrc;
        this.r2Available = false;
        
        // Wait for upload to load
        this.mainAudio.onloadeddata = () => {
          console.log(`Audio loaded successfully from upload: ${uploadAudioSrc}`);
          this.mainAudio.onloadeddata = null;
        };
        
        this.mainAudio.onerror = () => {
          console.error(`All audio sources failed for: ${src}`);
          this.mainAudio.onerror = null;
        };
      };
    };
    
    // Wait for R2 to load or fail
    this.mainAudio.onloadeddata = () => {
      console.log(`Audio loaded successfully from R2: ${r2AudioSrc}`);
      this.mainAudio.onloadeddata = null;
    };
    
    this.mainAudio.onerror = handleAudioError;
  }

  setInitialAudioSource(src) {
    const r2AudioSrc = `${this.audioBucketUrl}${src}.mp3`;
    const localAudioSrc = `${this.audioFolder}${src}.mp3`;
    const uploadAudioSrc = `Upload/${src}.mp3`;
    const backupAudioSrc = `Backup/${src}.mp3`; // New backup folder
    
    // Clear any previous event listeners
    this.mainAudio.onerror = null;
    this.mainAudio.onloadeddata = null;
    
    // Try R2 first
    this.mainAudio.src = r2AudioSrc;
    
    const handleInitialAudioError = () => {
      console.warn(`Initial audio failed from R2: ${r2AudioSrc}, trying local: ${localAudioSrc}`);
      this.mainAudio.src = localAudioSrc;
      
      this.mainAudio.onloadeddata = () => {
        console.log(`Initial audio loaded from local: ${localAudioSrc}`);
        this.mainAudio.onloadeddata = null;
      };
      
      this.mainAudio.onerror = () => {
        console.warn(`Initial audio failed from local: ${localAudioSrc}, trying upload: ${uploadAudioSrc}`);
        this.mainAudio.src = uploadAudioSrc;
        
        this.mainAudio.onloadeddata = () => {
          console.log(`Initial audio loaded from upload: ${uploadAudioSrc}`);
          this.mainAudio.onloadeddata = null;
        };
        
        this.mainAudio.onerror = () => {
          console.warn(`Initial audio failed from upload: ${uploadAudioSrc}, trying backup: ${backupAudioSrc}`);
          this.mainAudio.src = backupAudioSrc;
          this.r2Available = false;
          
          this.mainAudio.onloadeddata = () => {
            console.log(`Initial audio loaded from backup: ${backupAudioSrc}`);
            this.mainAudio.onloadeddata = null;
          };
          
          this.mainAudio.onerror = () => {
            console.error(`All audio sources failed for initial song: ${src}`);
            this.mainAudio.onerror = null;
          };
        };
      };
    };
    
    this.mainAudio.onloadeddata = () => {
      console.log(`Initial audio loaded from R2: ${r2AudioSrc}`);
      this.mainAudio.onloadeddata = null;
    };
    
    this.mainAudio.onerror = handleInitialAudioError;
  }

  togglePlayPause() {
    this.isMusicPaused ? this.playMusic() : this.pauseMusic();
  }

  async playMusic() {
    try {
      const playPromise = this.mainAudio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        
        // Only update UI state after successful play
        if (this.mediaManager) {
          this.mediaManager.videoAd.muted = true;
        }
        this.wrapper.classList.add("paused");
        this.playPauseBtn.querySelector("i").textContent = "pause";
        this.isMusicPaused = false;
        localStorage.setItem(`isMusicPaused${this.suffix}`, false);
        
        // Handle video display using MediaManager if available
        this.callMediaManager('toggleVideoDisplay', false);
        this.callMediaManager('autoResizeVideoOnPlay');
        this.callMediaManager('resetVideoSize');
        
        // NEW: Notify MediaManager about music play state change for video override muting
        this.callMediaManager('onMusicPlayStateChange', true);
      }
    } catch (error) {
      console.warn("Failed to play audio - user interaction may be required:", error);
      
      // Reset play button state if play fails
      this.wrapper.classList.remove("paused");
      this.playPauseBtn.querySelector("i").textContent = "play_arrow";
      this.isMusicPaused = true;
      localStorage.setItem(`isMusicPaused${this.suffix}`, true);
      
      // Show a user-friendly message for mobile users
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        console.log("Tap the play button to start music");
      }
    }
    this.updatePlayingSong();
  }

  pauseMusic() {
    this.wrapper.classList.remove("paused");
    this.playPauseBtn.querySelector("i").textContent = "play_arrow";
    this.mainAudio.pause();
    this.isMusicPaused = true;
    localStorage.setItem(`isMusicPaused${this.suffix}`, true);
    
    // Handle video display using MediaManager if available
    this.callMediaManager('toggleVideoDisplay', true);
    this.callMediaManager('muteVideo');
    this.callMediaManager('resetVideoSize');
    
    // NEW: Notify MediaManager about music play state change for video override muting
    this.callMediaManager('onMusicPlayStateChange', false);
  }

  scrollToCurrentSong() {
    // Don't auto-scroll in shuffle mode
    if (this.isShuffleMode) return;
    
    // Don't scroll if searching
    if (this.isSearching) return;
    
    // Don't auto-scroll if user is currently scrolling
    if (this.userScrolling) return;
    
    // Prevent rapid auto-scrolls
    const now = performance.now();
    if (now - this.lastAutoScrollTime < 1000) return;
    
    this.lastAutoScrollTime = now;
    
    // Calculate the position of the current song
    const currentIndex = this.musicIndex - 1; // Convert to 0-based index
    const targetScrollTop = currentIndex * this.ROW_HEIGHT;
    
    // Get viewport height to center the current song
    const viewportHeight = this.ulTag.clientHeight;
    const centeredScrollTop = Math.max(0, targetScrollTop - (viewportHeight / 2) + (this.ROW_HEIGHT / 2));
    
    // Smooth scroll to the current song
    this.ulTag.scrollTo({
      top: centeredScrollTop,
      behavior: 'smooth'
    });
  }

  changeMusic(direction) {
    const currentArray = this.isShuffleMode ? this.shuffledOrder : this.musicSource;
    const arrayLength = currentArray.length;
    
    // Calculate new index with proper wrapping
    if (direction > 0) {
      // Next song
      this.musicIndex = this.musicIndex >= arrayLength ? 1 : this.musicIndex + 1;
    } else {
      // Previous song
      this.musicIndex = this.musicIndex <= 1 ? arrayLength : this.musicIndex - 1;
    }
    
    this.loadMusic(this.musicIndex);
    this.playMusic();
    this.callMediaManager('resetVideoSize');

    if (this.musicList.classList.contains("show")) {
      setTimeout(() => {
        this.scrollToCurrentSong();
      }, 200);
    }
  }

  handleProgressClick(e) {
    // Cache getBoundingClientRect result since it's expensive
    const rect = this.progressArea.getBoundingClientRect();
    const clickedOffsetX = e.clientX - rect.left;
    const songDuration = this.mainAudio.duration;
    
    if (!isNaN(songDuration) && songDuration > 0) {
      const newTime = Math.max(0, Math.min((clickedOffsetX / rect.width) * songDuration, songDuration));
      
      // Set audio time directly without intermediate updates
      this.mainAudio.currentTime = newTime;
      
      // Update progress bar immediately with cached calculation
      this.updateProgressBarImmediate(newTime, songDuration);
    }
  }

  updateProgressBarImmediate(currentTime, duration) {
    if (isNaN(duration) || duration <= 0) return;
    
    const percentage = Math.max(0, Math.min((currentTime / duration) * 100, 100));
    
    // Only update if the percentage actually changed significantly
    if (Math.abs(percentage - this.lastProgressValue) < 0.1) return;
    
    this.lastProgressValue = percentage;
    
    // Direct style update without RAF for immediate feedback
    this.progressBar.style.width = `${percentage.toFixed(1)}%`;
  }

  setupProgressBarDragging() {
    let isDragging = false;
    let wasPlaying = false;
    let dragRAF = null;
    
    const startDrag = (e) => {
      isDragging = true;
      wasPlaying = !this.isMusicPaused;
      
      // Pause audio while dragging
      if (wasPlaying) {
        this.mainAudio.pause();
      }
      
      // Prevent text selection - cache the style
      document.body.style.userSelect = 'none';
      
      // Handle initial position
      this.handleDragOptimized(e);
    };
    
    const handleDragOptimized = (e) => {
      if (!isDragging) return;
      
      // Cancel any pending RAF to avoid stacking
      if (dragRAF) {
        cancelAnimationFrame(dragRAF);
      }
      
      // Use RAF for smooth dragging
      dragRAF = requestAnimationFrame(() => {
        e.preventDefault();
        
        // Cache rect calculation - only recalculate if needed
        if (!this.cachedProgressRect || performance.now() - this.lastRectCache > 100) {
          this.cachedProgressRect = this.progressArea.getBoundingClientRect();
          this.lastRectCache = performance.now();
        }
        
        const offsetX = Math.max(0, Math.min(e.clientX - this.cachedProgressRect.left, this.cachedProgressRect.width));
        const songDuration = this.mainAudio.duration;
        
        if (!isNaN(songDuration) && songDuration > 0) {
          const newTime = (offsetX / this.cachedProgressRect.width) * songDuration;
          const clampedTime = Math.max(0, Math.min(newTime, songDuration));
          
          // Update audio time and progress bar efficiently
          this.mainAudio.currentTime = clampedTime;
          this.updateProgressBarImmediate(clampedTime, songDuration);
          
          // Throttled time display update
          const now = performance.now();
          if (now - this.lastTimeUpdate > this.timeUpdateThrottle) {
            this.updateTimeDisplayOptimized(clampedTime, songDuration);
            this.lastTimeUpdate = now;
          }
        }
        
        dragRAF = null;
      });
    };
    
    const endDrag = () => {
      if (!isDragging) return;
      
      isDragging = false;
      document.body.style.userSelect = '';
      
      // Clear cached rect
      this.cachedProgressRect = null;
      
      // Cancel any pending RAF
      if (dragRAF) {
        cancelAnimationFrame(dragRAF);
        dragRAF = null;
      }
      
      // Resume playback if it was playing before drag
      if (wasPlaying) {
        this.mainAudio.play().catch(error => {
          console.warn("Failed to resume playback after drag:", error);
        });
      }
    };
    
    // Use optimized event handlers
    this.progressArea.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', handleDragOptimized);
    document.addEventListener('mouseup', endDrag);
    
    // Optimized touch events
    this.progressArea.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startDrag({
        clientX: touch.clientX,
        preventDefault: () => e.preventDefault()
      });
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      handleDragOptimized({
        clientX: touch.clientX,
        preventDefault: () => e.preventDefault()
      });
    }, { passive: false });
    
    document.addEventListener('touchend', endDrag, { passive: true });
  }
  
  // Enhanced progress bar update method
  updateProgressBar(currentTime, duration) {
    if (isNaN(duration) || duration <= 0) return;
    
    const now = performance.now();
    
    // Throttle updates during regular playback
    if (now - this.lastProgressUpdate < this.progressThrottle) return;
    
    this.lastProgressUpdate = now;
    
    const percentage = Math.max(0, Math.min((currentTime / duration) * 100, 100));
    
    // Skip update if change is minimal
    if (Math.abs(percentage - this.lastProgressValue) < 0.1) return;
    
    this.lastProgressValue = percentage;
    
    // Use RAF for smooth updates during playback
    if (this.progressRAF) {
      cancelAnimationFrame(this.progressRAF);
    }
    
    this.progressRAF = requestAnimationFrame(() => {
      this.progressBar.style.width = `${percentage.toFixed(1)}%`;
      this.progressRAF = null;
    });
  }
  
  // Enhanced time display update method
  updateTimeDisplayOptimized(currentTime, duration) {
    const currentMin = Math.floor(currentTime / 60);
    const currentSec = Math.floor(currentTime % 60);
    
    // Use cached time strings to avoid repeated string operations
    const currentTimeStr = `${currentMin}:${currentSec.toString().padStart(2, "0")}`;
    
    const currentTimeElement = this.wrapper.querySelector(".current-time");
    if (currentTimeElement && currentTimeElement.textContent !== currentTimeStr) {
      currentTimeElement.textContent = currentTimeStr;
    }
    
    if (!isNaN(duration)) {
      const totalMin = Math.floor(duration / 60);
      const totalSec = Math.floor(duration % 60);
      const durationStr = `${totalMin}:${totalSec.toString().padStart(2, "0")}`;
      
      const maxDurationElement = this.wrapper.querySelector(".max-duration");
      if (maxDurationElement && maxDurationElement.textContent !== durationStr) {
        maxDurationElement.textContent = durationStr;
      }
    }
  }

  updateProgress(e) {
    const { currentTime, duration } = e.target;
    
    // Only update if we're not currently dragging
    if (!this.isDragging) {
      this.updateProgressBar(currentTime, duration);
      
      // Throttled time display updates
      const now = performance.now();
      if (now - this.lastTimeUpdate > this.timeUpdateThrottle) {
        this.updateTimeDisplayOptimized(currentTime, duration);
        this.lastTimeUpdate = now;
      }
    }
  }

  cleanupProgressBar() {
    if (this.progressRAF) {
      cancelAnimationFrame(this.progressRAF);
      this.progressRAF = null;
    }
    
    // Clear cached values
    this.cachedProgressRect = null;
    this.lastProgressValue = -1;
  }

  handleRepeat() {
    switch (this.repeatBtn.textContent) {
      case "repeat":
        this.repeatBtn.textContent = "repeat_one";
        this.repeatBtn.title = "Song looped";

        this.searchCache.clear();
        this.lastQuery = '';
        this.lastResults = [];
        break;
      case "repeat_one":
        this.repeatBtn.textContent = "shuffle";
        this.repeatBtn.title = "Playback shuffled";
        
        // Store current song index before shuffling
        this.preShuffleIndex = this.musicIndex;
        
        this.isShuffleMode = true;
        // Use Fisher-Yates shuffle algorithm
        this.shuffledOrder = [...this.musicSource];
        for (let i = this.shuffledOrder.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [this.shuffledOrder[i], this.shuffledOrder[j]] = [this.shuffledOrder[j], this.shuffledOrder[i]];
        }
        this.musicIndex = 1;
        this.loadMusic(this.musicIndex);
        this.playMusic();
        this.forceListRender();

        this.searchCache.clear();
        this.lastQuery = '';
        this.lastResults = [];
        break;
      case "shuffle":
        this.repeatBtn.textContent = "repeat";
        this.repeatBtn.title = "Playlist looped";
        this.isShuffleMode = false;
        
        // Return to the song that was playing before shuffle
        this.musicIndex = this.preShuffleIndex;
        
        this.loadMusic(this.musicIndex);
        this.playMusic();
        this.forceListRender();

        this.searchCache.clear();
        this.lastQuery = '';
        this.lastResults = [];
        break;
    }
  }

  handleSongEnd() {
    const mode = this.repeatBtn.textContent;
  
    if (mode === "repeat_one") {
      // Replay the same song
      this.mainAudio.currentTime = 0;
      this.playMusic();
    } else if (mode === "shuffle" || this.isShuffleMode) {
      // In shuffle mode, go to next song in shuffled order
      this.musicIndex = this.musicIndex >= this.shuffledOrder.length ? 1 : this.musicIndex + 1;
      this.loadMusic(this.musicIndex);
      this.playMusic();
    } else {
      // Normal mode - go to next song
      this.musicIndex = this.musicIndex >= this.musicSource.length ? 1 : this.musicIndex + 1;
      this.loadMusic(this.musicIndex);
      this.playMusic();
    }
  }

  toggleMusicList() {
    this.musicList.classList.toggle("show");
    
    // Auto-scroll to current song when opening the list (but not in shuffle mode)
    if (this.musicList.classList.contains("show")) {
      // Reset user scrolling state when opening
      this.userScrolling = false;
      
      // Small delay to ensure the list is fully rendered before scrolling
      setTimeout(() => {
        this.scrollToCurrentSong();
      }, 150);
    }
  }

  closeMusicList() {
    this.musicList.classList.remove("show");
  }

  // VIRTUALIZED MUSIC LIST METHODS
  populateMusicList(musicArray) {
    // Clear existing content
    this.ulTag.innerHTML = "";
    
    // Create spacer element to maintain scroll height
    const spacer = document.createElement('div');
    spacer.className = 'music-list-spacer';
    spacer.style.cssText = `
      width: 100%;
      height: ${this.musicSource.length * this.ROW_HEIGHT}px;
      position: relative;
    `;
    
    // Create items container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'music-list-items';
    itemsContainer.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      will-change: transform;
    `;
    
    spacer.appendChild(itemsContainer);
    this.ulTag.appendChild(spacer);
    
    // Store references
    this.musicListSpacer = spacer;
    this.musicListItems = itemsContainer;
    
    // Initial render
    this.renderVisibleItems();
  }

  renderVisibleItems() {
    try {
      if (!this.musicListItems || !this.ulTag) return;
      
      const scrollTop = this.ulTag.scrollTop;
      const viewportHeight = this.ulTag.clientHeight;
      const totalItems = this.musicSource.length;

      // Calculate visible range
      const startIndex = Math.max(0, Math.floor(scrollTop / this.ROW_HEIGHT) - this.BUFFER);
      const visibleCount = Math.ceil(viewportHeight / this.ROW_HEIGHT) + this.BUFFER * 2;
      const endIndex = Math.min(totalItems - 1, startIndex + visibleCount - 1);

      // Force render if shuffle state changed (don't skip based on range)
      if (startIndex === this.lastRenderStart && endIndex === this.lastRenderEnd && !this.forceRender) {
        return;
      }

      this.lastRenderStart = startIndex;
      this.lastRenderEnd = endIndex;
      this.forceRender = false;

      // Position items container
      const translateY = startIndex * this.ROW_HEIGHT;
      this.musicListItems.style.transform = `translateY(${translateY}px)`;

      // Create document fragment for better performance
      const fragment = document.createDocumentFragment();

      // Render visible items
      for (let i = startIndex; i <= endIndex; i++) {
        if (i < this.musicSource.length) {
          const music = this.musicSource[i];
          const liTag = this.createMusicListItem(music, i);
          fragment.appendChild(liTag);
        }
      }

      // Replace content efficiently
      this.musicListItems.innerHTML = '';
      this.musicListItems.appendChild(fragment);

      // Update playing song indicators
      this.updatePlayingSong();
    } catch (error) {
      this.throttledLog('render_error', `Render error: ${error.message}`);
    }
  }

  createMusicListItem(music, actualIndex) {
    const liTag = document.createElement("li");
    liTag.setAttribute("li-index", actualIndex + 1);

    // Use cached duration if available, otherwise show placeholder
    const cachedDuration = this.getDurationCache(music.src);
    const displayDuration = cachedDuration || "0:00";

    liTag.innerHTML = `
      <div class="row">
        <span>${music.name}</span>
        <p>${music.artist}</p>
      </div>
      <span id="${music.src}" class="audio-duration">${displayDuration}</span>
    `;

    // Apply dark mode styles immediately if in dark mode
    const isDarkMode = this.wrapper.classList.contains("dark-mode");
    liTag.style.color = isDarkMode ? 'white' : 'black';
    liTag.style.borderBottom = isDarkMode ? '3px solid white' : '3px solid black';

    // UPDATED click handler to work with search
    liTag.addEventListener("click", () => {
      try {
        if (this.isSearching) {
          // When searching, we need to find the correct index in the current mode
          const clickedMusic = this.musicSource[actualIndex];
          
          if (this.isShuffleMode) {
            const shuffledIndex = this.shuffledOrder.findIndex(song => song.src === clickedMusic.src);
            this.musicIndex = shuffledIndex >= 0 ? shuffledIndex + 1 : 1;
          } else {
            this.musicIndex = actualIndex + 1;
          }
        } else {
          // Normal behavior when not searching
          if (this.isShuffleMode) {
            const clickedMusic = this.musicSource[actualIndex];
            const shuffledIndex = this.shuffledOrder.findIndex(song => song.src === clickedMusic.src);
            this.musicIndex = shuffledIndex >= 0 ? shuffledIndex + 1 : 1;
          } else {
            this.musicIndex = actualIndex + 1;
          }
        }
        
        this.loadMusic(this.musicIndex);
        this.playMusic();
        this.callMediaManager('resetVideoSize');
        
        // Close search results after selection
        if (this.isSearching && this.searchField) {
          this.searchField.value = '';
          this.restoreOriginalList();
        }
      } catch (error) {
        this.throttledLog('click_error', `Click handler error: ${error.message}`, music.src);
      }
    });

    return liTag;
  }

  createSearchListItem(music, originalIndex) {
    const liTag = document.createElement("li");
    liTag.className = 'search-result-item'; // Unique class for search items
    liTag.setAttribute("li-index", originalIndex + 1);
    liTag.setAttribute("data-search-result", "true"); // Mark as search result

    // Use cached duration if available, otherwise show placeholder
    const cachedDuration = this.getDurationCache(music.src);
    const displayDuration = cachedDuration || "0:00";

    // Clean the display text to prevent any HTML injection
    const cleanName = String(music.name).replace(/<[^>]*>/g, '').trim();
    const cleanArtist = String(music.artist).replace(/<[^>]*>/g, '').trim();

    liTag.innerHTML = `
      <div class="row">
        <span>${cleanName}</span>
        <p>${cleanArtist}</p>
      </div>
      <span id="search-${music.src}" class="audio-duration">${displayDuration}</span>
    `;

    // Apply dark mode styles immediately if in dark mode
    const isDarkMode = this.wrapper.classList.contains("dark-mode");
    liTag.style.color = isDarkMode ? 'white' : 'black';
    liTag.style.borderBottom = isDarkMode ? '3px solid white' : '3px solid black';

    // Search-specific click handler
    liTag.addEventListener("click", () => {
      try {
        // Verify this is still a valid music item
        if (!music || !music.src || originalIndex < 0 || originalIndex >= this.musicSource.length) {
          console.warn('Invalid music selection in search results');
          return;
        }

        // Find the correct index based on current playback mode
        if (this.isShuffleMode) {
          const shuffledIndex = this.shuffledOrder.findIndex(song => 
            song && song.src === music.src
          );
          this.musicIndex = shuffledIndex >= 0 ? shuffledIndex + 1 : 1;
        } else {
          this.musicIndex = originalIndex + 1;
        }
        
        this.loadMusic(this.musicIndex);
        this.playMusic();
        this.callMediaManager('resetVideoSize');
        
        // Clear search and restore normal view
        if (this.searchField) {
          this.searchField.value = '';
        }
        this.isSearching = false;
        this.filteredMusic = [];
        this.restoreOriginalList();
        
      } catch (error) {
        this.throttledLog('search_click_error', `Search click handler error: ${error.message}`, music.src);
      }
    });

    return liTag;
  }

  getDurationCache(src) {
    if (!this.durationCache) this.durationCache = {};
    return this.durationCache[src];
  }

  setDurationCache(src, duration) {
    if (!this.durationCache) this.durationCache = {};
    this.durationCache[src] = duration;
  }

  updatePlayingSong() {
    // Only update visible items in virtualized list
    if (!this.musicListItems) return;
    
    const allLiTags = this.musicListItems.querySelectorAll("li");

    const currentMusic = this.isShuffleMode
      ? this.shuffledOrder[this.musicIndex - 1]
      : this.musicSource[this.musicIndex - 1];

    allLiTags.forEach(liTag => {
      const audioTag = liTag.querySelector(".audio-duration");
      if (!audioTag) return;
      
      const id = audioTag.id;
      const isPlaying = id === currentMusic.src || id === `search-${currentMusic.src}`;

      if (!audioTag.hasAttribute("t-duration")) {
        audioTag.setAttribute("t-duration", audioTag.textContent);
      }

      // Update styling for playing state
      liTag.classList.toggle("playing", isPlaying);
      
      if (isPlaying) {
        liTag.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        audioTag.textContent = "Playing";
      } else {
        liTag.style.backgroundColor = 'transparent';
        audioTag.textContent = audioTag.getAttribute("t-duration");
      }
    });
  }

  toggleDarkMode() {
    const isDarkMode = this.wrapper.classList.toggle("dark-mode");
    document.getElementById(`fontawesome-icons${this.suffix}`).classList.toggle("Dark");

    // Get the controls box, progress area, and progress bar
    const controlsBox = this.wrapper.querySelector('.control-box');
    const progressArea = this.wrapper.querySelector('.progress-area');
    const progressBar = this.wrapper.querySelector('.progress-bar');
    const voiceBtns = this.wrapper.querySelector('.PABoxButton');

    if (isDarkMode) {
      document.body.style.backgroundColor = "white";
      this.listcolourblack();
      
      // Make controls box blue
      if (controlsBox) {
        controlsBox.style.setProperty('background-color', 'black', 'important');
        controlsBox.style.setProperty('border-color', 'black', 'important');
      }
      
      // Make progress area background red (the track)
      if (progressArea) {
        progressArea.style.setProperty('background', 'white', 'important');
      }
      
      // Make progress bar red (the filled portion)
      if (progressBar) {
        progressBar.style.setProperty('background', 'linear-gradient(90deg, white 0%, white 100%)', 'important');
      }

      if (voiceBtns) {
        voiceBtns.style.setProperty('background-color', 'black', 'important');
        voiceBtns.style.setProperty('color', 'white', 'important');
      }

      if (this.searchField) {
        this.searchField.style.setProperty('background-color', 'black', 'important');
        this.searchField.style.setProperty('color', 'white', 'important');
        this.searchField.style.setProperty('border-color', 'white', 'important');
      }

      this.updatePlaceholderStyles('white');
      
      // Make ALL content inside controls box red (except play-pause icon)
      const controlsContent = this.wrapper.querySelectorAll('.control-box *');
      controlsContent.forEach(element => {
        // Skip the play-pause icon itself
        if (element.closest('.play-pause') && element.tagName === 'I') {
          return;
        }
        
        // Skip the progress bar since we handle it separately
        if (element.classList.contains('progress-bar')) {
          return;
        }
        
        // For regular elements
        element.style.setProperty('color', 'white', 'important');
        
        // For elements with gradients (like the other control icons)
        if (element.tagName === 'I' && element.classList.contains('material-icons')) {
          element.style.setProperty('background', 'linear-gradient(white 0%, white 100%)', 'important');
          element.style.setProperty('background-clip', 'text', 'important');
          element.style.setProperty('-webkit-background-clip', 'text', 'important');
          element.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
        }
      });
      
      // Make the play-pause button circle red, but keep icon black
      const playPauseBtn = this.wrapper.querySelector('.play-pause');
      if (playPauseBtn) {
        playPauseBtn.style.setProperty('background', 'linear-gradient(red 0%, red 100%)', 'important');
      }
      
      // Make the play-pause button's ::before pseudo-element red
      const playPauseBefore = this.wrapper.querySelector('.play-pause');
      if (playPauseBefore) {
        // Create a style element to target the ::before pseudo-element
        const styleElement = document.createElement('style');
        styleElement.id = `dark-mode-style${this.suffix}`;
        styleElement.textContent = `
          #wrapper${this.suffix}.dark-mode .play-pause::before {
            background: linear-gradient(white 0%, white 100%) !important;
          }
        `;
        document.head.appendChild(styleElement);
      }
      
      // Ensure the play-pause icon stays black
      const playPauseIcon = this.wrapper.querySelector('.play-pause i');
      if (playPauseIcon) {
        playPauseIcon.style.setProperty('background', 'linear-gradient(black 0%, black 100%)', 'important');
        playPauseIcon.style.setProperty('background-clip', 'text', 'important');
        playPauseIcon.style.setProperty('-webkit-background-clip', 'text', 'important');
        playPauseIcon.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
      }
      
    } else {
      document.body.style.backgroundColor = "black";
      this.listcolourwhite();
      
      // Reset controls box to original color
      if (controlsBox) {
        controlsBox.style.removeProperty('background-color');
        controlsBox.style.removeProperty('border-color');
      }
      
      // Reset progress area to original color
      if (progressArea) {
        progressArea.style.removeProperty('background');
      }
      
      // Reset progress bar to original color
      if (progressBar) {
        progressBar.style.removeProperty('background');
      }

      if (voiceBtns) {
        voiceBtns.style.removeProperty('background-color');
        voiceBtns.style.removeProperty('color')
      }

      if (this.searchField) {
        this.searchField.style.removeProperty('background-color');
        this.searchField.style.removeProperty('color');
        this.searchField.style.removeProperty('border-color');
      }

      this.updatePlaceholderStyles('black');
      
      // Reset all content inside controls box
      const controlsContent = this.wrapper.querySelectorAll('.control-box *');
      controlsContent.forEach(element => {
        element.style.removeProperty('color');
        element.style.removeProperty('background');
        element.style.removeProperty('background-clip');
        element.style.removeProperty('-webkit-background-clip');
        element.style.removeProperty('-webkit-text-fill-color');
      });
      
      // Reset play-pause button and icon
      const playPauseBtn = this.wrapper.querySelector('.play-pause');
      if (playPauseBtn) {
        playPauseBtn.style.removeProperty('background');
      }
      
      // Remove the dark mode style element
      const styleElement = document.getElementById(`dark-mode-style${this.suffix}`);
      if (styleElement) {
        styleElement.remove();
      }
      
      const playPauseIcon = this.wrapper.querySelector('.play-pause i');
      if (playPauseIcon) {
        playPauseIcon.style.removeProperty('background');
        playPauseIcon.style.removeProperty('background-clip');
        playPauseIcon.style.removeProperty('-webkit-background-clip');
        playPauseIcon.style.removeProperty('-webkit-text-fill-color');
      }
    }

    // Notify MediaManager of dark mode change (if available)
    this.callMediaManager('updateDarkMode', isDarkMode);
    
    // Update cover placeholder if in standalone mode
    if (!this.mediaManager) {
      this.showCoverPlaceholder();
    }
  }

  updatePlaceholderStyles(color) {
    const styleId = `placeholder-style${this.suffix}`;
    
    // Remove existing style if it exists
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Create new style element
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = `
      #wrapper${this.suffix} .search-field::placeholder {
        color: ${color} !important;
      }
      #wrapper${this.suffix} .search-field::-webkit-input-placeholder {
        color: ${color} !important;
      }
      #wrapper${this.suffix} .search-field::-moz-placeholder {
        color: ${color} !important;
      }
      #wrapper${this.suffix} .search-field:-ms-input-placeholder {
        color: ${color} !important;
      }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
  }

  initializeSearchOptimization() {
    this.nameTrie = new SearchTrie();
    this.artistTrie = new SearchTrie();
    this.indexCache = new Map();
    
    // Build tries for efficient prefix searching
    this.musicSource.forEach((music, index) => {
      if (music && music.name && music.artist) {
        this.nameTrie.insert(music.name, index);
        this.artistTrie.insert(music.artist, index);
        
        // Cache index strings for numeric search
        const displayIndex = (index + 1).toString();
        if (!this.indexCache.has(displayIndex[0])) {
          this.indexCache.set(displayIndex[0], []);
        }
        this.indexCache.get(displayIndex[0]).push({ index, displayIndex });
      }
    });
  }
  
  searchByIndexOptimized(query) {
    const results = [];
    const firstDigit = query[0];
    
    // Use cached index data for O(1) lookup of first digit
    const candidates = this.indexCache.get(firstDigit) || [];
    
    for (const candidate of candidates) {
      if (candidate.displayIndex.startsWith(query)) {
        const music = this.musicSource[candidate.index];
        if (music && music.name && music.artist) {
          results.push(music);
        }
      }
    }
    
    return results;
  }
  
  searchByTextOptimized(query) {
    const queryLower = query.toLowerCase();
    
    // Use tries to get matching indices efficiently
    const nameMatches = this.nameTrie.searchPrefix(queryLower);
    const artistMatches = this.artistTrie.searchPrefix(queryLower);
    
    // Combine results using Set for O(1) deduplication
    const allMatches = new Set([...nameMatches, ...artistMatches]);
    
    // Convert back to music objects
    const results = [];
    for (const index of allMatches) {
      const music = this.musicSource[index];
      if (music && music.name && music.artist) {
        results.push(music);
      }
    }
    
    return results;
  }
  
  filterFromPreviousResults(query, previousResults) {
    const isNumericQuery = /^\d+$/.test(query);
    const queryLower = query.toLowerCase();
    
    return previousResults.filter((music, originalIndex) => {
      if (!music || !music.name || !music.artist) {
        return false;
      }
      
      if (isNumericQuery) {
        const actualIndex = this.musicSource.indexOf(music);
        const displayIndex = (actualIndex + 1).toString();
        return displayIndex.startsWith(query);
      } else {
        const songName = String(music.name).toLowerCase().replace(/<[^>]*>/g, '').trim();
        const artistName = String(music.artist).toLowerCase().replace(/<[^>]*>/g, '').trim();
        return songName.startsWith(queryLower) || artistName.startsWith(queryLower);
      }
    });
  }
  
  performFullSearch(query) {
    const isNumericQuery = /^\d+$/.test(query);
    const queryLower = query.toLowerCase();
    const results = [];
    
    // Use for loop for better performance with instant refresh
    const sourceLength = this.musicSource.length;
    
    for (let index = 0; index < sourceLength; index++) {
      const music = this.musicSource[index];
      
      // Skip invalid entries quickly
      if (!music?.name || !music?.artist) continue;
      
      let matches = false;
      
      if (isNumericQuery) {
        // Fast numeric check
        const displayIndex = (index + 1).toString();
        matches = displayIndex.startsWith(query);
      } else {
        // Optimized text matching - avoid repeated operations
        const songName = music.name.toLowerCase();
        const artistName = music.artist.toLowerCase();
        matches = songName.startsWith(queryLower) || artistName.startsWith(queryLower);
      }
      
      if (matches) {
        results.push(music);
        
        // Optional: Limit results for very fast rendering
        if (results.length >= 200) break;
      }
    }
    
    return results;
  }

  handleSearch(e) {
    const query = e.target.value.trim();
    
    if (query === '') {
      this.isSearching = false;
      this.filteredMusic = [];
      this.restoreOriginalList();
      this.searchCache.clear();
      this.lastQuery = '';
      this.lastResults = [];
      return;
    }
    
    if (query.length < 1) {
      return;
    }
    
    // Clear any existing timeout for immediate response
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    
    // Perform search immediately for every character
    this.performInstantSearch(query);
  }

  performInstantSearch(query) {
    // Check cache first for performance
    if (this.searchCache.has(query)) {
      this.filteredMusic = [...this.searchCache.get(query)];
      this.isSearching = true;
      this.renderFilteredItems();
      return;
    }
    
    // Perform full search every time for consistency
    this.filteredMusic = this.performFullSearch(query);
    
    // Cache the result (limit cache size)
    if (this.searchCache.size > 50) { // Reduced cache size for instant refresh
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
    this.searchCache.set(query, [...this.filteredMusic]);
    
    this.isSearching = true;
    this.renderFilteredItems();
  }

  renderFilteredItems() {
    if (!this.musicListItems || !this.ulTag) return;
    
    // Use requestAnimationFrame for smoother updates
    if (this.renderFrame) {
      cancelAnimationFrame(this.renderFrame);
    }
    
    this.renderFrame = requestAnimationFrame(() => {
      // Clear existing content efficiently
      this.musicListItems.innerHTML = '';
      this.musicListItems.style.transform = 'translateY(0px)';
      
      const resultCount = this.filteredMusic.length;
      const minHeight = Math.max(resultCount * this.ROW_HEIGHT, this.ROW_HEIGHT);
      
      // Update spacer height
      if (this.musicListSpacer) {
        this.musicListSpacer.style.height = `${minHeight}px`;
      }
      
      // Adjust scrolling based on result count
      this.ulTag.style.overflowY = resultCount <= 8 ? 'hidden' : 'auto';
      
      const fragment = document.createDocumentFragment();
      
      if (resultCount === 0) {
        // No results message
        const noResults = document.createElement('li');
        noResults.className = 'search-no-results';
        noResults.style.cssText = `
          height: ${this.ROW_HEIGHT}px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          list-style: none;
          box-sizing: border-box;
        `;
        
        noResults.innerHTML = `
          <div class="row" style="justify-content: center; text-align: center; width: 100%;">
            <span>No songs found</span>
          </div>
        `;
        
        const isDarkMode = this.wrapper.classList.contains("dark-mode");
        noResults.style.color = isDarkMode ? 'white' : 'black';
        noResults.style.borderBottom = 'none';
        
        fragment.appendChild(noResults);
      } else {
        // Render results with performance optimization
        const maxResults = Math.min(resultCount, 100); // Limit for performance
        
        for (let i = 0; i < maxResults; i++) {
          const music = this.filteredMusic[i];
          
          if (!music?.name || !music?.artist || !music?.src) continue;
          
          // Find original index efficiently
          const originalIndex = this.musicSource.indexOf(music);
          if (originalIndex === -1) continue;
          
          const liTag = this.createSearchListItem(music, originalIndex);
          fragment.appendChild(liTag);
        }
        
        // Show truncation message if needed
        if (resultCount > 100) {
          const truncateMsg = document.createElement('li');
          truncateMsg.style.cssText = `
            height: ${this.ROW_HEIGHT}px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px;
            font-style: italic;
            opacity: 0.7;
          `;
          truncateMsg.innerHTML = `<span>Showing first 100 of ${resultCount} results</span>`;
          
          const isDarkMode = this.wrapper.classList.contains("dark-mode");
          truncateMsg.style.color = isDarkMode ? 'white' : 'black';
          
          fragment.appendChild(truncateMsg);
        }
      }
      
      // Apply changes in single operation
      this.musicListItems.appendChild(fragment);
      
      // Update playing indicators
      this.updatePlayingSong();
      
      this.renderFrame = null;
    });
  }
  
  restoreOriginalList() {
    if (!this.musicListItems || !this.ulTag) return;
    
    // Reset search state
    this.isSearching = false;
    this.filteredMusic = [];
    
    // Reset spacer height to original
    if (this.musicListSpacer) {
      this.musicListSpacer.style.height = `${this.musicSource.length * this.ROW_HEIGHT}px`;
    }
    
    // Restore normal scrolling behavior
    this.ulTag.style.overflowY = 'auto';
    
    // Reset render state to force re-render
    this.lastRenderStart = -1;
    this.lastRenderEnd = -1;
    this.forceRender = true;
    
    // Restore virtualized rendering
    this.renderVisibleItems();
  }

  handleMute() {
    const isAudioPlaying = !this.isMusicPaused;
    if (isAudioPlaying && !this.isMuted) {
      this.muteButton.disabled = true;
      return;
    }
  
    // Check if MediaManager has video override enabled
    const hasVideoOverride = this.mediaManager && this.mediaManager.videoOverride;
    
    if (hasVideoOverride) {
      // When video override is enabled, don't allow manual mute control
      // The mute state should be controlled automatically by music playback state
      console.log("Manual mute disabled - video override is controlling mute state");
      return;
    }
  
    // Only allow manual mute control when video override is NOT enabled
    // Use MediaManager if available, otherwise handle basic video muting
    if (this.mediaManager && this.mediaManager.videoAd) {
      this.mediaManager.videoAd.muted = !this.mediaManager.videoAd.muted;
      this.isMuted = this.mediaManager.videoAd.muted;
      this.muteButton.classList.toggle("muted", this.isMuted);
      this.muteButton.classList.toggle("unmuted", !this.isMuted);
    } else if (!this.mediaManager) {
      // Fallback video muting without MediaManager - but since standalone has no video, this does nothing
      console.log("Standalone mode - no video to mute");
    }
  }

  handleAudioPause() {
    this.muteButton.disabled = false;
    this.pauseMusic();
  }

  handleAudioPlay() {
    this.muteButton.disabled = true;
    this.playMusic();
  }

  listcolourblack() {
    const listItems = this.musicListItems?.querySelectorAll("li") || [];
    listItems.forEach(item => {
      item.style.color = 'white';
      item.style.borderBottom = '3px solid white';
    });
    this.musicList.style.backgroundColor = "black";
    this.closeMoreMusicBtn.style.color = "white";
    this.header.style.color = "white";
  }
  
  listcolourwhite() {
    const listItems = this.musicListItems?.querySelectorAll("li") || [];
    listItems.forEach(item => {
      item.style.color = 'black';
      item.style.borderBottom = '3px solid black';
    });
    this.musicList.style.backgroundColor = "white";
    this.closeMoreMusicBtn.style.color = "black";
    this.header.style.color = "black";
  }

  // Add resize observer for responsive behavior
  setupResizeObserver() {
    if ('ResizeObserver' in window && this.ulTag) {
      const resizeObserver = new ResizeObserver(() => {
        // Re-render when container size changes
        this.renderVisibleItems();
      });
      resizeObserver.observe(this.ulTag);
    }
  }

  // Cleanup method
  cleanup() {
    // Clean up progress bar resources
    this.cleanupProgressBar();
    
    // Clear timeouts and intervals
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    if (this.renderFrame) {
      cancelAnimationFrame(this.renderFrame);
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Stop audio
    if (this.mainAudio) {
      this.mainAudio.pause();
      this.mainAudio.currentTime = 0;
      this.mainAudio.src = '';
      this.mainAudio.load();
    }
    
    // Clear lists
    if (this.ulTag) {
      this.ulTag.innerHTML = '';
    }
    
    // Clear cover area
    if (this.coverArea) {
      this.coverArea.innerHTML = '';
    }
    
    // Cleanup MediaManager if available
    this.callMediaManager('cleanup');
  }
}

// Updated handleSize function to work with MediaManager
function handleSize() {
  console.log("Setting up video controls for player 1");
  
  // This function now only needs to ensure MediaManager is properly set up
  if (window.homeMediaManager && window.homeMediaManager.setupVideoSizeToggle) {
    window.homeMediaManager.setupVideoSizeToggle();
  } else if (typeof MediaManager !== 'undefined') {
    // Try to initialize if not available
    try {
      if (!window.homeMediaManager) {
        window.homeMediaManager = new MediaManager('');
      }
      if (window.homeMediaManager.setupVideoSizeToggle) {
        window.homeMediaManager.setupVideoSizeToggle();
      }
    } catch (error) {
      console.warn('Could not setup video controls:', error);
    }
  }
}

// Global player initialization functions
async function initializeHomePlayer() {
  if (!window.homePlayer) {
    // Wait for music data to load first
    if (!window.allMusic || window.allMusic.length === 0) {
      console.log('Waiting for music data to load...');
      if (typeof loadMusicData === 'function') {
        await loadMusicData();
      }
    }
    
    console.log('Initializing Home Player...');
    window.homePlayer = new MusicPlayer();
    handleSize();
    
    // Prefetch assets for home player if MediaManager is available
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        if (window.allMusic && window.homePlayer.mediaManager) {
          // Prefetch assets if available
          if (window.homePlayer.mediaManager.prefetchPlaylistAssets) {
            window.homePlayer.mediaManager.prefetchPlaylistAssets(window.allMusic);
          }
        }
      });
    }
  }
}

async function initializeDisguisePlayer() {
  if (!window.disguisePlayer) {
    // Wait for music data to load first
    if (!window.ReducedMusic || window.ReducedMusic.length === 0) {
      console.log('Waiting for reduced music data to load...');
      if (typeof loadMusicData === 'function') {
        await loadMusicData();
      }
    }
    
    console.log('Initializing Disguise Player...');
    window.disguisePlayer = new MusicPlayer('2');
    
    // Prefetch assets for disguise player if MediaManager is available
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        if (window.ReducedMusic && window.disguisePlayer.mediaManager) {
          // Prefetch assets if available
          if (window.disguisePlayer.mediaManager.prefetchPlaylistAssets) {
            window.disguisePlayer.mediaManager.prefetchPlaylistAssets(window.ReducedMusic);
          }
        }
      });
    }
  }
}

// Add this function to AudioPlayer00.js
function resetPlayerState() {
  // Reset global player variables if they exist
  if (typeof musicIndex !== 'undefined') {
      window.musicIndex = 1;
  }
  if (typeof isMusicPaused !== 'undefined') {
      window.isMusicPaused = true;
  }
  
  // Reset UI states for both players
  ['', '2'].forEach(suffix => {
      const playBtn = document.querySelector(`#wrapper${suffix} .play-pause i`);
      if (playBtn) {
          playBtn.classList.remove('pause');
          playBtn.classList.add('play');
          playBtn.textContent = 'play_arrow';
      }
      
      // Reset progress bars
      const progressBar = document.querySelector(`#wrapper${suffix} .progress-bar`);
      if (progressBar) {
          progressBar.style.width = '0%';
      }
      
      // Reset time displays
      const currentTime = document.querySelector(`#wrapper${suffix} .current-time`);
      const maxDuration = document.querySelector(`#wrapper${suffix} .max-duration`);
      if (currentTime) currentTime.textContent = '0:00';
      if (maxDuration) maxDuration.textContent = '0:00';
      
      // Clear any wrapper paused state
      const wrapper = document.querySelector(`#wrapper${suffix}`);
      if (wrapper) {
          wrapper.classList.remove('paused');
      }
  });
  
  console.log('Player state reset complete');
}

function cleanupPlayers() {
  console.log('Cleaning up music players...');
  
  // Cleanup MediaManagers first if available
  if (typeof cleanupMediaManagers === 'function') {
    cleanupMediaManagers();
  }
  
  if (window.homePlayer) {
    try {
      window.homePlayer.cleanup();
      console.log('Home player deinitialized');
    } catch (error) {
      console.warn('Error cleaning up home player:', error);
    }
    window.homePlayer = null;
  }
  
  if (window.disguisePlayer) {
    try {
      window.disguisePlayer.cleanup();
      console.log('Disguise player deinitialized');
    } catch (error) {
      console.warn('Error cleaning up disguise player:', error);
    }
    window.disguisePlayer = null;
  }
  
  console.log('All players cleaned up successfully');
}

// Only initialize handleSize on DOM load - players will be initialized on login
document.addEventListener("DOMContentLoaded", () => {
  // Initialize MediaManagers first if available
  if (typeof initializeMediaManagers === 'function') {
    try {
      initializeMediaManagers();
    } catch (error) {
      console.warn('Failed to initialize MediaManagers:', error);
    }
  }
  
  // Then setup video controls (only for player 1)
  handleSize();
});

window.cleanupPlayers = cleanupPlayers;