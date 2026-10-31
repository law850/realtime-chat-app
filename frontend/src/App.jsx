import { useState, useEffect, useRef } from 'react';

function App() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('general');
  const [newRoom, setNewRoom] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [readyState, setReadyState] = useState(0);
  const [replyTo, setReplyTo] = useState(null); // <-- NEW: State for replies
  
  const ws = useRef(null);
  const chatEndRef = useRef(null);

  const [rooms, setRooms] = useState(['general', 'tech', 'gaming', 'random']);

  useEffect(() => {
    if (!isLoggedIn) return;

    if (ws.current) ws.current.close();

    ws.current = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${room}/`);

    ws.current.onopen = () => setReadyState(1);
    ws.current.onclose = () => setReadyState(3);
    ws.current.onerror = () => setReadyState(3);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.action === 'delete') {
        setMessages((prev) => prev.filter((msg) => msg.id !== data.id));
      } else if (data.action === 'edit') {
        setMessages((prev) => 
          prev.map((msg) => msg.id === data.id ? { ...msg, message: data.message } : msg)
        );
      } else {
        setMessages((prev) => [...prev, data]);
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [isLoggedIn, room]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() === '' || readyState !== 1) return;

    ws.current.send(JSON.stringify({
      message: message,
      username: username,
      reply_to: replyTo ? replyTo.id : null, // <-- NEW: Send reply ID
    }));

    setMessage('');
    setReplyTo(null); // <-- NEW: Clear reply after sending
  };

  const handleDeleteMessage = (id) => {
    if (readyState !== 1) return;
    ws.current.send(JSON.stringify({
      action: 'delete',
      id: id
    }));
  };

  const handleEditMessage = (id, currentMessage) => {
    const newMessage = prompt("Edit your message:", currentMessage);
    if (newMessage && newMessage.trim() !== '' && newMessage !== currentMessage) {
      ws.current.send(JSON.stringify({
        action: 'edit',
        id: id,
        message: newMessage
      }));
    }
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    const formattedRoom = newRoom.trim().toLowerCase().replace(/\s+/g, '-');
    if (formattedRoom && !rooms.includes(formattedRoom)) {
      setRooms([...rooms, formattedRoom]);
      setRoom(formattedRoom);
      setNewRoom('');
    }
  };

  const getAvatarColor = (name) => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const connectionStatus = readyState === 1 ? 'Online' : readyState === 0 ? 'Connecting...' : 'Offline';

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="bg-slate-900 p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          <h2 className="text-4xl font-extrabold mb-2 text-white">Welcome Back</h2>
          <p className="text-slate-400 mb-8">Enter a username to join the conversation.</p>
          <form onSubmit={(e) => { e.preventDefault(); if(username.trim()) setIsLoggedIn(true); }} className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Your username..." 
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-white"
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-lg transition text-white shadow-lg shadow-indigo-500/30">
              Join Chat
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="bg-slate-900 w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-800 flex overflow-hidden h-[85vh]">
        
        {/* SIDEBAR */}
        <div className="w-72 bg-slate-950 p-6 border-r border-slate-800 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              #
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Chats</h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            {rooms.map((r) => (
              <button 
                key={r}
                onClick={() => { setRoom(r); setMessages([]); setReplyTo(null); }}
                className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center justify-between ${room === r ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'}`}
              >
                <span className="truncate"># {r}</span>
                {room === r && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
              </button>
            ))}
          </div>

          <form onSubmit={handleCreateRoom} className="mt-4 pt-4 border-t border-slate-800">
            <input 
              type="text" 
              placeholder="+ New room" 
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
            />
          </form>
          
          <div className="mt-6 pt-6 border-t border-slate-800 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getAvatarColor(username)}`}>
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{username}</p>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> {connectionStatus}
              </p>
            </div>
          </div>
        </div>

        {/* MAIN CHAT AREA */}
        <div className="flex-1 flex flex-col bg-slate-900">
          <div className="h-20 px-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-sm">
            <div>
              <h2 className="text-xl font-bold text-white"># {room}</h2>
              <p className="text-xs text-slate-400">Welcome to the #{room} channel.</p>
            </div>
          </div>

          <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-3xl mb-4">👋</div>
                <p>This is the start of the #{room} room.</p>
              </div>
            )}
            
            {messages.map((msg, index) => {
              const isMe = msg.username === username;
              const repliedMessage = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null; // <-- NEW

              return (
                <div key={msg.id || index} className={`flex gap-4 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold ${getAvatarColor(msg.username)}`}>
                    {msg.username.charAt(0).toUpperCase()}
                  </div>
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs text-slate-400">{msg.username}</span>
                      {msg.id && (
                        <>
                          <button 
                            onClick={() => setReplyTo(msg)} // <-- NEW: Set reply state
                            className="text-indigo-400 hover:text-indigo-300 transition text-[10px] font-bold"
                          >
                            [Reply]
                          </button>
                          {isMe && (
                            <>
                              <button onClick={() => handleEditMessage(msg.id, msg.message)} className="text-yellow-400 hover:text-yellow-300 transition text-[10px] font-bold">[Edit]</button>
                              <button onClick={() => handleDeleteMessage(msg.id)} className="text-red-400 hover:text-red-300 transition text-[10px] font-bold">[Delete]</button>
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {/* Reply Preview Bubble */}
                    {repliedMessage && (
                      <div className="mb-1 px-3 py-1 bg-slate-800/50 border-l-2 border-indigo-500 rounded text-xs text-slate-400 truncate max-w-full">
                        Replying to {repliedMessage.username}: "{repliedMessage.message}"
                      </div>
                    )}

                    <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                      isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <div className="p-6 bg-slate-900 border-t border-slate-800">
            {/* Replying to bar */}
            {replyTo && (
              <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border border-slate-700 rounded-t-xl text-sm text-slate-300 mb-2">
                <span>Replying to <strong>{replyTo.username}</strong>: {replyTo.message.substring(0, 30)}...</span>
                <button onClick={() => setReplyTo(null)} className="text-red-400 hover:text-red-300 font-bold ml-4">✕</button>
              </div>
            )}
            
            <form onSubmit={handleSendMessage} className="flex gap-4">
              <input 
                type="text" 
                placeholder={`Message #${room}...`}
                className="flex-1 p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-white"
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                disabled={readyState !== 1}
              />
              <button 
                type="submit" 
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition text-white disabled:opacity-50 shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                disabled={readyState !== 1}
              >
                Send
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;