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
  
    // Only set video src if not disguise player
    if (this.suffix !== '2') {
      this.setVideoSourceWithFallback(src);
    } else {
      this.videoAd.src = "";
      this.videoAd.style.display = "none";
    }
  
    localStorage.setItem(`musicIndex${this.suffix}`, index);
    this.updatePlayingSong();
  }
  
  createVideoElementWithFallback(src, type) {
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
    this.videoAd.style.display = show ? "block" : "none";
    show ? this.videoAd.play() : this.videoAd.pause();
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

  populateMusicList(musicArray) {
    this.ulTag.innerHTML = "";
    musicArray.forEach((music, i) => {
      const liTag = document.createElement("li");
      liTag.setAttribute("li-index", i + 1);

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
        this.musicIndex = i + 1;
        this.loadMusic(this.musicIndex);
        this.playMusic();
      });
    });
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

  toggleDarkMode() {
    const isDarkMode = this.wrapper.classList.toggle("dark-mode");
    document.getElementById(`fontawesome-icons${this.suffix}`).classList.toggle("Dark");

    if (isDarkMode) {
      document.body.style.backgroundColor = "white";
      this.listcolourblack();
    } else {
      document.body.style.backgroundColor = "black";
      this.listcolourwhite();
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
  const sizer = document.getElementById("video");

  sizer.addEventListener("click", () => {
      if (sizer.classList.contains("overlay-video")) {
      sizer.classList.replace("overlay-video", "bigger-video");
      } else {
      sizer.classList.replace("bigger-video", "overlay-video");
      }
  });
}

function handleSize() {
  const sizer = document.getElementById("video");

  if (!sizer.classList.contains("overlay-video") && !sizer.classList.contains("bigger-video")) {
    sizer.classList.add("overlay-video");
  }

  sizer.addEventListener("click", () => {
    const player = window.homePlayer || window.disguisePlayer;
    
    // Prevent size toggle if controls are shown by user
    if (sizer.classList.contains("bigger-video") && player.controlsToggledManually) return;

    sizer.classList.toggle("overlay-video");
    sizer.classList.toggle("bigger-video");
  });
}

// Initialize players when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  window.homePlayer = new MusicPlayer();       // Original page
  window.disguisePlayer = new MusicPlayer('2'); // Disguise page
  handleSize();
});