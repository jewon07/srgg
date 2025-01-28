const socket = io();

// HTML 요소 참조
const loginContainer = document.getElementById("login-container");
const chatContainer = document.getElementById("chat-container");
const roomListContainer = document.getElementById("room-list");
const usernameInput = document.getElementById("username");
const roomInput = document.getElementById("room");
const joinRoomButton = document.getElementById("join-room");
const messages = document.getElementById("messages");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");

// 사용자 정보 저장
let username;
let currentRoom;

// 방 목록 요청
function updateRoomList() {
  socket.emit("getRooms");
}

// 방 목록 표시 및 클릭 이벤트 처리
socket.on("roomList", (rooms) => {
  roomListContainer.innerHTML = ""; // 기존 목록 초기화
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.textContent = room;

    // 클릭 시 해당 방으로 바로 접속
    li.addEventListener("click", () => {
      if (!username) {
        username = usernameInput.value.trim();
        if (!username) {
          alert("Please enter your username before joining a room.");
          return;
        }
      }

      const previousRoom = currentRoom;
      currentRoom = room; // 선택한 방 이름으로 변경

      // 서버로 방 전환 요청
      socket.emit("joinRoom", { username, newRoom: room, previousRoom });

      // 로그인 화면 숨기고 채팅 화면 표시
      loginContainer.style.display = "none";
      chatContainer.style.display = "block";

      messages.innerHTML = ""; // 기존 메시지 초기화
    });

    roomListContainer.appendChild(li);
  });
});

// 방 입장 버튼 이벤트 처리
joinRoomButton.addEventListener("click", () => {
  const newRoom = roomInput.value.trim();

  if (!username) {
    username = usernameInput.value.trim();
  }

  if (username && newRoom) {
    socket.emit("setUsername", username); // 서버에 사용자 이름 설정
    const previousRoom = currentRoom;
    currentRoom = newRoom;

    socket.emit("joinRoom", { username, newRoom, previousRoom });

    loginContainer.style.display = "none";
    chatContainer.style.display = "block";

    messages.innerHTML = ""; // 기존 메시지 초기화
  } else {
    alert("Please enter both a username and a room name.");
  }
});

// 메시지 전송
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (messageInput.value) {
    socket.emit("chatMessage", { room: currentRoom, message: messageInput.value });
    messageInput.value = ""; // 입력창 초기화
  }
});

// 서버에서 메시지 수신
socket.on("message", ({ username, message }) => {
  const li = document.createElement("li");
  const userSpan = document.createElement("span");
  const messageSpan = document.createElement("span");

  userSpan.textContent = username ? `${username}: ` : "System: ";
  userSpan.style.fontWeight = "bold";
  messageSpan.textContent = message;

  li.appendChild(userSpan);
  li.appendChild(messageSpan);
  messages.appendChild(li);

  // 스크롤 자동 이동
  messages.scrollTop = messages.scrollHeight;
});

// 초기 로드 시 방 목록 업데이트
updateRoomList();
