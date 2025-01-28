// 서버와 연결
const socket = io();

// DOM 요소
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

// TTS 관련 변수
let ttsQueue = []; // TTS 메시지를 저장하는 큐
let isSpeaking = false; // 현재 TTS가 재생 중인지 확인
let lastMessageTime = 0; // 마지막 메시지가 수신된 시간

// TTS 큐 관리 함수
const processTTSQueue = () => {
  if (isSpeaking || ttsQueue.length === 0) return;

  isSpeaking = true;
  const { message, delayAudio } = ttsQueue.shift();

  // 오디오 파일 재생
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

// TTS 재생 함수
const playTTS = (message) => {
  const speech = new SpeechSynthesisUtterance(message);
  speech.lang = "ko-KR";
  speech.onend = () => {
    isSpeaking = false;
    processTTSQueue(); // 큐의 다음 메시지를 처리
  };

  window.speechSynthesis.speak(speech);
};

// 로그인 화면에서 방 목록 불러오기
socket.emit("getRooms"); // 방 목록을 요청

// 서버로부터 방 목록 받기
socket.on("roomList", (rooms) => {
  roomList.innerHTML = ""; // 기존 방 목록 지우기
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.textContent = room;
    li.addEventListener("click", () => {
      roomInput.value = room; // 클릭하면 방 이름 입력 필드에 채워짐
    });
    roomList.appendChild(li);
  });
});

// 현재 방 이름 표시
socket.on("currentRoom", (roomName) => {
  currentRoomName.textContent = `현재 방: ${roomName}`;
});

// 방에 입장
joinRoomButton.addEventListener("click", () => {
  const username = usernameInput.value;
  const room = roomInput.value;

  if (username && room) {
    socket.emit("joinRoom", { username, newRoom: room });

    // 화면 전환: 로그인 화면 숨기기, 채팅 화면 보이기
    loginContainer.style.display = "none";
    chatContainer.style.display = "block";

    // 사용자 목록을 오른쪽 상단에 표시
    usersListContainer.style.display = "block";
  } else {
    alert("Please enter a valid username and room name.");
  }
});

// 메시지 전송
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const message = messageInput.value;
  const room = roomInput.value;

  if (message) {
    socket.emit("chatMessage", { room, message });
    messageInput.value = "";
  }
});

// 서버로부터 메시지 수신
socket.on("message", (data) => {
  const messageElement = document.createElement("p");
  messageElement.textContent = `${data.username}: ${data.message}`;
  messagesDiv.appendChild(messageElement);

  const currentTime = Date.now(); // 현재 시간
  const timeDiff = (currentTime - lastMessageTime) / 1000; // 간격 계산 (초 단위)

  // TTS 메시지를 큐에 추가
  ttsQueue.push({
    message: `${data.message}`,
    delayAudio: timeDiff > 3, // 이전 메시지와 3초 이상 간격일 경우 오디오 재생
  });

  lastMessageTime = currentTime;

  // 큐 처리 시작
  processTTSQueue();
});

// 방에 있는 사용자 목록 업데이트
socket.on("roomUsers", (users) => {
  usersList.innerHTML = ""; // 기존 목록 지우기
  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user;
    usersList.appendChild(li);
  });
});
