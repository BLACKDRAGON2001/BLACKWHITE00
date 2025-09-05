// Complete Optimized AudioPlayer - Enhanced Performance & All Features
// IndexedDB helper for large data storage
class AudioStorage {
    constructor() {
        this.dbName = 'AudioPlayerDB';
        this.version = 1;
        this.db = null;
        this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('playerState')) {
                    db.createObjectStore('playerState', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('musicCache')) {
                    db.createObjectStore('musicCache', { keyPath: 'src' });
                }
            };
        });
    }

    async set(key, value) {
        if (!this.db) await this.init();
        const transaction = this.db.transaction(['playerState'], 'readwrite');
        const store = transaction.objectStore('playerState');
        await store.put({ id: key, value });
    }

    async get(key) {
        if (!this.db) await this.init();
        const transaction = this.db.transaction(['playerState'], 'readonly');
        const store = transaction.objectStore('playerState');
        const result = await store.get(key);
        return result ? result.value : null;
    }

    async remove(key) {
        if (!this.db) await this.init();
        const transaction = this.db.transaction(['playerState'], 'readwrite');
        const store = transaction.objectStore('playerState');
        await store.delete(key);
    }
}

// Web Worker for heavy operations
const createShuffleWorker = () => {
    const workerScript = `
        self.onmessage = function(e) {
            const { array, action } = e.data;
            
            if (action === 'shuffle') {
                const shuffled = [...array];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                self.postMessage(shuffled);
            }
        };
    `;
    
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
};

document.getElementById("title")?.addEventListener("click", function() {
    pauseAudio();
    const storage = new AudioStorage();
    storage.remove("musicIndex");
    storage.remove("isMusicPaused");
    document.getElementById("HomePage").style.display = "none";
    document.getElementById("LoginPage").style.display = "block";
    storage.remove("LoginTime");
    document.body.style.backgroundColor = "white";
    clearInputFields();
    refreshPage();
});

document.getElementById("title2")?.addEventListener("click", function() {
    pauseAudio2();
    const storage = new AudioStorage();
    storage.remove("musicIndex2");
    storage.remove("isMusicPaused2");
    document.getElementById("DisguisePage").style.display = "none";
    document.getElementById("LoginPage").style.display = "block";
    storage.remove("LoginTime");
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
        // Initialize storage with fallback to localStorage if IndexedDB fails
        this.initializeStorage().then(() => {
            if (!this.hasStorageValue(`musicIndex${suffix}`)) {
                this.musicIndex = 1;
                this.setStorageValue(`musicIndex${suffix}`, 1);
            }
        });
        
        this.suffix = suffix;
        this.storage = new AudioStorage();
        this.shuffleWorker = createShuffleWorker();
        
        this.initializeConfiguration();
        this.cacheElements();
        this.initializeState();
        
        // Performance optimization flags
        this.rafId = null;
        this.updateQueue = new Set();
        this.lastUpdate = 0;
        this.eventListeners = new Map(); // Track listeners for cleanup
        
        if (this.wrapper) {
            this.initialize();
        }
    }

    async initializeStorage() {
        try {
            await this.storage.init();
            this.useIndexedDB = true;
        } catch (error) {
            console.warn('IndexedDB failed, falling back to localStorage:', error);
            this.useIndexedDB = false;
        }
    }

    async setStorageValue(key, value) {
        if (this.useIndexedDB) {
            try {
                await this.storage.set(key, value);
            } catch (error) {
                console.warn('IndexedDB write failed, using localStorage:', error);
                localStorage.setItem(key, JSON.stringify(value));
            }
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }

    async getStorageValue(key) {
        if (this.useIndexedDB) {
            try {
                return await this.storage.get(key);
            } catch (error) {
                console.warn('IndexedDB read failed, using localStorage:', error);
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : null;
            }
        } else {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        }
    }

    hasStorageValue(key) {
        if (this.useIndexedDB) {
            // For IndexedDB, we'll check asynchronously in initialize
            return false;
        } else {
            return localStorage.getItem(key) !== null;
        }
    }

    async removeStorageValue(key) {
        if (this.useIndexedDB) {
            try {
                await this.storage.remove(key);
            } catch (error) {
                console.warn('IndexedDB remove failed, using localStorage:', error);
                localStorage.removeItem(key);
            }
        } else {
            localStorage.removeItem(key);
        }
    }

    initializeConfiguration() {
        // Configure media folders based on page
        this.imageFolder = this.suffix === '2' ? 'MainAssets/ImagesDisguise/' : 'MainAssets/Images/';
        this.videoFolder = this.suffix === '2' ? 'VideosDisguise/' : 'MainAssets/Videos/';
        this.audioFolder = 'MainAssets/Audios/';
        this.audioBucketUrl = 'https://pub-c755c6dec2fa41a5a9f9a659408e2150.r2.dev/';
        this.videoBucketUrls = [
            'https://pub-fb9b941e940b4b44a61b7973d5ba28c3.r2.dev/',
            'https://pub-2e4c11f1d1e049e5a893e7a1681ebf7e.r2.dev/',
            'https://pub-15e524466e7449c997fe1434a0717e91.r2.dev/'
        ];

        // Configure R2 bucket URLs for images
        this.imageBucketUrl = this.suffix === '2' 
            ? 'https://pub-35bf609bb46e4f27a992efb322030db4.r2.dev/'
            : 'https://pub-99d8e809a4554c358c8d5e75932939cd.r2.dev/';
    }

    cacheElements() {
        // Element selectors
        this.wrapper = document.querySelector(`#wrapper${this.suffix}`);
        if (!this.wrapper) return;

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
        this.seeAllMusicBtn = this.wrapper.querySelector('.seeAllMusic');
        
        // Only initialize border box for Player 2
        if (this.suffix === '2') {
            this.borderBox = document.getElementById(`video-border-box${this.suffix}`);
        }
    }

    initializeState() {
        // Player state
        this.musicIndex = 1;
        this.isMusicPaused = true;
        this.isShuffleMode = false;
        
        // Set initial music array based on player type
        if (this.suffix === '2') {
            this.originalOrder = [...(window.ReducedMusic || [])];
            this.usingReducedMusic = true;
        } else {
            this.originalOrder = [...(window.allMusic || [])];
            this.usingReducedMusic = false;
        }

        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioContextClass = AudioContext || webkitAudioContext;
            this.audioContext = new AudioContextClass();
        }
        
        this.shuffledOrder = [];
        this.isMuted = false;
        this.isInitializing = true;
        this.r2Available = true;
        this.hasScrolledToCurrentSong = false;
        this.hasUserScrolled = false;
        this.scrollTimeout = null;
        this.preShuffleIndex = 1;
        
        // Pagination state
        this.currentPage = 0;
        this.itemsPerPage = 25;
        this.isLoading = false;
        this.currentMusicArray = this.originalOrder;
        
        this.controlsToggledManually = false;
        this.videoOverride = false;
        
        // Audio preloading
        this.nextAudio = new Audio();
        this.preloadQueue = [];
        
        // Only set up border box styles for Player 2
        if (this.suffix === '2') {
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

    async initialize() {
        if (this.suffix === '2') {
            // Check if we have a stored preference for which music array to use
            const storedArrayType = await this.getStorageValue(`usingReducedMusic${this.suffix}`);
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
                await this.setStorageValue(`usingReducedMusic${this.suffix}`, true);
            }
        } else {
            this.originalOrder = [...(window.allMusic || [])]; // Use allMusic for player 1
        }
    
        this.setupEventListeners();
        await this.loadPersistedState();
        this.populateMusicList(this.originalOrder);
        this.updatePlayingSong();
        
        // Only initialize border box for Player 2
        if (this.suffix === '2') {
            this.initializeBorderBox();
        }
    
        // Preload next track
        this.preloadNextTrack();
    
        setTimeout(() => {
            this.isInitializing = false;
        }, 100);
    }

    // Only used for Player 2
    initializeBorderBox() {
        if (this.suffix !== '2' || !this.borderBox) return;
        
        // Use CSS transforms for better performance
        this.borderBox.style.transform = 'translateZ(0)'; // Force hardware acceleration
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

    addEventListenerWithCleanup(element, event, handler, options = {}) {
        if (!element) return;
        
        const wrappedHandler = handler.bind(this);
        element.addEventListener(event, wrappedHandler, options);
        
        // Store for cleanup
        const key = `${element.constructor.name}_${event}`;
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }
        this.eventListeners.get(key).push({ element, event, handler: wrappedHandler, options });
    }

    setupEventListeners() {
        // Control events with cleanup tracking
        this.addEventListenerWithCleanup(this.playPauseBtn, "click", this.togglePlayPause);
        this.addEventListenerWithCleanup(this.prevBtn, "click", () => this.changeMusic(-1));
        this.addEventListenerWithCleanup(this.nextBtn, "click", () => this.changeMusic(1));
        this.addEventListenerWithCleanup(this.progressArea, "click", this.handleProgressClick);
        this.addEventListenerWithCleanup(this.moreMusicBtn, "click", this.toggleMusicList);
        this.addEventListenerWithCleanup(this.closeMoreMusicBtn, "click", this.closeMusicList);
        this.addEventListenerWithCleanup(this.modeToggle, "click", this.toggleDarkMode);
        this.addEventListenerWithCleanup(this.muteButton, "click", this.handleMute);
        this.addEventListenerWithCleanup(this.repeatBtn, "click", this.handleRepeat);

        // Media events with throttling and cleanup
        if (this.mainAudio) {
            this.addEventListenerWithCleanup(this.mainAudio, "timeupdate", this.throttle((e) => this.updateProgress(e), 100));
            this.addEventListenerWithCleanup(this.mainAudio, "ended", this.handleSongEnd);
            this.addEventListenerWithCleanup(this.mainAudio, "pause", this.handleAudioPause);
            this.addEventListenerWithCleanup(this.mainAudio, "play", this.handleAudioPlay);
            this.addEventListenerWithCleanup(this.mainAudio, "error", this.handleAudioError);
        }
        
        this.addEventListenerWithCleanup(this.videoAd, "ended", this.handleVideoEnd);
        this.addEventListenerWithCleanup(this.musicName, "click", this.toggleVideoControls);

        // Optimized scroll event with passive listening
        if (this.ulTag) {
            this.addEventListenerWithCleanup(this.ulTag, "scroll", this.throttle(() => this.handleScroll(), 50), { passive: true });
        }

        const seeVideoBtn = document.querySelector('.seeVideo');
        if (seeVideoBtn) {
            this.addEventListenerWithCleanup(seeVideoBtn, "click", this.toggleVideoOverride);
        }

        if (this.suffix === '2' && this.seeAllMusicBtn) {
            // Remove the pointer-events: none and make it clickable
            this.seeAllMusicBtn.style.pointerEvents = 'auto';
            this.seeAllMusicBtn.style.cursor = 'pointer';
            
            // Set initial button state based on current mode
            this.seeAllMusicBtn.textContent = "star";
            this.addEventListenerWithCleanup(this.seeAllMusicBtn, "click", this.switchToAllMusic);
        }

        // Enhanced scroll event listener with manual scroll detection
        if (this.ulTag) {
            this.addEventListenerWithCleanup(this.ulTag, 'scroll', (e) => {
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

        // Shuffle worker message handler
        this.shuffleWorker.onmessage = (e) => {
            this.shuffledOrder = e.data;
            this.musicIndex = 1;
            this.loadMusic(this.musicIndex);
            this.playMusic();
        };
    }

    async preloadNextTrack() {
        if (!this.originalOrder.length) return;
        
        const currentArray = this.isShuffleMode ? this.shuffledOrder : this.originalOrder;
        const nextIndex = this.musicIndex >= currentArray.length ? 1 : this.musicIndex + 1;
        const nextTrack = currentArray[nextIndex - 1];
        
        if (nextTrack && this.nextAudio) {
            // Create preload link in document head
            const existingPreload = document.querySelector('link[rel="preload"][as="audio"]');
            if (existingPreload) {
                existingPreload.remove();
            }
            
            const preloadLink = document.createElement('link');
            preloadLink.rel = 'preload';
            preloadLink.as = 'audio';
            preloadLink.href = `${this.audioBucketUrl}${nextTrack.src}.mp3`;
            document.head.appendChild(preloadLink);
            
            // Also preload in audio element
            this.nextAudio.src = `${this.audioBucketUrl}${nextTrack.src}.mp3`;
            this.nextAudio.preload = 'auto';
        }
    }

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
        await this.setStorageValue(`usingReducedMusic${this.suffix}`, this.usingReducedMusic);
        
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
                // Use Web Worker for shuffling
                this.shuffleWorker.postMessage({
                    array: this.originalOrder,
                    action: 'shuffle'
                });
                
                // Wait for shuffle to complete before finding the song's new position
                await new Promise(resolve => {
                    const originalHandler = this.shuffleWorker.onmessage;
                    this.shuffleWorker.onmessage = (e) => {
                        // Restore original handler
                        this.shuffleWorker.onmessage = originalHandler;
                        
                        // Find the song's new position in the shuffled order
                        const shuffledIndex = this.shuffledOrder.findIndex(song => 
                            song.src === currentSong.src && 
                            song.name === currentSong.name && 
                            song.artist === currentSong.artist
                        );
                        
                        if (shuffledIndex >= 0) {
                            this.musicIndex = shuffledIndex + 1;
                        }
                        resolve();
                    };
                });
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
                this.shuffleWorker.postMessage({
                    array: this.originalOrder,
                    action: 'shuffle'
                });
                
                // Wait for shuffle to complete
                await new Promise(resolve => {
                    const originalHandler = this.shuffleWorker.onmessage;
                    this.shuffleWorker.onmessage = (e) => {
                        this.shuffleWorker.onmessage = originalHandler;
                        // Find the closest song's position in shuffled order
                        const shuffledIndex = this.shuffledOrder.findIndex(song => 
                            song.src === this.originalOrder[closestIndex].src
                        );
                        this.musicIndex = shuffledIndex >= 0 ? shuffledIndex + 1 : 1;
                        resolve();
                    };
                });
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
        await this.setStorageValue(`musicIndex${this.suffix}`, this.musicIndex);
        
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
        
        // Use CSS transforms for better performance
        this.videoAd.style.transform = 'translate(-50%, -50%) translateZ(0)';
        this.videoAd.style.top = '50%';
        this.videoAd.style.left = '50%';
        
        // Set video mute state based on audio playing state
        this.videoAd.muted = !this.isMusicPaused;
        
        // Enhanced autoplay with proper error handling
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

    async loadPersistedState() {
        const storedMusicIndex = await this.getStorageValue(`musicIndex${this.suffix}`);
        if (storedMusicIndex) {
            const parsedIndex = parseInt(storedMusicIndex, 10);
            // Ensure the index is valid for the current array
            if (parsedIndex >= 1 && parsedIndex <= this.originalOrder.length) {
                this.musicIndex = parsedIndex;
            } else {
                // Index is invalid for current array, reset to first song
                this.musicIndex = 1;
                await this.setStorageValue(`musicIndex${this.suffix}`, 1);
            }
            
            this.loadMusic(this.musicIndex);
            const isPaused = await this.getStorageValue(`isMusicPaused${this.suffix}`);
            if (isPaused === false) {
                this.playMusic();
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

        if (!this.controlsToggledManually && this.mainAudio.paused) {
            this.videoAd.play();
        }
    }
        
    loadMusic(index) {
        const music = this.isShuffleMode ?
            this.shuffledOrder[index - 1] :
            this.originalOrder[index - 1];

        if (!music) return;

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

        // At the end of loadMusic method, reset scroll state and scroll to current song
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
        
        this.updatePlayingSong();
        this.preloadNextTrack(); // Preload next track after loading current
    }
    
    resetScrollState() {
        this.hasUserScrolled = false;
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        this.lastScrollTime = 0;
    }

    setAudioSourceWithFallback(src) {
    const r2AudioSrc = `${this.audioBucketUrl}${src}.mp3`;
    const localAudioSrc = `${this.audioFolder}${src}.mp3`;
    const uploadAudioSrc = `Upload/${src}.mp3`;
    
    // Clear any previous event listeners
    this.mainAudio.onerror = null;
    this.mainAudio.onloadeddata = null;
    
    // iOS Safari: Set preload to metadata for better initial loading
    this.mainAudio.preload = 'metadata';
    
    // Try R2 first
    this.mainAudio.src = r2AudioSrc;
    
    const handleAudioError = () => {
        console.warn(`Audio failed to load from R2: ${r2AudioSrc}, trying local: ${localAudioSrc}`);
        this.mainAudio.src = localAudioSrc;
        
        this.mainAudio.onloadeddata = () => {
            console.log(`Audio loaded successfully from local: ${localAudioSrc}`);
            this.mainAudio.onloadeddata = null;
        };
        
        this.mainAudio.onerror = () => {
            console.warn(`Audio failed to load from local: ${localAudioSrc}, trying upload: ${uploadAudioSrc}`);
            this.mainAudio.src = uploadAudioSrc;
            this.r2Available = false;
            
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
    this.wrapper.classList.add("paused");
    this.playPauseBtn.querySelector("i").textContent = "pause";
    
    try {
        // iOS Safari specific: ensure audio context is resumed
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioContextClass = AudioContext || webkitAudioContext;
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
        }

        // Wait for audio to be ready before playing
        await this.waitForAudioReady();
        
        // iOS Safari: Load the audio explicitly before playing
        this.mainAudio.load();
        
        // Wait a bit for load to complete on iOS
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Temporarily remove event handlers to prevent loops
        const originalPlayHandler = this.mainAudio.onplay;
        this.mainAudio.onplay = null;
        
        // iOS Safari: Use a more aggressive play approach
        const playPromise = this.mainAudio.play();
        
        if (playPromise !== undefined) {
            await playPromise;
        }
        
        // Restore handler after successful play
        setTimeout(() => {
            this.mainAudio.onplay = originalPlayHandler;
        }, 150);
        
        this.isMusicPaused = false;
        await this.setStorageValue(`isMusicPaused${this.suffix}`, false);
        
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
    } catch (error) {
        console.warn("Failed to play audio:", error);
        // iOS Safari fallback: try again after a longer delay
        setTimeout(async () => {
            try {
                await this.mainAudio.play();
                this.isMusicPaused = false;
                await this.setStorageValue(`isMusicPaused${this.suffix}`, false);
            } catch (retryError) {
                console.warn("Retry also failed:", retryError);
                this.wrapper.classList.remove("paused");
                this.playPauseBtn.querySelector("i").textContent = "play_arrow";
                this.isMusicPaused = true;
                await this.setStorageValue(`isMusicPaused${this.suffix}`, true);
            }
        }, 300);
    }
    this.updatePlayingSong();
}
    
    async pauseMusic() {
        this.wrapper.classList.remove("paused");
        this.playPauseBtn.querySelector("i").textContent = "play_arrow";
        this.mainAudio.pause();
        this.isMusicPaused = true;
        await this.setStorageValue(`isMusicPaused${this.suffix}`, true);
        
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
        this.videoAd?.classList.remove("bigger-video");
        this.videoAd?.classList.add("overlay-video");
        if (this.videoAd) {
            this.videoAd.controls = false;
        }
        this.controlsToggledManually = false;
        if (this.videoAd) {
            this.videoAd.loop = true;
        }
    }
    
    toggleVideoDisplay(show) {
        // If video override is active, use override behavior instead
        if (this.videoOverride) {
            this.showVideoOverride();
            return;
        }
        
        if (show) {
            if (this.suffix === '2') {
                this.videoAd.style.display = "none";
            } else {
                this.videoAd.style.display = "block";
                
                // Use CSS transforms for better performance
                this.videoAd.style.transform = 'translate(-50%, -50%) translateZ(0)';
                this.videoAd.style.top = '50%';
                this.videoAd.style.left = '50%';
                
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
        if (this.videoAd) {
            this.videoAd.muted = true;
        }
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
        
        // Use RAF for smooth progress updates
        requestAnimationFrame(() => {
            if (this.progressBar) {
                // Use CSS transform for smoother progress updates while maintaining compatibility
                const percentage = (currentTime / duration) * 100;
                this.progressBar.style.width = `${percentage}%`;
            }

            const currentMin = Math.floor(currentTime / 60);
            const currentSec = Math.floor(currentTime % 60).toString().padStart(2, "0");
            const currentTimeElement = this.wrapper.querySelector(".current-time");
            if (currentTimeElement) {
                currentTimeElement.textContent = `${currentMin}:${currentSec}`;
            }

            if (!isNaN(duration)) {
                const totalMin = Math.floor(duration / 60);
                const totalSec = Math.floor(duration % 60).toString().padStart(2, "0");
                const maxDurationElement = this.wrapper.querySelector(".max-duration");
                if (maxDurationElement) {
                    maxDurationElement.textContent = `${totalMin}:${totalSec}`;
                }
            }
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
                
                // Use Web Worker for shuffling
                this.shuffleWorker.postMessage({
                    array: this.originalOrder,
                    action: 'shuffle'
                });
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
        this.musicList?.classList.toggle("show");
        
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
        this.musicList?.classList.remove("show");
        this.resetScrollState();
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
                this.listColourBlack();
            } else {
                this.loadMoreItems();
            }
        }
    }

    loadMoreItems() {
        const isDarkMode = this.wrapper.classList.contains("dark-mode");
        if (this.isLoading) return;
        
        const startIndex = (this.currentPage + 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        
        // Check if there are more items to load from original order
        if (startIndex >= this.originalOrder.length) return;
        
        this.isLoading = true;
        this.currentPage++;
        
        // Get the next batch of items from original order
        const nextItems = this.originalOrder.slice(startIndex, endIndex);

        if (isDarkMode) {
            this.appendMusicItems(nextItems, startIndex);
            this.listColourBlack();
        } else {
            this.appendMusicItems(nextItems, startIndex);
        }
        
        this.isLoading = false;
    }

    resetPagination() {
        this.currentPage = 0;
        this.ulTag.innerHTML = "";
        
        // Load initial batch from current array
        const initialItems = this.originalOrder.slice(0, this.itemsPerPage);
        this.appendMusicItems(initialItems, 0);
    }

    populateMusicList(musicArray) {
        this.currentMusicArray = this.originalOrder;
        this.currentPage = 0;
        this.ulTag.innerHTML = "";
        
        // Load initial batch from current array
        const initialItems = this.currentMusicArray.slice(0, this.itemsPerPage);
        this.appendMusicItems(initialItems, 0);
    }

    appendMusicItems(musicItems, startIndex) {
        const fragment = document.createDocumentFragment();
        
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

            const liAudioTag = liTag.querySelector(`.${music.src}`);
            
            // Add fallback for list audio elements
            liAudioTag.onerror = () => {
                console.warn(`List audio failed from R2, trying local: ${this.audioFolder}${music.src}.mp3`);
                liAudioTag.src = `${this.audioFolder}${music.src}.mp3`;
                
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

            this.addEventListenerWithCleanup(liTag, "click", () => {
                const clickedMusic = this.originalOrder[actualIndex];
                
                if (this.isShuffleMode) {
                    // Find this song's position in the shuffled array
                    const shuffledIndex = this.shuffledOrder.findIndex(song => 
                        song.src === clickedMusic.src && 
                        song.name === clickedMusic.name && 
                        song.artist === clickedMusic.artist
                    );
                    
                    if (shuffledIndex >= 0) {
                        this.musicIndex = shuffledIndex + 1;
                    } else {
                        // Fallback: add the song to shuffled order if somehow missing
                        this.shuffledOrder.push(clickedMusic);
                        this.musicIndex = this.shuffledOrder.length;
                    }
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
        const allLiTags = this.ulTag?.querySelectorAll("li");
        if (!allLiTags || allLiTags.length === 0) return;

        let currentMusic;
        
        if (this.isShuffleMode) {
            currentMusic = this.shuffledOrder[this.musicIndex - 1];
        } else {
            currentMusic = this.originalOrder[this.musicIndex - 1];
        }

        if (!currentMusic) return;

        // Clear all previous "Playing" states first
        allLiTags.forEach(liTag => {
            const audioTag = liTag.querySelector(".audio-duration");
            if (!audioTag) return;
            
            // Restore original duration if it was showing "Playing"
            if (audioTag.textContent === "Playing") {
                const originalDuration = audioTag.getAttribute("t-duration");
                if (originalDuration) {
                    audioTag.textContent = originalDuration;
                }
            }
            
            liTag.classList.remove("playing");
        });

        // Now find and mark the currently playing song
        let foundPlaying = false;
        allLiTags.forEach(liTag => {
            const audioTag = liTag.querySelector(".audio-duration");
            if (!audioTag) return;

            // Store original duration if not already stored
            if (!audioTag.hasAttribute("t-duration") && audioTag.textContent !== "Playing") {
                audioTag.setAttribute("t-duration", audioTag.textContent);
            }

            // Check if this is the currently playing song
            const isPlaying = audioTag.id === currentMusic.src;

            if (isPlaying) {
                liTag.classList.add("playing");
                audioTag.textContent = "Playing";
                foundPlaying = true;
            }
        });

        // If we didn't find the playing song in the current loaded items, 
        // it might be because it hasn't been loaded yet due to pagination
        if (!foundPlaying) {
            console.log('Currently playing song not found in loaded items, may need to load more');
            
            // Find the song's position in the original order
            const songIndexInOriginal = this.originalOrder.findIndex(song => song.src === currentMusic.src);
            
            if (songIndexInOriginal >= 0) {
                const currentlyLoadedCount = (this.currentPage + 1) * this.itemsPerPage;
                
                if (songIndexInOriginal >= currentlyLoadedCount) {
                    // The playing song is beyond the currently loaded items
                    // Load more items to include it
                    this.loadItemsUntilSongForPlaying(songIndexInOriginal, currentMusic.src);
                }
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
        const fontAwesome = document.getElementById(`fontawesome-icons${this.suffix}`);
        if (fontAwesome) {
            fontAwesome.classList.toggle("Dark");
        }

        // Get the controls box, progress area, and progress bar
        const controlsBox = this.wrapper.querySelector('.control-box');
        const progressArea = this.wrapper.querySelector('.progress-area');
        const progressBar = this.wrapper.querySelector('.progress-bar');

        if (isDarkMode) {
            document.body.style.backgroundColor = "white";
            this.listColourBlack();
            
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
            this.listColourWhite();
            
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

        if (this.videoAd) {
            this.videoAd.muted = !this.videoAd.muted;
            this.isMuted = this.videoAd.muted;
            this.muteButton?.classList.toggle("muted", this.isMuted);
            this.muteButton?.classList.toggle("unmuted", !this.isMuted);
        }
    }

    handleAudioPause() {
        if (this.muteButton) {
            this.muteButton.disabled = false;
        }
        // Don't call pauseMusic() here as it creates a loop
        // Just update the UI state to reflect the pause
        this.wrapper.classList.remove("paused");
        this.playPauseBtn.querySelector("i").textContent = "play_arrow";
        this.isMusicPaused = true;
        this.setStorageValue(`isMusicPaused${this.suffix}`, true);
    }
    
    handleAudioPlay() {
        if (this.muteButton) {
            this.muteButton.disabled = true;
        }
        // Don't call playMusic() here as it creates a loop  
        // Just update the UI state to reflect the play
        this.wrapper.classList.add("paused");
        this.playPauseBtn.querySelector("i").textContent = "pause";
        this.isMusicPaused = false;
        this.setStorageValue(`isMusicPaused${this.suffix}`, false);
    }

    handleAudioError(e) {
        console.error('Audio playback error:', e);
        // Enhanced autoplay fallback
        setTimeout(() => {
            if (this.mainAudio.paused && !this.isMusicPaused) {
                this.mainAudio.play().catch(err => {
                    console.warn('Autoplay retry failed:', err);
                    // Reset to paused state if all attempts fail
                    this.pauseMusic();
                });
            }
        }, 1000);
    }

    handleVideoEnd() {
        if (this.muteButton) {
            this.muteButton.disabled = false;
        }
    }

    listColourBlack() {
        const listItems = this.ulTag?.querySelectorAll("li");
        listItems?.forEach(item => {
            item.style.color = 'white';
            item.style.borderBottom = '3px solid white';
        });
        if (this.musicList) {
            this.musicList.style.backgroundColor = "black";
        }
        if (this.closeMoreMusicBtn) {
            this.closeMoreMusicBtn.style.color = "white";
        }
        if (this.header) {
            this.header.style.color = "white";
        }
    }

    listColourWhite() {
        const listItems = this.ulTag?.querySelectorAll("li");
        listItems?.forEach(item => {
            item.style.color = 'black';
            item.style.borderBottom = '3px solid black';
        });
        if (this.musicList) {
            this.musicList.style.backgroundColor = "white";
        }
        if (this.closeMoreMusicBtn) {
            this.closeMoreMusicBtn.style.color = "black";
        }
        if (this.header) {
            this.header.style.color = "black";
        }
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
            
            // Use CSS transform for better performance with hardware acceleration
            const cssText = `
                display: block;
                top: ${styles.top};
                left: ${styles.left};
                width: ${styles.width};
                height: ${styles.height};
                transform: ${styles.transform} translateZ(0);
                border-radius: ${styles.borderRadius};
                will-change: transform;
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

    // Cleanup method to prevent memory leaks
    cleanup() {
        // Clean up event listeners
        this.eventListeners.forEach((listeners, key) => {
            listeners.forEach(({ element, event, handler, options }) => {
                try {
                    element.removeEventListener(event, handler, options);
                } catch (error) {
                    console.warn(`Failed to remove event listener: ${key}`, error);
                }
            });
        });
        this.eventListeners.clear();

        // Clean up Web Worker
        if (this.shuffleWorker) {
            this.shuffleWorker.terminate();
            this.shuffleWorker = null;
        }

        // Clean up audio elements
        if (this.mainAudio) {
            this.mainAudio.pause();
            this.mainAudio.src = '';
            this.mainAudio.load();
        }

        if (this.nextAudio) {
            this.nextAudio.pause();
            this.nextAudio.src = '';
            this.nextAudio.load();
        }

        // Clean up video element
        if (this.videoAd) {
            this.videoAd.pause();
            this.videoAd.src = '';
            this.videoAd.load();
        }

        // Cancel any pending animation frames
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        // Clear timeouts
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }

        // Clear preload links
        const preloadLinks = document.querySelectorAll('link[rel="preload"][as="audio"]');
        preloadLinks.forEach(link => link.remove());

        // Close IndexedDB connection
        if (this.storage && this.storage.db) {
            this.storage.db.close();
        }

        console.log(`MusicPlayer${this.suffix} cleaned up successfully`);
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
                // Use CSS transforms for better performance
                sizer.style.transform = 'translate(0, 0) translateZ(0)';
                sizer.style.top = '0px';
                sizer.style.left = '0px';
            } else {
                // Use CSS transforms for smooth centering
                sizer.style.transform = 'translate(-50%, -50%) translateZ(0)';
                sizer.style.top = '50%';
                sizer.style.left = '50%';
            }
        }
    });
}

// Enhanced initialization with error handling and cleanup
document.addEventListener("DOMContentLoaded", () => {
    // Clean up any existing players first
    if (window.homePlayer) {
        window.homePlayer.cleanup();
    }
    if (window.disguisePlayer) {
        window.disguisePlayer.cleanup();
    }

    // Initialize with performance optimization
    requestAnimationFrame(() => {
        try {
            window.homePlayer = new MusicPlayer();
            window.disguisePlayer = new MusicPlayer('2');
            
            // Set up performance monitoring
            if (window.homePlayer.setupPerformanceMonitoring) {
                window.homePlayer.setupPerformanceMonitoring();
            }
            if (window.disguisePlayer.setupPerformanceMonitoring) {
                window.disguisePlayer.setupPerformanceMonitoring();
            }
            
            handleSize();
            
            console.log('Music players initialized successfully');
        } catch (error) {
            console.error("Failed to initialize music players:", error);
        }
    });
});

// Clean up on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
    if (window.homePlayer) {
        window.homePlayer.cleanup();
    }
    if (window.disguisePlayer) {
        window.disguisePlayer.cleanup();
    }
});

// Additional performance optimizations
// Optimize scroll performance with passive event listeners
if ('serviceWorker' in navigator) {
    // Register service worker for audio caching (optional)
    navigator.serviceWorker.register('/audio-cache-sw.js').catch(error => {
        console.log('Service Worker registration failed:', error);
    });
}

// Enable hardware acceleration for better performance
document.documentElement.style.transform = 'translateZ(0)';

console.log('Complete Optimized Audio Player initialized with all features and enhanced performance');