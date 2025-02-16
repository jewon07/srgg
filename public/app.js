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
const usersList = document.getElementById("users-list"); // 사용자 목록을 표시할 div
const usersListContainer = document.getElementById("users-list-container"); // 사용자 목록을 포함한 컨테이너
const currentRoomName = document.getElementById("currentRoomName");
const volumeControl = document.getElementById("volume-control");
const volumeValueDisplay = document.getElementById("volume-value");

let localUsername = "";

let ttsQueue = [];
let isSpeaking = false; 
let lastMessageTime = 0; 

const processTTSQueue = () => {
  if (isSpeaking || ttsQueue.length === 0) return;

  isSpeaking = true;
  const { message, delayAudio } = ttsQueue.shift();

  if (delayAudio) {
    const audio = new Audio("radio.mp3");
    audio.volume = (parseFloat(volumeControl.value) / 100) * 0.1;
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
  speech.volume = parseFloat(volumeControl.value) / 100;
  speech.onend = () => {
    isSpeaking = false;
    processTTSQueue(); // 큐의 다음 메시지를 처리
  };

  window.speechSynthesis.speak(speech);
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
    alert("Please enter a valid username and room name.");
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

socket.on("message", (data) => {
  const messageElement = document.createElement("p");
  messageElement.textContent = `${data.username}: ${data.message}`;
  messagesDiv.appendChild(messageElement);

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
