document.addEventListener('DOMContentLoaded', function() {
    const loader = document.getElementById('loader');
      // Check camera status every 500ms
     function checkCameraStatus() {
          fetch('/check_camera_status')
              .then(response => response.json())
              .then(data => {
                  if (data.initializing) {
                      loader.style.display = 'block';
                  } else {
                      loader.style.display = 'none';
                  }
                  if (data.initialized) {
                      alert("Camera is initialized");
                      // Handle initialized state
                  } else {
                      alert("Camera is not initialized");
                      // Handle not initialized state
                  }
              });
      }
      setInterval(checkCameraStatus, 500); 


    // Function to disable the translate button by default
    function disableTranslateButton() {
        const readContentButton = document.getElementById('read-content');
        readContentButton.disabled = true;
        readContentButton.style.color = "#768aa6";
        readContentButton.style.backgroundColor = "#3A4D68";
    }

    // Function to add event listeners to buttons
    function addButtonEventListeners() {
        document.getElementById('video-btn').addEventListener('click', function() {
            setActiveContent('video-btn', 'video-content');

            // Start Camera button functionality
            fetch('/start_camera')
                .then(response => response.json())
                .then(data => {
                    loader.style.display = 'none';
                });
        });

        document.getElementById('record-btn').addEventListener('click', function() {
            setActiveContent('record-btn', 'record-content');

            // Release Camera button functionality
            fetch('/release_camera')
                .then(response => response.json())
                .then(data => {
                    loader.style.display = 'none';
                });
        });

        document.getElementById('text-btn').addEventListener('click', function() {
            setActiveContent('text-btn', 'text-content');

            // Release Camera button functionality
            fetch('/release_camera')
                .then(response => response.json())
                .then(data => {
                    loader.style.display = 'none';
                });
        });
    }

    // Function to handle active content switching
    function setActiveContent(buttonId, contentId) {
        document.querySelectorAll('.sidebar button').forEach(function(btn) {
            btn.classList.remove('active');
        });
        document.getElementById(buttonId).classList.add('active');

        document.querySelectorAll('.main-content').forEach(function(content) {
            content.classList.remove('active');
        });
        document.getElementById(contentId).classList.add('active');
    }

    // Function to handle textarea changes
    function handleTextareaChange(event) {
        const content = event.target.value;
        const readContentButton = document.getElementById('read-content');
        if (content) {
            readContentButton.disabled = false;
            readContentButton.style.backgroundColor = "#535FD7";
            readContentButton.style.color = "#fff";
        } else {
            readContentButton.disabled = true;
            readContentButton.style.color = "#768aa6";
            readContentButton.style.backgroundColor = "#3A4D68";
        }
    }

    // Function to initialize speech synthesis
    function initializeSpeechSynthesis() {
        const readContentButton = document.getElementById('read-content');
        readContentButton.addEventListener('click', () => {
            const content = document.getElementById('chat-input').value;
            const utterance = new SpeechSynthesisUtterance(content);
            speechSynthesis.speak(utterance);

            const readCard = document.getElementById('read-card');
            readCard.classList.add('reading');
            readContentButton.disabled = true;
            readContentButton.style.color = "#768aa6";
            readContentButton.style.backgroundColor = "#3A4D68";

            utterance.onend = () => {
                readCard.classList.remove('reading');
                readContentButton.disabled = false;
                readContentButton.style.backgroundColor = "#535FD7";
                readContentButton.style.color = "#fff";
            };
        });
    }

    // Function to initialize speech recognition
    function initializeSpeechRecognition() {
        const recordButton = document.getElementById('record');
        const translationBox = document.getElementById('translation-box');
        const status = document.getElementById('status');

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            const textDiv = document.createElement('div');
            textDiv.classList.add('text');
            textDiv.textContent = transcript;
            translationBox.appendChild(textDiv);

            recordButton.classList.remove('reading');
            status.textContent = "Recording stopped. Press the button to start recording again.";
        };

        recognition.onend = function() {
            recordButton.classList.remove('reading');
            status.textContent = "Recording stopped. Press the button to start recording again.";
        };

        recognition.onerror = function(event) {
            console.error('Recognition error:', event.error);
            recordButton.classList.remove('reading');
            status.textContent = "Error occurred during recording. Press the button to try again.";
        };

        recordButton.addEventListener('click', function() {
            this.classList.add('reading');
            status.textContent = "Recording... Please start talking.";
            recognition.start();
        });
    }

    // Initialize all functions
    disableTranslateButton();
    addButtonEventListeners();
    document.getElementById('chat-input').addEventListener('input', handleTextareaChange);
    initializeSpeechSynthesis();
    initializeSpeechRecognition();
});
