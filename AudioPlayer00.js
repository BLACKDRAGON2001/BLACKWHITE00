// Add this to your existing test.js file
document.getElementById("title").addEventListener("click", function() {
  pauseAudio();
  // Clear HomePage player state
  localStorage.removeItem("musicIndex");
  localStorage.removeItem("isMusicPaused");
  // Existing logout logic
  document.getElementById("HomePage").style.display = "none";
  document.getElementById("LoginPage").style.display = "block";
  localStorage.removeItem("LoginTime");
  document.body.style.backgroundColor = "white";
  clearInputFields();
  refreshPage();
});

document.getElementById("title2").addEventListener("click", function() {
  pauseAudio2();
  // Clear DisguisePage player state
  localStorage.removeItem("musicIndex2");
  localStorage.removeItem("isMusicPaused2");
  // Existing logout logic
  document.getElementById("DisguisePage").style.display = "none";
  document.getElementById("LoginPage").style.display = "block";
  localStorage.removeItem("LoginTime");
  document.body.style.backgroundColor = "white";
  clearInputFields();
  refreshPage();
});

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
      node = node.children[char];
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
    // Configure media folders based on page
    this.suffix = suffix;
    this.imageFolder = suffix === '2' ? 'MainAssets/ImagesDisguise/' : 'MainAssets/Images/';
    this.videoFolder = suffix === '2' ? 'VideosDisguise/' : 'MainAssets/Videos/';
    this.audioFolder = 'MainAssets/Audios/';
    this.audioBucketUrl = 'https://r2-asset-proxy.mcvities755.workers.dev/account2/audios/';
    this.videoBucketUrls = [
      'https://r2-asset-proxy.mcvities755.workers.dev/account1/videos1/',      // Account 1 - videos1
      'https://r2-asset-proxy.mcvities755.workers.dev/account2/videos2/',     // Account 2 - videos2  
      'https://r2-asset-proxy.mcvities755.workers.dev/account3/videos3/'      // Account 3 - videos3
    ];

    // Configure R2 bucket URLs for images
    this.imageBucketUrl = suffix === '2' 
      ? 'https://r2-asset-proxy.mcvities755.workers.dev/account3/images-disguise/' // Disguise images
      : 'https://r2-asset-proxy.mcvities755.workers.dev/account3/images/'; // Main images

    // Element selectors
    this.wrapper = document.querySelector(`#wrapper${suffix}`);
    this.coverArea = this.wrapper.querySelector(".img-area");
    this.musicName = this.wrapper.querySelector(".song-details .name");
    this.musicArtist = this.wrapper.querySelector(".song-details .artist");
    this.playPauseBtn = this.wrapper.querySelector(".play-pause");
    this.prevBtn = this.wrapper.querySelector(`#prev${suffix}`);
    this.nextBtn = this.wrapper.querySelector(`#next${suffix}`);
    this.mainAudio = this.wrapper.querySelector(`#main-audio${suffix}`);
    this.videoAd = this.wrapper.querySelector(`#video${suffix}`);
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
    
    // Only initialize border box for Player 2
    if (suffix === '2') {
      this.borderBox = document.getElementById(`video-border-box${suffix}`);
    }

    // Player state
    this.musicIndex = 1;
    this.isMusicPaused = true;
    this.musicSource = suffix === '2' ? ReducedMusic : allMusic;
    this.originalOrder = [...this.musicSource];
    this.shuffledOrder = [];
    this.isMuted = false;
    this.isInitializing = true;

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

    this.controlsToggledManually = false;
    this.videoOverride = false;
    
    // Only set up border box styles for Player 2
    if (suffix === '2') {
      this.borderBoxStyles = {
        player2DarkMode: {
          top: '0px',
          left: '0px',
          width: '370px',
          height: '370px',
          transform: 'translate(0, 0)',
          borderRadius: '15px'
        }
      };

      this.borderBoxState = {
        isVisible: false,
        currentStyle: null,
        lastUpdate: 0
      };

      this.updateBorderBoxDebounced = this.debounce(this.updateBorderBoxImmediate.bind(this), 16);
    }
    
    // Only initialize if not blocked
    if (!window.playerInitBlocked) {
      this.initialize();
    } else {
      // Just set up basic event listeners
      this.setupEventListeners();
      this.isInitializing = false;
      console.log(`Player ${this.suffix || '1'} created but initialization blocked`);
    }
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
    // Initialize search optimization
    this.initializeSearchOptimization();
    
    // Test autoplay capability on mobile
    //this.testAutoplaySupport();
    
    // Only initialize border box for Player 2
    if (this.suffix === '2') {
      this.initializeBorderBox();
    }
  
    setTimeout(() => {
      this.isInitializing = false;
    }, 100)
  }

  delayedInitialize() {
    if (this.hasInitialized) return;
    
    console.log(`Delayed initialization for player ${this.suffix || '1'}`);
    
    this.loadPersistedState();
    this.populateMusicList(this.originalOrder);
    this.updatePlayingSong();
    this.setupResizeObserver();
    this.initializeSearchOptimization();
    
    if (this.suffix === '2') {
        this.initializeBorderBox();
    }
    
    this.hasInitialized = true;
    
    setTimeout(() => {
        this.isInitializing = false;
    }, 100);
  }

  // Only used for Player 2
  initializeBorderBox() {
    if (this.suffix !== '2' || !this.borderBox) return;
    
    // Force hide border box with multiple methods to ensure it's gone
    this.borderBox.style.display = "none";
    this.borderBox.style.visibility = "hidden";
    this.borderBox.style.opacity = "0";
    this.borderBox.classList.remove('player2-dark');
    
    // Reset border box state
    this.borderBoxState = {
      isVisible: false,
      currentStyle: null,
      lastUpdate: 0
    };
    
    // For extra safety, use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      if (this.borderBox) {
        this.borderBox.style.display = "none";
      }
    });
  }

  updateBorderBoxDisplay() {
    // Only update border box for Player 2
    if (this.suffix === '2') {
      this.updateBorderBoxDebounced();
    }
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
    this.videoAd.addEventListener("ended", () => this.handleVideoEnd());

    this.musicName.addEventListener("click", () => this.toggleVideoControls());

    // Virtualized scroll event
    this.ulTag.addEventListener("scroll", () => this.handleVirtualizedScroll(), { passive: true });

    const seeVideoBtn = document.querySelector('.seeVideo');
    if (seeVideoBtn) {
      seeVideoBtn.addEventListener("click", () => this.toggleVideoOverride());
    }

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

  toggleVideoOverride() {
    this.videoOverride = !this.videoOverride;
    
    if (this.videoOverride) {
      // Override mode: always show video
      this.showVideoOverride();
    } else {
      // Normal mode: restore original behavior
      this.toggleVideoDisplay(this.isMusicPaused);
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
  
  showVideoOverride() {
    if (this.suffix === '2') {
      this.videoAd.style.display = "none";
      return;
    }
    
    this.videoAd.style.display = "block";
    
    const videoSize = 280;
    const containerSize = 370;
    const videoOffset = (containerSize - videoSize) / 2;
    
    Object.assign(this.videoAd.style, {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    });
    
    // Set video mute state based on audio playing state
    this.videoAd.muted = !this.isMusicPaused;
    
    // Force video to play with error handling
    const playPromise = this.videoAd.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn("Video autoplay failed:", error);
        // Retry after a short delay
        setTimeout(() => {
          this.videoAd.play().catch(e => {
            console.warn("Video retry also failed:", e);
          });
        }, 100);
      });
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

  toggleVideoControls() {
    if (!this.videoAd.classList.contains("bigger-video")) return;
  
    this.controlsToggledManually = !this.controlsToggledManually;
    this.videoAd.controls = this.controlsToggledManually;
  
    if (!this.controlsToggledManually && this.mainAudio.paused) {
      this.videoAd.play()
    }
  }

  loadMusic(index) {
    const music = this.isShuffleMode ?
      this.shuffledOrder[index - 1] :
      this.musicSource[index - 1];
  
    this.musicName.textContent = music.name;
    this.musicArtist.textContent = music.artist;
  
    const { coverType = 'Images', src, type = 'jpg' } = music;
    this.coverArea.innerHTML = '';
  
    // Choose image or video element
    const mediaElement = (this.suffix === '2' || coverType !== 'video')
      ? this.createImageElement(src, type)
      : this.createVideoElementWithFallback(src, type);
  
    this.coverArea.appendChild(mediaElement);
  
    // Use backup fallback only for the first song (index 1)
    if (index === 1) {
      this.setInitialAudioSource(src);
    } else {
      this.setAudioSourceWithFallback(src);
    }
  
    // Only set video source for player 1, but keep video element for player 2 (for border positioning)
    if (this.suffix !== '2') {
      // Original player - full video functionality
      this.setVideoSourceWithFallback(src);
      
      // If video override is active, ensure video plays after source change
      if (this.videoOverride) {
        // Wait for video to load then apply override behavior
        const handleVideoLoaded = () => {
          this.showVideoOverride();
        };
        
        // Use both events to ensure it works across different scenarios
        this.videoAd.addEventListener('loadeddata', handleVideoLoaded, { once: true });
        this.videoAd.addEventListener('canplay', handleVideoLoaded, { once: true });
        
        // Fallback timeout in case events don't fire
        setTimeout(() => {
          if (this.videoOverride) {
            this.showVideoOverride();
          }
        }, 500);
      }
    } else {
      // Player 2 - NO VIDEO, but keep element for border reference
      this.videoAd.src = "";
      this.videoAd.style.display = "none";
    }
  
    localStorage.setItem(`musicIndex${this.suffix}`, index);
    this.updatePlayingSong();
    
    // Only update border box for Player 2
    if (this.suffix === '2' && !this.isInitializing) {
      this.updateBorderBoxDisplay();
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

  /*waitForAudioReady() {
    return new Promise((resolve) => {
      if (this.mainAudio.readyState >= 3) { // HAVE_FUTURE_DATA or higher
        resolve();
        return;
      }
      
      const handleCanPlay = () => {
        this.mainAudio.removeEventListener('canplay', handleCanPlay);
        this.mainAudio.removeEventListener('loadeddata', handleCanPlay);
        resolve();
      };
      
      this.mainAudio.addEventListener('canplay', handleCanPlay);
      this.mainAudio.addEventListener('loadeddata', handleCanPlay);
      
      // Fallback timeout
      setTimeout(() => {
        this.mainAudio.removeEventListener('canplay', handleCanPlay);
        this.mainAudio.removeEventListener('loadeddata', handleCanPlay);
        resolve();
      }, 2000);
    });
  }*/

  createVideoElementWithFallback(src, type) {
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.loop = true;
  
    // R2 sources
    const r2Sources = [
      `${this.videoBucketUrls[0]}${src}.${type}`,
      `${this.videoBucketUrls[1]}${src}.${type}`,
      `${this.videoBucketUrls[2]}${src}.${type}`
    ];
    
    // Local and upload fallbacks
    const localVideoSrc = `${this.videoFolder}${src}.${type}`;
    const uploadVideoSrc = `Upload/${src}.${type}`; // New upload folder fallback
    const allSources = [...r2Sources, localVideoSrc, uploadVideoSrc];
  
    // Track fallback attempts
    let attempt = 0;
  
    const tryNextSource = () => {
      if (attempt >= allSources.length) {
        console.error("All video sources (R2, local, and upload) failed to load.");
        return;
      }
      
      video.src = allSources[attempt];
      
      // Mark R2 as unavailable if we've exhausted R2 sources
      if (attempt >= r2Sources.length) {
        this.r2Available = false;
        console.warn("R2 video sources failed, using local/upload fallback");
      }
      
      attempt++;
    };
  
    // On error, try next fallback source
    video.onerror = () => {
      console.warn(`Video source failed: ${allSources[attempt - 1]}, trying next fallback`);
      tryNextSource();
    };
  
    // Start with first source
    tryNextSource();
  
    return video;
  }

  setVideoSourceWithFallback(src) {
    // R2 sources
    const r2Sources = [
      `${this.videoBucketUrls[0]}${src}.mp4`,
      `${this.videoBucketUrls[1]}${src}.mp4`,
      `${this.videoBucketUrls[2]}${src}.mp4`
    ];
    
    // Local and upload fallbacks
    const localVideoSrc = `${this.videoFolder}${src}.mp4`;
    const uploadVideoSrc = `Upload/${src}.mp4`; // New upload folder fallback
    const allSources = [...r2Sources, localVideoSrc, uploadVideoSrc];
  
    let attempt = 0;
  
    const tryNextSource = () => {
      if (attempt >= allSources.length) {
        console.error("All videoAd sources (R2, local, and upload) failed to load.");
        return;
      }
      
      this.videoAd.src = allSources[attempt];
      
      // Mark R2 as unavailable if we've exhausted R2 sources
      if (attempt >= r2Sources.length) {
        this.r2Available = false;
        console.warn("R2 videoAd sources failed, using local/upload fallback");
      }
      
      attempt++;
    };
  
    this.videoAd.onerror = () => {
      console.warn(`videoAd source failed: ${allSources[attempt - 1]}, trying next fallback`);
      tryNextSource();
    };
  
    tryNextSource();
  }   

  createImageElement(src, type) {
    const img = document.createElement('img');
    
    // Try R2 bucket first
    const r2ImageSrc = `${this.imageBucketUrl}${src}.${type}`;
    const localImageSrc = `${this.imageFolder}${src}.${type}`;
    const uploadImageSrc = `Upload/${src}.${type}`; // New upload folder fallback
    
    img.src = r2ImageSrc;
    img.alt = this.musicName.textContent;
    
    // Add error handling for image loading
    img.onerror = () => {
      console.warn(`Failed to load image from R2 bucket: ${r2ImageSrc}, trying local: ${localImageSrc}`);
      
      // For disguise player (Player 2), try local first, then upload, then create white fallback
      if (this.suffix === '2') {
        img.src = localImageSrc;
        img.onerror = () => {
          console.warn(`Failed to load local image: ${localImageSrc}, trying upload: ${uploadImageSrc}`);
          img.src = uploadImageSrc;
          img.onerror = () => {
            console.warn(`Failed to load upload image: ${uploadImageSrc}, using white fallback`);
            this.createWhiteFallback(img);
          };
        };
      } else {
        // For regular player, try local folder then upload folder
        img.src = localImageSrc;
        img.onerror = () => {
          console.warn(`Failed to load local image: ${localImageSrc}, trying upload: ${uploadImageSrc}`);
          img.src = uploadImageSrc;
          img.onerror = () => {
            console.warn(`Failed to load upload image: ${uploadImageSrc}`);
          };
        };
      }
      this.r2Available = false;
    };
    
    return img;
  }

  createWhiteFallback(imgElement) {
    // Create a white div to replace the failed image for disguise player
    const whiteDiv = document.createElement('div');
    whiteDiv.style.cssText = `
      width: 100%;
      height: 100%;
      background-color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: inherit;
      min-height: 280px;
    `;
    
    // Replace the image element with the white div
    if (imgElement.parentNode) {
      imgElement.parentNode.replaceChild(whiteDiv, imgElement);
    }
    
    return whiteDiv;
  }

  togglePlayPause() {
    this.isMusicPaused ? this.playMusic() : this.pauseMusic();
  }

  async playMusic() {
    try {
      // Remove the waitForAudioReady call that might be causing delays
      // Just try to play directly
      
      const playPromise = this.mainAudio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        
        // Only update UI state after successful play
        this.wrapper.classList.add("paused");
        this.playPauseBtn.querySelector("i").textContent = "pause";
        this.isMusicPaused = false;
        localStorage.setItem(`isMusicPaused${this.suffix}`, false);
        
        if (this.videoOverride) {
          this.videoAd.muted = true;
          this.showVideoOverride();
        } else {
          this.toggleVideoDisplay(false);
        }
        
        this.resetVideoSize();
        
        if (this.suffix === '2') {
          this.updateBorderBoxDisplay();
        }
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
        // You could show a toast or notification here
        console.log("Tap the play button to start music");
      }
    }
    this.updatePlayingSong();
  }
  
  // Update the existing pauseMusic method to handle video unmuting in override mode:
  pauseMusic() {
    this.wrapper.classList.remove("paused");
    this.playPauseBtn.querySelector("i").textContent = "play_arrow";
    this.mainAudio.pause();
    this.isMusicPaused = true;
    localStorage.setItem(`isMusicPaused${this.suffix}`, true);
    
    if (this.videoOverride) {
      // In override mode: unmute video when audio pauses and ensure it's playing
      this.videoAd.muted = false;
      this.showVideoOverride();
    } else {
      this.toggleVideoDisplay(true);
      this.muteVideo();
    }
    
    this.resetVideoSize();
    
    // Only update border box for Player 2
    if (this.suffix === '2') {
      this.updateBorderBoxDisplay();
    }
  }

  resetVideoSize() {
    this.videoAd.classList.remove("bigger-video");
    this.videoAd.classList.add("overlay-video");
    this.videoAd.controls = false;
    this.controlsToggledManually = false;
    this.videoAd.loop = true;
  }
  
  toggleVideoDisplay(show) {
    // If video override is active, use override behavior instead
    if (this.videoOverride) {
      this.showVideoOverride();
      return;
    }
    
    const isDarkMode = this.wrapper.classList.contains("dark-mode");
    
    if (show) {
      if (this.suffix === '2') {
        this.videoAd.style.display = "none";
      } else {
        this.videoAd.style.display = "block";
        
        const videoSize = 280;
        const containerSize = 370;
        const videoOffset = (containerSize - videoSize) / 2;
        
        // Batch video positioning updates
        Object.assign(this.videoAd.style, {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        });
        
        this.videoAd.play();
      }
    } else {
      if (this.suffix === '2') {
        this.videoAd.style.display = "none";
        this.videoAd.pause();
      } else {
        this.videoAd.style.display = "none";
        this.videoAd.pause();
      }
    }
  }

  muteVideo() {
    this.videoAd.muted = true;
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
    this.resetVideoSize();
  }

  handleProgressClick(e) {
    const clickedOffsetX = e.offsetX;
    const songDuration = this.mainAudio.duration;
    this.mainAudio.currentTime = (clickedOffsetX / this.progressArea.clientWidth) * songDuration;
    this.playMusic();
  }

  updateProgress(e) {
    const { currentTime, duration } = e.target;
    this.progressBar.style.width = `${(currentTime / duration) * 100}%`;

    const currentMin = Math.floor(currentTime / 60);
    const currentSec = Math.floor(currentTime % 60).toString().padStart(2, "0");
    this.wrapper.querySelector(".current-time").textContent = `${currentMin}:${currentSec}`;

    if (!isNaN(duration)) {
      const totalMin = Math.floor(duration / 60);
      const totalSec = Math.floor(duration % 60).toString().padStart(2, "0");
      this.wrapper.querySelector(".max-duration").textContent = `${totalMin}:${totalSec}`;
    }
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

  
  /*createMusicListItem(music, actualIndex) {
    const liTag = document.createElement("li");
    liTag.setAttribute("li-index", actualIndex + 1);

    // Check if we already have the duration cached
    const cachedDuration = this.getDurationCache(music.src);
    const displayDuration = cachedDuration || "3:40";

    liTag.innerHTML = `
      <div class="row">
        <span>${music.name}</span>
        <p>${music.artist}</p>
      </div>
      <span id="${music.src}" class="audio-duration">${displayDuration}</span>
      <audio class="${music.src}" src="${this.audioBucketUrl}${music.src}.mp3"></audio>
    `;

    // Apply dark mode styles immediately if in dark mode
    const isDarkMode = this.wrapper.classList.contains("dark-mode");
    if (isDarkMode) {
      liTag.style.color = 'white';
      liTag.style.borderBottom = '3px solid white';
    } else {
      liTag.style.color = 'black';
      liTag.style.borderBottom = '3px solid black';
    }

    const liAudioTag = liTag.querySelector(`.${music.src}`);
    const durationSpan = liTag.querySelector(".audio-duration");
    
    // Add fallback for list audio elements with throttled logging
    liAudioTag.onerror = () => {
      this.throttledLog('audio_r2', `List audio failed from R2, trying local: ${this.audioFolder}${music.src}.mp3`, music.src);
      liAudioTag.src = `${this.audioFolder}${music.src}.mp3`;
      
      liAudioTag.onerror = () => {
        this.throttledLog('audio_local', `List audio failed from local, trying upload: Upload/${music.src}.mp3`, music.src);
        liAudioTag.src = `Upload/${music.src}.mp3`;
        this.r2Available = false;
        
        liAudioTag.onerror = () => {
          this.throttledLog('audio_all', `All audio sources failed for: ${music.src}`, music.src);
        };
      };
    };
    
    // Only load duration if not already cached
    if (!cachedDuration) {
      liAudioTag.addEventListener("loadeddata", () => {
        try {
          const duration = liAudioTag.duration;
          if (isNaN(duration) || duration === 0) {
            this.throttledLog('duration', `Invalid duration for: ${music.src}`, music.src);
            return;
          }
          
          const totalMin = Math.floor(duration / 60);
          const totalSec = Math.floor(duration % 60).toString().padStart(2, "0");
          const formattedDuration = `${totalMin}:${totalSec}`;
          
          // Cache the duration
          this.setDurationCache(music.src, formattedDuration);
          
          // Update display only if this element is still in the DOM
          if (durationSpan && durationSpan.isConnected) {
            durationSpan.textContent = formattedDuration;
          }
        } catch (error) {
          this.throttledLog('duration_error', `Duration calculation error for ${music.src}: ${error.message}`, music.src);
        }
      });
    }

    liTag.addEventListener("click", () => {
      try {
        // Set the music index based on current mode
        if (this.isShuffleMode) {
          const clickedMusic = this.musicSource[actualIndex];
          const shuffledIndex = this.shuffledOrder.findIndex(song => song.src === clickedMusic.src);
          this.musicIndex = shuffledIndex >= 0 ? shuffledIndex + 1 : 1;
        } else {
          this.musicIndex = actualIndex + 1;
        }
        this.loadMusic(this.musicIndex);
        this.playMusic();
        this.resetVideoSize();
      } catch (error) {
        this.throttledLog('click_error', `Click handler error: ${error.message}`, music.src);
      }
    });

    return liTag;
  }*/

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
        this.resetVideoSize();
        
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
        this.resetVideoSize();
        
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
      const isPlaying = id === currentMusic.src;

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
        voiceBtns.style.setProperty('background-color', 'black', 'important')
        voiceBtns.style.setProperty('color', 'white', 'important')
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
      
      // Only update border box for Player 2
      if (this.suffix === '2') {
        this.updateBorderBoxDisplay();
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
        voiceBtns.style.removeProperty('background-color')
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
      
      // Only update border box for Player 2
      if (this.suffix === '2') {
        this.updateBorderBoxDisplay();
      }
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

  performSearch(query) {
    // Check cache first
    if (this.searchCache.has(query)) {
      this.filteredMusic = [...this.searchCache.get(query)]; // Create new array to avoid reference issues
      this.isSearching = true;
      this.renderFilteredItems();
      return;
    }
    
    // For reliability, always do a full search instead of incremental
    // The caching provides the performance benefit we need
    this.filteredMusic = this.performFullSearch(query);
    
    // Cache the result (limit cache size to prevent memory issues)
    if (this.searchCache.size > 100) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
    this.searchCache.set(query, [...this.filteredMusic]);
    this.lastQuery = query;
    this.lastResults = [...this.filteredMusic];
    
    this.isSearching = true;
    this.renderFilteredItems();
  }
  
  // Replace the renderFilteredItems method:
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
  
  // Replace the restoreOriginalList method:
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

    this.videoAd.muted = !this.videoAd.muted;
    this.isMuted = this.videoAd.muted;
    this.muteButton.classList.toggle("muted", this.isMuted);
    this.muteButton.classList.toggle("unmuted", !this.isMuted);
  }

  handleAudioPause() {
    this.muteButton.disabled = false;
    this.pauseMusic();
  }

  handleAudioPlay() {
    this.muteButton.disabled = true;
    this.playMusic();
  }

  handleVideoEnd() {
    this.muteButton.disabled = false;
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

  updateBorderBoxImmediate() {
    // Only handle border box for Player 2
    if (this.suffix !== '2' || !this.borderBox) return;

    if (this.isInitializing) {
      this.borderBox.style.display = "none";
      return;
    }
    
    const now = performance.now();
    
    // Throttle updates to avoid excessive DOM manipulation
    if (now - this.borderBoxState.lastUpdate < 16) return;
    
    const isDarkMode = this.wrapper.classList.contains("dark-mode");
    
    // Determine visibility and style in one pass
    let shouldShowBorder = false;
    let targetStyle = null;
    
    if (isDarkMode) {
      shouldShowBorder = true;
      targetStyle = 'player2DarkMode';
    }
    
    // Only update if state actually changed
    if (this.borderBoxState.isVisible !== shouldShowBorder || 
        this.borderBoxState.currentStyle !== targetStyle) {
      
      // Batch all DOM operations together
      this.applyBorderBoxChanges(shouldShowBorder, targetStyle);
      
      // Update cached state
      this.borderBoxState.isVisible = shouldShowBorder;
      this.borderBoxState.currentStyle = targetStyle;
      this.borderBoxState.lastUpdate = now;
    }
  }

  applyBorderBoxChanges(shouldShow, styleKey) {
    if (shouldShow && styleKey) {
      const styles = this.borderBoxStyles[styleKey];
      
      // Use CSS transform for better performance
      const cssText = `
        display: block;
        top: ${styles.top};
        left: ${styles.left};
        width: ${styles.width};
        height: ${styles.height};
        transform: ${styles.transform};
        border-radius: ${styles.borderRadius};
      `;
      
      // Apply all styles at once using cssText (single reflow)
      this.borderBox.style.cssText = cssText;
    } else {
      // Hide with minimal DOM impact
      this.borderBox.style.cssText = 'display: none; visibility: hidden; opacity: 0;';
    }
  }

  setupPerformanceMonitoring() {
    if (this.suffix === '2' && this.borderBox && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            // Border box is not visible, can skip some updates
            this.borderBoxState.isVisible = false;
          }
        });
      });
      
      observer.observe(this.borderBox);
    }
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
}

function handleSize() {
  // Only handle video element for player 1 (no video interaction for player 2)
  const sizer = document.getElementById("video");
  
  if (!sizer) return;
  
  if (!sizer.classList.contains("overlay-video") && !sizer.classList.contains("bigger-video")) {
    sizer.classList.add("overlay-video");
  }

  sizer.addEventListener("click", () => {
    const player = window.homePlayer;
    
    // Prevent size toggle if controls are shown by user
    if (sizer.classList.contains("bigger-video") && player && player.controlsToggledManually) return;

    sizer.classList.toggle("overlay-video");
    sizer.classList.toggle("bigger-video");
    
    // Update video positioning based on new size
    if (player && sizer.style.display !== "none") {
      if (sizer.classList.contains('bigger-video')) {
        // Full size video positioning
        sizer.style.top = '0px';
        sizer.style.left = '0px';
        sizer.style.transform = 'translate(0, 0)';
      } else {
        // Overlay size video positioning (centered)
        const videoSize = 280;
        const containerSize = 370;
        const videoOffset = (containerSize - videoSize) / 2;
        
        sizer.style.top = '50%';
        sizer.style.left = '50%';
        sizer.style.transform = 'translate(-50%, -50%)';
      }
    }
  });
}

// ADD these functions at the END of your AudioPlayer00.js file, just before the DOMContentLoaded event listener

// Global player state isolation
let homePlayerInitialized = false;
let disguisePlayerInitialized = false;

// Initialize Home Player
window.initializeHomeMusicPlayer = function() {
  if (homePlayerInitialized) return;
  
  console.log('Initializing Home Music Player...');
  
  // Stop disguise player if it exists and is real
  if (window.disguisePlayer && typeof window.disguisePlayer.pauseMusic === 'function') {
      window.disguisePlayer.pauseMusic();
  }
  
  const disguiseAudio = document.getElementById('main-audio2');
  const disguiseVideo = document.getElementById('video2');
  const disguiseMediaContainer = document.getElementById('media-container2');
  
  if (disguiseAudio) {
      disguiseAudio.pause();
      disguiseAudio.src = '';
      disguiseAudio.currentTime = 0;
  }
  if (disguiseVideo) {
      disguiseVideo.pause();
      disguiseVideo.src = '';
      disguiseVideo.currentTime = 0;
      disguiseVideo.style.display = 'none';
  }
  if (disguiseMediaContainer) {
      disguiseMediaContainer.innerHTML = '';
  }
  
  // Create real home player if it doesn't exist or is a dummy
  if (!window.homePlayer || typeof window.homePlayer.loadMusic !== 'function') {
      console.log('Creating real home player...');
      window.homePlayer = new MusicPlayer();
  }
  
  // Initialize/reset home player
  if (window.homePlayer && typeof window.homePlayer.loadMusic === 'function') {
      window.homePlayer.musicIndex = 1;
      window.homePlayer.isMusicPaused = true;
      
      const homeAudio = document.getElementById('main-audio');
      const homeVideo = document.getElementById('video');
      const homeMediaContainer = document.getElementById('media-container');
      
      if (homeAudio) {
          homeAudio.pause();
          homeAudio.src = '';
          homeAudio.currentTime = 0;
      }
      if (homeVideo) {
          homeVideo.pause();
          homeVideo.src = '';
          homeVideo.currentTime = 0;
          homeVideo.style.display = 'none';
      }
      if (homeMediaContainer) {
          homeMediaContainer.innerHTML = '';
      }
      
      // Load first song with delay
      setTimeout(() => {
          if (window.homePlayer && window.homePlayer.musicSource && window.homePlayer.musicSource.length > 0) {
              window.homePlayer.loadMusic(1);
              window.homePlayer.updatePlayingSong();
          }
      }, 200);
  }
  
  homePlayerInitialized = true;
  disguisePlayerInitialized = false;
};

// UPDATE your window.initializeDisguiseMusicPlayer function:

window.initializeDisguiseMusicPlayer = function() {
  if (disguisePlayerInitialized) return;
  
  console.log('Initializing Disguise Music Player...');
  
  // Stop home player if it exists and is real
  if (window.homePlayer && typeof window.homePlayer.pauseMusic === 'function') {
      window.homePlayer.pauseMusic();
  }
  
  const homeAudio = document.getElementById('main-audio');
  const homeVideo = document.getElementById('video');
  const homeMediaContainer = document.getElementById('media-container');
  
  if (homeAudio) {
      homeAudio.pause();
      homeAudio.src = '';
      homeAudio.currentTime = 0;
  }
  if (homeVideo) {
      homeVideo.pause();
      homeVideo.src = '';
      homeVideo.currentTime = 0;
      homeVideo.style.display = 'none';
  }
  if (homeMediaContainer) {
      homeMediaContainer.innerHTML = '';
  }
  
  // Create real disguise player if it doesn't exist or is a dummy
  if (!window.disguisePlayer || typeof window.disguisePlayer.loadMusic !== 'function') {
      console.log('Creating real disguise player...');
      window.disguisePlayer = new MusicPlayer('2');
  }
  
  // Initialize/reset disguise player
  if (window.disguisePlayer && typeof window.disguisePlayer.loadMusic === 'function') {
      window.disguisePlayer.musicIndex = 1;
      window.disguisePlayer.isMusicPaused = true;
      
      const disguiseAudio = document.getElementById('main-audio2');
      const disguiseVideo = document.getElementById('video2');
      const disguiseMediaContainer = document.getElementById('media-container2');
      
      if (disguiseAudio) {
          disguiseAudio.pause();
          disguiseAudio.src = '';
          disguiseAudio.currentTime = 0;
      }
      if (disguiseVideo) {
          disguiseVideo.pause();
          disguiseVideo.src = '';
          disguiseVideo.currentTime = 0;
          disguiseVideo.style.display = 'none';
      }
      if (disguiseMediaContainer) {
          disguiseMediaContainer.innerHTML = '';
      }
      
      // Load first song with delay
      setTimeout(() => {
          if (window.disguisePlayer && window.disguisePlayer.musicSource && window.disguisePlayer.musicSource.length > 0) {
              window.disguisePlayer.loadMusic(1);
              window.disguisePlayer.updatePlayingSong();
          }
      }, 200);
  }
  
  disguisePlayerInitialized = true;
  homePlayerInitialized = false;
};

// Add cleanup function
window.cleanupPlayers = function() {
    homePlayerInitialized = false;
    disguisePlayerInitialized = false;
    
    // Stop all media
    const allAudio = document.querySelectorAll('audio');
    const allVideo = document.querySelectorAll('video');
    
    allAudio.forEach(audio => {
        audio.pause();
        audio.src = '';
        audio.currentTime = 0;
    });
    
    allVideo.forEach(video => {
        video.pause();
        video.src = '';
        video.currentTime = 0;
        video.style.display = 'none';
    });
    
    // Clear media containers
    const containers = document.querySelectorAll('#media-container, #media-container2');
    containers.forEach(container => {
        container.innerHTML = '';
    });
    
    console.log('Players cleaned up');
};

// MODIFY the existing DOMContentLoaded event listener (replace the existing one at the bottom):

// Initialize players when DOM loads
// REPLACE your existing DOMContentLoaded event listener with this enhanced version:

// REPLACE your DOMContentLoaded listener in AudioPlayer00.js with this:

document.addEventListener("DOMContentLoaded", () => {
  // Wait for auth state to be determined
  const initPlayers = () => {
      if (!window.authStateReady) {
          setTimeout(initPlayers, 50);
          return;
      }
      
      const initialPage = window.initialPageDetermined;
      console.log('Initializing players based on:', initialPage);
      
      if (initialPage === 'home') {
          // Only create home player
          console.log('Creating HOME player only');
          window.homePlayer = new MusicPlayer();
          window.disguisePlayer = { 
              pauseMusic: () => {}, 
              loadMusic: () => {},
              updatePlayingSong: () => {}
          }; // Dummy object to prevent errors
      } else if (initialPage === 'disguise') {
          // Only create disguise player
          console.log('Creating DISGUISE player only');
          window.disguisePlayer = new MusicPlayer('2');
          window.homePlayer = { 
              pauseMusic: () => {}, 
              loadMusic: () => {},
              updatePlayingSong: () => {}
          }; // Dummy object to prevent errors
      } else if (initialPage === 'login') {
          // Create dummy objects for login page
          console.log('Login page - creating dummy players');
          window.homePlayer = { 
              pauseMusic: () => {}, 
              loadMusic: () => {},
              updatePlayingSong: () => {}
          };
          window.disguisePlayer = { 
              pauseMusic: () => {}, 
              loadMusic: () => {},
              updatePlayingSong: () => {}
          };
      } else {
          // Fallback - create both but don't initialize
          console.log('Fallback - creating both players');
          window.homePlayer = new MusicPlayer();
          window.disguisePlayer = new MusicPlayer('2');
      }
      
      handleSize();
  };
  
  initPlayers();
  
  // Add visibility change handler
  document.addEventListener('visibilitychange', function() {
      if (!document.hidden) {
          const isHomePage = document.getElementById("HomePage")?.style.display !== "none";
          const isDisguisePage = document.getElementById("DisguisePage")?.style.display !== "none";
          
          if (isHomePage && window.disguisePlayer && typeof window.disguisePlayer.pauseMusic === 'function') {
              window.disguisePlayer.pauseMusic();
              const disguiseAudio = document.getElementById('main-audio2');
              const disguiseVideo = document.getElementById('video2');
              if (disguiseAudio) {
                  disguiseAudio.pause();
                  disguiseAudio.src = '';
              }
              if (disguiseVideo) {
                  disguiseVideo.pause();
                  disguiseVideo.src = '';
                  disguiseVideo.style.display = 'none';
              }
          } else if (isDisguisePage && window.homePlayer && typeof window.homePlayer.pauseMusic === 'function') {
              window.homePlayer.pauseMusic();
              const homeAudio = document.getElementById('main-audio');
              const homeVideo = document.getElementById('video');
              if (homeAudio) {
                  homeAudio.pause();
                  homeAudio.src = '';
              }
              if (homeVideo) {
                  homeVideo.pause();
                  homeVideo.src = '';
                  homeVideo.style.display = 'none';
              }
          }
      }
  });
});