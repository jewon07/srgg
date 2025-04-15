const socket = io();

const loginContainer = document.getElementById("login-container");
const chatContainer = document.getElementById("chat-container");
const usernameInput = document.getElementById("username");
const roomInput = document.getElementById("room");
const joinRoomButton = document.getElementById("join-room");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const chatForm = document.getElementById("chat-form");
const roomList = document.getElementById("room-list");
const usersList = document.getElementById("users-list");
const usersListContainer = document.getElementById("users-list-container");
const currentRoomName = document.getElementById("currentRoomName");
const volumeControl = document.getElementById("volume-control");
const volumeValueDisplay = document.getElementById("volume-value");

let localUsername = "";

let ttsQueue = [];
let isSpeaking = false;
let lastMessageTime = 0;

// Web Audio API 구성
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const gainNode = audioCtx.createGain();

const processTTSQueue = () => {
  if (isSpeaking || ttsQueue.length === 0) return;

  isSpeaking = true;
  const { message, delayAudio } = ttsQueue.shift();

  if (delayAudio) {
    const radio = new Audio("radio.mp3");
    radio.volume = (parseFloat(volumeControl.value) / 100) * 1;
    radio.play();
    radio.onended = () => {
      playTTS(message);
    };
  } else {
    playTTS(message);
  }
};

const playTTS = async (message) => {
  try {
    const response = await fetch("/synthesize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      console.error("TTS 요청 실패");
      isSpeaking = false;
      processTTSQueue();
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;

    const userVolume = parseFloat(volumeControl.value) / 100;
    const gainBoostFactor = 3;
    gainNode.gain.value = userVolume * gainBoostFactor;

    source.connect(gainNode).connect(audioCtx.destination);
    source.start(0);

    source.onended = () => {
      isSpeaking = false;
      processTTSQueue();
    };
  } catch (error) {
    console.error("TTS 처리 오류:", error);
    isSpeaking = false;
    processTTSQueue();
  }
};

volumeControl.addEventListener("input", () => {
  volumeValueDisplay.textContent = volumeControl.value;
});

socket.emit("getRooms");

socket.on("roomList", (rooms) => {
  roomList.innerHTML = "";
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.textContent = room;
    li.addEventListener("click", () => {
      roomInput.value = room;
    });
    roomList.appendChild(li);
  });
});

socket.on("currentRoom", (roomName) => {
  currentRoomName.textContent = `현재 방: ${roomName}`;
});

joinRoomButton.addEventListener("click", () => {
  const username = usernameInput.value;
  const room = roomInput.value;

  if (username && room) {
    localUsername = username;
    socket.emit("joinRoom", { username, newRoom: room });

    loginContainer.style.display = "none";
    chatContainer.style.display = "block";
    usersListContainer.style.display = "block";
  } else {
    alert("유효한 사용자 이름과 방 이름을 입력하세요.");
  }
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const message = messageInput.value;
  const room = roomInput.value;

  if (message) {
    socket.emit("chatMessage", { room, message });
    messageInput.value = "";
  }
});

// ✅ 자동 스크롤 기능이 추가된 메시지 이벤트 핸들러
socket.on("message", (data) => {
  const messageElement = document.createElement("p");
  messageElement.textContent = `${data.username}: ${data.message}`;
  messagesDiv.appendChild(messageElement);

  // 🔽 자동 스크롤
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  const currentTime = Date.now();
  const timeDiff = (currentTime - lastMessageTime) / 1000;

  if (data.username !== localUsername) {
    ttsQueue.push({
      message: `${data.message}`,
      delayAudio: timeDiff > 3,
    });

    processTTSQueue();
  }

  lastMessageTime = currentTime;
});

socket.on("roomUsers", (users) => {
  usersList.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user;
    usersList.appendChild(li);
  });
});

setInterval(() => {
  socket.emit("keepAlive", { timestamp: Date.now() });
}, 30000);
