const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const textToSpeech = require("@google-cloud/text-to-speech"); // GCP TTS
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const client = new textToSpeech.TextToSpeechClient();

// 정적 파일 (public 폴더 내 html/css/js)
app.use(express.static("public"));
app.use(express.json()); // JSON 파싱 미들웨어

let rooms = {};     // 방별 사용자 목록
let roomname = [];  // 전체 방 목록

// 🔊 GCP TTS 요청 처리
app.post("/synthesize", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).send("No text provided");
  }

  const request = {
    input: { text },
    voice: {
      languageCode: "ko-KR",
      ssmlGender: "NEUTRAL",
    },
    audioConfig: {
      audioEncoding: "MP3",
      volumeGainDb: 10.0,
    },
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    res.set("Content-Type", "audio/mpeg");
    res.send(response.audioContent);
  } catch (error) {
    console.error("TTS 요청 실패:", error);
    res.status(500).send("TTS 처리 중 오류 발생");
  }
});

// 💬 Socket.IO 처리
io.on("connection", (socket) => {
  console.log("A user connected");

  // 접속 시 방 목록 전달
  socket.emit("roomList", roomname);

  // ping-pong keepAlive
  socket.on("keepAlive", (data) => {
    console.log(`keepAlive received at ${new Date(data.timestamp)}`);
  });

  // 방 입장
  socket.on("joinRoom", ({ username, newRoom }) => {
    socket.username = username;
    socket.join(newRoom);

    if (!rooms[newRoom]) {
      rooms[newRoom] = [];
    }
    rooms[newRoom].push(username);

    if (!roomname.includes(newRoom)) {
      roomname.push(newRoom);
    }

    io.to(newRoom).emit("roomUsers", rooms[newRoom]);
    socket.to(newRoom).emit("message", { username: "System", message: `${username} has joined the room` });
    socket.emit("currentRoom", newRoom);

    // 접속 종료 시 처리
    socket.on("disconnect", () => {
      rooms[newRoom] = rooms[newRoom].filter((user) => user !== username);
      io.to(newRoom).emit("roomUsers", rooms[newRoom]);

      if (rooms[newRoom].length === 0) {
        delete rooms[newRoom];
        roomname = roomname.filter((room) => room !== newRoom);
        io.emit("roomList", roomname);
      }
    });
  });

  // 메시지 수신 처리
  socket.on("chatMessage", ({ room, message }) => {
    io.to(room).emit("message", { username: socket.username, message });
  });

  // 별도의 종료 로그
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// 서버 실행
server.listen(3000, '0.0.0.0', () => {
  console.log("Server is running on http://0.0.0.0:3000");
});

