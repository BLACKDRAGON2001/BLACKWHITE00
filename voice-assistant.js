class ZeddAIIntegration {
    constructor(apiBaseUrl = 'http://localhost:8787') {
      this.apiBaseUrl = apiBaseUrl;
      this.isActive = false;
      this.isListening = false;
      this.isProcessing = false;
      this.mediaRecorder = null;
      this.audioChunks = [];
      this.stream = null;
      this.userId = this.getUserId();
      this.silenceTimeout = null;
      this.silenceDelay = 3000; // 3 seconds of silence
      
      // Reference to existing music players
      this.musicPlayer = null;
      this.currentPage = null;
      
      // Commands that should NOT trigger voice response (silent actions)
      this.silentCommands = [
        'play', 'pause', 'stop', 'next', 'previous', 'skip',
        'shuffle', 'repeat', 'dark mode', 'volume', 'mute'
      ];
      
      // Keywords that indicate user wants conversation/information
      this.conversationalKeywords = [
        'what', 'how', 'why', 'when', 'where', 'who', 'tell me',
        'explain', 'help', 'can you', 'do you', 'are you',
        'weather', 'time', 'date', 'remind', 'schedule'
      ];
      
      this.init();
    }
  
    async init() {
      this.detectCurrentPlayer();
      await this.setupAudio();
      this.bindEvents();
      console.log('Zedd AI Integration initialized');
    }
  
    detectCurrentPlayer() {
      // Detect which page is currently active and get the music player
      const homePage = document.getElementById('HomePage');
      const disguisePage = document.getElementById('DisguisePage');
      
      if (homePage && homePage.style.display !== 'none') {
        this.musicPlayer = window.homePlayer;
        this.currentPage = 'home';
      } else if (disguisePage && disguisePage.style.display !== 'none') {
        this.musicPlayer = window.disguisePlayer;
        this.currentPage = 'disguise';
      }
    }
  
    async setupAudio() {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        // Create audio context for volume detection
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.source = this.audioContext.createMediaStreamSource(this.stream);
        this.source.connect(this.analyser);
        
        this.analyser.fftSize = 256;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        
        this.mediaRecorder = new MediaRecorder(this.stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
  
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };
  
        this.mediaRecorder.onstop = () => {
          this.processAudio();
        };
  
      } catch (error) {
        console.error('Error accessing microphone:', error);
        this.showFeedback('Microphone access denied. Please enable microphone permissions.');
      }
    }
  
    // NEW: Get current audio level for detecting actual speech
    getAudioLevel() {
      if (!this.analyser) return 0;
      
      this.analyser.getByteFrequencyData(this.dataArray);
      
      let sum = 0;
      for (let i = 0; i < this.bufferLength; i++) {
        sum += this.dataArray[i];
      }
      
      return sum / this.bufferLength;
    }
  
    // NEW: Check if there's actual speech vs just background noise
    detectSpeech() {
      const level = this.getAudioLevel();
      return level > 30; // Adjust threshold as needed
    }
  
    bindEvents() {
      // Find and bind to the Personal Assistant button
      const paButton = document.querySelector('.PABoxButton');
      if (paButton) {
        paButton.addEventListener('click', () => this.toggleAssistant());
        // Update button text to show it's Zedd AI
        paButton.textContent = this.isActive ? 'ZEDD AI (ON)' : 'ZEDD AI (OFF)';
      }
      
      // Listen for page changes to update music player reference
      const observer = new MutationObserver(() => {
        this.detectCurrentPlayer();
      });
      
      observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ['style']
      });
    }
  
    toggleAssistant() {
      if (this.isProcessing) return;
      
      this.isActive = !this.isActive;
      
      if (this.isActive) {
        this.startListening();
      } else {
        this.stopListening();
      }
      
      this.updateUI();
    }
  
    startListening() {
      if (!this.isListening && this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
        this.audioChunks = [];
        this.mediaRecorder.start();
        this.isListening = true;
        this.showFeedback('🎤 Listening... Speak now!');
        
        // Enhanced silence detection with speech level monitoring
        let speechDetected = false;
        let silenceCount = 0;
        
        const checkSpeech = () => {
          if (!this.isListening) return;
          
          const hasSpeech = this.detectSpeech();
          
          if (hasSpeech) {
            speechDetected = true;
            silenceCount = 0;
          } else if (speechDetected) {
            silenceCount++;
            
            // Stop after 1.5 seconds of silence after speech was detected
            if (silenceCount >= 15) { // 15 * 100ms = 1.5 seconds
              this.stopListening();
              return;
            }
          }
          
          // Continue monitoring
          setTimeout(checkSpeech, 100);
        };
        
        // Start speech monitoring
        checkSpeech();
        
        // Fallback timeout - stop after 10 seconds regardless
        this.silenceTimeout = setTimeout(() => {
          if (this.isListening) {
            if (!speechDetected) {
              this.showFeedback('No speech detected. Try again.', 2000);
            }
            this.stopListening();
          }
        }, 10000);
      }
    }
  
    stopListening() {
      if (this.isListening && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
        this.isListening = false;
        clearTimeout(this.silenceTimeout);
        this.showFeedback('🔄 Processing...');
      }
    }
  
    async processAudio() {
      this.isProcessing = true;
      this.updateUI();
      
      try {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Check if audio is too short or too quiet (likely just noise)
        if (audioBlob.size < 1000) { // Less than 1KB is probably just noise
          this.showFeedback('Audio too short. Try speaking louder.', 2000);
          this.continueListeningAfterDelay();
          return;
        }
        
        const formData = new FormData();
        formData.append('audio', audioBlob);
  
        // Convert speech to text
        const sttResponse = await fetch(`${this.apiBaseUrl}/api/stt`, {
          method: 'POST',
          body: formData
        });
  
        if (!sttResponse.ok) {
          throw new Error('Speech recognition failed');
        }
  
        const { text, confidence } = await sttResponse.json();
        
        // Validate the transcription
        if (this.isValidTranscription(text, confidence)) {
          this.showFeedback(`You said: "${text}"`);
          await this.processCommand(text, confidence);
        } else {
          this.showFeedback('Could not understand. Try speaking clearer.', 2000);
          this.continueListeningAfterDelay();
        }
      } catch (error) {
        console.error('Speech processing error:', error);
        this.showFeedback('Speech processing failed. Please try again.');
        this.continueListeningAfterDelay();
      } finally {
        this.isProcessing = false;
        this.updateUI();
      }
    }
  
    // NEW: Validate transcription quality
    isValidTranscription(text, confidence = 1.0) {
      if (!text || text.trim().length === 0) {
        return false;
      }
      
      const cleanText = text.trim().toLowerCase();
      
      // Reject very short nonsensical results
      if (cleanText.length < 2) {
        return false;
      }
      
      // Common misheard words/sounds that should be ignored
      const commonMisheards = [
        'uh', 'um', 'hmm', 'ah', 'oh', 'eh', 'huh',
        'you', 'the', 'a', 'an', 'and', 'but', 'or',
        'noise', 'sound', 'music', 'background',
        'sometimes', 'something', 'nothing', 'anything'
      ];
      
      // If the entire transcription is just common misheard words, reject it
      const words = cleanText.split(/\s+/);
      if (words.length <= 2 && words.every(word => commonMisheards.includes(word))) {
        console.log('Rejected common mishearing:', cleanText);
        return false;
      }
      
      // Reject if it seems like random noise (lots of repeated characters)
      const hasRepeatedChars = /(.)\1{3,}/.test(cleanText);
      if (hasRepeatedChars) {
        console.log('Rejected repeated characters:', cleanText);
        return false;
      }
      
      // Check if it contains actual command words or question words
      const commandWords = [
        'play', 'pause', 'stop', 'next', 'previous', 'skip',
        'shuffle', 'repeat', 'dark', 'light', 'mode',
        'what', 'how', 'why', 'when', 'where', 'who',
        'tell', 'explain', 'help', 'can', 'do', 'are',
        'volume', 'loud', 'quiet', 'song', 'track', 'music'
      ];
      
      const hasCommandWord = commandWords.some(word => cleanText.includes(word));
      
      // If no command words and it's short, probably mishearing
      if (!hasCommandWord && words.length < 3) {
        console.log('Rejected - no command words and too short:', cleanText);
        return false;
      }
      
      // Use confidence score if available (some STT services provide this)
      if (confidence && confidence < 0.5) {
        console.log('Rejected low confidence:', cleanText, confidence);
        return false;
      }
      
      return true;
    }
  
    continueListeningAfterDelay() {
      if (this.isActive) {
        // Continue listening after a brief pause
        setTimeout(() => {
          if (this.isActive) this.startListening();
        }, 1000);
      }
    }
  
    // Check if music is currently playing
    isMusicPlaying() {
      if (!this.musicPlayer) return false;
      
      try {
        // Check if the music player has an audio element and if it's playing
        const audioElement = this.musicPlayer.audio || this.musicPlayer.currentAudio;
        if (audioElement && !audioElement.paused && audioElement.currentTime > 0) {
          return true;
        }
        
        // Alternative check - look for play/pause button state
        const playBtn = document.querySelector('.play-pause-btn, .playBtn');
        if (playBtn) {
          return playBtn.textContent.includes('pause') || 
                 playBtn.classList.contains('playing') ||
                 playBtn.innerHTML.includes('pause');
        }
        
        // Check if any audio elements are playing
        const allAudioElements = document.querySelectorAll('audio');
        for (let audio of allAudioElements) {
          if (!audio.paused && audio.currentTime > 0) {
            return true;
          }
        }
        
        return false;
      } catch (error) {
        console.warn('Error checking music playback status:', error);
        return false;
      }
    }
  
    // Check current volume level
    getCurrentVolume() {
      if (!this.musicPlayer) return 1;
      
      try {
        const audioElement = this.musicPlayer.audio || this.musicPlayer.currentAudio;
        return audioElement ? audioElement.volume : 1;
      } catch (error) {
        return 1;
      }
    }
  
    // Temporarily lower music volume for voice response
    async ducAudio(callback) {
      const originalVolume = this.getCurrentVolume();
      const musicWasPlaying = this.isMusicPlaying();
      
      if (musicWasPlaying && this.musicPlayer) {
        try {
          // Lower volume to 20% for voice response
          const audioElement = this.musicPlayer.audio || this.musicPlayer.currentAudio;
          if (audioElement) {
            audioElement.volume = originalVolume * 0.2;
          }
        } catch (error) {
          console.warn('Could not duck audio:', error);
        }
      }
      
      // Execute the callback (usually speaking)
      await callback();
      
      // Restore original volume after a brief delay
      if (musicWasPlaying && this.musicPlayer) {
        setTimeout(() => {
          try {
            const audioElement = this.musicPlayer.audio || this.musicPlayer.currentAudio;
            if (audioElement) {
              audioElement.volume = originalVolume;
            }
          } catch (error) {
            console.warn('Could not restore audio volume:', error);
          }
        }, 500);
      }
    }
  
    // NEW: Analyze if command needs voice response
    shouldProvideVoiceResponse(text, aiResponse, action) {
      const lowerText = text.toLowerCase();
      const musicIsPlaying = this.isMusicPlaying();
      
      // Never interrupt music for simple commands
      if (musicIsPlaying) {
        const isSilentCommand = this.silentCommands.some(command => 
          lowerText.includes(command)
        );
        
        // If music is playing and it's a simple command, always be silent
        if (isSilentCommand || action) {
          return false;
        }
        
        // For questions while music is playing, only respond to urgent/important ones
        const urgentKeywords = [
          'help', 'emergency', 'stop', 'error', 'problem', 'wrong',
          'what song', 'who is', 'what artist', 'song title', 'track name'
        ];
        
        const isUrgent = urgentKeywords.some(keyword => lowerText.includes(keyword));
        if (!isUrgent) {
          return false; // Don't interrupt music for non-urgent questions
        }
      }
      
      // When music is NOT playing, use normal logic
      const isConversational = this.conversationalKeywords.some(keyword => 
        lowerText.includes(keyword)
      );
      
      if (isConversational) {
        return true;
      }
      
      // Don't respond with voice for simple music commands
      const isSilentCommand = this.silentCommands.some(command => 
        lowerText.includes(command)
      );
      
      if (isSilentCommand && action) {
        return false; // Just execute the action silently
      }
      
      // Don't respond with voice for short confirmations unless requested
      if (aiResponse && aiResponse.length < 20 && action) {
        return false;
      }
      
      // If user says "thanks" or similar, brief voice response is ok
      const gratitudeWords = ['thanks', 'thank you', 'good', 'perfect', 'great'];
      if (gratitudeWords.some(word => lowerText.includes(word))) {
        return false; // Just show visual feedback
      }
      
      // Default to voice response for everything else (when music isn't playing)
      return !musicIsPlaying;
    }
  
    async processCommand(text, confidence = 1.0) {
      try {
        const musicPlaying = this.isMusicPlaying();
        
        const response = await fetch(`${this.apiBaseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            userId: this.userId,
            musicPlaying: musicPlaying,
            confidence: confidence
          })
        });
  
        if (!response.ok) {
          throw new Error('Chat API failed');
        }
  
        const { response: aiResponse, action, shouldSpeak: backendShouldSpeak } = await response.json();
        
        // Check if AI is asking for clarification
        if (aiResponse.includes("didn't catch that") || aiResponse.includes("Could you repeat")) {
          this.showFeedback('🤔 ' + aiResponse, 3000);
          this.continueListeningAfterDelay();
          return;
        }
        
        // Execute any system actions
        if (action) {
          this.executeAction(action);
        }
  
        // Use backend recommendation, but apply local logic as backup
        const localShouldSpeak = this.shouldProvideVoiceResponse(text, aiResponse, action);
        const shouldSpeak = backendShouldSpeak !== undefined ? backendShouldSpeak : localShouldSpeak;
        
        if (shouldSpeak) {
          // If music is playing, duck the audio while speaking
          if (this.isMusicPlaying()) {
            await this.ducAudio(async () => {
              await this.speak(aiResponse);
            });
          } else {
            await this.speak(aiResponse);
          }
        } else {
          // Show silent feedback instead
          this.showFeedback(`✓ ${action ? 'Action completed' : aiResponse}`, 2000);
        }
        
        this.continueListeningAfterDelay();
        
      } catch (error) {
        console.error('Command processing error:', error);
        // Always speak error messages, but duck audio if music is playing
        if (this.isMusicPlaying()) {
          await this.ducAudio(async () => {
            this.speak("Sorry, I encountered an error. Please try again.");
          });
        } else {
          this.speak("Sorry, I encountered an error. Please try again.");
        }
        this.continueListeningAfterDelay();
      }
    }
  
    async speak(text) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
  
        if (!response.ok) {
          throw new Error('Text-to-speech failed');
        }
  
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        this.showFeedback(`Zedd AI: "${text}"`);
        
        return new Promise((resolve) => {
          audio.addEventListener('ended', () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          });
          
          audio.addEventListener('error', () => {
            console.error('Audio playback failed');
            resolve();
          });
          
          audio.play();
        });
        
      } catch (error) {
        console.error('Text-to-speech error:', error);
        this.showFeedback(`Zedd AI: ${text}`); // Fallback to text display
      }
    }
  
    executeAction(action) {
      if (!this.musicPlayer) {
        console.warn('No music player available for action:', action);
        return;
      }
  
      const actions = {
        'playMusic': () => {
          console.log('🎵 Playing music');
          this.musicPlayer.playMusic();
        },
        'pauseMusic': () => {
          console.log('⏸️ Pausing music');
          this.musicPlayer.pauseMusic();
        },
        'nextSong': () => {
          console.log('⏭️ Next song');
          this.musicPlayer.changeMusic(1);
        },
        'previousSong': () => {
          console.log('⏮️ Previous song');
          this.musicPlayer.changeMusic(-1);
        },
        'toggleShuffle': () => {
          console.log('🔀 Toggle shuffle');
          // Simulate shuffle button click
          const shuffleBtn = this.musicPlayer.repeatBtn;
          if (shuffleBtn && shuffleBtn.textContent === 'repeat') {
            // Click twice to get to shuffle mode
            shuffleBtn.click();
            shuffleBtn.click();
          }
        },
        'toggleRepeat': () => {
          console.log('🔁 Toggle repeat');
          this.musicPlayer.repeatBtn?.click();
        },
        'toggleDarkMode': () => {
          console.log('🌙 Toggle dark mode');
          this.musicPlayer.toggleDarkMode();
        }
      };
  
      const actionFn = actions[action];
      if (actionFn) {
        actionFn();
      } else {
        console.warn('Unknown action:', action);
      }
    }
  
    updateUI() {
      const paButton = document.querySelector('.PABoxButton');
      if (!paButton) return;
      
      if (this.isProcessing) {
        paButton.textContent = 'PROCESSING...';
        paButton.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
      } else if (this.isListening) {
        paButton.textContent = 'LISTENING...';
        paButton.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
      } else if (this.isActive) {
        paButton.textContent = 'ZEDD AI (ON)';
        paButton.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      } else {
        paButton.textContent = 'ZEDD AI (OFF)';
        paButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      }
    }
  
    // Enhanced feedback with custom duration
    showFeedback(message, duration = 3000) {
      // Create or update feedback display
      let feedback = document.getElementById('zedd-feedback');
      if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'zedd-feedback';
        feedback.style.cssText = `
          position: fixed;
          bottom: 120px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 10px 20px;
          border-radius: 25px;
          font-size: 14px;
          z-index: 10000;
          max-width: 80%;
          text-align: center;
          display: none;
        `;
        document.body.appendChild(feedback);
      }
      
      feedback.textContent = message;
      feedback.style.display = 'block';
      
      // Auto-hide after specified duration
      setTimeout(() => {
        feedback.style.display = 'none';
      }, duration);
    }
  
    getUserId() {
      let userId = localStorage.getItem('zedd_user_id');
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('zedd_user_id', userId);
      }
      return userId;
    }
  }
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for the music players to initialize
    setTimeout(() => {
      window.zeddAI = new ZeddAIIntegration();
    }, 1000);
  });