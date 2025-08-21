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
    localStorage.removeTime("LoginTime");
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
      this.isShuffleMode = false;
      this.originalOrder = [...allMusic];
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
  
      // Scroll event for pagination
      this.ulTag.addEventListener("scroll", () => this.handleScroll());
    }
  
    loadPersistedState() {
      const storedMusicIndex = localStorage.getItem(`musicIndex${this.suffix}`);
      if (storedMusicIndex) {
        const parsedIndex = parseInt(storedMusicIndex, 10);
        // Ensure the index is valid
        if (parsedIndex >= 1 && parsedIndex <= this.originalOrder.length) {
          this.musicIndex = parsedIndex;
        } else {
          this.musicIndex = 1; // Reset to first song if invalid
          localStorage.setItem(`musicIndex${this.suffix}`, 1);
        }
        
        this.loadMusic(this.musicIndex);
        if (localStorage.getItem(`isMusicPaused${this.suffix}`) === "false") {
          this.playMusic();
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
      
      // Try R2 first
      this.mainAudio.src = r2AudioSrc;
      
      // Set up error handling for audio
      const handleAudioError = () => {
        console.warn(`Audio failed to load from R2: ${r2AudioSrc}, trying local: ${localAudioSrc}`);
        this.mainAudio.src = localAudioSrc;
        this.r2Available = false;
      };
      
      this.mainAudio.onerror = handleAudioError;
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
      
      // Local fallback (only for regular player, not disguise)
      const localVideoSrc = `${this.videoFolder}${src}.${type}`;
      const allSources = [...r2Sources, localVideoSrc];
    
      // Track fallback attempts
      let attempt = 0;
    
      const tryNextSource = () => {
        if (attempt >= allSources.length) {
          console.error("All video sources (R2 and local) failed to load.");
          return;
        }
        
        video.src = allSources[attempt];
        
        // Mark R2 as unavailable if we've exhausted R2 sources
        if (attempt >= r2Sources.length) {
          this.r2Available = false;
          console.warn("R2 video sources failed, using local fallback");
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
      
      // Local fallback (only for regular player, not disguise)
      const localVideoSrc = `${this.videoFolder}${src}.mp4`;
      const allSources = [...r2Sources, localVideoSrc];
    
      let attempt = 0;
    
      const tryNextSource = () => {
        if (attempt >= allSources.length) {
          console.error("All videoAd sources (R2 and local) failed to load.");
          return;
        }
        
        this.videoAd.src = allSources[attempt];
        
        // Mark R2 as unavailable if we've exhausted R2 sources
        if (attempt >= r2Sources.length) {
          this.r2Available = false;
          console.warn("R2 videoAd sources failed, using local fallback");
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
      
      img.src = r2ImageSrc;
      img.alt = this.musicName.textContent;
      
      // Add error handling for image loading
      img.onerror = () => {
        console.warn(`Failed to load image from R2 bucket: ${r2ImageSrc}, trying local: ${localImageSrc}`);
        
        // For disguise player (Player 2), try local first, then create white fallback
        if (this.suffix === '2') {
          img.src = localImageSrc;
          img.onerror = () => {
            console.warn(`Failed to load local image: ${localImageSrc}, using white fallback`);
            this.createWhiteFallback(img);
          };
        } else {
          // For regular player, try local folder
          img.src = localImageSrc;
          img.onerror = () => {
            console.warn(`Failed to load local image: ${localImageSrc}`);
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
  
    playMusic() {
      this.wrapper.classList.add("paused");
      this.playPauseBtn.querySelector("i").textContent = "pause";
      this.mainAudio.play();
      this.isMusicPaused = false;
      localStorage.setItem(`isMusicPaused${this.suffix}`, false);
      this.toggleVideoDisplay(false);
      this.resetVideoSize();
      
      // Only update border box for Player 2
      if (this.suffix === '2') {
        this.updateBorderBoxDisplay();
      }
    }
  
    pauseMusic() {
      this.wrapper.classList.remove("paused");
      this.playPauseBtn.querySelector("i").textContent = "play_arrow";
      this.mainAudio.pause();
      this.isMusicPaused = true;
      localStorage.setItem(`isMusicPaused${this.suffix}`, true);
      this.toggleVideoDisplay(true);
      this.muteVideo();
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
            top: `${videoOffset}px`,
            left: `${videoOffset}px`,
            transform: 'translate(0, 0)'
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
          this.repeatBtn.title = "Playback shuffled";
          
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
      this.musicList.classList.toggle("show");
    }
  
    closeMusicList() {
      this.musicList.classList.remove("show");
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
          this.r2Available = false;
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
      const allLiTags = this.ulTag.querySelectorAll("li");
    
      const currentMusic = this.isShuffleMode
        ? this.shuffledOrder[this.musicIndex - 1]
        : this.originalOrder[this.musicIndex - 1];
    
      allLiTags.forEach(liTag => {
        const audioTag = liTag.querySelector(".audio-duration");
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
          
          sizer.style.top = `${videoOffset}px`;
          sizer.style.left = `${videoOffset}px`;
          sizer.style.transform = 'translate(0, 0)';
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