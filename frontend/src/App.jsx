import { useState, useEffect, useRef } from 'react';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [question, setQuestion] = useState('What is your favorite color?');
  const [answer, setAnswer] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [token, setToken] = useState(localStorage.getItem('access_token') || null);
  
  const [room, setRoom] = useState('general');
  const [newRoom, setNewRoom] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [readyState, setReadyState] = useState(0);
  const [replyTo, setReplyTo] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [activeUsers, setActiveUsers] = useState([]); 
  const [showUserList, setShowUserList] = useState(false); 
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // Settings States
  const [showSettings, setShowSettings] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  
  const ws = useRef(null);
  const chatEndRef = useRef(null);

  const [rooms, setRooms] = useState(['general', 'tech', 'gaming', 'random']);

  // Load token AND username on startup
  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    const savedUsername = localStorage.getItem('username');
    
    if (savedToken) {
      setToken(savedToken);
      if (savedUsername) {
        setUsername(savedUsername);
      }
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    if (ws.current) ws.current.close();

    ws.current = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${room}/?username=${username}`);

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
      } else if (data.action === 'typing') {
        setTypingUsers(prev => {
          const newState = { ...prev };
          if (data.is_typing) {
            newState[data.username] = true;
          } else {
            delete newState[data.username];
          }
          return newState;
        });
      } else if (data.action === 'user_list') {
        setActiveUsers(data.users);
      } else if (data.action === 'unread') {
        if (data.username !== username && data.room !== room) {
          setUnreadCounts(prev => ({
            ...prev,
            [data.room]: (prev[data.room] || 0) + 1
          }));
        }
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

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (isRegistering && password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    const endpoint = isRegistering ? 'register' : 'login';
    const url = `http://127.0.0.1:8000/api/${endpoint}/`;

    try {
      const payload = isRegistering 
        ? { username, password, question, answer } 
        : { username, password };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();

      if (res.ok) {
        if (isRegistering) {
          setIsRegistering(false);
          setAuthError('Registration successful! Please log in.');
          setPassword('');
          setConfirmPassword('');
          setAnswer('');
        } else {
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('username', username); // SAVE USERNAME
          setToken(data.access);
          setIsLoggedIn(true);
        }
      } else {
        setAuthError(data.error || data.detail || JSON.stringify(data) || 'Authentication failed');
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setAuthError('Server error. Please check the console for details.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      const res = await fetch('http://127.0.0.1:8000/api/reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, answer, new_password: password })
      });
      
      const data = await res.json();

      if (res.ok) {
        setAuthError('Password reset successful! Please log in.');
        setIsResetting(false);
        setPassword('');
        setAnswer('');
      } else {
        setAuthError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setAuthError('Server error. Please try again.');
    }
  };

  // UPDATED: Shows success message for 3 seconds before closing
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');

    if (newPassword !== confirmPassword) {
      setSettingsError('New passwords do not match.');
      return;
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/api/change-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, old_password: oldPassword, new_password: newPassword })
      });
      
      const data = await res.json();

      if (res.ok) {
        setSettingsSuccess('Password changed successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Keep modal open for 3 seconds so user sees the message
        setTimeout(() => {
          setShowSettings(false);
          setSettingsSuccess(''); 
        }, 3000);
      } else {
        setSettingsError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setSettingsError('Server error. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username'); // REMOVE USERNAME
    setToken(null);
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    if (ws.current) ws.current.close();
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    if (readyState !== 1) return;
    
    ws.current.send(JSON.stringify({
      action: 'typing',
      username: username,
      is_typing: true
    }));

    if (window.typingTimeout) clearTimeout(window.typingTimeout);

    window.typingTimeout = setTimeout(() => {
      ws.current.send(JSON.stringify({
        action: 'typing',
        username: username,
        is_typing: false
      }));
    }, 2000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() === '' || readyState !== 1) return;

    ws.current.send(JSON.stringify({
      message: message,
      username: username,
      reply_to: replyTo ? replyTo.id : null,
    }));

    setMessage('');
    setReplyTo(null);
    
    ws.current.send(JSON.stringify({
      action: 'typing',
      username: username,
      is_typing: false
    }));
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

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/upload/', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (data.url) {
        ws.current.send(JSON.stringify({
          message: `📎 File: ${data.url}`,
          username: username,
        }));
      }
    } catch (error) {
      console.error('Upload failed:', error);
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

  // --- LOGIN / REGISTER / RESET SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="bg-slate-900 p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          
          <h2 className="text-4xl font-extrabold mb-2 text-white">
            {isResetting ? 'Reset Password' : isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-slate-400 mb-8">
            {isResetting ? 'Enter your username, security answer, and new password.' : isRegistering ? 'Sign up to join the chat.' : 'Log in to your account.'}
          </p>
          
          {authError && <p className="text-red-400 mb-4 text-sm">{authError}</p>}
          
          <form onSubmit={isResetting ? handleResetPassword : handleAuth} className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Username" 
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-white"
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />

            {isRegistering && (
              <select 
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                value={question} 
                onChange={e => setQuestion(e.target.value)}
              >
                <option>What is your favorite color?</option>
                <option>What is your mother's maiden name?</option>
                <option>What was your first pet's name?</option>
              </select>
            )}

            {(isRegistering || isResetting) && (
              <input 
                type="text" 
                placeholder="Security Answer" 
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition text-white"
                value={answer} 
                onChange={e => setAnswer(e.target.value)} 
                required 
              />
            )}

            <input 
              type="password" 
              placeholder={isResetting ? "New Password" : "Password"} 
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-white"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />

            {isRegistering && (
              <input 
                type="password" 
                placeholder="Confirm Password" 
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-white"
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
              />
            )}

            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-lg transition text-white shadow-lg shadow-indigo-500/30">
              {isResetting ? 'Reset Password' : isRegistering ? 'Register' : 'Login'}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2">
            {!isResetting && (
              <>
                <button 
                  onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition"
                >
                  {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
                </button>
                <button 
                  onClick={() => { setIsResetting(true); setAuthError(''); }}
                  className="text-sm text-slate-500 hover:text-slate-400 transition"
                >
                  Forgot your password?
                </button>
              </>
            )}
            {isResetting && (
              <button 
                onClick={() => { setIsResetting(false); setAuthError(''); }}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition"
              >
                Back to Login
              </button>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              Built by <span className="text-indigo-400 font-bold">Simiyu Lawrence</span>
            </p>
            <p className="text-[10px] text-slate-600 mt-1">
              simiyulawrence176@gmail.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- CHAT ROOM UI ---
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
                onClick={() => { 
                  setRoom(r); 
                  setMessages([]); 
                  setReplyTo(null); 
                  setUnreadCounts(prev => ({ ...prev, [r]: 0 })); 
                }}
                className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center justify-between ${room === r ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'}`}
              >
                <span className="truncate"># {r}</span>
                {unreadCounts[r] > 0 && room !== r && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCounts[r]}
                  </span>
                )}
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
          
          <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
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
            <div className="flex flex-col gap-1">
              <button onClick={() => setShowSettings(true)} className="text-indigo-400 hover:text-indigo-300 text-xs font-bold text-left">Settings</button>
              <button onClick={handleLogout} className="text-red-400 hover:text-red-300 text-xs font-bold text-left">Logout</button>
            </div>
          </div>
        </div>

        {/* MAIN CHAT AREA */}
        <div className="flex-1 flex flex-col bg-slate-900">
          
          <div className="h-20 px-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-sm relative">
            <div>
              <h2 className="text-xl font-bold text-white"># {room}</h2>
              <p className="text-xs text-slate-400">Welcome to the #{room} channel.</p>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowUserList(!showUserList)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-full transition"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-sm font-medium text-slate-200">{activeUsers.length} Online</span>
              </button>

              {showUserList && (
                <div className="absolute right-0 top-12 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Active Members</h3>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {activeUsers.map((user, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${getAvatarColor(user)}`}>
                          {user.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-300">{user}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              const repliedMessage = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;

              return (
                <div key={msg.id || index} className={`flex gap-4 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold ${getAvatarColor(msg.username)}`}>
                    {msg.username.charAt(0).toUpperCase()}
                  </div>
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs text-slate-400 font-bold">{msg.username}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.id && (
                        <>
                          <button 
                            onClick={() => setReplyTo(msg)}
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

                    {repliedMessage && (
                      <div className="mb-1 px-3 py-1 bg-slate-800/50 border-l-2 border-indigo-500 rounded text-xs text-slate-400 truncate max-w-full">
                        Replying to {repliedMessage.username}: "{repliedMessage.message}"
                      </div>
                    )}

                    <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed chat-bubble ${
                      isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
                    }`}>
                      {msg.message.includes('📎 File:') ? (
                        /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.message) ? (
                          <div className="flex flex-col gap-2">
                            <span className="text-xs opacity-75">Sent an image:</span>
                            <img 
                              src={`http://127.0.0.1:8000${msg.message.replace('📎 File: ', '')}`} 
                              alt="Uploaded" 
                              className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition"
                              onClick={() => window.open(`http://127.0.0.1:8000${msg.message.replace('📎 File: ', '')}`, '_blank')}
                            />
                          </div>
                        ) : (
                          <a 
                            href={`http://127.0.0.1:8000${msg.message.replace('📎 File: ', '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 underline hover:text-white"
                          >
                            📄 Click to download/view file
                          </a>
                        )
                      ) : (
                        msg.message
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {Object.keys(typingUsers).filter(u => u !== username).length > 0 && (
              <div className="text-xs text-slate-500 italic px-4 pb-2">
                {Object.keys(typingUsers).filter(u => u !== username).join(', ')} is typing...
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          <div className="p-6 bg-slate-900 border-t border-slate-800">
            {replyTo && (
              <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border border-slate-700 rounded-t-xl text-sm text-slate-300 mb-2">
                <span>Replying to <strong>{replyTo.username}</strong>: {replyTo.message.substring(0, 30)}...</span>
                <button onClick={() => setReplyTo(null)} className="text-red-400 hover:text-red-300 font-bold ml-4">✕</button>
              </div>
            )}
            
            <form onSubmit={handleSendMessage} className="flex gap-4 items-end">
              <input 
                type="file" 
                onChange={handleFileUpload} 
                className="hidden" 
                id="file-upload" 
              />
              <label 
                htmlFor="file-upload" 
                className="cursor-pointer px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl flex items-center justify-center text-white transition h-[52px]"
              >
                📎
              </label>
              
              <textarea 
                placeholder={`Message #${room}...`}
                className="flex-1 p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-white resize-none h-[52px] max-h-32 overflow-y-auto custom-scrollbar"
                value={message} 
                onChange={handleTyping}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); 
                    handleSendMessage(e); 
                  }
                }}
                disabled={readyState !== 1}
                rows={1}
              />
              
              <button 
                type="submit" 
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition text-white disabled:opacity-50 shadow-lg shadow-indigo-500/20 flex items-center gap-2 h-[52px]"
                disabled={readyState !== 1}
              >
                Send
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Change Password</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>
            
            {settingsError && <p className="text-red-400 mb-4 text-sm text-center">{settingsError}</p>}
            {settingsSuccess && <p className="text-green-400 mb-4 text-sm text-center">{settingsSuccess}</p>}
            
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <input 
                type="password" 
                placeholder="Current Password" 
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                value={oldPassword} 
                onChange={e => setOldPassword(e.target.value)} 
                required 
              />
              <input 
                type="password" 
                placeholder="New Password" 
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                required 
              />
              <input 
                type="password" 
                placeholder="Confirm New Password" 
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
              />
              <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white transition">
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;