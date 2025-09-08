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
    localStorage.removeItem("LoginTime"); // Fixed typo: was removeTime
    document.body.style.backgroundColor = "white";
    clearInputFields();
    refreshPage();
  });
  
  function pauseAudio() {
    const audio = document.getElementById('main-audio');
    if (audio) audio.pause();
  }
  
  function pauseAudio2() {
    const audio = document.getElementById('main-audio2');
    if (audio) audio.pause();
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
      this.audioBucketUrl = 'https://pub-c755c6dec2fa41a5a9f9a659408e2150.r2.dev/';
      this.videoBucketUrls = [
        'https://pub-fb9b941e940b4b44a61b7973d5ba28c3.r2.dev/',
        'https://pub-2e4c11f1d1e049e5a893e7a1681ebf7e.r2.dev/',
        'https://pub-15e524466e7449c997fe1434a0717e91.r2.dev/'
      ];
  
      // Configure R2 bucket URLs for images
      this.imageBucketUrl = suffix === '2' 
      ? 'https://pub-35bf609bb46e4f27a992efb322030db4.r2.dev/'
      : 'https://pub-99d8e809a4554c358c8d5e75932939cd.r2.dev/';
  
      // Initialize DOM elements with null checks
      this.initializeDOMElements();
      
      // Player state
      this.musicIndex = 1;
      this.isMusicPaused = true;
      this.musicSource = suffix === '2' ? (typeof ReducedMusic !== 'undefined' ? ReducedMusic : []) : (typeof allMusic !== 'undefined' ? allMusic : []);
      this.originalOrder = [...this.musicSource];
      this.shuffledOrder = [];
      this.isMuted = false;
      this.isInitializing = true;
      this.r2Available = true;
      this.preShuffleIndex = 1;
      this.isShuffleMode = false;
  
      // Pagination state
      this.currentPage = 0;
      this.itemsPerPage = 25;
      this.maxDOMItems = 200; // Prevent unbounded growth
      this.isLoading = false;
      this.currentMusicArray = this.originalOrder;
  
      this.controlsToggledManually = false;
      this.videoOverride = false;
      
      // Audio loading cleanup
      this.audioEventCleanup = [];
      this.videoEventCleanup = [];
      
      // Only set up border box for Player 2
      if (suffix === '2' && this.borderBox) {
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
    }
  
    initializeDOMElements() {
      // Element selectors with null checks
      this.wrapper = document.querySelector(`#wrapper${this.suffix}`);
      if (!this.wrapper) {
        console.error(`Wrapper element #wrapper${this.suffix} not found`);
        return;
      }
  
      this.coverArea = this.wrapper.querySelector(".img-area");
      this.musicName = this.wrapper.querySelector(".song-details .name");
      this.musicArtist = this.wrapper.querySelector(".song-details .artist");
      this.playPauseBtn = this.wrapper.querySelector(".play-pause");
      this.prevBtn = this.wrapper.querySelector(`#prev${this.suffix}`);
      this.nextBtn = this.wrapper.querySelector(`#next${this.suffix}`);
      this.mainAudio = this.wrapper.querySelector(`#main-audio${this.suffix}`);
      this.videoAd = this.wrapper.querySelector(`#video${this.suffix}`);
      this.progressArea = this.wrapper.querySelector(".progress-area");
      this.progressBar = this.progressArea?.querySelector(".progress-bar");
      this.musicList = this.wrapper.querySelector(".music-list");
      this.moreMusicBtn = this.wrapper.querySelector(`#more-music${this.suffix}`);
      this.closeMoreMusicBtn = this.musicList?.querySelector(`#close${this.suffix}`);
      this.modeToggle = document.getElementById(`modeToggle${this.suffix}`);
      this.muteButton = document.getElementById(`muteButton${this.suffix}`);
      this.header = this.wrapper.querySelector(".row");
      this.ulTag = this.wrapper.querySelector("ul");
      this.repeatBtn = this.wrapper.querySelector(`#repeat-plist${this.suffix}`);
      
      // Only initialize border box for Player 2
      if (this.suffix === '2') {
        this.borderBox = document.getElementById(`video-border-box${this.suffix}`);
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
      if (!this.wrapper) return;
      
      this.setupEventListeners();
      this.loadPersistedState();
      this.populateMusicList(this.originalOrder);
      this.updatePlayingSong();
      
      // Test autoplay capability on mobile
      this.testAutoplaySupport();
      
      // Only initialize border box for Player 2
      if (this.suffix === '2' && this.borderBox) {
        this.initializeBorderBox();
      }
    
      setTimeout(() => {
        this.isInitializing = false;
      }, 100);
    }
    
    testAutoplaySupport() {
      const testAudio = document.createElement('audio');
      testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG';
      testAudio.volume = 0;
      
      const playPromise = testAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.autoplayAllowed = true;
        }).catch(() => {
          this.autoplayAllowed = false;
          console.log("Autoplay not allowed - user interaction required");
        });
      }
    }
  
    initializeBorderBox() {
      if (this.suffix !== '2' || !this.borderBox) return;
      
      // Batch all style changes
      const resetStyles = `
        display: none;
        visibility: hidden;
        opacity: 0;
      `;
      this.borderBox.style.cssText = resetStyles;
      this.borderBox.classList.remove('player2-dark');
      
      // Reset border box state
      this.borderBoxState = {
        isVisible: false,
        currentStyle: null,
        lastUpdate: 0
      };
      
      // Ensure DOM is ready
      requestAnimationFrame(() => {
        if (this.borderBox) {
          this.borderBox.style.display = "none";
        }
      });
    }
  
    updateBorderBoxDisplay() {
      if (this.suffix === '2' && this.updateBorderBoxDebounced) {
        this.updateBorderBoxDebounced();
      }
    }
  
    setupEventListeners() {
      // Add null checks for all event listeners
      this.playPauseBtn?.addEventListener("click", () => this.togglePlayPause());
      this.prevBtn?.addEventListener("click", () => this.changeMusic(-1));
      this.nextBtn?.addEventListener("click", () => this.changeMusic(1));
      this.progressArea?.addEventListener("click", (e) => this.handleProgressClick(e));
      this.moreMusicBtn?.addEventListener("click", () => this.toggleMusicList());
      this.closeMoreMusicBtn?.addEventListener("click", () => this.closeMusicList());
      this.modeToggle?.addEventListener("click", () => this.toggleDarkMode());
      this.muteButton?.addEventListener("click", () => this.handleMute());
      this.repeatBtn?.addEventListener("click", () => this.handleRepeat());
  
      // Media events
      if (this.mainAudio) {
        this.mainAudio.addEventListener("timeupdate", (e) => this.updateProgress(e));
        this.mainAudio.addEventListener("ended", () => this.handleSongEnd());
        this.mainAudio.addEventListener("pause", () => this.handleAudioPause());
        this.mainAudio.addEventListener("play", () => this.handleAudioPlay());
      }
      
      if (this.videoAd) {
        this.videoAd.addEventListener("ended", () => this.handleVideoEnd());
      }
  
      this.musicName?.addEventListener("click", () => this.toggleVideoControls());
  
      // Scroll event for pagination
      this.ulTag?.addEventListener("scroll", () => this.handleScroll());
  
      const seeVideoBtn = document.querySelector('.seeVideo');
      if (seeVideoBtn) {
        seeVideoBtn.addEventListener("click", () => this.toggleVideoOverride());
      }
    }
  
    toggleVideoOverride() {
      this.videoOverride = !this.videoOverride;
      
      if (this.videoOverride) {
        this.showVideoOverride();
      } else {
        this.toggleVideoDisplay(this.isMusicPaused);
      }
    }
    
    showVideoOverride() {
      if (this.suffix === '2' || !this.videoAd) {
        return; // Early return for player 2
      }
      
      this.videoAd.style.display = "block";
      
      // Batch style changes
      const overrideStyles = `
        display: block;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      `;
      this.videoAd.style.cssText += overrideStyles;
      
      this.videoAd.muted = !this.isMusicPaused;
      
      // Improved promise handling
      this.safeVideoPlay();
    }
  
    safeVideoPlay() {
      if (!this.videoAd) return;
      
      const playPromise = this.videoAd.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Video playing successfully");
          })
          .catch(error => {
            console.warn("Video autoplay failed:", error);
            // Single retry with delay
            setTimeout(() => {
              const retryPromise = this.videoAd.play();
              if (retryPromise !== undefined) {
                retryPromise.catch(e => {
                  console.warn("Video retry also failed:", e);
                });
              }
            }, 100);
          });
      }
    }
  
    loadPersistedState() {
      const storedMusicIndex = localStorage.getItem(`musicIndex${this.suffix}`);
      if (storedMusicIndex) {
        const parsedIndex = parseInt(storedMusicIndex, 10);
        // Ensure the index is valid
        if (parsedIndex >= 1 && parsedIndex <= this.musicSource.length) {
          this.musicIndex = parsedIndex;
        } else {
          this.musicIndex = 1;
          localStorage.setItem(`musicIndex${this.suffix}`, 1);
        }
        
        this.loadMusic(this.musicIndex);
        
        // Check if music should be playing but don't auto-play due to browser restrictions
        const wasPlaying = localStorage.getItem(`isMusicPaused${this.suffix}`) === "false";
        if (wasPlaying) {
          console.log("Music was playing, ready to resume when user interacts");
          // Update UI to show it was playing, but don't actually play
          this.isMusicPaused = false;
          localStorage.setItem(`isMusicPaused${this.suffix}`, false);
        }
      } else {
        this.musicIndex = 1;
        this.loadMusic(this.musicIndex);
      }
    }
  
    toggleVideoControls() {
      if (!this.videoAd?.classList.contains("bigger-video")) return;
    
      this.controlsToggledManually = !this.controlsToggledManually;
      this.videoAd.controls = this.controlsToggledManually;
    
      if (!this.controlsToggledManually && this.mainAudio?.paused) {
        this.safeVideoPlay();
      }
    }
  
    loadMusic(index) {
      // Clean up previous event listeners
      this.cleanupAudioEvents();
      
      const music = this.isShuffleMode ?
        this.shuffledOrder[index - 1] :
        this.musicSource[index - 1];
  
      if (!music) {
        console.error(`Music at index ${index} not found`);
        return;
      }
    
      if (this.musicName) this.musicName.textContent = music.name;
      if (this.musicArtist) this.musicArtist.textContent = music.artist;
    
      const { coverType = 'Images', src, type = 'jpg' } = music;
      
      if (this.coverArea) {
        this.coverArea.innerHTML = '';
        const mediaElement = (this.suffix === '2' || coverType !== 'video')
          ? this.createImageElement(src, type)
          : this.createVideoElementWithFallback(src, type);
        this.coverArea.appendChild(mediaElement);
      }
    
      // Use backup fallback only for the first song (index 1)
      if (index === 1) {
        this.setInitialAudioSource(src);
      } else {
        this.setAudioSourceWithFallback(src);
      }
    
      // Only set video source for player 1
      if (this.suffix !== '2' && this.videoAd) {
        this.setVideoSourceWithFallback(src);
        
        if (this.videoOverride) {
          const handleVideoLoaded = () => {
            this.showVideoOverride();
          };
          
          // Clean event listeners and add new ones
          this.cleanupVideoEvents();
          
          const loadedHandler = () => {
            handleVideoLoaded();
            this.cleanupVideoEvents();
          };
          
          this.videoAd.addEventListener('loadeddata', loadedHandler);
          this.videoAd.addEventListener('canplay', loadedHandler);
          
          // Store for cleanup
          this.videoEventCleanup = [
            { element: this.videoAd, event: 'loadeddata', handler: loadedHandler },
            { element: this.videoAd, event: 'canplay', handler: loadedHandler }
          ];
          
          // Fallback timeout
          setTimeout(() => {
            if (this.videoOverride) {
              this.showVideoOverride();
            }
            this.cleanupVideoEvents();
          }, 500);
        }
      } else if (this.videoAd) {
        // Player 2 - NO VIDEO
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
  
    cleanupAudioEvents() {
      this.audioEventCleanup.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      this.audioEventCleanup = [];
    }
  
    cleanupVideoEvents() {
      this.videoEventCleanup.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      this.videoEventCleanup = [];
    }
  
    setAudioSourceWithFallback(src) {
      if (!this.mainAudio) return;
      
      const r2AudioSrc = `${this.audioBucketUrl}${src}.mp3`;
      const localAudioSrc = `${this.audioFolder}${src}.mp3`;
      const uploadAudioSrc = `Upload/${src}.mp3`;
      
      // Clean up previous events
      this.cleanupAudioEvents();
      
      let currentAttempt = 0;
      const sources = [r2AudioSrc, localAudioSrc, uploadAudioSrc];
      
      const tryNextSource = () => {
        if (currentAttempt >= sources.length) {
          console.error(`All audio sources failed for: ${src}`);
          return;
        }
        
        const currentSrc = sources[currentAttempt];
        this.mainAudio.src = currentSrc;
        
        if (currentAttempt >= 1) {
          this.r2Available = false;
        }
        
        currentAttempt++;
      };
      
      const handleAudioError = () => {
        console.warn(`Audio failed: ${sources[currentAttempt - 1]}, trying next`);
        tryNextSource();
      };
      
      const handleAudioLoaded = () => {
        console.log(`Audio loaded successfully: ${sources[currentAttempt - 1]}`);
        this.cleanupAudioEvents();
      };
      
      // Attach event listeners before setting src
      this.mainAudio.addEventListener('error', handleAudioError);
      this.mainAudio.addEventListener('loadeddata', handleAudioLoaded);
      
      // Store for cleanup
      this.audioEventCleanup = [
        { element: this.mainAudio, event: 'error', handler: handleAudioError },
        { element: this.mainAudio, event: 'loadeddata', handler: handleAudioLoaded }
      ];
      
      // Start loading
      tryNextSource();
    }
  
    setInitialAudioSource(src) {
      if (!this.mainAudio) return;
      
      const sources = [
        `${this.audioBucketUrl}${src}.mp3`,
        `${this.audioFolder}${src}.mp3`,
        `Upload/${src}.mp3`,
        `Backup/${src}.mp3`
      ];
      
      // Clean up previous events
      this.cleanupAudioEvents();
      
      let currentAttempt = 0;
      
      const tryNextSource = () => {
        if (currentAttempt >= sources.length) {
          console.error(`All initial audio sources failed for: ${src}`);
          return;
        }
        
        const currentSrc = sources[currentAttempt];
        this.mainAudio.src = currentSrc;
        
        if (currentAttempt >= 1) {
          this.r2Available = false;
        }
        
        currentAttempt++;
      };
      
      const handleError = () => {
        console.warn(`Initial audio failed: ${sources[currentAttempt - 1]}, trying next`);
        tryNextSource();
      };
      
      const handleLoaded = () => {
        console.log(`Initial audio loaded: ${sources[currentAttempt - 1]}`);
        this.cleanupAudioEvents();
      };
      
      // Attach events before setting src
      this.mainAudio.addEventListener('error', handleError);
      this.mainAudio.addEventListener('loadeddata', handleLoaded);
      
      this.audioEventCleanup = [
        { element: this.mainAudio, event: 'error', handler: handleError },
        { element: this.mainAudio, event: 'loadeddata', handler: handleLoaded }
      ];
      
      tryNextSource();
    }
  
    waitForAudioReady() {
      return new Promise((resolve) => {
        if (!this.mainAudio) {
          resolve();
          return;
        }
        
        if (this.mainAudio.readyState >= 3) {
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
    }
  
    createVideoElementWithFallback(src, type) {
      const video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.loop = true;
    
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
        }
        
        attempt++;
      };
    
      video.onerror = () => {
        console.warn(`Video source failed: ${allSources[attempt - 1]}, trying next`);
        tryNextSource();
      };
    
      tryNextSource();
      return video;
    }
  
    setVideoSourceWithFallback(src) {
      if (!this.videoAd) return;
      
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
        }
        
        attempt++;
      };
    
      this.videoAd.onerror = () => {
        console.warn(`videoAd source failed: ${allSources[attempt - 1]}, trying next`);
        tryNextSource();
      };
    
      tryNextSource();
    }   
  
    createImageElement(src, type) {
      const img = document.createElement('img');
      
      const r2ImageSrc = `${this.imageBucketUrl}${src}.${type}`;
      const localImageSrc = `${this.imageFolder}${src}.${type}`;
      const uploadImageSrc = `Upload/${src}.${type}`;
      
      img.alt = this.musicName?.textContent || 'Music cover';
      
      let attempt = 0;
      const sources = [r2ImageSrc, localImageSrc, uploadImageSrc];
      
      const tryNextSource = () => {
        if (attempt >= sources.length) {
          if (this.suffix === '2') {
            return this.createWhiteFallback(img);
          }
          console.warn("All image sources failed");
          return;
        }
        
        img.src = sources[attempt];
        if (attempt >= 1) {
          this.r2Available = false;
        }
        attempt++;
      };
      
      img.onerror = () => {
        console.warn(`Image failed: ${sources[attempt - 1]}, trying next`);
        tryNextSource();
      };
      
      tryNextSource();
      return img;
    }
  
    createWhiteFallback(imgElement) {
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
      
      if (imgElement.parentNode) {
        imgElement.parentNode.replaceChild(whiteDiv, imgElement);
      }
      
      return whiteDiv;
    }
  
    togglePlayPause() {
      this.isMusicPaused ? this.playMusic() : this.pauseMusic();
    }
  
    async playMusic() {
      if (!this.mainAudio) return;
      
      try {
        await this.waitForAudioReady();
        await this.mainAudio.play();
        
        // Update state after successful play
        if (this.wrapper) this.wrapper.classList.add("paused");
        if (this.playPauseBtn) {
          const icon = this.playPauseBtn.querySelector("i");
          if (icon) icon.textContent = "pause";
        }
        this.isMusicPaused = false;
        localStorage.setItem(`isMusicPaused${this.suffix}`, false);
        
        if (this.videoOverride) {
          if (this.videoAd) this.videoAd.muted = true;
          this.showVideoOverride();
        } else {
          this.toggleVideoDisplay(false);
        }
        
        this.resetVideoSize();
        
        if (this.suffix === '2') {
          this.updateBorderBoxDisplay();
        }
      } catch (error) {
        console.warn("Failed to play audio:", error);
        // Reset UI on failure
        if (this.wrapper) this.wrapper.classList.remove("paused");
        if (this.playPauseBtn) {
          const icon = this.playPauseBtn.querySelector("i");
          if (icon) icon.textContent = "play_arrow";
        }
        this.isMusicPaused = true;
        localStorage.setItem(`isMusicPaused${this.suffix}`, true);
      }
    }
    
    pauseMusic() {
      if (!this.mainAudio) return;
      
      if (this.wrapper) this.wrapper.classList.remove("paused");
      if (this.playPauseBtn) {
        const icon = this.playPauseBtn.querySelector("i");
        if (icon) icon.textContent = "play_arrow";
      }
      this.mainAudio.pause();
      this.isMusicPaused = true;
      localStorage.setItem(`isMusicPaused${this.suffix}`, true);
      
      if (this.videoOverride) {
        if (this.videoAd) this.videoAd.muted = false;
        this.showVideoOverride();
      } else {
        this.toggleVideoDisplay(true);
        this.muteVideo();
      }
      
      this.resetVideoSize();
      
      if (this.suffix === '2') {
        this.updateBorderBoxDisplay();
      }
    }
  
    resetVideoSize() {
      if (!this.videoAd) return;
      
      this.videoAd.classList.remove("bigger-video");
      this.videoAd.classList.add("overlay-video");
      this.videoAd.controls = false;
      this.controlsToggledManually = false;
      this.videoAd.loop = true;
    }
    
    toggleVideoDisplay(show) {
      if (!this.videoAd) return;
      
      if (this.videoOverride) {
        this.showVideoOverride();
        return;
      }
      
      if (show) {
        if (this.suffix === '2') {
          this.videoAd.style.display = "none";
        } else {
          // Batch style updates
          const showStyles = `
            display: block;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          `;
          this.videoAd.style.cssText += showStyles;
          this.safeVideoPlay();
        }
      } else {
        this.videoAd.style.display = "none";
        this.videoAd.pause();
      }
    }
  
    muteVideo() {
      if (this.videoAd) {
        this.videoAd.muted = true;
      }
    }
  
    changeMusic(direction) {
      const currentArray = this.isShuffleMode ? this.shuffledOrder : this.musicSource;
      const arrayLength = currentArray.length;
      
      if (arrayLength === 0) return;
      
      // Fixed direction handling
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
      if (!this.mainAudio || !this.progressArea) return;
      
      const clickedOffsetX = e.offsetX;
      const songDuration = this.mainAudio.duration;
      if (isNaN(songDuration)) return;
      
      this.mainAudio.currentTime = (clickedOffsetX / this.progressArea.clientWidth) * songDuration;
      this.playMusic();
    }
  
    updateProgress(e) {
      const { currentTime, duration } = e.target;
      
      if (this.progressBar && !isNaN(duration) && duration > 0) {
        this.progressBar.style.width = `${(currentTime / duration) * 100}%`;
      }
  
      const currentTimeEl = this.wrapper?.querySelector(".current-time");
      const maxDurationEl = this.wrapper?.querySelector(".max-duration");
      
      if (currentTimeEl) {
        const currentMin = Math.floor(currentTime / 60);
        const currentSec = Math.floor(currentTime % 60).toString().padStart(2, "0");
        currentTimeEl.textContent = `${currentMin}:${currentSec}`;
      }
  
      if (maxDurationEl && !isNaN(duration)) {
        const totalMin = Math.floor(duration / 60);
        const totalSec = Math.floor(duration % 60).toString().padStart(2, "0");
        maxDurationEl.textContent = `${totalMin}:${totalSec}`;
      }
    }
  
    handleRepeat() {
      if (!this.repeatBtn) return;
      
      const currentMode = this.repeatBtn.textContent;
      
      switch (currentMode) {
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
          break;
        case "shuffle":
          this.repeatBtn.textContent = "repeat";
          this.repeatBtn.title = "Playlist looped";
          this.isShuffleMode = false;
          
          // Return to the song that was playing before shuffle
          this.musicIndex = this.preShuffleIndex;
          
          this.loadMusic(this.musicIndex);
          this.playMusic();
          break;
      }
    }
  
    handleSongEnd() {
      if (!this.repeatBtn) return;
      
      const mode = this.repeatBtn.textContent;
    
      if (mode === "repeat_one") {
        // Replay the same song
        if (this.mainAudio) {
          this.mainAudio.currentTime = 0;
          this.playMusic();
        }
      } else if (mode === "shuffle" || this.isShuffleMode) {
        // In shuffle mode, go to next song in shuffled order
        const arrayLength = this.shuffledOrder.length;
        this.musicIndex = this.musicIndex >= arrayLength ? 1 : this.musicIndex + 1;
        this.loadMusic(this.musicIndex);
        this.playMusic();
      } else {
        // Normal mode - go to next song
        const arrayLength = this.musicSource.length;
        this.musicIndex = this.musicIndex >= arrayLength ? 1 : this.musicIndex + 1;
        this.loadMusic(this.musicIndex);
        this.playMusic();
      }
    }
  
    toggleMusicList() {
      if (this.musicList) {
        this.musicList.classList.toggle("show");
      }
    }
  
    closeMusicList() {
      if (this.musicList) {
        this.musicList.classList.remove("show");
      }
    }
  
    handleScroll() {
      if (!this.ulTag || this.isLoading) return;
      
      const isDarkMode = this.wrapper?.classList.contains("dark-mode");
      const scrollTop = this.ulTag.scrollTop;
      const scrollHeight = this.ulTag.scrollHeight;
      const clientHeight = this.ulTag.clientHeight;
      
      // Check if user scrolled to bottom (with small threshold)
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        this.loadMoreItems();
        if (isDarkMode) {
          this.listcolourblack();
        }
      }
    }
  
    loadMoreItems() {
      if (this.isLoading || !this.ulTag) return;
      
      const startIndex = (this.currentPage + 1) * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;
      
      // Check if there are more items to load
      if (startIndex >= this.musicSource.length) {
        console.log('No more items to load');
        return;
      }
      
      // Prevent unbounded DOM growth
      const currentItemCount = this.ulTag.children.length;
      if (currentItemCount >= this.maxDOMItems) {
        console.log('Maximum DOM items reached, consider implementing virtual scrolling');
        return;
      }
      
      this.isLoading = true;
      
      // Add timeout to prevent infinite loops
      const loadingTimeout = setTimeout(() => {
        this.isLoading = false;
        console.warn('Loading timeout reached');
      }, 2000);
      
      try {
        this.currentPage++;
        const nextItems = this.musicSource.slice(startIndex, endIndex);
        this.appendMusicItems(nextItems, startIndex);
      } catch (error) {
        console.error('Error loading items:', error);
      } finally {
        clearTimeout(loadingTimeout);
        this.isLoading = false;
      }
    }
  
    resetPagination() {
      this.currentPage = 0;
      if (this.ulTag) {
        this.ulTag.innerHTML = "";
      }
      this.populateMusicList(this.musicSource);
    }
    
    populateMusicList(musicArray) {
      if (!this.ulTag) return;
      
      this.currentMusicArray = this.musicSource;
      this.currentPage = 0;
      this.ulTag.innerHTML = "";
      
      // Load initial batch
      const initialItems = this.musicSource.slice(0, this.itemsPerPage);
      this.appendMusicItems(initialItems, 0);
    }
  
    appendMusicItems(musicItems, startIndex) {
      if (!this.ulTag || !Array.isArray(musicItems)) return;
      
      const fragment = document.createDocumentFragment();
      
      musicItems.forEach((music, i) => {
        const actualIndex = startIndex + i;
        const liTag = document.createElement("li");
        liTag.setAttribute("li-index", actualIndex + 1);
    
        liTag.innerHTML = `
          <div class="row">
            <span>${music.name || 'Unknown Title'}</span>
            <p>${music.artist || 'Unknown Artist'}</p>
          </div>
          <span id="${music.src}" class="audio-duration">3:40</span>
          <audio class="${music.src}" src="${this.audioBucketUrl}${music.src}.mp3"></audio>
        `;
    
        const liAudioTag = liTag.querySelector(`.${music.src}`);
        if (liAudioTag) {
          // Add fallback chain for list audio
          let audioAttempt = 0;
          const audioSources = [
            `${this.audioBucketUrl}${music.src}.mp3`,
            `${this.audioFolder}${music.src}.mp3`,
            `Upload/${music.src}.mp3`
          ];
          
          const tryNextAudioSource = () => {
            if (audioAttempt >= audioSources.length) return;
            liAudioTag.src = audioSources[audioAttempt];
            if (audioAttempt >= 1) this.r2Available = false;
            audioAttempt++;
          };
          
          liAudioTag.onerror = () => {
            tryNextAudioSource();
          };
          
          liAudioTag.addEventListener("loadeddata", () => {
            const duration = liAudioTag.duration;
            if (!isNaN(duration)) {
              const totalMin = Math.floor(duration / 60);
              const totalSec = Math.floor(duration % 60).toString().padStart(2, "0");
              const durationSpan = liTag.querySelector(".audio-duration");
              if (durationSpan) {
                durationSpan.textContent = `${totalMin}:${totalSec}`;
              }
            }
          });
        }
    
        liTag.addEventListener("click", () => {
          // Set the music index based on current mode
          if (this.isShuffleMode) {
            // Find the index of this song in the shuffled order
            const clickedMusic = this.musicSource[actualIndex];
            const shuffledIndex = this.shuffledOrder.findIndex(song => song.src === clickedMusic.src);
            this.musicIndex = shuffledIndex >= 0 ? shuffledIndex + 1 : 1;
          } else {
            this.musicIndex = actualIndex + 1;
          }
          this.loadMusic(this.musicIndex);
          this.playMusic();
          this.resetVideoSize();
        });
        
        fragment.appendChild(liTag);
      });
      
      this.ulTag.appendChild(fragment);
      this.updatePlayingSong();
    }
  
    updatePlayingSong() {
      if (!this.ulTag) return;
      
      const allLiTags = this.ulTag.querySelectorAll("li");
    
      const currentMusic = this.isShuffleMode
        ? this.shuffledOrder[this.musicIndex - 1]
        : this.musicSource[this.musicIndex - 1];
  
      if (!currentMusic) return;
    
      // Calculate the actual index in the original music source
      const actualMusicIndex = this.isShuffleMode 
        ? this.musicSource.findIndex(song => song.src === currentMusic.src)
        : this.musicIndex - 1;
    
      allLiTags.forEach(liTag => {
        const audioTag = liTag.querySelector(".audio-duration");
        if (!audioTag) return;
        
        const id = audioTag.id;
        const isPlaying = id === currentMusic.src;
    
        if (!audioTag.hasAttribute("t-duration")) {
          audioTag.setAttribute("t-duration", audioTag.textContent);
        }
    
        liTag.classList.toggle("playing", isPlaying);
        audioTag.textContent = isPlaying
          ? "Playing"
          : audioTag.getAttribute("t-duration");
      });
    
      // Smart scrolling based on index calculation (only in normal mode)
      this.scrollToSongByIndex(actualMusicIndex);
    }
    
    // Fixed scroll method - only scrolls in normal mode
    scrollToSongByIndex(targetIndex) {
      // Only auto-scroll if NOT in shuffle mode (i.e., in normal mode)
      if (this.isShuffleMode || !this.ulTag) {
        return; // Exit early - no scrolling in shuffle mode
      }
      
      const startIndex = this.currentPage * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;
      
      // Check if target song is in currently loaded range
      if (targetIndex >= startIndex && targetIndex < endIndex) {
        // Song is already loaded, scroll to it
        const relativeIndex = targetIndex - startIndex;
        const targetElement = this.ulTag.children[relativeIndex];
        
        if (targetElement) {
          requestAnimationFrame(() => {
            const containerHeight = this.ulTag.clientHeight;
            const elementTop = targetElement.offsetTop;
            const elementHeight = targetElement.offsetHeight;
            const scrollPosition = elementTop - (containerHeight / 2) + (elementHeight / 2);
            
            this.ulTag.scrollTo({
              top: Math.max(0, scrollPosition),
              behavior: 'smooth'
            });
          });
        }
      }
    }
  
    toggleDarkMode() {
      if (!this.wrapper) return;
      
      const isDarkMode = this.wrapper.classList.toggle("dark-mode");
      
      const fontAwesome = document.getElementById(`fontawesome-icons${this.suffix}`);
      if (fontAwesome) {
        fontAwesome.classList.toggle("Dark");
      }
  
      // Get the controls elements
      const controlsBox = this.wrapper.querySelector('.control-box');
      const progressArea = this.wrapper.querySelector('.progress-area');
      const progressBar = this.wrapper.querySelector('.progress-bar');
      const controlsContent = this.wrapper.querySelectorAll('.control-box *');
      const playPauseBtn = this.wrapper.querySelector('.play-pause');
      const playPauseIcon = this.wrapper.querySelector('.play-pause i');
  
      if (isDarkMode) {
        // Dark mode styling - batch all changes
        document.body.style.backgroundColor = "white";
        this.listcolourblack();
        
        // Apply dark mode styles in batches
        if (controlsBox) {
          controlsBox.style.cssText += `
            background-color: black !important;
            border-color: black !important;
          `;
        }
        
        if (progressArea) {
          progressArea.style.setProperty('background', 'white', 'important');
        }
        
        if (progressBar) {
          progressBar.style.setProperty('background', 'linear-gradient(90deg, white 0%, white 100%)', 'important');
        }
        
        // Style all controls content
        controlsContent.forEach(element => {
          if (element.closest('.play-pause') && element.tagName === 'I') return;
          if (element.classList.contains('progress-bar')) return;
          
          element.style.setProperty('color', 'white', 'important');
          
          if (element.tagName === 'I' && element.classList.contains('material-icons')) {
            element.style.cssText += `
              background: linear-gradient(white 0%, white 100%) !important;
              background-clip: text !important;
              -webkit-background-clip: text !important;
              -webkit-text-fill-color: transparent !important;
            `;
          }
        });
        
        if (playPauseBtn) {
          playPauseBtn.style.setProperty('background', 'linear-gradient(red 0%, red 100%)', 'important');
        }
        
        // Create style element for pseudo-element
        let styleElement = document.getElementById(`dark-mode-style${this.suffix}`);
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = `dark-mode-style${this.suffix}`;
          document.head.appendChild(styleElement);
        }
        styleElement.textContent = `
          #wrapper${this.suffix}.dark-mode .play-pause::before {
            background: linear-gradient(white 0%, white 100%) !important;
          }
        `;
        
        if (playPauseIcon) {
          playPauseIcon.style.cssText += `
            background: linear-gradient(black 0%, black 100%) !important;
            background-clip: text !important;
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
          `;
        }
        
      } else {
        // Light mode - reset all styles
        document.body.style.backgroundColor = "black";
        this.listcolourwhite();
        
        // Reset all custom styles
        [controlsBox, progressArea, progressBar].forEach(el => {
          if (el) {
            el.style.removeProperty('background-color');
            el.style.removeProperty('border-color');
            el.style.removeProperty('background');
          }
        });
        
        controlsContent.forEach(element => {
          ['color', 'background', 'background-clip', '-webkit-background-clip', '-webkit-text-fill-color'].forEach(prop => {
            element.style.removeProperty(prop);
          });
        });
        
        if (playPauseBtn) {
          playPauseBtn.style.removeProperty('background');
        }
        
        const styleElement = document.getElementById(`dark-mode-style${this.suffix}`);
        if (styleElement) {
          styleElement.remove();
        }
      }
      
      // Update border box for Player 2
      if (this.suffix === '2') {
        this.updateBorderBoxDisplay();
      }
    }
  
    handleMute() {
      if (!this.videoAd || !this.muteButton) return;
      
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
      if (this.muteButton) {
        this.muteButton.disabled = false;
      }
    }
  
    handleAudioPlay() {
      if (this.muteButton) {
        this.muteButton.disabled = true;
      }
    }
  
    handleVideoEnd() {
      if (this.muteButton) {
        this.muteButton.disabled = false;
      }
    }
  
    listcolourblack() {
      if (!this.ulTag || !this.musicList) return;
      
      const listItems = this.ulTag.querySelectorAll("li");
      listItems.forEach(item => {
        item.style.cssText += `
          color: white;
          border-bottom: 3px solid white;
        `;
      });
      this.musicList.style.backgroundColor = "black";
      
      if (this.closeMoreMusicBtn) this.closeMoreMusicBtn.style.color = "white";
      if (this.header) this.header.style.color = "white";
    }
  
    listcolourwhite() {
      if (!this.ulTag || !this.musicList) return;
      
      const listItems = this.ulTag.querySelectorAll("li");
      listItems.forEach(item => {
        item.style.cssText += `
          color: black;
          border-bottom: 3px solid black;
        `;
      });
      this.musicList.style.backgroundColor = "white";
      
      if (this.closeMoreMusicBtn) this.closeMoreMusicBtn.style.color = "black";
      if (this.header) this.header.style.color = "black";
    }
  
    updateBorderBoxImmediate() {
      // Only handle border box for Player 2
      if (this.suffix !== '2' || !this.borderBox) return;
  
      if (this.isInitializing) {
        this.borderBox.style.display = "none";
        return;
      }
      
      const now = performance.now();
      
      // Throttle updates
      if (now - this.borderBoxState.lastUpdate < 16) return;
      
      const isDarkMode = this.wrapper.classList.contains("dark-mode");
      
      let shouldShowBorder = false;
      let targetStyle = null;
      
      if (isDarkMode) {
        shouldShowBorder = true;
        targetStyle = 'player2DarkMode';
      }
      
      // Only update if state changed
      if (this.borderBoxState.isVisible !== shouldShowBorder || 
          this.borderBoxState.currentStyle !== targetStyle) {
        
        this.applyBorderBoxChanges(shouldShowBorder, targetStyle);
        
        this.borderBoxState.isVisible = shouldShowBorder;
        this.borderBoxState.currentStyle = targetStyle;
        this.borderBoxState.lastUpdate = now;
      }
    }
  
    applyBorderBoxChanges(shouldShow, styleKey) {
      if (!this.borderBox) return;
      
      if (shouldShow && styleKey && this.borderBoxStyles[styleKey]) {
        const styles = this.borderBoxStyles[styleKey];
        
        this.borderBox.style.cssText = `
          display: block;
          top: ${styles.top};
          left: ${styles.left};
          width: ${styles.width};
          height: ${styles.height};
          transform: ${styles.transform};
          border-radius: ${styles.borderRadius};
        `;
      } else {
        this.borderBox.style.cssText = 'display: none; visibility: hidden; opacity: 0;';
      }
    }
  
    // Cleanup method for when player is destroyed
    destroy() {
      this.cleanupAudioEvents();
      this.cleanupVideoEvents();
      
      // Remove any created style elements
      const styleElement = document.getElementById(`dark-mode-style${this.suffix}`);
      if (styleElement) {
        styleElement.remove();
      }
    }
  }
  
  function handleSize() {
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
          // Batch style changes for better performance
          sizer.style.cssText += `
            top: 0px;
            left: 0px;
            transform: translate(0, 0);
          `;
        } else {
          sizer.style.cssText += `
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          `;
        }
      }
    });
  }
  
  // Initialize players when DOM loads
  document.addEventListener("DOMContentLoaded", () => {
    // Check if required variables exist
    if (typeof allMusic === 'undefined') {
      console.warn('allMusic array not found');
    }
    if (typeof ReducedMusic === 'undefined') {
      console.warn('ReducedMusic array not found');
    }
    
    try {
      window.homePlayer = new MusicPlayer();
      window.disguisePlayer = new MusicPlayer('2');
      handleSize();
    } catch (error) {
      console.error('Error initializing music players:', error);
    }
  });