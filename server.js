const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 정적 파일 제공 (html, css, js)
app.use(express.static("public"));

let rooms = {}; // 방마다 사용자 목록을 관리
let roomname = []; // 생성된 방 목록

io.on("connection", (socket) => {
  console.log("A user connected");

  // 클라이언트가 방 목록을 요청하면
  socket.emit("roomList", roomname);

  // 방에 입장
  socket.on("joinRoom", ({ username, newRoom }) => {
    // 사용자의 이름을 socket.username에 저장
    socket.username = username;

    // 방에 사용자 추가
    socket.join(newRoom);
    if (!rooms[newRoom]) {
      rooms[newRoom] = [];
    }
    rooms[newRoom].push(username);

    // 방 목록에 해당 방 추가 (중복 방지)
    if (!roomname.includes(newRoom)) {
      roomname.push(newRoom);
    }

    // 해당 방에 있는 사용자 목록을 클라이언트로 전송
    io.to(newRoom).emit("roomUsers", rooms[newRoom]);

    // 방에 입장 메시지 전송
    socket.to(newRoom).emit("message", { username: "System", message: `${username} has joined the room` });

    // 방 이름을 클라이언트로 전송
    socket.emit("currentRoom", newRoom); // 방 이름을 클라이언트로 전송

    // 나가기 처리
    socket.on("disconnect", () => {
      rooms[newRoom] = rooms[newRoom].filter(user => user !== username);
      io.to(newRoom).emit("roomUsers", rooms[newRoom]);

      // 방에 유저가 없으면 방 삭제
      if (rooms[newRoom].length === 0) {
        delete rooms[newRoom]; // 방 삭제
        roomname = roomname.filter(room => room !== newRoom); // 방 목록에서 삭제
        io.emit("roomList", roomname); // 클라이언트에 갱신된 방 목록 전송
      }
    });
  });

  // 메시지 전송
  socket.on("chatMessage", ({ room, message }) => {
    io.to(room).emit("message", { username: socket.username, message });
  });

  // 사용자 연결 해제
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
