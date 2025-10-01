// Voice Control System for AudioPlayer - iOS Optimized
class VoiceControlSystem {
    constructor() {
      this.recognition = null;
      this.isListening = false;
      this.buttons = {}; // Store buttons by ID
      this.originalButtonText = "START VOICE CONTROL";
      this.activeButtonText = "LISTENING...";
      this.permissionGranted = false;
      this.permissionChecked = false;
      this.mediaStream = null;
      this.isIOS = this.detectIOS();
      this.isSafari = this.detectSafari();
      this.recognitionRestartAttempts = 0;
      this.maxRestartAttempts = 3;
      this.restartTimeout = null;
      
      // Voice commands mapping
      this.commands = {
        'play': () => this.executePlayerCommand('playMusic'),
        'pause': () => this.executePlayerCommand('pauseMusic'),
        'stop': () => this.executePlayerCommand('pauseMusic'),
        'next': () => this.executePlayerCommand('changeMusic', [1]),
        'previous': () => this.executePlayerCommand('changeMusic', [-1]),
        'skip': () => this.executePlayerCommand('changeMusic', [1]),
        'back': () => this.executePlayerCommand('changeMusic', [-1]),
        'dark mode': () => this.executePlayerCommand('toggleDarkMode'),
        'darkmode': () => this.executePlayerCommand('toggleDarkMode'),
        'light mode': () => this.executePlayerCommand('toggleDarkMode'),
        'lightmode': () => this.executePlayerCommand('toggleDarkMode'),
        'open list': () => this.executePlayerCommand('toggleMusicList'),
        'show list': () => this.executePlayerCommand('toggleMusicList'),
        'music list': () => this.executePlayerCommand('toggleMusicList'),
        'close list': () => this.executePlayerCommand('closeMusicList'),
        'hide list': () => this.executePlayerCommand('closeMusicList'),
        'shuffle': () => this.handleShuffleCommand(),
        'repeat': () => this.handleRepeatCommand(),
        'normal': () => this.handleNormalCommand(),
        'logout': () => this.handleLogout(),
        'log out': () => this.handleLogout(),
        'sign out': () => this.handleLogout()
      };
      
      this.injectButtonStyles();
      this.initialize();
    }
  
    detectIOS() {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
             (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }
  
    detectSafari() {
      return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    }
  
    async initialize() {
      // Check for Web Speech API support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('Web Speech API not supported in this browser');
        this.disableVoiceControl('Voice control not supported on this device');
        return;
      }
  
      // iOS Safari has limited support - warn user
      if (this.isIOS && !this.isSafari) {
        console.warn('Voice control works best in Safari on iOS');
      }
  
      // Initialize speech recognition
      this.recognition = new SpeechRecognition();
      
      // Configure for iOS compatibility
      this.recognition.continuous = !this.isIOS; // iOS works better with non-continuous mode
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;
  
      // Set up event listeners
      this.recognition.onstart = () => {
        console.log('Voice recognition started');
        this.recognitionRestartAttempts = 0;
        this.updateButtonState(true);
        this.provideFeedback('listening');
      };
  
      this.recognition.onend = () => {
        console.log('Voice recognition ended');
        
        if (this.isListening) {
          // On iOS, we need to manually restart after each recognition
          if (this.isIOS) {
            this.restartTimeout = setTimeout(() => {
              if (this.isListening && this.recognitionRestartAttempts < this.maxRestartAttempts) {
                this.recognitionRestartAttempts++;
                this.startListening();
              } else if (this.recognitionRestartAttempts >= this.maxRestartAttempts) {
                console.log('Max restart attempts reached, stopping voice control');
                this.stopListening();
                this.provideFeedback('stopped');
              }
            }, 300); // Longer delay for iOS
          } else {
            // Non-iOS: restart immediately
            setTimeout(() => {
              if (this.isListening) {
                this.startListening();
              }
            }, 100);
          }
        } else {
          this.updateButtonState(false);
        }
      };
  
      this.recognition.onerror = (event) => {
        console.warn('Voice recognition error:', event.error);
        
        // Handle iOS-specific errors gracefully
        if (event.error === 'no-speech') {
          // Common on iOS, just continue
          return;
        }
        
        if (event.error === 'audio-capture') {
          this.provideFeedback('error');
          alert('Microphone not available. Please check your device settings.');
          this.stopListening();
          return;
        }
        
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          this.permissionGranted = false;
          this.provideFeedback('error');
          alert('Microphone access denied. Please enable microphone access in Settings > Safari > Microphone');
          this.stopListening();
          return;
        }
  
        if (event.error === 'network') {
          this.provideFeedback('error');
          alert('Network error. Voice control requires an internet connection.');
          this.stopListening();
          return;
        }
  
        // For other errors, try to continue
        if (this.isListening) {
          console.log('Attempting to recover from error...');
          setTimeout(() => {
            if (this.isListening) {
              this.startListening();
            }
          }, 500);
        }
      };
  
      this.recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.toLowerCase().trim();
          console.log('Voice command received:', transcript);
          this.provideFeedback('recognized');
          this.processCommand(transcript);
          
          // On iOS, reset restart attempts after successful recognition
          if (this.isIOS) {
            this.recognitionRestartAttempts = 0;
          }
        }
      };
  
      // Check microphone permission
      await this.checkMicrophonePermission();
      
      this.setupButtons();
    }
  
    provideFeedback(type) {
      // Provide visual/haptic feedback for iOS users
      const buttons = Object.values(this.buttons);
      
      switch(type) {
        case 'listening':
          buttons.forEach(b => {
            b.element.style.backgroundColor = '#4CAF50';
            b.element.style.color = 'white';
          });
          // Haptic feedback on iOS
          if (this.isIOS && window.navigator.vibrate) {
            window.navigator.vibrate(50);
          }
          break;
          
        case 'recognized':
          buttons.forEach(b => {
            b.element.style.backgroundColor = '#2196F3';
          });
          if (this.isIOS && window.navigator.vibrate) {
            window.navigator.vibrate([50, 50, 50]);
          }
          setTimeout(() => {
            buttons.forEach(b => {
              b.element.style.backgroundColor = '#4CAF50';
            });
          }, 200);
          break;
          
        case 'error':
          buttons.forEach(b => {
            b.element.style.backgroundColor = '#f44336';
          });
          if (this.isIOS && window.navigator.vibrate) {
            window.navigator.vibrate([100, 50, 100]);
          }
          setTimeout(() => {
            buttons.forEach(b => {
              b.element.style.backgroundColor = 'white';
              b.element.style.color = 'black';
            });
          }, 1000);
          break;
          
        case 'stopped':
          buttons.forEach(b => {
            b.element.style.backgroundColor = 'white';
            b.element.style.color = 'black';
          });
          break;
      }
    }
  
    injectButtonStyles() {
      const style = document.createElement("style");
      style.textContent = `
        .PABox .PABoxButton {
          width: 100%;
          background-color: white;
          font-size: ${this.isIOS ? '12px' : '10px'};
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: black;
          border: none;
          padding: ${this.isIOS ? '12px' : '8px'};
          margin-top: 10px;
          border-radius: 12px;
          font-weight: 600;
          transition: all 0.3s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          cursor: pointer;
          min-height: ${this.isIOS ? '44px' : '32px'};
        }
        
        .PABox .PABoxButton:active {
          transform: scale(0.95);
        }
        
        .PABox .PABoxButton:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `;
      document.head.appendChild(style);
    }
  
    createVoiceControlBox(containerId, buttonId) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn(`Container ${containerId} not found`);
        return null;
      }
    
      const paBox = document.createElement('div');
      paBox.className = 'PABox';
      
      const voiceBtn = document.createElement('button');
      voiceBtn.id = buttonId;
      voiceBtn.className = 'PABoxButton';
      voiceBtn.textContent = this.originalButtonText;
      
      // iOS-specific attributes for better touch handling
      if (this.isIOS) {
        voiceBtn.setAttribute('role', 'button');
        voiceBtn.setAttribute('aria-label', 'Voice Control');
      }
      
      paBox.appendChild(voiceBtn);
      container.appendChild(paBox);
      
      return voiceBtn;
    }
  
    async checkMicrophonePermission() {
      if (this.permissionChecked) {
        return this.permissionGranted;
      }
  
      try {
        // iOS doesn't support permissions API well, so we skip it
        if (this.isIOS) {
          console.log('iOS detected - will request permission when needed');
          this.permissionChecked = true;
          return false;
        }
  
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        
        if (permissionStatus.state === 'granted') {
          this.permissionGranted = true;
          console.log('Microphone permission already granted');
        } else {
          this.permissionGranted = false;
          console.log('Microphone permission not yet granted');
        }
  
        permissionStatus.onchange = () => {
          this.permissionGranted = permissionStatus.state === 'granted';
          console.log('Microphone permission changed:', permissionStatus.state);
          
          if (!this.permissionGranted && this.isListening) {
            this.stopListening();
          }
        };
  
        this.permissionChecked = true;
        return this.permissionGranted;
        
      } catch (error) {
        console.log('Permissions API not supported, will request permission when needed');
        this.permissionChecked = true;
        return false;
      }
    }
  
    async requestMicrophonePermission() {
      try {
        // On iOS, getUserMedia must be called from a user gesture
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        this.permissionGranted = true;
        console.log('Microphone permission granted');
        
        // On iOS, we can close the stream immediately as speech recognition will request it again
        if (this.isIOS) {
          this.closeMicrophoneStream();
        }
        
        return true;
      } catch (error) {
        this.permissionGranted = false;
        console.error('Microphone permission denied:', error);
        
        const message = this.isIOS 
          ? 'Microphone access required. Please enable in Settings > Safari > Microphone'
          : 'Microphone access required. Please allow access and try again.';
        
        alert(message);
        return false;
      }
    }
  
    setupButtons() {
      const homeWrapper = document.getElementById('wrapper');
      const disguiseWrapper = document.getElementById('wrapper2');
      
      if (homeWrapper) {
        const homeVoiceBtn = this.createVoiceControlBox('wrapper', 'voiceBtn');
        if (homeVoiceBtn) {
          this.buttons.voiceBtn = {
            element: homeVoiceBtn,
            playerId: 'home',
            originalText: this.originalButtonText
          };
          
          // Use touchend for better iOS responsiveness
          const eventType = this.isIOS ? 'touchend' : 'click';
          
          homeVoiceBtn.addEventListener(eventType, (e) => {
            if (this.isIOS) e.preventDefault(); // Prevent double-firing on iOS
            
            if (this.isListening) {
              this.stopListening();
            } else {
              this.startListening();
            }
          }, { passive: false });
          
          console.log('Home voice control button created');
        }
      }
      
      if (disguiseWrapper) {
        const disguiseVoiceBtn = this.createVoiceControlBox('wrapper2', 'voiceBtn2');
        if (disguiseVoiceBtn) {
          this.buttons.voiceBtn2 = {
            element: disguiseVoiceBtn,
            playerId: 'disguise',
            originalText: this.originalButtonText
          };
          
          const eventType = this.isIOS ? 'touchend' : 'click';
          
          disguiseVoiceBtn.addEventListener(eventType, (e) => {
            if (this.isIOS) e.preventDefault();
            
            if (this.isListening) {
              this.stopListening();
            } else {
              this.startListening();
            }
          }, { passive: false });
          
          console.log('Disguise voice control button created');
        }
      }
      
      const buttonCount = Object.keys(this.buttons).length;
      if (buttonCount === 0) {
        console.warn('No voice control containers found');
      } else {
        console.log(`Created ${buttonCount} voice control button(s)`);
      }
    }
  
    getCurrentRepeatMode() {
      const activePlayer = this.getActivePlayer();
      if (!activePlayer || !activePlayer.repeatBtn) {
        return 'normal';
      }
  
      const repeatBtnText = activePlayer.repeatBtn.textContent;
      switch (repeatBtnText) {
        case 'repeat':
          return 'normal';
        case 'repeat_one':
          return 'repeat';
        case 'shuffle':
          return 'shuffle';
        default:
          return 'normal';
      }
    }
  
    handleShuffleCommand() {
      const currentMode = this.getCurrentRepeatMode();
      console.log(`Current mode: ${currentMode}, switching to shuffle`);
  
      switch (currentMode) {
        case 'normal':
          this.executePlayerCommand('handleRepeat');
          setTimeout(() => this.executePlayerCommand('handleRepeat'), 150);
          break;
        case 'repeat':
          this.executePlayerCommand('handleRepeat');
          break;
        case 'shuffle':
          console.log('Already in shuffle mode');
          break;
      }
    }
  
    handleRepeatCommand() {
      const currentMode = this.getCurrentRepeatMode();
      console.log(`Current mode: ${currentMode}, switching to repeat`);
  
      switch (currentMode) {
        case 'normal':
          this.executePlayerCommand('handleRepeat');
          break;
        case 'shuffle':
          this.executePlayerCommand('handleRepeat');
          setTimeout(() => this.executePlayerCommand('handleRepeat'), 150);
          break;
        case 'repeat':
          console.log('Already in repeat mode');
          break;
      }
    }
  
    handleNormalCommand() {
      const currentMode = this.getCurrentRepeatMode();
      console.log(`Current mode: ${currentMode}, switching to normal`);
  
      switch (currentMode) {
        case 'shuffle':
          this.executePlayerCommand('handleRepeat');
          break;
        case 'repeat':
          this.executePlayerCommand('handleRepeat');
          setTimeout(() => this.executePlayerCommand('handleRepeat'), 150);
          break;
        case 'normal':
          console.log('Already in normal mode');
          break;
      }
    }
  
    async startListening() {
      if (!this.recognition) {
        console.warn('Speech recognition not available');
        return;
      }
  
      // Request permission if needed
      if (!this.permissionGranted) {
        const granted = await this.requestMicrophonePermission();
        if (!granted) {
          return;
        }
      }
  
      try {
        this.isListening = true;
        this.recognitionRestartAttempts = 0;
        
        // Clear any pending restart timeout
        if (this.restartTimeout) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = null;
        }
        
        this.recognition.start();
        console.log('Voice control started');
        
        // On iOS, show a helpful message
        if (this.isIOS) {
          console.log('iOS detected: Voice control will listen for one command at a time');
        }
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        this.isListening = false;
        
        if (error.name === 'NotAllowedError') {
          this.permissionGranted = false;
          const message = this.isIOS
            ? 'Please enable microphone access in Settings > Safari > Microphone'
            : 'Microphone access denied. Please allow access in your browser settings.';
          alert(message);
        }
      }
    }
  
    stopListening() {
      this.isListening = false;
      
      // Clear restart timeout
      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = null;
      }
      
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (e) {
          console.log('Recognition already stopped');
        }
      }
      
      this.closeMicrophoneStream();
      this.updateButtonState(false);
      this.provideFeedback('stopped');
      console.log('Voice control stopped');
    }
  
    closeMicrophoneStream() {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => {
          track.stop();
          console.log('Microphone track stopped');
        });
        this.mediaStream = null;
      }
    }
  
    updateButtonState(listening) {
      Object.values(this.buttons).forEach(buttonInfo => {
        const button = buttonInfo.element;
        button.textContent = listening ? this.activeButtonText : buttonInfo.originalText;
        
        if (!listening) {
          button.style.backgroundColor = 'white';
          button.style.color = 'black';
        }
      });
    }
  
    processCommand(transcript) {
      const cleanTranscript = transcript
        .replace(/\b(please|could you|can you|hey|ok|okay)\b/gi, '')
        .trim();
      
      // Check for song index commands
      const indexMatch = cleanTranscript.match(/(?:go to|play|song)\s*(?:song\s*)?(?:number\s*)?(\d+)/i);
      if (indexMatch) {
        const songIndex = parseInt(indexMatch[1], 10);
        this.goToSongIndex(songIndex);
        return;
      }
  
      // Check for song name commands
      const songNameMatch = cleanTranscript.match(/(?:play|go to)\s+(.+)/i);
      if (songNameMatch) {
        const songName = songNameMatch[1].trim();
        if (!this.isSimpleCommand(songName)) {
          this.goToSongByName(songName);
          return;
        }
      }
      
      // Check exact matches
      if (this.commands[cleanTranscript]) {
        this.commands[cleanTranscript]();
        return;
      }
  
      // Check partial matches
      for (const command in this.commands) {
        if (cleanTranscript.includes(command)) {
          console.log(`Executing command: ${command}`);
          this.commands[command]();
          return;
        }
      }
  
      this.checkVariations(cleanTranscript);
    }
  
    isSimpleCommand(text) {
      const simpleCommands = [
        'next', 'previous', 'pause', 'stop', 'play', 'back', 'skip',
        'dark mode', 'light mode', 'open list', 'close list', 'shuffle', 
        'repeat', 'normal', 'logout', 'list', 'music'
      ];
      
      return simpleCommands.some(cmd => text.toLowerCase().includes(cmd));
    }
  
    goToSongIndex(index) {
      try {
        const activePlayer = this.getActivePlayer();
        if (!activePlayer || !activePlayer.musicSource) {
          console.warn('No active player found');
          return;
        }
  
        const totalSongs = activePlayer.musicSource.length;
        
        if (index < 1 || index > totalSongs) {
          console.log(`Song index ${index} is out of range. Available: 1-${totalSongs}`);
          return;
        }
  
        activePlayer.musicIndex = index;
        activePlayer.loadMusic(index);
        activePlayer.playMusic();
        activePlayer.resetVideoSize();
        
        console.log(`Navigated to song ${index}`);
      } catch (error) {
        console.error('Error navigating to song index:', error);
      }
    }
  
    goToSongByName(searchTerm) {
      try {
        const activePlayer = this.getActivePlayer();
        if (!activePlayer || !activePlayer.musicSource) {
          console.warn('No active player found');
          return;
        }
  
        const searchTermLower = searchTerm.toLowerCase();
        let foundIndex = -1;
        let foundSong = null;
  
        // Try exact match
        activePlayer.musicSource.forEach((song, index) => {
          if (song && song.name && song.name.toLowerCase() === searchTermLower) {
            foundIndex = index + 1;
            foundSong = song;
          }
        });
  
        // Try partial name match
        if (foundIndex === -1) {
          activePlayer.musicSource.forEach((song, index) => {
            if (song && song.name && song.name.toLowerCase().includes(searchTermLower)) {
              foundIndex = index + 1;
              foundSong = song;
            }
          });
        }
  
        // Try artist match
        if (foundIndex === -1) {
          activePlayer.musicSource.forEach((song, index) => {
            if (song && song.artist && song.artist.toLowerCase().includes(searchTermLower)) {
              foundIndex = index + 1;
              foundSong = song;
            }
          });
        }
  
        if (foundIndex !== -1 && foundSong) {
          activePlayer.musicIndex = foundIndex;
          activePlayer.loadMusic(foundIndex);
          activePlayer.playMusic();
          activePlayer.resetVideoSize();
          
          console.log(`Playing: "${foundSong.name}" (Song #${foundIndex})`);
        } else {
          console.log(`Song "${searchTerm}" not found`);
        }
      } catch (error) {
        console.error('Error searching for song:', error);
      }
    }
  
    checkVariations(transcript) {
      if (transcript.includes('turn on dark') || transcript.includes('enable dark')) {
        this.executePlayerCommand('toggleDarkMode');
      } else if (transcript.includes('turn off dark') || transcript.includes('disable dark') || 
                 transcript.includes('turn on light') || transcript.includes('enable light')) {
        this.executePlayerCommand('toggleDarkMode');
      } else if (transcript.includes('start playing') || transcript.includes('resume')) {
        this.executePlayerCommand('playMusic');
      } else if (transcript.includes('stop playing') || transcript.includes('halt')) {
        this.executePlayerCommand('pauseMusic');
      } else if (transcript.includes('next song') || transcript.includes('forward')) {
        this.executePlayerCommand('changeMusic', [1]);
      } else if (transcript.includes('previous song') || transcript.includes('go back')) {
        this.executePlayerCommand('changeMusic', [-1]);
      } else if (transcript.includes('show music') || transcript.includes('display list')) {
        this.executePlayerCommand('toggleMusicList');
      } else if (transcript.includes('shuffle mode') || transcript.includes('enable shuffle')) {
        this.handleShuffleCommand();
      } else if (transcript.includes('repeat mode') || transcript.includes('enable repeat')) {
        this.handleRepeatCommand();
      } else if (transcript.includes('normal mode') || transcript.includes('disable shuffle') || 
                 transcript.includes('disable repeat')) {
        this.handleNormalCommand();
      } else {
        console.log('Command not recognized:', transcript);
      }
    }
  
    executePlayerCommand(methodName, args = []) {
      try {
        const activePlayer = this.getActivePlayer();
  
        if (activePlayer && typeof activePlayer[methodName] === 'function') {
          activePlayer[methodName](...args);
          console.log(`Executed ${methodName}`);
        } else {
          console.warn(`Method ${methodName} not found`);
        }
      } catch (error) {
        console.error(`Error executing ${methodName}:`, error);
      }
    }
  
    getActivePlayer() {
      const homePage = document.getElementById('HomePage');
      const disguisePage = document.getElementById('DisguisePage');
      
      if (homePage && homePage.style.display !== 'none') {
        return window.homePlayer;
      } else if (disguisePage && disguisePage.style.display !== 'none') {
        return window.disguisePlayer;
      } else {
        return window.homePlayer;
      }
    }
  
    handleLogout() {
      this.stopListening();
      
      if (typeof window.handleLogout === 'function') {
        window.handleLogout(true, 'Voice command logout');
      } else {
        console.warn('Logout function not available');
      }
    }
  
    disableVoiceControl(message = "VOICE CONTROL NOT SUPPORTED") {
      Object.values(this.buttons).forEach(buttonInfo => {
        const button = buttonInfo.element;
        button.textContent = message;
        button.disabled = true;
        button.style.opacity = '0.5';
      });
    }
  
    destroy() {
      this.stopListening();
      this.closeMicrophoneStream();
      
      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = null;
      }
      
      Object.values(this.buttons).forEach(buttonInfo => {
        const button = buttonInfo.element;
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
      });
      
      this.buttons = {};
      this.recognition = null;
    }
  
    isActive() {
      return this.isListening;
    }
  
    hasPermission() {
      return this.permissionGranted;
    }
  }
  
  // Initialize voice control
  function initializeVoiceControlSystem() {
    if (!window.voiceControl) {
      console.log('Creating VoiceControlSystem instance...');
      window.voiceControl = new VoiceControlSystem();
    }
  }
  
  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(initializeVoiceControlSystem, 1000);
    });
  } else {
    setTimeout(initializeVoiceControlSystem, 100);
  }
  
  window.initializeVoiceControlSystem = initializeVoiceControlSystem;
  
  // Cleanup on logout
  document.addEventListener('DOMContentLoaded', function() {
    const originalHandleLogout = window.handleLogout;
    if (originalHandleLogout) {
      window.handleLogout = function(...args) {
        if (window.voiceControl) {
          if (window.voiceControl.isActive()) {
            window.voiceControl.stopListening();
          }
          window.voiceControl.closeMicrophoneStream();
        }
        return originalHandleLogout.apply(this, args);
      };
    }
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    if (window.voiceControl) {
      window.voiceControl.stopListening();
      window.voiceControl.closeMicrophoneStream();
    }
  });
  
  // Handle visibility changes
  document.addEventListener('visibilitychange', function() {
    if (window.voiceControl && window.voiceControl.isActive()) {
      if (document.hidden) {
        window.voiceControl.stopListening();
        console.log('Voice control paused - tab hidden');
      }
    }
  });
  
  // iOS-specific: Handle page freeze/resume
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    window.addEventListener('pagehide', function() {
      if (window.voiceControl) {
        window.voiceControl.stopListening();
        window.voiceControl.closeMicrophoneStream();
      }
    });
  }