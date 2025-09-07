// Enhanced AudioPlayer with Auto-scroll and ReducedMusic features
document.getElementById("title").addEventListener("click", function() {
    pauseAudio();
    // Clear HomePage player state - using memory storage instead of localStorage
    if (window.homePlayer) {
      window.homePlayer.removeStorageValue("musicIndex");
      window.homePlayer.removeStorageValue("isMusicPaused");
    }
    // Existing logout logic
    document.getElementById("HomePage").style.display = "none";
    document.getElementById("LoginPage").style.display = "block";
    // Clear LoginTime from memory
    if (window.homePlayer) {
      window.homePlayer.removeStorageValue("LoginTime");
    }
    document.body.style.backgroundColor = "white";
    clearInputFields();
    refreshPage();
  });
  
  document.getElementById("title2").addEventListener("click", function() {
    pauseAudio2();
    // Clear DisguisePage player state - using memory storage instead of localStorage
    if (window.disguisePlayer) {
      window.disguisePlayer.removeStorageValue("musicIndex2");
      window.disguisePlayer.removeStorageValue("isMusicPaused2");
    }
    // Existing logout logic
    document.getElementById("DisguisePage").style.display = "none";
    document.getElementById("LoginPage").style.display = "block";
    // Clear LoginTime from memory
    if (window.disguisePlayer) {
      window.disguisePlayer.removeStorageValue("LoginTime");
    }
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
      // Initialize memory storage instead of localStorage
      this.memoryStorage = new Map();
      
      if (!this.getStorageValue(`musicIndex${suffix}`)) {
        this.musicIndex = 1;
        this.setStorageValue(`musicIndex${suffix}`, 1);
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
      this.seeAllMusicBtn = this.wrapper.querySelector('.seeAllMusic');
      this.currentTimeElement = this.wrapper.querySelector(".current-time");
      this.maxDurationElement = this.wrapper.querySelector(".max-duration");
      
      // Only initialize border box for Player 2
      if (suffix === '2') {
        this.borderBox = document.getElementById(`video-border-box${suffix}`);
      }
  
      // Player state
      this.musicIndex = 1;
      this.isMusicPaused = true;
      this.isShuffleMode = false;
      
      // Set initial music array based on player type - NEW FEATURE FROM OP2
      if (this.suffix === '2') {
        this.originalOrder = [...(window.ReducedMusic || [])];
        this.usingReducedMusic = true;
      } else {
        this.originalOrder = [...(window.allMusic || [])];
        this.usingReducedMusic = false;
      }
      
      this.shuffledOrder = [];
      this.isMuted = false;
      this.isInitializing = true;
  
      this.r2Available = true;
  
      this.preShuffleIndex = 1;
  
      // Pagination state
      this.currentPage = 0;
      this.itemsPerPage = 15;
      this.isLoading = false;
      this.currentMusicArray = this.originalOrder;
  
      this.controlsToggledManually = false;
  
      this.videoOverride = false;
      
      // Auto-scroll state variables - NEW FEATURE FROM OP2
      this.hasScrolledToCurrentSong = false;
      this.hasUserScrolled = false;
      this.scrollTimeout = null;

      this.preloadedSongs = new Set(); // Track which songs are preloaded
      this.nextSongIndex = null; // Cache next song index
      this.prevSongIndex = null; // Cache previous song index
      this.returnToNormalIndex = null; // Index to return to when shuffle is disabled
      
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

        this.updateBorderBoxDebounced = this.debounce(this.updateBorderBoxImmediate.bind(this), 100);
      }
      
      this.initialize();
    }
  
    // Memory storage methods to replace localStorage
    setStorageValue(key, value) {
      this.memoryStorage.set(key, value);
    }
  
    getStorageValue(key) {
      return this.memoryStorage.get(key);
    }
  
    removeStorageValue(key) {
      this.memoryStorage.delete(key);
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
      // Check if we have a stored preference for which music array to use - Player 2 only
      if (this.suffix === '2') {
        // Always start Player 2 with ReducedMusic array
        this.originalOrder = [...(window.ReducedMusic || [])];
        this.usingReducedMusic = true;
        this.setStorageValue(`usingReducedMusic${this.suffix}`, true);
        
        // Set button state
        setTimeout(() => {
          if (this.seeAllMusicBtn) {
            this.seeAllMusicBtn.textContent = "star";
          }
        }, 100);
      }
    
      this.setupEventListeners();
      this.loadPersistedState();
      
      // MOBILE OPTIMIZATION: Delay heavy operations
      requestAnimationFrame(() => {
        this.populateMusicList(this.originalOrder);
        this.updatePlayingSong();
      });
      
      // Test autoplay capability on mobile
      this.testAutoplaySupport();
      
      // Only initialize border box for Player 2
      if (this.suffix === '2') {
        this.initializeBorderBox();
      }
    
      setTimeout(() => {
        this.isInitializing = false;
      }, 100);
    }
    
    testAutoplaySupport() {
      // Create a silent audio element to test autoplay
      const testAudio = document.createElement('audio');
      testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG'; // Minimal silent WAV
      testAudio.volume = 0;
      
      const playPromise = testAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.autoplayAllowed = true;
        }).catch(() => {
          this.autoplayAllowed = false;
        });
      }
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
      // MOBILE OPTIMIZATION: Use throttled progress update
      this.mainAudio.addEventListener("timeupdate", this.throttle((e) => this.updateProgress(e), 100));
      this.mainAudio.addEventListener("ended", () => this.handleSongEnd());
      this.mainAudio.addEventListener("pause", () => this.handleAudioPause());
      this.mainAudio.addEventListener("play", () => this.handleAudioPlay());
      this.videoAd.addEventListener("ended", () => this.handleVideoEnd());
    
      this.musicName.addEventListener("click", () => this.toggleVideoControls());
    
      // MOBILE OPTIMIZATION: More aggressive scroll throttling for mobile
      if (this.ulTag) {
        let scrollThrottleTimeout = null;
        
        this.ulTag.addEventListener('scroll', (e) => {
          this.hasUserScrolled = true;
          
          // MOBILE OPTIMIZATION: Increased throttle to 150ms for mobile
          if (!scrollThrottleTimeout) {
            scrollThrottleTimeout = setTimeout(() => {
              this.handleScroll();
              scrollThrottleTimeout = null;
            }, 150);
          }
          
          if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
          }
          this.scrollTimeout = setTimeout(() => {
            // Keep manual scroll flag
          }, 400);
        }, { passive: true });
      }
    
      const seeVideoBtn = document.querySelector('.seeVideo');
      if (seeVideoBtn) {
        seeVideoBtn.addEventListener("click", () => this.toggleVideoOverride());
      }
    
      // ReducedMusic/AllMusic switching for Player 2
      if (this.suffix === '2' && this.seeAllMusicBtn) {
        this.seeAllMusicBtn.style.pointerEvents = 'auto';
        this.seeAllMusicBtn.style.cursor = 'pointer';
        this.seeAllMusicBtn.textContent = "star";
        this.seeAllMusicBtn.addEventListener("click", () => this.switchToAllMusic());
      }
    }
  
    // Auto-scroll functionality - NEW FEATURE FROM OP2
    scrollToCurrentSong() {
      if (this.hasUserScrolled || !this.musicList?.classList.contains("show")) {
        return;
      }
      
      // Single visibility check - removed redundant checks
      if (!this.ulTag?.offsetParent) {
        return;
      }
      
      let currentSong = this.isShuffleMode ? 
        this.shuffledOrder[this.musicIndex - 1] : 
        this.originalOrder[this.musicIndex - 1];
      
      if (!currentSong) return;
      
      const songIndexInOriginal = this.originalOrder.findIndex(song => song.src === currentSong.src);
      if (songIndexInOriginal === -1) return;
      
      const currentlyLoadedCount = (this.currentPage + 1) * this.itemsPerPage;
      
      if (songIndexInOriginal >= currentlyLoadedCount) {
        // Simplified loading - removed recursive approach
        if (!this.isLoading && this.currentPage * this.itemsPerPage < this.originalOrder.length) {
          this.loadMoreItems();
          // Single retry after loading
          setTimeout(() => {
            this.attemptScrollToSong(currentSong.src);
          }, 200);
        }
      } else {
        this.attemptScrollToSong(currentSong.src);
      }
    }
  
    loadItemsUntilSong(targetIndex, targetSrc) {
      const loadNextBatch = () => {
        const currentlyLoadedCount = (this.currentPage + 1) * this.itemsPerPage;
        
        if (targetIndex < currentlyLoadedCount) {
          // Target song should now be loaded, attempt scroll
          setTimeout(() => {
            this.attemptScrollToSong(targetSrc);
          }, 200);
          return;
        }
        
        // Load more items
        if (!this.isLoading && this.currentPage * this.itemsPerPage < this.originalOrder.length) {
          this.loadMoreItems();
          
          // Continue loading after a delay
          setTimeout(loadNextBatch, 300);
        }
      };
      
      loadNextBatch();
    }
  
    attemptScrollToSong(targetSrc) {
      if (!this.musicList?.classList.contains("show")) {
        return;
      }
      
      const allLiTags = this.ulTag.querySelectorAll("li");
      
      for (let i = 0; i < allLiTags.length; i++) {
        const liTag = allLiTags[i];
        const audioTag = liTag.querySelector(".audio-duration");
        
        if (audioTag && audioTag.id === targetSrc) {
          try {
            const containerRect = this.ulTag.getBoundingClientRect();
            const itemRect = liTag.getBoundingClientRect();
            const scrollTop = this.ulTag.scrollTop + (itemRect.top - containerRect.top) - (containerRect.height / 2);
            
            // MOBILE OPTIMIZATION: Use instant scroll on mobile for better performance
            const isMobile = window.innerWidth <= 768;
            this.ulTag.scrollTo({
              top: scrollTop,
              behavior: isMobile ? 'auto' : 'smooth' // Changed behavior based on device
            });
            
            break;
          } catch (error) {
            console.warn('Scroll failed:', error);
          }
        }
      }
    }
  
    // ReducedMusic/AllMusic switching functionality - NEW FEATURE FROM OP2
    async switchToAllMusic() {
      // Only for player 2
      if (this.suffix !== '2') return;
      
      // Check if music list is currently open
      const isMusicListOpen = this.musicList?.classList.contains("show");
      
      // Get the current song details BEFORE switching arrays
      const currentSong = this.isShuffleMode ? 
        this.shuffledOrder[this.musicIndex - 1] : 
        this.originalOrder[this.musicIndex - 1];
          
      const wasPlaying = !this.isMusicPaused;
      const wasShuffleMode = this.isShuffleMode;
      
      // IMPORTANT: Pause the audio first to prevent errors during transition
      if (this.mainAudio && !this.mainAudio.paused) {
        this.mainAudio.pause();
      }
      
      // Toggle between arrays
      if (this.usingReducedMusic) {
        // Switching FROM ReducedMusic TO allMusic
        this.originalOrder = [...(window.allMusic || [])];
        this.usingReducedMusic = false;
        
        if (this.seeAllMusicBtn) {
          this.seeAllMusicBtn.textContent = "star";
        }
      } else {
        // Switching FROM allMusic TO ReducedMusic
        this.originalOrder = [...(window.ReducedMusic || [])];
        this.usingReducedMusic = true;
        
        if (this.seeAllMusicBtn) {
          this.seeAllMusicBtn.textContent = "star";
        }
      }
      
      // Store the preference
      this.setStorageValue(`usingReducedMusic${this.suffix}`, this.usingReducedMusic);
      
      this.currentMusicArray = this.originalOrder;
      
      // Find the same song in the new array
      const newIndex = this.originalOrder.findIndex(song => 
        song.src === currentSong.src && 
        song.name === currentSong.name && 
        song.artist === currentSong.artist
      );
      
      // Handle the transition based on whether the song exists in the new array
      if (newIndex >= 0) {
        // Song found in new array - smooth transition
        this.musicIndex = newIndex + 1;
        
        // If we were in shuffle mode, recreate the shuffle with the new array
        if (wasShuffleMode) {
          this.shuffledOrder = [...this.originalOrder].sort(() => Math.random() - 0.5);
          
          // Find the song's new position in the shuffled order
          const shuffledIndex = this.shuffledOrder.findIndex(song => 
            song.src === currentSong.src && 
            song.name === currentSong.name && 
            song.artist === currentSong.artist
          );
          
          if (shuffledIndex >= 0) {
            this.musicIndex = shuffledIndex + 1;
          }
        }
        
        // Load the same song in the new array context
        this.loadMusic(this.musicIndex);
        
        // Restore playing state if it was playing before
        if (wasPlaying) {
          // Use a timeout to ensure the audio source is fully loaded
          setTimeout(async () => {
            try {
              await this.waitForAudioReady();
              await this.playMusic();
            } catch (error) {
              console.warn('Failed to resume playback after array switch:', error);
              this.pauseMusic();
            }
          }, 300);
        } else {
          // Ensure paused state is maintained
          this.pauseMusic();
        }
      } else {
        // Song not found in new array - find the closest song
        let closestIndex = 0;
        
        if (this.usingReducedMusic) {
          // Switching to ReducedMusic - find closest song by artist or similar characteristics
          
          // Try to find a song by the same artist first
          const sameArtistIndex = this.originalOrder.findIndex(song => 
            song.artist.toLowerCase() === currentSong.artist.toLowerCase()
          );
          
          if (sameArtistIndex >= 0) {
            closestIndex = sameArtistIndex;
          } else {
            // If no same artist, try to find similar genre or style
            // Look for songs with similar words in the title
            const currentSongWords = currentSong.name.toLowerCase().split(' ');
            let bestMatch = -1;
            let bestMatchScore = 0;
            
            this.originalOrder.forEach((song, index) => {
              const songWords = song.name.toLowerCase().split(' ');
              let matchScore = 0;
              
              // Calculate similarity score based on common words
              currentSongWords.forEach(word => {
                if (word.length > 3 && songWords.some(songWord => songWord.includes(word) || word.includes(songWord))) {
                  matchScore++;
                }
              });
              
              // Also check artist similarity
              const currentArtistWords = currentSong.artist.toLowerCase().split(' ');
              const artistWords = song.artist.toLowerCase().split(' ');
              currentArtistWords.forEach(word => {
                if (word.length > 2 && artistWords.some(artistWord => artistWord.includes(word) || word.includes(artistWord))) {
                  matchScore += 0.5;
                }
              });
              
              if (matchScore > bestMatchScore) {
                bestMatchScore = matchScore;
                bestMatch = index;
              }
            });
            
            if (bestMatch >= 0 && bestMatchScore > 0) {
              closestIndex = bestMatch;
            } else {
              // Fall back to middle of the array for a more varied selection
              closestIndex = Math.floor(this.originalOrder.length / 2);
            }
          }
        } else {
          // Switching to allMusic - use first song as before
          closestIndex = 0;
        }
        
        // Set to closest song
        this.musicIndex = closestIndex + 1;
        
        // Recreate shuffle if needed
        if (wasShuffleMode) {
          this.shuffledOrder = [...this.originalOrder].sort(() => Math.random() - 0.5);
          // Find the closest song's position in shuffled order
          const shuffledIndex = this.shuffledOrder.findIndex(song => 
            song.src === this.originalOrder[closestIndex].src
          );
          this.musicIndex = shuffledIndex >= 0 ? shuffledIndex + 1 : 1;
        }
        
        // Load the closest song
        this.loadMusic(this.musicIndex);
        
        // Autoplay the closest song after a short delay to ensure it's loaded
        setTimeout(async () => {
          try {
            await this.waitForAudioReady();
            await this.playMusic();
          } catch (error) {
            console.warn('Failed to autoplay closest song after array switch:', error);
            this.pauseMusic();
          }
        }, 400);
      }
      
      // Update the stored music index to match the new array
      this.setStorageValue(`musicIndex${this.suffix}`, this.musicIndex);
      
      // Reset pagination and reload list
      this.resetPagination();
      
      // Update playing song status
      setTimeout(() => {
        this.updatePlayingSong();
      }, 400);
      
      // Auto-scroll to current song if music list was open
      if (isMusicListOpen) {
        this.hasUserScrolled = false; // Reset scroll state
        if (this.scrollTimeout) {
          clearTimeout(this.scrollTimeout);
        }
        
        // Multiple scroll attempts with increasing delays to ensure it works
        setTimeout(() => {
          this.scrollToCurrentSong();
        }, 400);
      } else {
        // Reset scroll state even if list is closed
        this.hasUserScrolled = false;
        if (this.scrollTimeout) {
          clearTimeout(this.scrollTimeout);
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
      const storedMusicIndex = this.getStorageValue(`musicIndex${this.suffix}`);
      if (storedMusicIndex) {
        const parsedIndex = parseInt(storedMusicIndex, 10);
        // Ensure the index is valid
        if (parsedIndex >= 1 && parsedIndex <= this.originalOrder.length) {
          this.musicIndex = parsedIndex;
        } else {
          this.musicIndex = 1; // Reset to first song if invalid
          this.setStorageValue(`musicIndex${this.suffix}`, 1);
        }
        
        this.loadMusic(this.musicIndex);
        if (this.getStorageValue(`isMusicPaused${this.suffix}`) === false) {
          // Don't auto-play on mobile due to autoplay restrictions
          // Just load the music and let user manually start it
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
        this.originalOrder[index - 1];
    
      this.musicName.textContent = music.name;
      this.musicArtist.textContent = music.artist;
    
      const { coverType = 'Images', src, type = 'jpg' } = music;
      this.coverArea.innerHTML = '';
    
      // Choose image or video element
      const mediaElement = (this.suffix === '2' || coverType !== 'video')
        ? this.createImageElement(src, type)
        : this.createVideoElementWithFallback(src, type);
    
      this.coverArea.appendChild(mediaElement);
    
      // Set audio source with R2 fallback to local
      this.setAudioSourceWithFallback(src);
    
      // VIDEO FIX: Only set video source for player 1, remove duplicate calls
      if (this.suffix !== '2') {
        // Only for Player 1 - set video source once
        this.setVideoSourceWithFallback(src);
        
        // Handle video override if active
        if (this.videoOverride) {
          const handleVideoLoaded = () => {
            this.showVideoOverride();
          };
          
          this.videoAd.addEventListener('loadeddata', handleVideoLoaded, { once: true });
          this.videoAd.addEventListener('canplay', handleVideoLoaded, { once: true });
          
          setTimeout(() => {
            if (this.videoOverride) {
              this.showVideoOverride();
            }
          }, 500);
        }
      } else {
        // Player 2 - ensure video is completely disabled
        this.videoAd.src = "";
        this.videoAd.style.display = "none";
        this.videoAd.pause(); // Ensure it's stopped
      }
    
      this.setStorageValue(`musicIndex${this.suffix}`, index);
      this.updatePlayingSong();
      
      // Only update border box for Player 2
      if (this.suffix === '2' && !this.isInitializing) {
        this.updateBorderBoxDisplay();
      }
    
      // Auto-scroll functionality
      this.hasScrolledToCurrentSong = false;
      this.hasUserScrolled = false;
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
    
      setTimeout(() => {
        this.scrollToCurrentSong();
      }, 300);
    
      this.calculateNextPrevSongs();
      setTimeout(() => {
        this.preloadCriticalSongs();
      }, 100);
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
          this.mainAudio.onloadeddata = null;
        };
        
        // Add upload folder fallback
        this.mainAudio.onerror = () => {
          console.warn(`Audio failed to load from local: ${localAudioSrc}, trying upload: ${uploadAudioSrc}`);
          this.mainAudio.src = uploadAudioSrc;
          this.r2Available = false;
          
          // Wait for upload to load
          this.mainAudio.onloadeddata = () => {
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
        this.mainAudio.onloadeddata = null;
      };
      
      this.mainAudio.onerror = handleAudioError;
    }
  
    waitForAudioReady() {
      return new Promise((resolve) => {
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
        
        // MOBILE OPTIMIZATION: Reduced timeout from 2000ms to 1500ms
        setTimeout(() => {
          this.mainAudio.removeEventListener('canplay', handleCanPlay);
          this.mainAudio.removeEventListener('loadeddata', handleCanPlay);
          resolve();
        }, 1500); // Changed from 2000ms
      });
    }
  
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
        // Wait for audio to be ready before changing UI state
        await this.waitForAudioReady();
        await this.mainAudio.play();
        
        // Only update UI state after successful play
        this.wrapper.classList.add("paused");
        this.playPauseBtn.querySelector("i").textContent = "pause";
        this.isMusicPaused = false;
        this.setStorageValue(`isMusicPaused${this.suffix}`, false);
        
        if (this.videoOverride) {
          // In override mode: mute video when audio plays and ensure it's playing
          this.videoAd.muted = true;
          this.showVideoOverride();
        } else {
          this.toggleVideoDisplay(false);
        }
        
        this.resetVideoSize();
        
        // Only update border box for Player 2
        if (this.suffix === '2') {
          this.updateBorderBoxDisplay();
        }
      } catch (error) {
        console.warn("Failed to play audio:", error);
        // Reset play button state if play fails
        this.wrapper.classList.remove("paused");
        this.playPauseBtn.querySelector("i").textContent = "play_arrow";
        this.isMusicPaused = true;
        this.setStorageValue(`isMusicPaused${this.suffix}`, true);
      }
      this.updatePlayingSong()
    }
    
    // Update the existing pauseMusic method to handle video unmuting in override mode:
    pauseMusic() {
      this.wrapper.classList.remove("paused");
      this.playPauseBtn.querySelector("i").textContent = "play_arrow";
      this.mainAudio.pause();
      this.isMusicPaused = true;
      this.setStorageValue(`isMusicPaused${this.suffix}`, true);
      
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
      const currentArray = this.isShuffleMode ? this.shuffledOrder : this.originalOrder;
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
  
    // MOBILE OPTIMIZATION: Cached DOM elements and reduced calculations
    updateProgress(e) {
      const { currentTime, duration } = e.target;
      this.progressBar.style.width = `${(currentTime / duration) * 100}%`;

      const currentMin = Math.floor(currentTime / 60);
      const currentSec = Math.floor(currentTime % 60).toString().padStart(2, "0");
      this.currentTimeElement.textContent = `${currentMin}:${currentSec}`; // Use cached element

      if (!isNaN(duration)) {
        const totalMin = Math.floor(duration / 60);
        const totalSec = Math.floor(duration % 60).toString().padStart(2, "0");
        this.maxDurationElement.textContent = `${totalMin}:${totalSec}`; // Use cached element
      }
    }

        // MOBILE OPTIMIZATION: Add throttle function for frequent events
    throttle(func, limit) {
      let inThrottle;
      return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      }
    }
  
    handleRepeat() {
      switch (this.repeatBtn.textContent) {
        case "repeat":
          this.repeatBtn.textContent = "repeat_one";
          this.repeatBtn.title = "Song looped";
          break;
        case "repeat_one":
          this.repeatBtn.textContent = "shuffle";
          this.repeatBtn.title = "Playbook shuffled";
          
          // Store current song for return from shuffle
          this.preShuffleIndex = this.musicIndex;
          this.returnToNormalIndex = this.musicIndex - 1;
          
          this.isShuffleMode = true;
          this.shuffledOrder = this.fisherYatesShuffle([...this.originalOrder]);
          this.musicIndex = 1;
          
          // Load music lightweight
          this.loadMusicLightweight(this.musicIndex);
          
          // FIXED: Use your existing playMusic method directly
          setTimeout(() => {
            this.playMusic(); // This should work since shuffle click = user interaction
          }, 200);
          
          // Defer expensive operations
          setTimeout(() => {
            this.calculateNextPrevSongs();
            this.updatePlayingSong();
          }, 50);
          
          setTimeout(() => {
            this.preloadCriticalSongs();
          }, 300);
          break;
          
        case "shuffle":
          this.repeatBtn.textContent = "repeat";
          this.repeatBtn.title = "Playlist looped";
          this.isShuffleMode = false;
          
          this.musicIndex = this.preShuffleIndex;
          this.returnToNormalIndex = null;
          
          this.loadMusicLightweight(this.musicIndex);
          
          // FIXED: Use your existing playMusic method directly
          setTimeout(() => {
            this.playMusic(); // This should work since shuffle click = user interaction
          }, 200);
          
          setTimeout(() => {
            this.calculateNextPrevSongs();
            this.preloadCriticalSongs();
            this.updatePlayingSong();
          }, 50);
          break;
      }
    }

    fisherYatesShuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    loadMusicLightweight(index) {
      const music = this.isShuffleMode ?
        this.shuffledOrder[index - 1] :
        this.originalOrder[index - 1];
    
      // Only update essential info immediately
      this.musicName.textContent = music.name;
      this.musicArtist.textContent = music.artist;
    
      // Load cover image (this is relatively fast)
      this.loadCoverOnly(music);
    
      // Set audio source (essential for playback)
      this.setAudioSourceWithFallback(music.src);
    
      // Store state
      this.setStorageValue(`musicIndex${this.suffix}`, index);
      
      // VIDEO FIX: Only set video for Player 1, and only once
      if (this.suffix !== '2') {
        this.setVideoSourceWithFallback(music.src);
      } else {
        // For Player 2: ensure video is hidden and has no source
        this.videoAd.src = "";
        this.videoAd.style.display = "none";
      }
    }

    loadCoverOnly(music) {
      const { coverType = 'Images', src, type = 'jpg' } = music;
      this.coverArea.innerHTML = '';
    
      // For Player 2 or when not using video covers, always use image
      const mediaElement = (this.suffix === '2' || coverType !== 'video')
        ? this.createImageElement(src, type)
        : this.createVideoElementWithFallback(src, type);
    
      this.coverArea.appendChild(mediaElement);
    }

    async startShuffleMode() {
      // Show loading state immediately
      this.repeatBtn.style.opacity = '0.6';
      this.repeatBtn.style.pointerEvents = 'none';
      
      try {
        // Step 1: Set shuffle mode flag
        this.isShuffleMode = true;
        
        // Step 2: Create shuffled array asynchronously
        await this.createShuffledArrayAsync();
        
        // Step 3: Set starting position
        this.musicIndex = 1;
        
        // Step 4: Load new song with minimal operations
        await this.loadMusicOptimized(this.musicIndex);
        
        // Step 5: Defer expensive calculations
        requestIdleCallback(() => {
          this.calculateNextPrevSongs();
          this.preloadCriticalSongs();
        });
        
        // Step 6: Attempt playback (respecting mobile autoplay policies)
        await this.playMusicSafe();
        
      } catch (error) {
        console.warn('Shuffle mode failed:', error);
        // Fallback to normal mode
        this.exitShuffleModeQuick();
      } finally {
        // Restore button state
        this.repeatBtn.style.opacity = '1';
        this.repeatBtn.style.pointerEvents = 'auto';
      }
    }
    
    // Async exit shuffle for better performance
    async exitShuffleMode() {
      // Show loading state
      this.repeatBtn.style.opacity = '0.6';
      this.repeatBtn.style.pointerEvents = 'none';
      
      try {
        this.isShuffleMode = false;
        
        // Return to pre-shuffle position
        this.musicIndex = this.preShuffleIndex;
        this.returnToNormalIndex = null;
        
        // Load music with minimal operations
        await this.loadMusicOptimized(this.musicIndex);
        
        // Defer expensive calculations
        requestIdleCallback(() => {
          this.calculateNextPrevSongs();
          this.preloadCriticalSongs();
          this.updatePlayingSong();
        });
        
        // Attempt playback
        await this.playMusicSafe();
        
      } catch (error) {
        console.warn('Exit shuffle failed:', error);
      } finally {
        // Restore button state
        this.repeatBtn.style.opacity = '1';
        this.repeatBtn.style.pointerEvents = 'auto';
      }
    }
    
    // Quick shuffle exit without animations (fallback)
    exitShuffleModeQuick() {
      this.isShuffleMode = false;
      this.musicIndex = this.preShuffleIndex || 1;
      this.returnToNormalIndex = null;
      this.repeatBtn.textContent = "repeat";
      this.repeatBtn.title = "Playlist looped";
      this.repeatBtn.style.opacity = '1';
      this.repeatBtn.style.pointerEvents = 'auto';
    }
    
    // Async array shuffling to prevent main thread blocking
    createShuffledArrayAsync() {
      return new Promise((resolve) => {
        // For smaller arrays, do it immediately
        if (this.originalOrder.length <= 50) {
          this.shuffledOrder = [...this.originalOrder].sort(() => Math.random() - 0.5);
          resolve();
          return;
        }
        
        // For larger arrays, chunk the work
        this.shuffledOrder = [...this.originalOrder];
        let i = this.shuffledOrder.length;
        
        const shuffleChunk = () => {
          const startTime = performance.now();
          
          // Process for max 5ms chunks to avoid blocking
          while (i > 1 && (performance.now() - startTime) < 5) {
            const j = Math.floor(Math.random() * i);
            i--;
            [this.shuffledOrder[i], this.shuffledOrder[j]] = [this.shuffledOrder[j], this.shuffledOrder[i]];
          }
          
          if (i <= 1) {
            resolve();
          } else {
            // Continue in next frame
            requestAnimationFrame(shuffleChunk);
          }
        };
        
        requestAnimationFrame(shuffleChunk);
      });
    }
    
    // Optimized music loading with minimal DOM operations
    async loadMusicOptimized(index) {
      const music = this.isShuffleMode ?
        this.shuffledOrder[index - 1] :
        this.originalOrder[index - 1];
    
      // Batch DOM updates to minimize reflows
      requestAnimationFrame(() => {
        this.musicName.textContent = music.name;
        this.musicArtist.textContent = music.artist;
      });
    
      // Load cover image efficiently
      this.loadCoverImageOptimized(music);
    
      // Set audio source with better error handling
      await this.setAudioSourceOptimized(music.src);
    
      // Store state
      this.setStorageValue(`musicIndex${this.suffix}`, index);
    }
    
    // Optimized cover image loading
    loadCoverImageOptimized(music) {
      const { coverType = 'Images', src, type = 'jpg' } = music;
      
      // Clear previous content efficiently
      if (this.coverArea.firstChild) {
        this.coverArea.removeChild(this.coverArea.firstChild);
      }
    
      const mediaElement = (this.suffix === '2' || coverType !== 'video')
        ? this.createImageElement(src, type)
        : this.createVideoElementWithFallback(src, type);
    
      this.coverArea.appendChild(mediaElement);
    }
    
    // Optimized audio source setting
    setAudioSourceOptimized(src) {
      return new Promise((resolve) => {
        const r2AudioSrc = `${this.audioBucketUrl}${src}.mp3`;
        const localAudioSrc = `${this.audioFolder}${src}.mp3`;
        const uploadAudioSrc = `Upload/${src}.mp3`;
        
        // Clear previous handlers
        this.mainAudio.onloadeddata = null;
        this.mainAudio.onerror = null;
        
        const handleSuccess = () => {
          this.mainAudio.onloadeddata = null;
          this.mainAudio.onerror = null;
          resolve();
        };
        
        const tryLocal = () => {
          this.mainAudio.src = localAudioSrc;
          this.mainAudio.onloadeddata = handleSuccess;
          this.mainAudio.onerror = () => {
            this.mainAudio.src = uploadAudioSrc;
            this.mainAudio.onloadeddata = handleSuccess;
            this.mainAudio.onerror = () => {
              console.error(`All audio sources failed for: ${src}`);
              resolve(); // Continue anyway
            };
          };
        };
        
        // Try R2 first
        this.mainAudio.src = r2AudioSrc;
        this.mainAudio.onloadeddata = handleSuccess;
        this.mainAudio.onerror = tryLocal;
        
        // Timeout for mobile networks
        setTimeout(() => {
          if (this.mainAudio.onloadeddata) {
            console.warn('Audio loading timeout, continuing anyway');
            this.mainAudio.onloadeddata = null;
            this.mainAudio.onerror = null;
            resolve();
          }
        }, 3000);
      });
    }
    
    // Safe play method respecting mobile autoplay policies
    async playMusicSafe() {
      try {
        // Check if we can autoplay
        if (!this.autoplayAllowed) {
          // On mobile, often need user gesture first
          console.log('Autoplay not allowed, waiting for user interaction');
          return;
        }
        
        await this.waitForAudioReady();
        await this.mainAudio.play();
        
        // Update UI state
        this.wrapper.classList.add("paused");
        this.playPauseBtn.querySelector("i").textContent = "pause";
        this.isMusicPaused = false;
        this.setStorageValue(`isMusicPaused${this.suffix}`, false);
        
        // Handle video display efficiently
        this.updateVideoDisplayOptimized();
        
      } catch (error) {
        console.warn("Safe play failed:", error);
        // Set paused state
        this.wrapper.classList.remove("paused");
        this.playPauseBtn.querySelector("i").textContent = "play_arrow";
        this.isMusicPaused = true;
        this.setStorageValue(`isMusicPaused${this.suffix}`, true);
      }
    }
    
    // Optimized video display updates
    updateVideoDisplayOptimized() {
      if (this.videoOverride) {
        this.showVideoOverride();
      } else {
        this.toggleVideoDisplay(!this.isMusicPaused);
      }
      
      this.resetVideoSize();
      
      // Only update border box for Player 2 with debouncing
      if (this.suffix === '2') {
        if (this.borderBoxUpdateTimeout) {
          clearTimeout(this.borderBoxUpdateTimeout);
        }
        this.borderBoxUpdateTimeout = setTimeout(() => {
          this.updateBorderBoxDisplay();
        }, 100);
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
        this.musicIndex = this.musicIndex >= this.originalOrder.length ? 1 : this.musicIndex + 1;
        this.loadMusic(this.musicIndex);
        this.playMusic();
      }
    }
  
    toggleMusicList() {
      const wasClosed = !this.musicList?.classList.contains("show");
      this.musicList.classList.toggle("show");
      
      // Auto-scroll when music list is opened - NEW FEATURE FROM OP2
      if (wasClosed && this.musicList?.classList.contains("show")) {
        // FORCE reset manual scroll flag
        this.hasUserScrolled = false;
        if (this.scrollTimeout) {
          clearTimeout(this.scrollTimeout);
        }
        
        // Multiple scroll attempts
        setTimeout(() => {
          this.scrollToCurrentSong();
        }, 200);
      }
    }
  
    closeMusicList() {
      this.musicList.classList.remove("show");
      // Reset scroll state when list is closed - NEW FEATURE FROM OP2
      this.hasUserScrolled = false;
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
    }
  
    handleScroll() {
      const isDarkMode = this.wrapper.classList.contains("dark-mode");
      if (this.isLoading) return;
      
      const scrollTop = this.ulTag.scrollTop;
      const scrollHeight = this.ulTag.scrollHeight;
      const clientHeight = this.ulTag.clientHeight;
      
      // MOBILE OPTIMIZATION: Increased threshold for mobile touch scrolling
      if (scrollTop + clientHeight >= scrollHeight - 20) { // Changed from -10
        if (isDarkMode) {
          this.loadMoreItems();
          this.listcolourblack();
        } else {
          this.loadMoreItems();
        }
      }
    }
  
    loadMoreItems() {
      if (this.isLoading) return;
      
      const startIndex = (this.currentPage + 1) * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;
      
      // Check if there are more items to load from original order
      if (startIndex >= this.originalOrder.length) return;
      
      this.isLoading = true;
      this.currentPage++;
      
      // Get the next batch of items from original order
      const nextItems = this.originalOrder.slice(startIndex, endIndex);
      
      // Add the new items to the existing list
      this.appendMusicItems(nextItems, startIndex);
      
      this.isLoading = false;
    }
  
    resetPagination() {
      this.currentPage = 0;
      this.ulTag.innerHTML = "";
      this.populateMusicList(this.originalOrder);
    }
  
    populateMusicList(musicArray) {
      this.currentMusicArray = this.originalOrder;
      this.currentPage = 0;
      this.ulTag.innerHTML = "";
      
      // MOBILE OPTIMIZATION: Load fewer items initially on mobile
      const isMobile = window.innerWidth <= 768;
      const initialLoadCount = isMobile ? 10 : 15; // Reduced for mobile
      
      const currentSongIndex = this.findCurrentSongIndex();
      const startIndex = Math.max(0, currentSongIndex - Math.floor(initialLoadCount / 2));
      const endIndex = Math.min(startIndex + initialLoadCount, this.originalOrder.length);
      
      const actualStartIndex = Math.max(0, endIndex - initialLoadCount);
      
      const itemsToLoad = this.originalOrder.slice(actualStartIndex, endIndex);
      this.appendMusicItems(itemsToLoad, actualStartIndex);
      
      this.currentPage = Math.floor(actualStartIndex / this.itemsPerPage);
      
      // MOBILE OPTIMIZATION: Delay preloading on mobile
      if (!isMobile) {
        this.preloadCriticalSongs();
      } else {
        setTimeout(() => {
          this.preloadCriticalSongs();
        }, 500);
      }
    }

    findCurrentSongIndex() {
      const currentMusic = this.isShuffleMode ? 
        this.shuffledOrder[this.musicIndex - 1] : 
        this.originalOrder[this.musicIndex - 1];
      
      if (!currentMusic) return 0;
      
      return this.originalOrder.findIndex(song => song.src === currentMusic.src);
    }
    
    preloadCriticalSongs() {
      // Skip preloading on slower connections
      if (navigator.connection && navigator.connection.effectiveType === 'slow-2g') {
        return;
      }
      
      this.calculateNextPrevSongs();
      
      const songsToPreload = [];
      
      if (this.nextSongIndex !== null) {
        songsToPreload.push(this.nextSongIndex);
      }
      
      if (this.prevSongIndex !== null) {
        songsToPreload.push(this.prevSongIndex);
      }
      
      if (this.isShuffleMode && this.returnToNormalIndex !== null) {
        songsToPreload.push(this.returnToNormalIndex);
      }
      
      // MOBILE OPTIMIZATION: Limit preloading on mobile
      const isMobile = window.innerWidth <= 768;
      const maxPreload = isMobile ? 1 : songsToPreload.length;
      
      songsToPreload.slice(0, maxPreload).forEach(index => {
        this.ensureSongIsLoaded(index);
      });
    }
    
    calculateNextPrevSongs() {
      if (this.isShuffleMode) {
        // In shuffle mode
        const currentArray = this.shuffledOrder;
        const currentIndex = this.musicIndex - 1;
        
        // Next song in shuffle
        this.nextSongIndex = this.findOriginalIndex(
          currentArray[(currentIndex + 1) % currentArray.length]
        );
        
        // Previous song in shuffle  
        this.prevSongIndex = this.findOriginalIndex(
          currentArray[currentIndex === 0 ? currentArray.length - 1 : currentIndex - 1]
        );
        
        // Song to return to when shuffle is disabled (store current normal mode position)
        if (this.returnToNormalIndex === null) {
          this.returnToNormalIndex = this.findOriginalIndex(
            this.shuffledOrder[this.musicIndex - 1]
          );
        }
      } else {
        // In normal mode
        const currentIndex = this.musicIndex - 1;
        
        // Next song in normal mode
        this.nextSongIndex = (currentIndex + 1) % this.originalOrder.length;
        
        // Previous song in normal mode
        this.prevSongIndex = currentIndex === 0 ? this.originalOrder.length - 1 : currentIndex - 1;
        
        // Clear return index when not in shuffle
        this.returnToNormalIndex = null;
      }
    }
    
    findOriginalIndex(song) {
      if (!song) return null;
      return this.originalOrder.findIndex(s => s.src === song.src);
    }
    
    ensureSongIsLoaded(originalIndex) {
      if (originalIndex === null || this.preloadedSongs.has(originalIndex)) {
        return; // Already loaded or invalid index
      }
      
      const allLiTags = this.ulTag.querySelectorAll("li");
      let songFound = false;
      
      // Check if song is already in the current 25 items
      allLiTags.forEach(liTag => {
        const liIndex = parseInt(liTag.getAttribute("li-index")) - 1;
        if (liIndex === originalIndex) {
          songFound = true;
          this.preloadedSongs.add(originalIndex);
        }
      });
      
      if (!songFound) {
        // Song not in current view, need to strategically load it
        this.loadSongAtIndex(originalIndex);
      }
    }
    
    loadSongAtIndex(targetIndex) {
      if (this.preloadedSongs.has(targetIndex)) return;
      
      // Find the range of currently loaded items
      const allLiTags = this.ulTag.querySelectorAll("li");
      if (allLiTags.length === 0) return;
      
      const firstIndex = parseInt(allLiTags[0].getAttribute("li-index")) - 1;
      const lastIndex = parseInt(allLiTags[allLiTags.length - 1].getAttribute("li-index")) - 1;
      
      // If target is within current range, mark as preloaded
      if (targetIndex >= firstIndex && targetIndex <= lastIndex) {
        this.preloadedSongs.add(targetIndex);
        return;
      }
      
      // Need to adjust the loaded range to include target song
      // Remove the song furthest from current playing song
      const currentSongIndex = this.findCurrentSongIndex();
      
      let indexToRemove = null;
      let maxDistance = 0;
      
      allLiTags.forEach(liTag => {
        const liIndex = parseInt(liTag.getAttribute("li-index")) - 1;
        const distance = Math.abs(liIndex - currentSongIndex);
        
        if (distance > maxDistance) {
          maxDistance = distance;
          indexToRemove = liIndex;
        }
      });
      
      // Remove the furthest song and add the target song
      if (indexToRemove !== null) {
        // Remove the furthest li element
        allLiTags.forEach(liTag => {
          const liIndex = parseInt(liTag.getAttribute("li-index")) - 1;
          if (liIndex === indexToRemove) {
            liTag.remove();
            this.preloadedSongs.delete(indexToRemove);
          }
        });
        
        // Add the target song
        this.addSingleSongToList(targetIndex);
        this.preloadedSongs.add(targetIndex);
      }
    }
    
    addSingleSongToList(songIndex) {
      if (songIndex < 0 || songIndex >= this.originalOrder.length) return;
      
      const music = this.originalOrder[songIndex];
      const liTag = document.createElement("li");
      liTag.setAttribute("li-index", songIndex + 1);
    
      liTag.innerHTML = `
        <div class="row">
          <span>${music.name}</span>
          <p>${music.artist}</p>
        </div>
        <span id="${music.src}" class="audio-duration">3:40</span>
        <audio class="${music.src}" src="${this.audioBucketUrl}${music.src}.mp3"></audio>
      `;
    
      // Insert in correct position to maintain order
      const allLiTags = this.ulTag.querySelectorAll("li");
      let insertBeforeElement = null;
      
      for (let i = 0; i < allLiTags.length; i++) {
        const existingIndex = parseInt(allLiTags[i].getAttribute("li-index")) - 1;
        if (existingIndex > songIndex) {
          insertBeforeElement = allLiTags[i];
          break;
        }
      }
      
      if (insertBeforeElement) {
        this.ulTag.insertBefore(liTag, insertBeforeElement);
      } else {
        this.ulTag.appendChild(liTag);
      }
      
      // Set up audio and event listeners
      const liAudioTag = liTag.querySelector(`.${music.src}`);
      
      liAudioTag.onerror = () => {
        liAudioTag.src = `${this.audioFolder}${music.src}.mp3`;
        liAudioTag.onerror = () => {
          liAudioTag.src = `Upload/${music.src}.mp3`;
        };
      };
      
      liAudioTag.addEventListener("loadeddata", () => {
        const duration = liAudioTag.duration;
        const totalMin = Math.floor(duration / 60);
        const totalSec = Math.floor(duration % 60).toString().padStart(2, "0");
        liTag.querySelector(".audio-duration").textContent = `${totalMin}:${totalSec}`;
      });
    
      liTag.addEventListener("click", () => {
        if (this.isShuffleMode) {
          const clickedMusic = this.originalOrder[songIndex];
          const shuffledIndex = this.shuffledOrder.findIndex(song => song.src === clickedMusic.src);
          this.musicIndex = shuffledIndex >= 0 ? shuffledIndex + 1 : 1;
        } else {
          this.musicIndex = songIndex + 1;
        }
        this.loadMusic(this.musicIndex);
        this.playMusic();
        this.resetVideoSize();
      });
    }
  
    appendMusicItems(musicItems, startIndex) {
      musicItems.forEach((music, i) => {
        const actualIndex = startIndex + i;
        const liTag = document.createElement("li");
        liTag.setAttribute("li-index", actualIndex + 1);
    
        liTag.innerHTML = `
          <div class="row">
            <span>${music.name}</span>
            <p>${music.artist}</p>
          </div>
          <span id="${music.src}" class="audio-duration">3:40</span>
          <audio class="${music.src}" src="${this.audioBucketUrl}${music.src}.mp3"></audio>
        `;
    
        this.ulTag.appendChild(liTag);
        const liAudioTag = liTag.querySelector(`.${music.src}`);
        
        // Add fallback for list audio elements
        liAudioTag.onerror = () => {
          console.warn(`List audio failed from R2, trying local: ${this.audioFolder}${music.src}.mp3`);
          liAudioTag.src = `${this.audioFolder}${music.src}.mp3`;
          
          // Add upload folder fallback for list audio
          liAudioTag.onerror = () => {
            console.warn(`List audio failed from local, trying upload: Upload/${music.src}.mp3`);
            liAudioTag.src = `Upload/${music.src}.mp3`;
            this.r2Available = false;
          };
        };
        
        liAudioTag.addEventListener("loadeddata", () => {
          const duration = liAudioTag.duration;
          const totalMin = Math.floor(duration / 60);
          const totalSec = Math.floor(duration % 60).toString().padStart(2, "0");
          liTag.querySelector(".audio-duration").textContent = `${totalMin}:${totalSec}`;
        });
    
        liTag.addEventListener("click", () => {
          // Set the music index based on current mode
          if (this.isShuffleMode) {
            // Find the index of this song in the shuffled order
            const clickedMusic = this.originalOrder[actualIndex];
            const shuffledIndex = this.shuffledOrder.findIndex(song => song.src === clickedMusic.src);
            this.musicIndex = shuffledIndex >= 0 ? shuffledIndex + 1 : 1;
          } else {
            this.musicIndex = actualIndex + 1;
          }
          this.loadMusic(this.musicIndex);
          this.playMusic();
          this.resetVideoSize(); // Add this to reset video state
        });
      });
      
      this.updatePlayingSong();
    }
  
    updatePlayingSong() {
      const allLiTags = this.ulTag?.querySelectorAll("li");
      if (!allLiTags || allLiTags.length === 0) return;
  
      // Get current music based on mode
      let currentMusic;
      if (this.isShuffleMode && this.shuffledOrder.length > 0) {
        currentMusic = this.shuffledOrder[this.musicIndex - 1];
      } else if (this.originalOrder.length > 0) {
        currentMusic = this.originalOrder[this.musicIndex - 1];
      }
  
      if (!currentMusic) {
        return;
      }
  
      // First pass: Clear all playing states and restore durations
      allLiTags.forEach(liTag => {
        const audioTag = liTag.querySelector(".audio-duration");
        if (!audioTag) return;
        
        // Store original duration if not stored yet
        if (!audioTag.hasAttribute("t-duration") && audioTag.textContent !== "Playing" && audioTag.textContent !== "3:40") {
          audioTag.setAttribute("t-duration", audioTag.textContent);
        }
        
        // Clear playing state
        liTag.classList.remove("playing");
        
        // Restore duration if showing "Playing"
        if (audioTag.textContent === "Playing") {
          const originalDuration = audioTag.getAttribute("t-duration");
          if (originalDuration) {
            audioTag.textContent = originalDuration;
          } else {
            audioTag.textContent = "3:40"; // fallback
          }
        }
      });
  
      // Second pass: Find and mark the current song
      let foundCurrentSong = false;
      allLiTags.forEach(liTag => {
        const audioTag = liTag.querySelector(".audio-duration");
        if (!audioTag) return;
  
        // Check if this matches the current song
        if (audioTag.id === currentMusic.src) {
          foundCurrentSong = true;
          
          // Mark as currently selected
          liTag.classList.add("playing");
          
          // Show "Playing" only if music is actually playing
          if (!this.isMusicPaused) {
            audioTag.textContent = "Playing";
          } else {
            // Show duration when paused
            const originalDuration = audioTag.getAttribute("t-duration");
            if (originalDuration && originalDuration !== "3:40") {
              audioTag.textContent = originalDuration;
            }
          }
        }
      });
  
      // If song not found, try to load it
      if (!foundCurrentSong) {
        
        // Find song position in original order
        const songIndexInOriginal = this.originalOrder.findIndex(song => song.src === currentMusic.src);
        
        if (songIndexInOriginal >= 0) {
          const currentlyLoadedCount = (this.currentPage + 1) * this.itemsPerPage;
          
          if (songIndexInOriginal >= currentlyLoadedCount) {
            // Load more items to reach the current song
            this.loadItemsUntilSongForPlaying(songIndexInOriginal, currentMusic.src);
          }
        } else {
          console.warn('Current song not found in original order:', currentMusic.src);
        }
      }
    }
  
    loadItemsUntilSongForPlaying(targetIndex, targetSrc) {
      const loadNextBatch = () => {
        const currentlyLoadedCount = (this.currentPage + 1) * this.itemsPerPage;
        
        if (targetIndex < currentlyLoadedCount) {
          // Target song should now be loaded, update playing status
          setTimeout(() => {
            this.updatePlayingSong();
          }, 100);
          return;
        }
        
        // Load more items if we haven't reached the end
        if (!this.isLoading && this.currentPage * this.itemsPerPage < this.originalOrder.length) {
          this.loadMoreItems();
          
          // Continue loading after a delay
          setTimeout(loadNextBatch, 200);
        }
      };
      
      loadNextBatch();
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
      const listItems = this.ulTag.querySelectorAll("li");
      listItems.forEach(item => {
        item.style.color = 'white';
        item.style.borderBottom = '3px solid white';
      });
      this.musicList.style.backgroundColor = "black";
      this.closeMoreMusicBtn.style.color = "white";
      this.header.style.color = "white";
    }
  
    listcolourwhite() {
      const listItems = this.ulTag.querySelectorAll("li");
      listItems.forEach(item => {
        item.style.color = 'black';
        item.style.borderBottom = '3px solid black';
      });
      this.musicList.style.backgroundColor = "white";
      this.closeMoreMusicBtn.style.color = "black";
      this.header.style.color = "black";
    }
  
    updateBorderBoxImmediate() {
      if (this.suffix !== '2' || !this.borderBox || this.isInitializing) {
        if (this.borderBox) this.borderBox.style.display = "none";
        return;
      }
      
      const now = performance.now();
      
      // Increased throttling from 16ms to 50ms
      if (now - this.borderBoxState.lastUpdate < 50) return;
      
      const isDarkMode = this.wrapper.classList.contains("dark-mode");
      
      let shouldShowBorder = isDarkMode;
      let targetStyle = isDarkMode ? 'player2DarkMode' : null;
      
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
  
  // Initialize players when DOM loads
  // Replace the existing DOMContentLoaded listener with:
document.addEventListener("DOMContentLoaded", () => {
  // Critical initialization first
  window.homePlayer = new MusicPlayer();
  window.disguisePlayer = new MusicPlayer('2');
  
  // MOBILE OPTIMIZATION: Defer non-critical setup
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      handleSize();
    });
  } else {
    setTimeout(() => {
      handleSize();
    }, 100);
  }
  
  // MOBILE OPTIMIZATION: Add mobile-specific optimizations
  let viewport = document.querySelector('meta[name=viewport]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.name = 'viewport';
    document.head.appendChild(viewport);
  }
  viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  
  // Better touch performance
  document.body.style.touchAction = 'manipulation';
});