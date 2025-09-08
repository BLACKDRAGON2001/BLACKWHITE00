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
    this.audioBucketUrl = 'https://pub-c755c6dec2fa41a5a9f9a659408e2150.r2.dev/';
    this.videoBucketUrls = [
      'https://pub-fb9b941e940b4b44a61b7973d5ba28c3.r2.dev/',
      'https://pub-2e4c11f1d1e049e5a893e7a1681ebf7e.r2.dev/',
      'https://pub-15e524466e7449c997fe1434a0717e91.r2.dev/'
    ];

    // Configure R2 bucket URLs for images
    this.imageBucketUrl = suffix === '2' 
    ? 'https://pub-35bf609bb46e4f27a992efb322030db4.r2.dev/' // Replace with your disguise images bucket URL
    : 'https://pub-99d8e809a4554c358c8d5e75932939cd.r2.dev/';    // Replace with your main images bucket URL

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
    
    this.initialize();
    this.hasUserInteracted = false;
    this.setupUserInteractionDetection();
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

  setupUserInteractionDetection() {
    const isMobile = this.detectMobile();
    
    if (isMobile) {
      const detectInteraction = () => {
        this.hasUserInteracted = true;
        document.removeEventListener('touchstart', detectInteraction);
        document.removeEventListener('click', detectInteraction);
      };
      
      document.addEventListener('touchstart', detectInteraction, { once: true, passive: true });
      document.addEventListener('click', detectInteraction, { once: true });
    } else {
      this.hasUserInteracted = true;
    }
  }

  detectPerformanceMode() {
    // Detect mobile devices and performance capabilities
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
    const isSlowCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
    
    if (isMobile || isLowMemory || isSlowCPU) {
      return 'mobile';
    } else if (navigator.deviceMemory && navigator.deviceMemory < 8) {
      return 'medium';
    }
    return 'desktop';
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
    // Use passive listeners where possible to improve scroll performance
    const passiveOptions = { passive: true };
    const activeOptions = { passive: false };

    // Control events
    this.playPauseBtn.addEventListener("click", () => this.togglePlayPause(), passiveOptions);
    this.prevBtn.addEventListener("click", () => this.changeMusic(-1), passiveOptions);
    this.nextBtn.addEventListener("click", () => this.changeMusic(1), passiveOptions);
    this.progressArea.addEventListener("click", (e) => this.handleProgressClick(e), activeOptions);
    this.moreMusicBtn.addEventListener("click", () => this.toggleMusicList(), passiveOptions);
    this.closeMoreMusicBtn.addEventListener("click", () => this.closeMusicList(), passiveOptions);
    this.modeToggle.addEventListener("click", () => this.toggleDarkMode(), passiveOptions);
    this.muteButton.addEventListener("click", () => this.handleMute(), passiveOptions);
    this.repeatBtn.addEventListener("click", () => this.handleRepeat(), passiveOptions);

    // Media events - throttle the heavy ones
    this.mainAudio.addEventListener("timeupdate", this.throttle((e) => this.updateProgress(e), this.updateInterval));
    this.mainAudio.addEventListener("ended", () => this.handleSongEnd(), passiveOptions);
    this.mainAudio.addEventListener("pause", () => this.handleAudioPause(), passiveOptions);
    this.mainAudio.addEventListener("play", () => this.handleAudioPlay(), passiveOptions);
    this.videoAd.addEventListener("ended", () => this.handleVideoEnd(), passiveOptions);

    this.musicName.addEventListener("click", () => this.toggleVideoControls(), passiveOptions);

    // Optimized scroll event
    this.ulTag.addEventListener("scroll", () => this.handleVirtualizedScroll(), passiveOptions);

    const seeVideoBtn = document.querySelector('.seeVideo');
    if (seeVideoBtn) {
      seeVideoBtn.addEventListener("click", () => this.toggleVideoOverride(), passiveOptions);
    }
  }

  // Add throttle utility
  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    return (...args) => {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  cleanup() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Clean up any unused audio elements
    const unusedAudio = document.querySelectorAll('audio:not(#main-audio):not(#main-audio2)');
    unusedAudio.forEach(audio => audio.remove());
  }

  handleVirtualizedScroll() {
    if (this.performanceMode === 'mobile') {
      // More aggressive throttling on mobile
      if (this.scrollTimeout) return;
      
      this.scrollTimeout = setTimeout(() => {
        this.renderVisibleItems();
        this.scrollTimeout = null;
      }, 50);
    } else {
      // Original implementation for desktop
      if (!this.renderTicking) {
        requestAnimationFrame(() => {
          this.renderVisibleItems();
          this.renderTicking = false;
        });
        this.renderTicking = true;
      }
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

    // Add this method to detect mobile
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Replace setAudioSourceWithFallback method:
  setAudioSourceWithFallback(src) {
    const r2AudioSrc = `${this.audioBucketUrl}${src}.mp3`;
    const localAudioSrc = `${this.audioFolder}${src}.mp3`;
    const uploadAudioSrc = `Upload/${src}.mp3`;
    
    this.mainAudio.onerror = null;
    this.mainAudio.onloadeddata = null;
    
    this.mainAudio.src = r2AudioSrc;
    
    this.mainAudio.onloadeddata = () => {
      console.log(`Audio loaded successfully from R2: ${r2AudioSrc}`);
      this.mainAudio.onloadeddata = null;
    };
    
    this.mainAudio.onerror = () => {
      console.warn(`Audio failed from R2, trying local: ${localAudioSrc}`);
      this.mainAudio.src = localAudioSrc;
      
      this.mainAudio.onloadeddata = () => {
        console.log(`Audio loaded from local: ${localAudioSrc}`);
        this.mainAudio.onloadeddata = null;
      };
      
      this.mainAudio.onerror = () => {
        console.warn(`Audio failed from local, trying upload: ${uploadAudioSrc}`);
        this.mainAudio.src = uploadAudioSrc;
        this.r2Available = false;
        
        this.mainAudio.onloadeddata = () => {
          console.log(`Audio loaded from upload: ${uploadAudioSrc}`);
          this.mainAudio.onloadeddata = null;
        };
        
        this.mainAudio.onerror = () => {
          console.error(`All audio sources failed for: ${src}`);
          this.mainAudio.onerror = null;
        };
      };
    };
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
    
    const r2ImageSrc = `${this.imageBucketUrl}${src}.${type}`;
    const localImageSrc = `${this.imageFolder}${src}.${type}`;
    const uploadImageSrc = `Upload/${src}.${type}`;
    
    img.src = r2ImageSrc;
    img.alt = this.musicName.textContent;
    
    img.onerror = () => {
      console.warn(`Failed to load image from R2: ${r2ImageSrc}, trying local: ${localImageSrc}`);
      img.src = localImageSrc;
      
      img.onerror = () => {
        console.warn(`Failed to load local image: ${localImageSrc}, trying upload: ${uploadImageSrc}`);
        img.src = uploadImageSrc;
        
        img.onerror = () => {
          console.warn(`Failed to load upload image: ${uploadImageSrc}`);
          if (this.suffix === '2') {
            this.createWhiteFallback(img);
          }
        };
      };
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
      const playPromise = this.mainAudio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        
        this.wrapper.classList.add("paused");
        this.playPauseBtn.querySelector("i").textContent = "pause";
        this.isMusicPaused = false;
        
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
      console.warn("Failed to play audio:", error);
      
      this.wrapper.classList.remove("paused");
      this.playPauseBtn.querySelector("i").textContent = "play_arrow";
      this.isMusicPaused = true;
    }
    this.updatePlayingSong();
  }
  
  // Add this helper method:
  waitForAudioReady(timeout = 3000) {
    return new Promise((resolve) => {
      if (this.mainAudio.readyState >= 2) {
        resolve();
        return;
      }
      
      let timeoutId = setTimeout(() => {
        console.warn("Audio ready timeout");
        resolve();
      }, timeout);
      
      const handleReady = () => {
        clearTimeout(timeoutId);
        this.mainAudio.removeEventListener('canplay', handleReady);
        this.mainAudio.removeEventListener('loadeddata', handleReady);
        resolve();
      };
      
      this.mainAudio.addEventListener('canplay', handleReady);
      this.mainAudio.addEventListener('loadeddata', handleReady);
    });
  }
  
  showMobilePlayMessage() {
    // You can implement a user-friendly notification here
    console.log("Tap the play button to start music on mobile");
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
    // Skip video operations entirely on mobile for Player 2
    if (this.suffix === '2' || (this.performanceMode === 'mobile' && this.suffix === '2')) {
      this.videoAd.style.display = "none";
      return;
    }
    
    // If video override is active, use override behavior instead
    if (this.videoOverride) {
      this.showVideoOverride();
      return;
    }
    
    const isDarkMode = this.wrapper.classList.contains("dark-mode");
    
    if (show) {
      this.videoAd.style.display = "block";
      
      // Use transform3d for hardware acceleration
      this.videoAd.style.transform = 'translate3d(-50%, -50%, 0)';
      this.videoAd.style.top = '50%';
      this.videoAd.style.left = '50%';
      
      this.videoAd.play();
    } else {
      this.videoAd.style.display = "none";
      this.videoAd.pause();
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
    // Skip updates if already updating (prevent stacking)
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    
    // Use requestAnimationFrame for smooth updates
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    this.rafId = requestAnimationFrame(() => {
      const { currentTime, duration } = e.target;
      
      // Only update if values actually changed significantly
      const progressPercent = (currentTime / duration) * 100;
      const currentProgressPercent = parseFloat(this.progressBar.style.width) || 0;
      
      if (Math.abs(progressPercent - currentProgressPercent) > 0.1) {
        this.progressBar.style.width = `${progressPercent}%`;
      }

      // Throttle time display updates (only update every second)
      const currentTimeInt = Math.floor(currentTime);
      if (this.lastTimeUpdate !== currentTimeInt) {
        const currentMin = Math.floor(currentTime / 60);
        const currentSec = Math.floor(currentTime % 60).toString().padStart(2, "0");
        this.wrapper.querySelector(".current-time").textContent = `${currentMin}:${currentSec}`;

        if (!isNaN(duration) && !this.durationSet) {
          const totalMin = Math.floor(duration / 60);
          const totalSec = Math.floor(duration % 60).toString().padStart(2, "0");
          this.wrapper.querySelector(".max-duration").textContent = `${totalMin}:${totalSec}`;
        }
        
        this.lastTimeUpdate = currentTimeInt;
      }
      
      this.isUpdating = false;
    });
  }

  handleRepeat() {
    switch (this.repeatBtn.textContent) {
      case "repeat":
        this.repeatBtn.textContent = "repeat_one";
        this.repeatBtn.title = "Song looped";
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
    this.currentMusicArray = this.musicSource;
    
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
      
      // Skip rendering if performance mode is mobile and list isn't visible
      if (this.performanceMode === 'mobile' && !this.musicList.classList.contains('show')) {
        return;
      }
      
      const scrollTop = this.ulTag.scrollTop;
      const viewportHeight = this.ulTag.clientHeight;
      const totalItems = this.musicSource.length;

      // Reduce buffer size on mobile for better performance
      const buffer = this.performanceMode === 'mobile' ? 3 : this.BUFFER;
      
      const startIndex = Math.max(0, Math.floor(scrollTop / this.ROW_HEIGHT) - buffer);
      const visibleCount = Math.ceil(viewportHeight / this.ROW_HEIGHT) + buffer * 2;
      const endIndex = Math.min(totalItems - 1, startIndex + visibleCount - 1);

      if (startIndex === this.lastRenderStart && endIndex === this.lastRenderEnd && !this.forceRender) {
        return;
      }

      this.lastRenderStart = startIndex;
      this.lastRenderEnd = endIndex;
      this.forceRender = false;

      // Use transform3d for hardware acceleration
      this.musicListItems.style.transform = `translate3d(0, ${startIndex * this.ROW_HEIGHT}px, 0)`;

      // Batch DOM operations
      const fragment = document.createDocumentFragment();
      for (let i = startIndex; i <= endIndex; i++) {
        if (i < this.musicSource.length) {
          const music = this.musicSource[i];
          const liTag = this.createOptimizedMusicListItem(music, i);
          fragment.appendChild(liTag);
        }
      }

      this.musicListItems.innerHTML = '';
      this.musicListItems.appendChild(fragment);
      this.updatePlayingSong();
    } catch (error) {
      this.throttledLog('render_error', `Render error: ${error.message}`);
    }
  }

  
  createOptimizedMusicListItem(music, actualIndex) {
    const liTag = document.createElement("li");
    liTag.setAttribute("li-index", actualIndex + 1);
  
    const cachedDuration = this.getDurationCache(music.src);
    const displayDuration = cachedDuration || "3:40";
  
    liTag.innerHTML = `
      <div class="row">
        <span>${music.name}</span>
        <p>${music.artist}</p>
      </div>
      <span id="${music.src}" class="audio-duration">${displayDuration}</span>
    `;
  
    // ALWAYS check and apply dark mode styles when creating items
    const isDarkMode = this.wrapper.classList.contains("dark-mode");
    this.applyListItemStyles(liTag, isDarkMode);
  
    // Skip creating audio elements for cached durations on mobile
    if (!cachedDuration && this.performanceMode !== 'mobile') {
      const audio = document.createElement('audio');
      audio.className = music.src;
      audio.src = `${this.audioBucketUrl}${music.src}.mp3`;
      
      audio.addEventListener("loadeddata", () => {
        const duration = audio.duration;
        if (!isNaN(duration) && duration > 0) {
          const totalMin = Math.floor(duration / 60);
          const totalSec = Math.floor(duration % 60).toString().padStart(2, "0");
          const formattedDuration = `${totalMin}:${totalSec}`;
          
          this.setDurationCache(music.src, formattedDuration);
          const durationSpan = liTag.querySelector(".audio-duration");
          if (durationSpan && durationSpan.isConnected) {
            durationSpan.textContent = formattedDuration;
          }
        }
        audio.remove();
      }, { once: true });
      
      liTag.appendChild(audio);
    }
  
    liTag.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleMusicItemClick(actualIndex);
    }, { passive: true });
  
    return liTag;
  }

  applyListItemStyles(liTag, isDarkMode) {
    if (isDarkMode) {
      liTag.style.color = 'white';
      liTag.style.borderBottom = '3px solid white';
    } else {
      liTag.style.color = 'black';
      liTag.style.borderBottom = '3px solid black';
    }
  }

  handleMusicItemClick(actualIndex) {
    try {
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
      console.warn(`Click handler error: ${error.message}`);
    }
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
    // Update currently visible items
    const listItems = this.musicListItems?.querySelectorAll("li") || [];
    listItems.forEach(item => {
      this.applyListItemStyles(item, true);
    });
    this.musicList.style.backgroundColor = "black";
    this.closeMoreMusicBtn.style.color = "white";
    this.header.style.color = "white";
  }
  
  listcolourwhite() {
    // Update currently visible items
    const listItems = this.musicListItems?.querySelectorAll("li") || [];
    listItems.forEach(item => {
      this.applyListItemStyles(item, false);
    });
    this.musicList.style.backgroundColor = "white";
    this.closeMoreMusicBtn.style.color = "black";
    this.header.style.color = "black";
  }

  updateBorderBoxImmediate() {
    if (this.suffix !== '2' || !this.borderBox || !this.enableBorderAnimations) return;

    if (this.isInitializing) {
      this.borderBox.style.display = "none";
      return;
    }
    
    const now = performance.now();
    
    // More aggressive throttling on mobile
    const throttleTime = this.performanceMode === 'mobile' ? 100 : 16;
    if (now - this.borderBoxState.lastUpdate < throttleTime) return;
    
    const isDarkMode = this.wrapper.classList.contains("dark-mode");
    
    let shouldShowBorder = false;
    let targetStyle = null;
    
    if (isDarkMode) {
      shouldShowBorder = true;
      targetStyle = 'player2DarkMode';
    }
    
    if (this.borderBoxState.isVisible !== shouldShowBorder || 
        this.borderBoxState.currentStyle !== targetStyle) {
      
      this.applyBorderBoxChanges(shouldShowBorder, targetStyle);
      
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

if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.name === 'long-task') {
        console.warn('Long task detected:', entry.duration);
      }
    });
  });
  
  try {
    observer.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    // Long task observer not supported
  }
}

// Initialize players when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  // Add slight delay to prevent blocking initial page load
  requestIdleCallback(() => {
    window.homePlayer = new MusicPlayer();
    window.disguisePlayer = new MusicPlayer('2');
    handleSize();
  }, { timeout: 1000 });
});