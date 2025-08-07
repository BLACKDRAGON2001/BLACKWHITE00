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
  localStorage.removeTime("LoginTime");
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

    // Pagination state
    this.currentPage = 0;
    this.itemsPerPage = 25;
    this.isLoading = false;
    this.currentMusicArray = this.originalOrder;

    this.controlsToggledManually = false;
    
    // Form state
    this.isFormVisible = false;
    this.pendingTrackIndex = null;
    
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
    this.createFormOverlay();
    
    // Only initialize border box for Player 2
    if (this.suffix === '2') {
      this.initializeBorderBox();
    }

    setTimeout(() => {
      this.isInitializing = false;
    }, 100)
  }

  // Create the form overlay
  createFormOverlay() {
    const overlay = document.createElement('div');
    overlay.id = `formOverlay${this.suffix}`;
    overlay.className = 'form-overlay';
    overlay.innerHTML = `
      <div class="form-container">
        <div class="form-header">
          <h3>Add New Track</h3>
          <button type="button" class="close-form-btn" onclick="window.${this.suffix === '2' ? 'disguisePlayer' : 'homePlayer'}.hideForm()">×</button>
        </div>
        
        <form id="trackForm${this.suffix}">
          <div class="input-group">
            <label>Artist</label>
            <input type="text" id="artist${this.suffix}" placeholder="Enter artist name" required>
            <div class="error-message" id="artistError${this.suffix}">Artist name is required</div>
          </div>
          
          <div class="input-group">
            <label>Song Name</label>
            <input type="text" id="songName${this.suffix}" placeholder="Enter song title" required>
            <div class="error-message" id="songNameError${this.suffix}">Song name is required</div>
          </div>
          
          <div class="input-group">
            <label>Image</label>
            <div class="file-input-wrapper" onclick="document.getElementById('imageFile${this.suffix}').click()">
              Choose Image File
              <input type="file" id="imageFile${this.suffix}" accept="image/*" required>
            </div>
            <div class="error-message" id="imageFileError${this.suffix}">Image file is required</div>
          </div>
          
          <div class="input-group">
            <label>Audio</label>
            <div class="file-input-wrapper" onclick="document.getElementById('audioFile${this.suffix}').click()">
              Choose Audio File
              <input type="file" id="audioFile${this.suffix}" accept="audio/*" required>
            </div>
            <div class="error-message" id="audioFileError${this.suffix}">Audio file is required</div>
          </div>
          
          <div class="input-group">
            <label>Video</label>
            <div class="file-input-wrapper" onclick="document.getElementById('videoFile${this.suffix}').click()">
              Choose Video File
              <input type="file" id="videoFile${this.suffix}" accept="video/*" required>
            </div>
            <div class="error-message" id="videoFileError${this.suffix}">Video file is required</div>
          </div>
          
          <div class="form-buttons">
            <button type="submit">Add Track</button>
            <button type="button" onclick="window.${this.suffix === '2' ? 'disguisePlayer' : 'homePlayer'}.hideForm()">Cancel</button>
          </div>
        </form>
        
        <div class="loading-overlay" id="loadingOverlay${this.suffix}">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">Processing...</div>
          </div>
        </div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .form-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: none;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(5px);
      }
      
      .form-overlay.show {
        display: flex;
      }
      
      .form-container {
        background: #111111;
        border: 1px solid #333333;
        border-radius: 8px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        color: #ffffff;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .form-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
        border-bottom: 1px solid #333333;
        padding-bottom: 15px;
      }
      
      .form-header h3 {
        margin: 0;
        color: #ffffff;
        font-size: 1.5rem;
        font-weight: 500;
      }
      
      .close-form-btn {
        background: none;
        border: none;
        color: #ffffff;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .close-form-btn:hover {
        background-color: #333333;
      }
      
      .input-group {
        margin-bottom: 20px;
      }
      
      .input-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #ffffff;
        font-size: 14px;
      }
      
      .input-group input[type="text"] {
        width: 100%;
        padding: 12px 16px;
        background: #000000;
        border: 1px solid #333333;
        border-radius: 4px;
        color: #ffffff;
        font-size: 16px;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      
      .input-group input[type="text"]:focus {
        outline: none;
        border-color: #666666;
        background: #111111;
      }
      
      .input-group input[type="text"]::placeholder {
        color: #666666;
      }
      
      .file-input-wrapper {
        display: inline-block;
        cursor: pointer;
        background: #222222;
        border: 1px solid #333333;
        border-radius: 4px;
        padding: 12px 20px;
        transition: background-color 0.2s;
        font-size: 14px;
        color: #ffffff;
        width: 100%;
        box-sizing: border-box;
        text-align: center;
      }
      
      .file-input-wrapper:hover {
        background: #333333;
        border-color: #555555;
      }
      
      .input-group input[type="file"] {
        display: none;
      }
      
      .error-message {
        color: #ff0000;
        font-size: 12px;
        margin-top: 5px;
        padding: 8px 12px;
        background: #110000;
        border: 1px solid #330000;
        border-radius: 4px;
        display: none;
      }
      
      .error-message.show {
        display: block;
      }
      
      .form-buttons {
        display: flex;
        gap: 10px;
        margin-top: 25px;
      }
      
      .form-buttons button {
        padding: 12px 24px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        transition: background-color 0.2s;
        flex: 1;
      }
      
      .form-buttons button[type="submit"] {
        background: #ffffff;
        color: #000000;
      }
      
      .form-buttons button[type="submit"]:hover {
        background: #f0f0f0;
      }
      
      .form-buttons button[type="button"] {
        background: #333333;
        color: #ffffff;
        border: 1px solid #555555;
      }
      
      .form-buttons button[type="button"]:hover {
        background: #444444;
      }
      
      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        justify-content: center;
        align-items: center;
        border-radius: 8px;
      }
      
      .loading-overlay.show {
        display: flex;
      }
      
      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 2px solid #333333;
        border-top: 2px solid #ffffff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
      }
      
      .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #ffffff;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    
    // Setup form event listeners
    this.setupFormEventListeners();
  }

  setupFormEventListeners() {
    const form = document.getElementById(`trackForm${this.suffix}`);
    form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    
    // Real-time validation
    const artistInput = document.getElementById(`artist${this.suffix}`);
    const songNameInput = document.getElementById(`songName${this.suffix}`);
    
    artistInput.addEventListener('input', () => {
      if (artistInput.value.trim().length >= 2) {
        this.clearFieldError('artist');
      }
    });
    
    songNameInput.addEventListener('input', () => {
      if (songNameInput.value.trim().length >= 2) {
        this.clearFieldError('songName');
      }
    });
  }

  clearFieldError(fieldName) {
    const field = document.getElementById(`${fieldName}${this.suffix}`);
    const errorEl = document.getElementById(`${fieldName}Error${this.suffix}`);
    
    if (field) field.classList.remove('error');
    if (errorEl) errorEl.classList.remove('show');
  }

  showFieldError(fieldName, message) {
    const field = document.getElementById(`${fieldName}${this.suffix}`);
    const errorEl = document.getElementById(`${fieldName}Error${this.suffix}`);
    
    if (field) field.classList.add('error');
    if (errorEl) {
      if (message) errorEl.textContent = message;
      errorEl.classList.add('show');
    }
  }

  validateForm() {
    this.clearAllErrors();
    let isValid = true;
    
    const artist = document.getElementById(`artist${this.suffix}`).value.trim();
    const songName = document.getElementById(`songName${this.suffix}`).value.trim();
    const imageFile = document.getElementById(`imageFile${this.suffix}`).files[0];
    const audioFile = document.getElementById(`audioFile${this.suffix}`).files[0];
    const videoFile = document.getElementById(`videoFile${this.suffix}`).files[0];
    
    if (!artist) {
      this.showFieldError('artist', 'Artist name is required');
      isValid = false;
    } else if (artist.length < 2) {
      this.showFieldError('artist', 'Artist name must be at least 2 characters');
      isValid = false;
    }
    
    if (!songName) {
      this.showFieldError('songName', 'Song name is required');
      isValid = false;
    } else if (songName.length < 2) {
      this.showFieldError('songName', 'Song name must be at least 2 characters');
      isValid = false;
    }
    
    if (!imageFile) {
      this.showFieldError('imageFile', 'Image file is required');
      isValid = false;
    } else if (!imageFile.type.startsWith('image/')) {
      this.showFieldError('imageFile', 'Please select a valid image file');
      isValid = false;
    }
    
    if (!audioFile) {
      this.showFieldError('audioFile', 'Audio file is required');
      isValid = false;
    } else if (!audioFile.type.startsWith('audio/')) {
      this.showFieldError('audioFile', 'Please select a valid audio file');
      isValid = false;
    }
    
    if (!videoFile) {
      this.showFieldError('videoFile', 'Video file is required');
      isValid = false;
    } else if (!videoFile.type.startsWith('video/')) {
      this.showFieldError('videoFile', 'Please select a valid video file');
      isValid = false;
    }
    
    return isValid;
  }

  clearAllErrors() {
    const overlay = document.getElementById(`formOverlay${this.suffix}`);
    overlay.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
    overlay.querySelectorAll('input').forEach(el => el.classList.remove('error'));
  }

  showLoading() {
    const loadingOverlay = document.getElementById(`loadingOverlay${this.suffix}`);
    loadingOverlay.classList.add('show');
  }

  hideLoading() {
    const loadingOverlay = document.getElementById(`loadingOverlay${this.suffix}`);
    loadingOverlay.classList.remove('show');
  }

  toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    if (!this.validateForm()) {
      return;
    }
    
    this.showLoading();
    
    try {
      const artist = document.getElementById(`artist${this.suffix}`).value.trim();
      const songName = document.getElementById(`songName${this.suffix}`).value.trim();
      const imageFile = document.getElementById(`imageFile${this.suffix}`).files[0];
      const audioFile = document.getElementById(`audioFile${this.suffix}`).files[0];
      const videoFile = document.getElementById(`videoFile${this.suffix}`).files[0];

      // Generate a unique src identifier
      const src = `${artist.toLowerCase().replace(/\s+/g, '_')}_${songName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
      
      // Convert files to base64 (in real implementation, you'd upload to your servers)
      const imageDataUrl = await this.toBase64(imageFile);
      const audioDataUrl = await this.toBase64(audioFile);
      const videoDataUrl = await this.toBase64(videoFile);

      // Create new music object
      const newTrack = {
        name: songName,
        artist: artist,
        src: src,
        imageDataUrl: imageDataUrl,
        audioDataUrl: audioDataUrl,
        videoDataUrl: videoDataUrl,
        coverType: 'Images', // Default to image
        type: imageFile.name.split('.').pop().toLowerCase()
      };

      // Insert the track after current position
      const insertIndex = this.musicIndex; // Insert after current track
      this.originalOrder.splice(insertIndex, 0, newTrack);
      
      // If in shuffle mode, also add to shuffled order
      if (this.isShuffleMode) {
        this.shuffledOrder.splice(insertIndex, 0, newTrack);
      }

      // Navigate to the new track
      this.musicIndex = insertIndex + 1;
      this.loadMusic(this.musicIndex);
      
      // Update the music list
      this.resetPagination();
      
      // Hide form
      this.hideForm();
      
      // Play the new track
      this.playMusic();
      
      // Simulate server processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Error adding track:', error);
      alert('Error adding track. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  showForm() {
    const overlay = document.getElementById(`formOverlay${this.suffix}`);
    overlay.classList.add('show');
    this.isFormVisible = true;
    
    // Clear form
    const form = document.getElementById(`trackForm${this.suffix}`);
    form.reset();
    this.clearAllErrors();
  }

  hideForm() {
    const overlay = document.getElementById(`formOverlay${this.suffix}`);
    overlay.classList.remove('show');
    this.isFormVisible = false;
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
    this.muteButton.addEventListener("click", () => this.showMoreOptions());
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
    
    // Add button event listener
    const addButton = document.getElementById('Add');
    if (addButton) {
      addButton.addEventListener('click', () => this.handleAddButtonClick());
    }
  }

  handleAddButtonClick() {
    // Hide moreOptionsPage
    const moreOptions = document.getElementById('moreOptionsPage');
    if (moreOptions) {
      moreOptions.style.display = 'none';
    }
    
    // Show the form
    this.showForm();
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
  
    // Check if it's a new track with base64 data
    if (music.imageDataUrl) {
      const img = document.createElement('img');
      img.src = music.imageDataUrl;
      img.alt = music.name;
      this.coverArea.appendChild(img);
    } else {
      // Choose image or video element for existing tracks
      const mediaElement = (this.suffix === '2' || coverType !== 'video')
        ? this.createImageElement(src, type)
        : this.createVideoElementWithFallback(src, type);
    
      this.coverArea.appendChild(mediaElement);
    }
  
    // Set audio source
    if (music.audioDataUrl) {
      this.mainAudio.src = music.audioDataUrl;
    } else {
      this.mainAudio.src = `https://pub-c755c6dec2fa41a5a9f9a659408e2150.r2.dev/${src}.mp3`;
    }
  
    // Only set video source for player 1, but keep video element for player 2 (for border positioning)
    if (this.suffix !== '2') {
      // Original player - full video functionality
      if (music.videoDataUrl) {
        this.videoAd.src = music.videoDataUrl;
      } else {
        this.setVideoSourceWithFallback(src);
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

  createVideoElementWithFallback(src, type) {
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.loop = true;
  
    const primarySrc = `https://pub-fb9b941e940b4b44a61b7973d5ba28c3.r2.dev/${src}.${type}`;
    const fallbackSrc1 = `https://pub-2e4c11f1d1e049e5a893e7a1681ebf7e.r2.dev/${src}.${type}`;
    const fallbackSrc2 = `https://pub-15e524466e7449c997fe1434a0717e91.r2.dev/${src}.${type}`;
  
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
    const fallbackSrc2 = `https://pub-15e524466e7449c997fe1434a0717e91.r2.dev/${src}.mp4`;
  
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

  createImageElement(src, type) {
    const img = document.createElement('img');
    // Use R2 bucket URL instead of local folder
    img.src = `${this.imageBucketUrl}${src}.${type}`;
    img.alt = this.musicName.textContent;
    
    // Add error handling for image loading
    img.onerror = () => {
      console.warn(`Failed to load image from R2 bucket: ${img.src}`);
      // Fallback to local folder if R2 fails
      img.src = `${this.imageFolder}${src}.${type}`;
    };
    
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
        <audio class="${music.src}" src="${music.audioDataUrl || `https://pub-c755c6dec2fa41a5a9f9a659408e2150.r2.dev/${music.src}.mp3`}"></audio>
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
    const moreOptionsBox = this.wrapper.querySelector('.more-options');
    const moreOptionsTitle = document.getElementById('moreOptionsTitle')

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

      if (moreOptionsBox) {
        moreOptionsBox.style.setProperty('background-color', 'black', 'important');
      }

      if (moreOptionsTitle) {
        moreOptionsTitle.style.setProperty('color', 'white', 'important')
      }

      const moreOptionsButton = this.wrapper.querySelectorAll('#moreOptionsPage .more-options-button')
      moreOptionsButton.forEach(element => {
        element.style.setProperty('background-color', 'black', 'important');
        element.style.setProperty('border-color', 'white', 'important');
        element.style.setProperty('color', 'white', 'important');
      })
      
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

      if (moreOptionsBox) {
        moreOptionsBox.style.removeProperty('background-color');
      }

      if (moreOptionsTitle) {
        moreOptionsTitle.style.removeProperty('color');
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

      const moreOptionsButton = this.wrapper.querySelectorAll('#moreOptionsPage .more-options-button')
      moreOptionsButton.forEach(element => {
        element.style.removeProperty('background-color');
        element.style.removeProperty('border-color');
        element.style.removeProperty('color');
      })
      
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

  showMoreOptions() {
    const moreOptions = document.getElementById('moreOptionsPage');
  
    if (moreOptions.style.display === 'none' || moreOptions.style.display === '') {
      moreOptions.style.display = 'block';
    } else {
      moreOptions.style.display = 'none';
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