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
    //refreshPage();
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
    //refreshPage();
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
      this.imageFolder = suffix === '2' ? 'ImagesDisguise/' : 'Images/';
      this.videoFolder = suffix === '2' ? 'VideosDisguise/' : 'Videos/';
  
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
  
      // Player state
      this.musicIndex = 1;
      this.isMusicPaused = true;
      this.isShuffleMode = false;
      this.originalOrder = [...allMusic];
      this.shuffledOrder = [];
      this.isMuted = false;
  
      // Pagination state
      this.currentPage = 0;
      this.itemsPerPage = 25;
      this.isLoading = false;
      this.currentMusicArray = this.originalOrder;
  
      this.controlsToggledManually = false;
      this.initialize();
    }
  
    initialize() {
      this.setupEventListeners();
      this.loadPersistedState();
      this.populateMusicList(this.originalOrder);
      this.updatePlayingSong();
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
        this.musicIndex = parseInt(storedMusicIndex, 10);
        this.loadMusic(this.musicIndex);
        if (localStorage.getItem(`isMusicPaused${this.suffix}`) === "false") {
          this.playMusic();
        }
      } else {
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
    
      this.mainAudio.src = `https://pub-c755c6dec2fa41a5a9f9a659408e2150.r2.dev/${src}.mp3`;
    
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
    }
    
    /*createVideoElementWithFallback(src, type) {
      const video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.loop = true;
    
      const primarySrc = `https://pub-fb9b941e940b4b44a61b7973d5ba28c3.r2.dev/${src}.${type}`;
      const fallbackSrc = `https://pub-2e4c11f1d1e049e5a893e7a1681ebf7e.r2.dev/${src}.${type}`; // Replace with your 2nd bucket URL
    
      video.src = primarySrc;
    
      // On error, try fallback
      video.onerror = function() {
        console.warn(`Primary video not found, switching to fallback: ${fallbackSrc}`);
        video.onerror = null; // prevent infinite loop
        video.src = fallbackSrc;
      };
    
      return video;
    }
    
    setVideoSourceWithFallback(src) {
      const primarySrc = `https://pub-fb9b941e940b4b44a61b7973d5ba28c3.r2.dev/${src}.mp4`;
      const fallbackSrc = `https://pub-2e4c11f1d1e049e5a893e7a1681ebf7e.r2.dev/${src}.mp4`; // Replace with your 2nd bucket URL
    
      this.videoAd.onerror = () => {
        console.warn(`Primary videoAd source failed. Falling back to: ${fallbackSrc}`);
        this.videoAd.onerror = null;
        this.videoAd.src = fallbackSrc;
      };
    
      this.videoAd.src = primarySrc;
    }*/

    createVideoElementWithFallback(src, type) {
      const video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.loop = true;
    
      const primarySrc = `https://pub-fb9b941e940b4b44a61b7973d5ba28c3.r2.dev/${src}.${type}`;
      const fallbackSrc1 = `https://pub-2e4c11f1d1e049e5a893e7a1681ebf7e.r2.dev/${src}.${type}`;
      const fallbackSrc2 = `https://f005.backblazeb2.com/file/assets4/${src}.${type}`; // Replace with your 3rd bucket URL
    
      // Track fallback attempts
      let attempt = 0;
      const sources = [primarySrc, fallbackSrc1, fallbackSrc2];
    
      const tryNextSource = () => {
        if (attempt >= sources.length) {
          console.error("All video sources failed to load.");
          return;
        }
        video.src = sources[attempt];
        attempt++;
      };
    
      // On error, try next fallback source
      video.onerror = () => {
        console.warn(`Video source failed, switching to fallback #${attempt}: ${sources[attempt]}`);
        tryNextSource();
      };
    
      // Start with primary source
      tryNextSource();
    
      return video;
    }

    setVideoSourceWithFallback(src) {
      const primarySrc = `https://pub-fb9b941e940b4b44a61b7973d5ba28c3.r2.dev/${src}.mp4`;
      const fallbackSrc1 = `https://pub-2e4c11f1d1e049e5a893e7a1681ebf7e.r2.dev/${src}.mp4`;
      const fallbackSrc2 = `https://f005.backblazeb2.com/file/assets4/${src}.mp4`; // Replace with your 3rd bucket URL
    
      const sources = [primarySrc, fallbackSrc1, fallbackSrc2];
      let attempt = 0;
    
      const tryNextSource = () => {
        if (attempt >= sources.length) {
          console.error("All videoAd sources failed to load.");
          return;
        }
        this.videoAd.src = sources[attempt];
        attempt++;
      };
    
      this.videoAd.onerror = () => {
        console.warn(`videoAd source failed, switching to fallback #${attempt}: ${sources[attempt]}`);
        tryNextSource();
      };
    
      tryNextSource();
    }    
  
    //createVideoElement(src, type) {
      //const video = document.createElement('video');
      //video.src = `https://pub-fb9b941e940b4b44a61b7973d5ba28c3.r2.dev/${src}.${type}`;
     // video.controls = true;
     // video.autoplay = true;
      //video.loop = true;
      //return video;
    //}
  
    createImageElement(src, type) {
      const img = document.createElement('img');
      img.src = `${this.imageFolder}${src}.${type}`;
      img.alt = this.musicName.textContent;
      return img;
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
      this.resetVideoSize(); // Reset size and controls
    }
  
    pauseMusic() {
      this.wrapper.classList.remove("paused");
      this.playPauseBtn.querySelector("i").textContent = "play_arrow";
      this.mainAudio.pause();
      this.isMusicPaused = true;
      localStorage.setItem(`isMusicPaused${this.suffix}`, true);
      this.toggleVideoDisplay(true);
      this.muteVideo();
      this.resetVideoSize(); // Reset size and controls
    }
  
    resetVideoSize() {
      this.videoAd.classList.remove("bigger-video");
      this.videoAd.classList.add("overlay-video");
      this.videoAd.controls = false;
      this.controlsToggledManually = false;
      this.videoAd.loop = true;
    }  
  
    toggleVideoDisplay(show) {
      const borderBox = document.getElementById(`video-border-box${this.suffix}`);
      const isDarkMode = this.wrapper.classList.contains("dark-mode");
      
      if (show) {
        if (this.suffix === '2') {
          // Player 2: Show ONLY the border box, no video
          this.videoAd.style.display = "none"; // Keep video hidden
         // borderBox.style.display = "none";
        } else {
          // Player 1: Show both video and border, centered
          this.videoAd.style.display = "block";
          borderBox.style.display = "block";
          
          // Style border based on video size - CENTER EVERYTHING
          if (this.videoAd.classList.contains('bigger-video')) {
            // Full size video (370px) - border matches exactly
            borderBox.style.top = '0px';
            borderBox.style.left = '0px';
            borderBox.style.width = '370px';
            borderBox.style.height = '370px';
            borderBox.style.transform = 'translate(0, 0)';
          } else {
            // Overlay video (280px) - center border (296px) and video within it
            const borderSize = 296;
            const containerSize = 370; // img-area size
            const borderOffset = (containerSize - borderSize) / 2; // 37px from edges
            
            // Position border box centered in container
            borderBox.style.top = `${borderOffset}px`;
            borderBox.style.left = `${borderOffset}px`;
            borderBox.style.width = `${borderSize}px`;
            borderBox.style.height = `${borderSize}px`;
            borderBox.style.transform = 'translate(0, 0)';
            
            // Center video within the border box
            const videoSize = 280;
            const videoBorderPadding = (borderSize - videoSize) / 2; // 8px padding
            const videoOffset = borderOffset + videoBorderPadding; // 37px + 8px = 45px from container edge
            
            this.videoAd.style.top = `${videoOffset}px`;
            this.videoAd.style.left = `${videoOffset}px`;
            this.videoAd.style.transform = 'translate(0, 0)';
          }
          
          this.videoAd.play();
        }
      } else {
        if (this.suffix === '2') {
          if (isDarkMode) {
            this.videoAd.style.display = "none";
            borderBox.style.display = "block";
            this.videoAd.pause();
          } else {
            this.videoAd.style.display = "none";
            borderBox.style.display = "none";
            this.videoAd.pause();
          }
        } else {
          this.videoAd.style.display = "none";
          borderBox.style.display = "none";
          this.videoAd.pause();
        }
      }
    }
  
    muteVideo() {
      this.videoAd.muted = true;
    }
  
    changeMusic(direction) {
      if (this.isShuffleMode) {
        this.musicIndex = (this.musicIndex + direction + this.shuffledOrder.length - 1) % 
                          this.shuffledOrder.length + 1;
      } else {
        this.musicIndex = (this.musicIndex + direction + this.originalOrder.length - 1) % 
                          this.originalOrder.length + 1;
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
          this.musicIndex = 1;
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
      } else if (this.isShuffleMode || mode === "shuffle") {
        // Shuffle to a random song
        this.musicIndex = Math.floor(Math.random() * this.shuffledOrder.length) + 1;
        this.loadMusic(this.musicIndex);
        this.playMusic();
      } else {
        // Go to next song normally
        this.musicIndex = (this.musicIndex % this.originalOrder.length) + 1;
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
      this.populateMusicList(this.originalOrder); // Always populate with original order
    }
  
    populateMusicList(musicArray) {
      this.currentMusicArray = this.originalOrder; // Always use original order for DOM list
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
          <audio class="${music.src}" src="https://pub-c755c6dec2fa41a5a9f9a659408e2150.r2.dev/${music.src}.mp3"></audio>
        `;
  
        this.ulTag.appendChild(liTag);
        const liAudioTag = liTag.querySelector(`.${music.src}`);
        
        liAudioTag.addEventListener("loadeddata", () => {
          const duration = liAudioTag.duration;
          const totalMin = Math.floor(duration / 60);
          const totalSec = Math.floor(duration % 60).toString().padStart(2, "0");
          liTag.querySelector(".audio-duration").textContent = `${totalMin}:${totalSec}`;
        });
  
        liTag.addEventListener("click", () => {
          // When clicking on a list item, find the corresponding index in the current playback order
          if (this.isShuffleMode) {
            // Find the index of this song in the shuffled order
            const clickedMusic = this.originalOrder[actualIndex];
            const shuffledIndex = this.shuffledOrder.findIndex(music => music.src === clickedMusic.src);
            this.musicIndex = shuffledIndex + 1;
          } else {
            this.musicIndex = actualIndex + 1;
          }
          this.loadMusic(this.musicIndex);
          this.playMusic();
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
        const id = audioTag.id; // id was set to music.src
    
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
  
    /*toggleDarkMode() {
      const isDarkMode = this.wrapper.classList.toggle("dark-mode");
      document.getElementById(`fontawesome-icons${this.suffix}`).classList.toggle("Dark");
  
      if (isDarkMode) {
        document.body.style.backgroundColor = "white";
        this.listcolourblack();
      } else {
        document.body.style.backgroundColor = "black";
        this.listcolourwhite();
      }
    }*/

    // Updated toggleDarkMode method in MusicPlayer class
    // Updated toggleDarkMode method - blue controls box, red content inside
    // Updated toggleDarkMode method - blue controls box, red content, but play icon stays black
    // Updated toggleDarkMode method in MusicPlayer class
toggleDarkMode() {
  const isDarkMode = this.wrapper.classList.toggle("dark-mode");
  document.getElementById(`fontawesome-icons${this.suffix}`).classList.toggle("Dark");

  // Get the controls box, progress area, and progress bar
  const controlsBox = this.wrapper.querySelector('.control-box');
  const progressArea = this.wrapper.querySelector('.progress-area');
  const progressBar = this.wrapper.querySelector('.progress-bar');

  if (isDarkMode) {
    const borderBox2 = document.getElementById("video-border-box2");
    borderBox2.style.display = "block";
    borderBox2.style.top = '0px';
    borderBox2.style.left = '0px';
    borderBox2.style.width = '370px';
    borderBox2.style.height = '370px';
    borderBox2.style.transform = 'translate(0, 0)';
    borderBox2.style.borderRadius = "15px";

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
        return; // Keep play/pause icon black
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
    const borderBox2 = document.getElementById("video-border-box2");

    borderBox2.style.display = "none";
    
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
  }
  
  function handleSize() {
    // Only handle video element for player 1 (no video interaction for player 2)
    const sizer = document.getElementById("video");
    
    if (!sizer) return;
    
    const borderBox = document.getElementById("video-border-box");
    
    if (!sizer.classList.contains("overlay-video") && !sizer.classList.contains("bigger-video")) {
      sizer.classList.add("overlay-video");
    }
  
    sizer.addEventListener("click", () => {
      const player = window.homePlayer;
      
      // Prevent size toggle if controls are shown by user
      if (sizer.classList.contains("bigger-video") && player && player.controlsToggledManually) return;
  
      sizer.classList.toggle("overlay-video");
      sizer.classList.toggle("bigger-video");
      
      // Update border box and video positioning when size changes
      if (sizer.style.display !== "none" && borderBox && borderBox.style.display !== "none") {
        if (sizer.classList.contains('bigger-video')) {
          // Full size - border and video fill container
          borderBox.style.backgroundColor = 'transparent';
          borderBox.style.top = '0px';
          borderBox.style.left = '0px';
          borderBox.style.width = '370px';
          borderBox.style.height = '370px';
          borderBox.style.transform = 'translate(0, 0)';
          
          sizer.style.top = '0px';
          sizer.style.left = '0px';
          sizer.style.transform = 'translate(0, 0)';
        } else {
          // Overlay size - center border and video
          borderBox.style.backgroundColor = 'black';
          const borderSize = 296;
          const containerSize = 370;
          const borderOffset = (containerSize - borderSize) / 2; // 37px
          
          // Center border box
          borderBox.style.top = `${borderOffset}px`;
          borderBox.style.left = `${borderOffset}px`;
          borderBox.style.width = `${borderSize}px`;
          borderBox.style.height = `${borderSize}px`;
          borderBox.style.transform = 'translate(0, 0)';
          
          // Center video within border (280px video with 8px padding on each side)
          const videoSize = 280;
          const videoBorderPadding = (borderSize - videoSize) / 2; // 8px
          const videoOffset = borderOffset + videoBorderPadding; // 45px from container edge
          
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