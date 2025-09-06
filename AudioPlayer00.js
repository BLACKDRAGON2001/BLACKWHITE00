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
      this.itemsPerPage = 25;
      this.isLoading = false;
      this.currentMusicArray = this.originalOrder;
  
      this.controlsToggledManually = false;
  
      this.videoOverride = false;
      
      // Auto-scroll state variables - NEW FEATURE FROM OP2
      this.hasScrolledToCurrentSong = false;
      this.hasUserScrolled = false;
      this.scrollTimeout = null;
      
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
        const storedArrayType = this.getStorageValue(`usingReducedMusic${this.suffix}`);
        if (storedArrayType !== null) {
          this.usingReducedMusic = storedArrayType;
          this.originalOrder = this.usingReducedMusic ? [...(window.ReducedMusic || [])] : [...(window.allMusic || [])];
          
          // Update button state based on stored preference - but wait for DOM
          setTimeout(() => {
            if (this.seeAllMusicBtn) {
              this.seeAllMusicBtn.textContent = "star";
            }
          }, 100);
        } else {
          // Default to ReducedMusic for Player 2 and store this preference
          this.originalOrder = [...(window.ReducedMusic || [])];
          this.usingReducedMusic = true;
          this.setStorageValue(`usingReducedMusic${this.suffix}`, true);
        }
      }
  
      this.setupEventListeners();
      this.loadPersistedState();
      this.populateMusicList(this.originalOrder);
      this.updatePlayingSong();
      
      // Test autoplay capability on mobile
      this.testAutoplaySupport();
      
      // Only initialize border box for Player 2
      if (this.suffix === '2') {
        this.initializeBorderBox();
      }
    
      setTimeout(() => {
        this.isInitializing = false;
      }, 100)
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
          console.log("Autoplay not allowed - user interaction required");
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
      this.mainAudio.addEventListener("timeupdate", (e) => this.updateProgress(e));
      this.mainAudio.addEventListener("ended", () => this.handleSongEnd());
      this.mainAudio.addEventListener("pause", () => this.handleAudioPause());
      this.mainAudio.addEventListener("play", () => this.handleAudioPlay());
      this.videoAd.addEventListener("ended", () => this.handleVideoEnd());
  
      this.musicName.addEventListener("click", () => this.toggleVideoControls());
  
      // Enhanced scroll event listener with manual scroll detection - NEW FEATURE FROM OP2
      if (this.ulTag) {
        this.ulTag.addEventListener('scroll', (e) => {
          // Handle pagination
          this.handleScroll();
          
          // Handle manual scroll detection with debouncing
          if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
          }
          
          // Mark as manually scrolled immediately for responsive feel
          this.hasUserScrolled = true;
          
          // Set a longer timeout to allow for programmatic scrolling
          this.scrollTimeout = setTimeout(() => {
            // Only keep the manual scroll flag if user is still actively scrolling
            const scrollTime = Date.now();
            this.lastScrollTime = scrollTime;
            
            // Check if this was likely a programmatic scroll by checking timing
            setTimeout(() => {
              if (this.lastScrollTime === scrollTime) {
                // No new scroll events, this was likely the last in a series
                // Keep hasUserScrolled true for user-initiated scrolling
              }
            }, 50);
          }, 150);
        }, { passive: true });
      }
  
      const seeVideoBtn = document.querySelector('.seeVideo');
      if (seeVideoBtn) {
        seeVideoBtn.addEventListener("click", () => this.toggleVideoOverride());
      }
  
      // ReducedMusic/AllMusic switching for Player 2 - NEW FEATURE FROM OP2
      if (this.suffix === '2' && this.seeAllMusicBtn) {
        // Remove the pointer-events: none and make it clickable
        this.seeAllMusicBtn.style.pointerEvents = 'auto';
        this.seeAllMusicBtn.style.cursor = 'pointer';
        
        // Set initial button state based on current mode
        this.seeAllMusicBtn.textContent = "star";
        this.seeAllMusicBtn.addEventListener("click", () => this.switchToAllMusic());
      }
    }
  
    // Auto-scroll functionality - NEW FEATURE FROM OP2
    scrollToCurrentSong() {
      console.log('scrollToCurrentSong called - hasUserScrolled:', this.hasUserScrolled, 'list visible:', this.musicList?.classList.contains("show"));
      
      if (this.hasUserScrolled || !this.musicList?.classList.contains("show")) {
        return;
      }
      
      // Additional check: ensure the music list container is actually visible
      if (this.ulTag?.offsetParent === null || this.ulTag?.clientHeight === 0) {
        console.log('Music list container not visible, skipping scroll');
        return;
      }
      
      let currentSong = this.isShuffleMode ? 
        this.shuffledOrder[this.musicIndex - 1] : 
        this.originalOrder[this.musicIndex - 1];
      
      console.log('Current song:', currentSong, 'musicIndex:', this.musicIndex, 'isShuffleMode:', this.isShuffleMode);
      
      if (!currentSong) {
        console.log('No current song found');
        return;
      }
      
      // First, find the song's index in the originalOrder array
      const songIndexInOriginal = this.originalOrder.findIndex(song => song.src === currentSong.src);
      console.log('Song index in originalOrder:', songIndexInOriginal);
      
      if (songIndexInOriginal === -1) {
        console.log('Song not found in originalOrder');
        return;
      }
      
      // Check if the song is in the currently loaded items
      const currentlyLoadedCount = (this.currentPage + 1) * this.itemsPerPage;
      console.log('Currently loaded items:', currentlyLoadedCount, 'Song needs to be at index:', songIndexInOriginal);
      
      if (songIndexInOriginal >= currentlyLoadedCount) {
        // Song is not loaded yet, load more items until we reach it
        console.log('Song not loaded yet, loading more items...');
        this.loadItemsUntilSong(songIndexInOriginal, currentSong.src);
      } else {
        // Song should be in the current list, try to scroll to it
        setTimeout(() => {
          this.attemptScrollToSong(currentSong.src);
        }, 100);
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
          console.log('Loading more items to reach song...');
          this.loadMoreItems();
          
          // Continue loading after a delay
          setTimeout(loadNextBatch, 300);
        }
      };
      
      loadNextBatch();
    }
  
    attemptScrollToSong(targetSrc) {
      // Double-check that the list is still visible before attempting scroll
      if (!this.musicList?.classList.contains("show") || this.ulTag?.offsetParent === null) {
        console.log('Music list no longer visible, aborting scroll');
        return;
      }
      
      const allLiTags = this.ulTag.querySelectorAll("li");
      console.log('Attempting to scroll to:', targetSrc, 'in', allLiTags.length, 'loaded items');
      
      let foundMatch = false;
      
      allLiTags.forEach((liTag, index) => {
        const audioTag = liTag.querySelector(".audio-duration");
        if (audioTag && audioTag.id === targetSrc) {
          console.log('Found matching song at index:', index, 'src:', audioTag.id);
          foundMatch = true;
          
          // Additional check: ensure the target element is within the visible container
          if (liTag.offsetParent !== null && this.ulTag.contains(liTag)) {
            try {
              // Use scrollTo on the container instead of scrollIntoView to prevent page scroll
              const containerRect = this.ulTag.getBoundingClientRect();
              const itemRect = liTag.getBoundingClientRect();
              const scrollTop = this.ulTag.scrollTop + (itemRect.top - containerRect.top) - (containerRect.height / 2) + (itemRect.height / 2);
              
              // Use CSS transform for smooth scrolling
              this.ulTag.style.scrollBehavior = 'smooth';
              this.ulTag.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
              });
              
              console.log('Scroll attempted successfully using scrollTo');
            } catch (error) {
              console.warn('Scroll failed:', error);
            }
          } else {
            console.log('Target element not properly visible, skipping scroll');
          }
        }
      });
      
      if (!foundMatch) {
        console.log('Still no matching song found after loading. Target src:', targetSrc);
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
          console.log('Finding closest song in ReducedMusic array for:', currentSong.name, 'by', currentSong.artist);
          
          // Try to find a song by the same artist first
          const sameArtistIndex = this.originalOrder.findIndex(song => 
            song.artist.toLowerCase() === currentSong.artist.toLowerCase()
          );
          
          if (sameArtistIndex >= 0) {
            closestIndex = sameArtistIndex;
            console.log('Found song by same artist:', this.originalOrder[closestIndex].name);
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
              console.log('Found closest match by similarity:', this.originalOrder[closestIndex].name, 'score:', bestMatchScore);
            } else {
              // Fall back to middle of the array for a more varied selection
              closestIndex = Math.floor(this.originalOrder.length / 2);
              console.log('No close matches found, selecting middle song:', this.originalOrder[closestIndex].name);
            }
          }
        } else {
          // Switching to allMusic - use first song as before
          closestIndex = 0;
          console.log('Switching to allMusic, using first song');
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
            console.log('Autoplaying closest song after array switch:', this.originalOrder[closestIndex]?.name);
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
        console.log('Music list was open during array switch - triggering auto scroll');
        this.hasUserScrolled = false; // Reset scroll state
        if (this.scrollTimeout) {
          clearTimeout(this.scrollTimeout);
        }
        
        // Multiple scroll attempts with increasing delays to ensure it works
        setTimeout(() => {
          console.log('switchToAllMusic - first scroll attempt');
          this.scrollToCurrentSong();
        }, 600);
        
        setTimeout(() => {
          console.log('switchToAllMusic - second scroll attempt');  
          this.scrollToCurrentSong();
        }, 900);
        
        setTimeout(() => {
          console.log('switchToAllMusic - third scroll attempt');
          this.scrollToCurrentSong();  
        }, 1200);
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
          console.log("Music loaded, ready to play when user interacts");
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
    
      this.setStorageValue(`musicIndex${this.suffix}`, index);
      this.updatePlayingSong();
      
      // Only update border box for Player 2
      if (this.suffix === '2' && !this.isInitializing) {
        this.updateBorderBoxDisplay();
      }
  
      // Auto-scroll functionality - reset scroll state and scroll to current song - NEW FEATURE FROM OP2
      this.hasScrolledToCurrentSong = false;
  
      // FORCE reset of scroll state and scroll to current song
      this.hasUserScrolled = false; // Force reset
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
  
      console.log('loadMusic end - calling scrollToCurrentSong after delay');
  
      // Use multiple attempts with increasing delays
      setTimeout(() => {
        console.log('First scroll attempt');
        this.scrollToCurrentSong();
      }, 200);
  
      setTimeout(() => {
        console.log('Second scroll attempt');
        this.scrollToCurrentSong();
      }, 500);
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
  
    waitForAudioReady() {
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
          break;
        case "repeat_one":
          this.repeatBtn.textContent = "shuffle";
          this.repeatBtn.title = "Playbook shuffled";
          
          // Store current song index before shuffling
          this.preShuffleIndex = this.musicIndex;
          
          this.isShuffleMode = true;
          this.shuffledOrder = [...this.originalOrder].sort(() => Math.random() - 0.5);
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
        console.log('Music list opened - resetting scroll state');
        // FORCE reset manual scroll flag
        this.hasUserScrolled = false;
        if (this.scrollTimeout) {
          clearTimeout(this.scrollTimeout);
        }
        
        // Multiple scroll attempts
        setTimeout(() => {
          console.log('toggleMusicList - first scroll attempt');
          this.scrollToCurrentSong();
        }, 100);
        
        setTimeout(() => {
          console.log('toggleMusicList - second scroll attempt');  
          this.scrollToCurrentSong();
        }, 300);
        
        setTimeout(() => {
          console.log('toggleMusicList - third scroll attempt');
          this.scrollToCurrentSong();  
        }, 600);
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
      
      // Check if user scrolled to bottom (with small threshold)
      if (scrollTop + clientHeight >= scrollHeight - 10) {
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
      
      // Load initial batch from original order
      const initialItems = this.originalOrder.slice(0, this.itemsPerPage);
      this.appendMusicItems(initialItems, 0);
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
        console.log('No current music found, musicIndex:', this.musicIndex, 'shuffleMode:', this.isShuffleMode);
        return;
      }
  
      console.log('Updating playing song for:', currentMusic.name, 'src:', currentMusic.src, 'isPaused:', this.isMusicPaused);
  
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
          console.log('Found current song in list:', currentMusic.name);
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
        console.log('Current song not found in loaded items. Looking for:', currentMusic.src);
        
        // Find song position in original order
        const songIndexInOriginal = this.originalOrder.findIndex(song => song.src === currentMusic.src);
        
        if (songIndexInOriginal >= 0) {
          const currentlyLoadedCount = (this.currentPage + 1) * this.itemsPerPage;
          console.log('Song index in original:', songIndexInOriginal, 'currently loaded:', currentlyLoadedCount);
          
          if (songIndexInOriginal >= currentlyLoadedCount) {
            // Load more items to reach the current song
            console.log('Loading more items to reach current song...');
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
  document.addEventListener("DOMContentLoaded", () => {
    window.homePlayer = new MusicPlayer();       // Original page
    window.disguisePlayer = new MusicPlayer('2'); // Disguise page
    handleSize();
  });