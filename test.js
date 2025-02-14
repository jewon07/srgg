// DOM 요소
const volumeControl = document.getElementById("volume-control");
const volumeValueDisplay = document.getElementById("volume-value");

// TTS 관련 변수 및 큐 관리
let ttsQueue = [];
let isSpeaking = false;

const processTTSQueue = () => {
  if (isSpeaking || ttsQueue.length === 0) return;

  isSpeaking = true;
  const { message, delayAudio } = ttsQueue.shift();

  if (delayAudio) {
    const audio = new Audio("radio.mp3");
    audio.play();
    audio.onended = () => {
      playTTS(message);
    };
  } else {
    playTTS(message);
  }
};

const playTTS = (message) => {
  const speech = new SpeechSynthesisUtterance(message);
  speech.lang = "ko-KR";
  // 사용자가 설정한 음량을 적용 (0.0 ~ 1.0)
  speech.volume = parseFloat(volumeControl.value);
  speech.onend = () => {
    isSpeaking = false;
    processTTSQueue();
  };

  window.speechSynthesis.speak(speech);
};

// 슬라이더 값 변경 시 현재 값 표시 업데이트
volumeControl.addEventListener("input", () => {
  volumeValueDisplay.textContent = volumeControl.value;
});
