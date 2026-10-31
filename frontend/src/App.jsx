import { useState, useEffect, useRef } from 'react';

function App() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('general');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [readyState, setReadyState] = useState(0);
  
  const ws = useRef(null);
  const chatEndRef = useRef(null);

  // Connect to WebSocket when logged in or room changes
  useEffect(() => {
    if (!isLoggedIn) return;

    // Close old connection if it exists
    if (ws.current) ws.current.close();

    // Connect to the specific room
    ws.current = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${room}/`);

    ws.current.onopen = () => setReadyState(1);
    ws.current.onclose = () => setReadyState(3);
    ws.current.onerror = () => setReadyState(3);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [isLoggedIn, room]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() === '' || readyState !== 1) return;

    ws.current.send(JSON.stringify({
      message: message,
      username: username,
    }));

    setMessage('');
  };

  const handleRoomChange = (newRoom) => {
    setRoom(newRoom);
    setMessages([]); // Clear messages when switching rooms
  };

  const connectionStatus = readyState === 1 ? 'Connected 🟢' : readyState === 0 ? 'Connecting...' : 'Disconnected 🔴';

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 text-center">
          <h2 className="text-3xl font-bold mb-6 text-white">Join the Chat</h2>
          <form onSubmit={(e) => { e.preventDefault(); if(username.trim()) setIsLoggedIn(true); }} className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Enter your name..." 
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 transition text-white"
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition text-white shadow-lg">
              Start Chatting
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- CHAT ROOM UI ---
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-700 flex overflow-hidden h-[80vh]">
        
        {/* SIDEBAR (Rooms) */}
        <div className="w-1/4 bg-slate-900 p-4 border-r border-slate-700 flex flex-col">
          <h2 className="text-xl font-bold text-white mb-4">Rooms</h2>
          <div className="flex flex-col gap-2 overflow-y-auto">
            {['general', 'tech', 'gaming', 'random'].map((r) => (
              <button 
                key={r}
                onClick={() => handleRoomChange(r)}
                className={`text-left px-4 py-2 rounded-lg font-medium transition ${room === r ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                # {r}
              </button>
            ))}
          </div>
          
          <div className="mt-auto pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400 mb-2">Logged in as:</p>
            <p className="font-bold text-white">{username}</p>
          </div>
        </div>

        {/* MAIN CHAT AREA */}
        <div className="w-3/4 flex flex-col">
          <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white"># {room}</h2>
            <span className="text-sm font-medium text-slate-400">{connectionStatus}</span>
          </div>

          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-slate-800/50">
            {messages.length === 0 && (
              <p className="text-center text-slate-500 mt-10">Welcome to #{room}! Say hello.</p>
            )}
            
            {messages.map((msg, index) => {
              const isMe = msg.username === username;
              return (
                <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-slate-400 mb-1 ml-1">{msg.username}</span>
                  <div className={`px-4 py-2 rounded-2xl max-w-[70%] break-words ${
                    isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-700 text-white rounded-tl-sm'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-slate-900 border-t border-slate-700">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="text" 
                placeholder={`Message #${room}...`}
                className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 transition text-white"
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                disabled={readyState !== 1}
              />
              <button 
                type="submit" 
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition text-white disabled:opacity-50"
                disabled={readyState !== 1}
              >
                Send
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;