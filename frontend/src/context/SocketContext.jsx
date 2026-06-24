import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../utils/constants";
const SocketContext = createContext(null);
export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const s = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    setSocket(s);
    return () => s.disconnect();
  }, []);
  const joinElection = (id) =>
    socket?.emit("join:election", { electionId: id });
  const leaveElection = (id) =>
    socket?.emit("leave:election", { electionId: id });
  const joinAdmin = () => socket?.emit("join:admin");
  return (
    <SocketContext.Provider
      value={{ socket, connected, joinElection, leaveElection, joinAdmin }}
    >
      {children}
    </SocketContext.Provider>
  );
}
export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket outside provider");
  return ctx;
};
