// MediaManager.js - Compatible with AudioPlayer00.js
class MediaManager {
  constructor(suffix = '') {
    this.suffix = suffix;
    this.imageFolder = suffix === '2' ? 'MainAssets/ImagesDisguise/' : 'MainAssets/Images/';
    this.videoFolder = suffix === '2' ? 'VideosDisguise/' : 'MainAssets/Videos/';
    this.videoBucketUrls = [
      'https://r2-asset-proxy.mcvities755.workers.dev/account1/videos1/',
      'https://r2-asset-proxy.mcvities755.workers.dev/account2/videos2/',
      'https://r2-asset-proxy.mcvities755.workers.dev/account3/videos3/'
    ];
    this.imageBucketUrl = suffix === '2' 
      ? 'https://r2-asset-proxy.mcvities755.workers.dev/account3/images-disguise/'
      : 'https://r2-asset-proxy.mcvities755.workers.dev/account3/images/';
    
    this.player = null;
    this.wrapper = null;
    this.coverArea = null;
    this.videoAd = null;
    this.borderBox = null;
    
    this.r2Available = true;
    this.controlsToggledManually = false;
    this.videoOverride = false;
    
    // Initialize elements immediately
    this.initialize();
    
    // Border box styles for Player 2
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
  }

  initialize() {
    // Get wrapper element
    this.wrapper = document.querySelector(`#wrapper${this.suffix}`);
    if (!this.wrapper) {
      console.warn(`Wrapper not found for MediaManager${this.suffix}`);
      return;
    }
    
    this.coverArea = this.wrapper.querySelector('.img-area');
    if (!this.coverArea) {
      console.warn(`Cover area not found for MediaManager${this.suffix}`);
      return;
    }
    
    this.initializeMediaElements();
    this.setupEventListeners();
    
    console.log(`MediaManager${this.suffix} initialized successfully`);
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

  initializeMediaElements() {
    this.createVideoElements();
    
    if (this.suffix === '2') {
      this.initializeBorderBox();
    }
  }

  // Only used for Player 2
  initializeBorderBox() {
    if (this.suffix !== '2') return;
    
    // Find or create border box
    this.borderBox = document.getElementById(`video-border-box${this.suffix}`);
    if (!this.borderBox) {
      const borderBox = document.createElement('div');
      borderBox.id = `video-border-box${this.suffix}`;
      borderBox.className = 'video-border-box';
      borderBox.style.display = 'none';
      const majorContainer = this.wrapper.querySelector('.Major-Container');
      if (majorContainer) {
        majorContainer.appendChild(borderBox);
        this.borderBox = borderBox;
      }
    }
    
    if (this.borderBox) {
      this.borderBox.style.display = "none";
      this.borderBox.style.visibility = "hidden";
      this.borderBox.style.opacity = "0";
      this.borderBox.classList.remove('player2-dark');
      
      this.borderBoxState = {
        isVisible: false,
        currentStyle: null,
        lastUpdate: 0
      };
      
      requestAnimationFrame(() => {
        if (this.borderBox) {
          this.borderBox.style.display = "none";
        }
      });
    }
  }

  createVideoElements() {
    const majorContainer = this.wrapper.querySelector('.Major-Container');
    if (!majorContainer) {
      console.warn(`Major-Container not found for MediaManager${this.suffix}`);
      return;
    }
    
    if (this.suffix === '2') {
      // Player 2: Create border box and dummy video element (hidden)
      if (!document.getElementById(`video-border-box${this.suffix}`)) {
        const borderBox = document.createElement('div');
        borderBox.id = `video-border-box${this.suffix}`;
        borderBox.className = 'video-border-box';
        borderBox.style.display = 'none';
        majorContainer.appendChild(borderBox);
        this.borderBox = borderBox;
      }
      
      // Create a dummy video element for consistency (always hidden)
      this.videoAd = document.createElement('video');
      this.videoAd.id = `video${this.suffix}`;
      this.videoAd.style.display = 'none';
      this.videoAd.muted = true;
      majorContainer.appendChild(this.videoAd);
    } else {
      // Player 1: Create functional video element
      this.videoAd = document.getElementById(`video${this.suffix}`);
      if (!this.videoAd) {
        const video = document.createElement('video');
        video.id = `video${this.suffix}`;
        video.className = 'overlay-video';
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.setAttribute('loop', '');
        video.setAttribute('preload', 'metadata');
        video.style.display = 'none';
        majorContainer.appendChild(video);
        this.videoAd = video;
      }
    }
  }

  setupEventListeners() {
    // Video controls toggle (only for player 1)
    if (this.suffix !== '2') {
      const musicName = this.wrapper.querySelector(".song-details .name");
      if (musicName) {
        musicName.addEventListener("click", () => this.toggleVideoControls());
      }

      // See video button
      const seeVideoBtn = document.querySelector('.seeVideo');
      if (seeVideoBtn) {
        seeVideoBtn.addEventListener("click", () => this.toggleVideoOverride());
      }

      // Video size toggle
      if (this.videoAd) {
        this.setupVideoSizeToggle();
      }
    }
  }

  setupVideoSizeToggle() {
    if (this.suffix === '2' || !this.videoAd) return; // No video interaction for player 2
    
    if (!this.videoAd.classList.contains("overlay-video") && !this.videoAd.classList.contains("bigger-video")) {
      this.videoAd.classList.add("overlay-video");
    }

    // Remove existing click handler
    if (this.videoAd.clickHandler) {
      this.videoAd.removeEventListener("click", this.videoAd.clickHandler);
    }

    const clickHandler = () => {
      if (this.videoAd.classList.contains("bigger-video") && this.controlsToggledManually) return;
  
      this.videoAd.classList.toggle("overlay-video");
      this.videoAd.classList.toggle("bigger-video");
      
      if (this.videoAd.classList.contains("bigger-video")) {
        this.videoAd.controls = false;
        this.controlsToggledManually = false;
      } else {
        this.videoAd.controls = false;
        this.controlsToggledManually = false;
      }
      
      if (this.videoAd.style.display !== "none") {
        if (this.videoOverride) {
          this.showVideoOverride();
        } else {
          if (this.videoAd.classList.contains('bigger-video')) {
            this.videoAd.style.top = '0px';
            this.videoAd.style.left = '0px';
            this.videoAd.style.transform = 'translate(0, 0)';
          } else {
            this.videoAd.style.top = '50%';
            this.videoAd.style.left = '50%';
            this.videoAd.style.transform = 'translate(-50%, -50%)';
          }
        }
      }
    };

    this.videoAd.clickHandler = clickHandler;
    this.videoAd.addEventListener("click", clickHandler);
  }

  toggleVideoControls() {
    if (!this.videoAd || !this.videoAd.classList.contains("bigger-video")) {
      if (this.videoAd) {
        this.videoAd.controls = false;
        this.controlsToggledManually = false;
      }
      return;
    }
    
    this.controlsToggledManually = !this.controlsToggledManually;
    this.videoAd.controls = this.controlsToggledManually;
    
    if (!this.controlsToggledManually && this.videoAd.paused) {
      this.videoAd.play().catch(error => {
        console.warn("Failed to resume video playback:", error);
      });
    }
  }

  toggleVideoOverride() {
    if (this.suffix === '2' || !this.videoAd) return; // No video override for player 2
    
    this.videoOverride = !this.videoOverride;
    
    if (this.videoOverride) {
      // When enabling override, check the actual audio element state directly
      const mainAudio = document.querySelector(`#main-audio${this.suffix}`);
      const isMusicPlaying = mainAudio ? !mainAudio.paused : false;
      const shouldMute = isMusicPlaying; // Unmute if music is paused, mute if playing
      
      console.log(`Video override enabled. Audio paused: ${mainAudio?.paused}, Music playing: ${isMusicPlaying}, Video will be muted: ${shouldMute}`);
      
      this.videoAd.muted = shouldMute;
      this.showVideoOverride();
    } else {
      // When disabling video override, hide the video and reset state
      this.videoAd.style.display = "none";
      this.videoAd.pause();
      this.videoAd.muted = true; // Reset to muted
      
      // Reset video state
      this.videoAd.classList.remove("bigger-video");
      this.videoAd.classList.add("overlay-video");
      this.videoAd.controls = false;
      this.controlsToggledManually = false;
      
      // Reset positioning to overlay mode
      Object.assign(this.videoAd.style, {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
      
      console.log('Video override disabled');
    }
  }

  showVideoOverride() {
    if (this.suffix === '2' || !this.videoAd) {
      if (this.videoAd) this.videoAd.style.display = "none";
      return;
    }
    
    this.videoAd.style.display = "block";
    
    if (this.videoAd.classList.contains('bigger-video')) {
      Object.assign(this.videoAd.style, {
        top: '0px',
        left: '0px',
        transform: 'translate(0, 0)'
      });
    } else {
      Object.assign(this.videoAd.style, {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
    }
    
    // Mute state is set in toggleVideoOverride() when override is first enabled
    // and updated in onMusicPlayStateChange() when music play state changes
    
    // Always play the video when override is enabled
    const playPromise = this.videoAd.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn("Video autoplay failed:", error);
        setTimeout(() => {
          this.videoAd.play().catch(e => {
            console.warn("Video retry also failed:", e);
          });
        }, 100);
      });
    }
  }

  createImageElement(src, type, musicName) {
    const img = document.createElement('img');
    
    const r2ImageSrc = `${this.imageBucketUrl}${src}.${type}`;
    const localImageSrc = `${this.imageFolder}${src}.${type}`;
    const uploadImageSrc = `Upload/${src}.${type}`;
    
    img.src = r2ImageSrc;
    img.alt = musicName;
    
    img.onerror = () => {
      console.warn(`Failed to load image from R2 bucket: ${r2ImageSrc}, trying local: ${localImageSrc}`);
      
      img.src = localImageSrc;
      img.onerror = () => {
        console.warn(`Failed to load local image: ${localImageSrc}, trying upload: ${uploadImageSrc}`);
        img.src = uploadImageSrc;
        img.onerror = () => {
          console.warn(`Failed to load upload image: ${uploadImageSrc}, using fallback`);
          this.createFallbackElement(img);
        };
      };
      this.r2Available = false;
    };
    
    return img;
  }

  createFallbackElement(imgElement) {
    const isDarkMode = this.wrapper && this.wrapper.classList.contains("dark-mode");
    const backgroundColor = isDarkMode ? 'black' : 'white';
    
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = 'media-fallback';
    fallbackDiv.style.cssText = `
      width: 100%;
      height: 100%;
      background-color: ${backgroundColor};
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: inherit;
      min-height: 380px;
      transition: background-color 0.3s ease;
    `;
    
    if (imgElement.parentNode) {
      imgElement.parentNode.replaceChild(fallbackDiv, imgElement);
    }
    
    return fallbackDiv;
  }

  updateFallbackElements() {
    if (!this.coverArea) return;
    
    const fallbackElements = this.coverArea.querySelectorAll('.media-fallback');
    const isDarkMode = this.wrapper && this.wrapper.classList.contains("dark-mode");
    const backgroundColor = isDarkMode ? 'black' : 'white';
    
    fallbackElements.forEach(element => {
      element.style.backgroundColor = backgroundColor;
    });
  }

  createVideoElementWithFallback(src, type) {
    if (this.suffix === '2') {
      // Player 2 doesn't show videos, return image instead
      return this.createImageElement(src, 'jpg', ''); // Default to jpg for player 2
    }

    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true; // Critical for iPhone
    video.setAttribute('playsinline', ''); // Ensure playsinline for iOS
    video.setAttribute('webkit-playsinline', ''); // Legacy iOS support
    
    const r2Sources = [
      `${this.videoBucketUrls[0]}${src}.${type}`,
      `${this.videoBucketUrls[1]}${src}.${type}`,
      `${this.videoBucketUrls[2]}${src}.${type}`
    ];
    
    const localVideoSrc = `${this.videoFolder}${src}.${type}`;
    const uploadVideoSrc = `Upload/${src}.${type}`;
    const allSources = [...r2Sources, localVideoSrc, uploadVideoSrc];
    
    let attempt = 0;
    
    const tryNextSource = () => {
      if (attempt >= allSources.length) {
        console.error("All video sources failed to load.");
        return;
      }
      
      video.src = allSources[attempt];
      
      if (attempt >= r2Sources.length) {
        this.r2Available = false;
        console.warn("R2 video sources failed, using local/upload fallback");
      }
      
      attempt++;
    };
    
    video.onerror = () => {
      console.warn(`Video source failed: ${allSources[attempt - 1]}, trying next fallback`);
      tryNextSource();
    };
    
    tryNextSource();
    return video;
  }

  setVideoSourceWithFallback(src) {
    if (this.suffix === '2' || !this.videoAd) {
      // Player 2 or no video element - do nothing
      return;
    }

    const r2Sources = [
      `${this.videoBucketUrls[0]}${src}.mp4`,
      `${this.videoBucketUrls[1]}${src}.mp4`,
      `${this.videoBucketUrls[2]}${src}.mp4`
    ];
    
    const localVideoSrc = `${this.videoFolder}${src}.mp4`;
    const uploadVideoSrc = `Upload/${src}.mp4`;
    const allSources = [...r2Sources, localVideoSrc, uploadVideoSrc];
    
    let attempt = 0;
    
    const tryNextSource = () => {
      if (attempt >= allSources.length) {
        console.error("All videoAd sources failed to load.");
        return;
      }
      
      this.videoAd.src = allSources[attempt];
      
      if (attempt >= r2Sources.length) {
        this.r2Available = false;
        console.warn("R2 videoAd sources failed, using local/upload fallback");
      }
      
      attempt++;
    };
    
    // Clear previous handlers
    this.videoAd.onerror = null;
    
    this.videoAd.onerror = () => {
      console.warn(`videoAd source failed: ${allSources[attempt - 1]}, trying next fallback`);
      tryNextSource();
    };
    
    tryNextSource();
  }

  // Main method called by AudioPlayer to load media content
  loadMediaContent(music, index) {
    if (!this.coverArea || !music) {
      console.warn('Cannot load media content - missing coverArea or music data');
      return;
    }
    
    const { coverType = 'Images', src, type = 'jpg' } = music;
    
    // Clear existing content
    this.coverArea.innerHTML = '';
    
    // Choose image or video element
    const mediaElement = (this.suffix === '2' || coverType !== 'video')
      ? this.createImageElement(src, type, music.name)
      : this.createVideoElementWithFallback(src, type);
    
    this.coverArea.appendChild(mediaElement);
    
    // Only set video source for player 1
    if (this.suffix !== '2' && src) {
      this.setVideoSourceWithFallback(src);
      
      if (this.videoOverride) {
        const handleVideoLoaded = () => {
          this.showVideoOverride();
        };
        
        if (this.videoAd) {
          this.videoAd.addEventListener('loadeddata', handleVideoLoaded, { once: true });
          this.videoAd.addEventListener('canplay', handleVideoLoaded, { once: true });
          
          setTimeout(() => {
            if (this.videoOverride) {
              this.showVideoOverride();
            }
          }, 500);
        }
      }
    }
    
    // Only update border box for Player 2
    if (this.suffix === '2') {
      this.updateBorderBoxDisplay();
    }
  }

  // Methods called by AudioPlayer through callMediaManager()
  onMusicPlayStateChange(isPlaying) {
    // FIXED: Proper logic flow matching AudioPlayer00.js
    if (!this.videoOverride) {
      // Normal mode: show video when music paused, hide when playing
      this.toggleVideoDisplay(!isPlaying); // !isPlaying = show video when music is paused
    } else {
      // Override mode: update mute state and ensure video keeps playing
      if (this.videoAd) {
        // Update mute state FIRST before any play attempts
        this.videoAd.muted = isPlaying; // Mute video when music is playing, unmute when paused
        
        // For iPhone compatibility: always ensure video is playing in override mode
        // Use a promise chain to handle iPhone's autoplay restrictions
        if (this.videoAd.paused) {
          const playPromise = this.videoAd.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log(`Video resumed in override mode (muted: ${this.videoAd.muted})`);
              })
              .catch(error => {
                console.warn("Failed to resume video in override mode:", error);
                // Retry after a brief delay (helps with iPhone timing issues)
                setTimeout(() => {
                  if (this.videoOverride && this.videoAd && this.videoAd.paused) {
                    this.videoAd.play().catch(e => {
                      console.warn("Video retry also failed:", e);
                    });
                  }
                }, 150);
              });
          }
        }
      }
    }
    
    // Auto-resize video to smaller/overlay mode when music starts (only for player 1, not in override)
    if (this.suffix !== '2' && this.videoAd && !this.videoOverride && isPlaying && this.videoAd.classList.contains("bigger-video")) {
      this.videoAd.classList.remove("bigger-video");
      this.videoAd.classList.add("overlay-video");
      
      // Reset controls when switching to overlay mode
      this.videoAd.controls = false;
      this.controlsToggledManually = false;
      
      // Update video positioning for overlay mode
      Object.assign(this.videoAd.style, {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
    }
    
    // Only reset video size if override is not enabled
    if (!this.videoOverride) {
      this.resetVideoSize();
    }
  }

  refreshVideoOverrideMuteState() {
    if (this.videoOverride && this.videoAd && this.player) {
      // Update video mute state based on current music playing state
      const isMusicPlaying = !this.player.isMusicPaused;
      this.videoAd.muted = isMusicPlaying;
    }
  }

  toggleVideoDisplay(show) {
    // FIXED: Respect videoOverride properly
    if (this.videoOverride) {
      this.showVideoOverride();
      return;
    }
    
    if (!this.videoAd) return; // Safety check
    
    if (show) {
      // When music is paused (show = true), show the video
      if (this.suffix === '2') {
        // Player 2 never shows video
        this.videoAd.style.display = "none";
      } else {
        this.videoAd.style.display = "block";
        
        Object.assign(this.videoAd.style, {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        });
        
        // iPhone-friendly play attempt with proper error handling
        const playPromise = this.videoAd.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.warn("Video play failed:", error);
            // Retry for iPhone compatibility
            setTimeout(() => {
              if (!this.videoOverride && show) {
                this.videoAd.play().catch(e => {
                  console.warn("Video retry failed:", e);
                });
              }
            }, 100);
          });
        }
      }
    } else {
      // When music is playing (show = false), hide the video
      this.videoAd.style.display = "none";
      this.videoAd.pause();
    }
  }

  autoResizeVideoOnPlay() {
    // Called by AudioPlayer when music starts playing
    this.onMusicPlayStateChange(true);
  }

  resetVideoSize() {
    if (!this.videoAd) return; // Safety check

    // FIXED: Don't reset if override is active
    if (this.videoOverride) return;
    
    this.videoAd.controls = false;
    this.controlsToggledManually = false;
    this.videoAd.loop = true;
    
    if (!this.videoAd.classList.contains("bigger-video") && 
        !this.videoAd.classList.contains("overlay-video")) {
      this.videoAd.classList.add("overlay-video");
    }
    
    if (this.videoAd.classList.contains("overlay-video")) {
      this.videoAd.controls = false;
      this.controlsToggledManually = false;
    }
  }

  muteVideo() {
    if (this.videoAd) {
      this.videoAd.muted = true;
    }
  }

  updateBorderBoxDisplay() {
    if (this.suffix === '2') {
      this.updateBorderBoxDebounced();
    }
  }

  updateBorderBoxImmediate() {
    if (this.suffix !== '2' || !this.borderBox) return;

    const now = performance.now();
    
    if (now - this.borderBoxState.lastUpdate < 16) return;
    
    const isDarkMode = this.wrapper && this.wrapper.classList.contains("dark-mode");
    
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
    if (shouldShow && styleKey && this.borderBoxStyles[styleKey]) {
      const styles = this.borderBoxStyles[styleKey];
      
      const cssText = `
        display: block;
        position: absolute;
        top: ${styles.top};
        left: ${styles.left};
        width: ${styles.width};
        height: ${styles.height};
        transform: ${styles.transform};
        border-radius: ${styles.borderRadius};
        border: 2px solid white;
        pointer-events: none;
        z-index: 10;
      `;
      
      this.borderBox.style.cssText = cssText;
    } else {
      this.borderBox.style.cssText = 'display: none; visibility: hidden; opacity: 0;';
    }
  }

  // Called when dark mode is toggled
  updateDarkMode(isDarkMode) {
    // Update fallback elements
    this.updateFallbackElements();
    
    // Update border box for Player 2
    if (this.suffix === '2') {
      this.updateBorderBoxDisplay();
    }
  }

  cleanup() {
    // Stop and clean up video
    if (this.videoAd) {
      this.videoAd.pause();
      this.videoAd.currentTime = 0;
      this.videoAd.src = '';
      this.videoAd.load();
      
      // Remove event listeners
      if (this.videoAd.clickHandler) {
        this.videoAd.removeEventListener("click", this.videoAd.clickHandler);
      }
      
      // Remove video element if we created it
      if (this.videoAd.parentNode && this.videoAd.id.includes('video')) {
        this.videoAd.parentNode.removeChild(this.videoAd);
      }
    }
    
    // Hide and remove border box
    if (this.borderBox) {
      this.borderBox.style.display = 'none';
      if (this.borderBox.parentNode) {
        this.borderBox.parentNode.removeChild(this.borderBox);
      }
    }
    
    console.log(`MediaManager${this.suffix} cleaned up`);
  }
}

// Global instance management
window.homeMediaManager = null;
window.disguiseMediaManager = null;

// Initialization functions
function initializeMediaManagers() {
  if (!window.homeMediaManager) {
    window.homeMediaManager = new MediaManager('');
  }
  if (!window.disguiseMediaManager) {
    window.disguiseMediaManager = new MediaManager('2');
  }
  console.log('MediaManager instances created');
}

// Cleanup function
function cleanupMediaManagers() {
  if (window.homeMediaManager) {
    window.homeMediaManager.cleanup();
    window.homeMediaManager = null;
  }
  if (window.disguiseMediaManager) {
    window.disguiseMediaManager.cleanup();
    window.disguiseMediaManager = null;
  }
  console.log('MediaManager instances cleaned up');
}

// Export functions
window.initializeMediaManagers = initializeMediaManagers;
window.cleanupMediaManagers = cleanupMediaManagers;