document.addEventListener('DOMContentLoaded', function() {
    const loader = document.getElementById('loader');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const recordButton = document.getElementById('record');
    const translationBox = document.getElementById('translation-box');
    const status = document.getElementById('status');

    // Check camera status every 500ms
    function checkCameraStatus() {
        fetch('/check_camera_status')
            .then(response => response.json())
            .then(data => {
                if (data.initializing) {
                    loader.style.display = 'block';
                    startBtn.disabled = true;
                    stopBtn.disabled = true;
                } else {
                    loader.style.display = 'none';
                    stopBtn.disabled = false;
                    startBtn.disabled = false;
                }
            });
    }
    setInterval(checkCameraStatus, 500); 

    function disableTranslateButton() {
        const readContentButton = document.getElementById('read-content');
        readContentButton.disabled = true;
        readContentButton.style.color = "#768aa6";
        readContentButton.style.backgroundColor = "#3A4D68";
    }

    function addButtonEventListeners() {
        document.getElementById('video-btn').addEventListener('click', function() {
            setActiveContent('video-btn', 'video-content');
            document.getElementById('translation-box').innerHTML = '';
            document.getElementById('chat-input').value='';
            fetch('/start_camera')
                .then(response => response.json())
                .then(data => {
                    loader.style.display = 'none';
                });
            disableTranslateButton();
        });

        document.getElementById('record-btn').addEventListener('click', function() {
            setActiveContent('record-btn', 'record-content');
            document.getElementById('predicted-character').innerHTML = '';
            document.getElementById('chat-input').value='';
            if (cam_init_count != 0) {
                document.getElementById('stop-btn').click();
                fetch('/release_camera')
                .then(response => response.json())
                .then(data => {
                    loader.style.display = 'none';
                    cam_init_count = 0;
                });
            }
            disableTranslateButton();
        });

        document.getElementById('text-btn').addEventListener('click', function() {
            setActiveContent('text-btn', 'text-content');
            document.getElementById('predicted-character').innerHTML = '';
            document.getElementById('translation-box').innerHTML = '';
            if (cam_init_count != 0) {
                document.getElementById('stop-btn').click();
                fetch('/release_camera')
                .then(response => response.json())
                .then(data => {
                    loader.style.display = 'none';
                    cam_init_count = 0;
                });
            }
        });
    }

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

    function initializeSpeechRecognition() {
        const recordButton = document.getElementById('record');
        const status = document.getElementById('status');
        const translationBox = document.getElementById('translation-box');

        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;

        recordButton.addEventListener('click', () => {
            if (!isRecording) {
                const utterance = new SpeechSynthesisUtterance("Recording");
                speechSynthesis.speak(utterance);
                recordButton.classList.add('reading');
                startRecording();
            } else {
                recordButton.classList.remove('reading');
                stopRecording();
            }
        });

        function startRecording() {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder.start();
                    status.textContent = "Recording... Please start talking.";
                    isRecording = true;
                    audioChunks = [];
        
                    mediaRecorder.addEventListener('dataavailable', event => {
                        audioChunks.push(event.data);
                    });
        
                    mediaRecorder.addEventListener('stop', () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                        const formData = new FormData();
                        formData.append('audio', audioBlob, 'uploaded_audio.wav'); // Ensure the filename is consistent
        
                        fetch('/start_recording', {
                            method: 'POST',
                            body: formData
                        })
                        .then(response => response.json())
                        .then(data => {
                            const transcript = data.text || "No speech detected.";
                            const textDiv = document.createElement('div');
                            textDiv.classList.add('text');
                            textDiv.textContent = transcript;
                            // Insert the new textDiv at the top of translationBox
                            translationBox.insertBefore(textDiv, translationBox.firstChild);
                            
                            recordButton.classList.remove('spinning');
                            status.style.display='block';
                            status.textContent = "Press the button to start recording again.";
                            const utterance = new SpeechSynthesisUtterance("Analysis completed.");
                            speechSynthesis.speak(utterance);
                        })
                        .catch(error => {
                            console.error('Error:', error);
                            status.textContent = "Error occurred during recording. Press the button to try again.";
                            const utterance = new SpeechSynthesisUtterance("Error occurred during recording.");
                            speechSynthesis.speak(utterance);
                        });
                    });
                })
                .catch(error => {
                    console.error('Error accessing microphone:', error);
                    status.textContent = "Error accessing microphone. Please check your device settings.";
                });
        }
        
        

        function stopRecording() {
            if (mediaRecorder) {
                mediaRecorder.stop();
                recordButton.classList.add('spinning');
                isRecording = false;
                status.style.display='none';
            }
        }
        // Initialize all functions
        disableTranslateButton();
        initializeSpeechSynthesis();
        addButtonEventListeners();
        document.getElementById('chat-input').addEventListener('input', handleTextareaChange);
    }
    
    initializeSpeechRecognition();
});
