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
  
  const [showLanding, setShowLanding] = useState(true);

  const [showDmModal, setShowDmModal] = useState(false);
  const [dmTargetUser, setDmTargetUser] = useState('');
  const [dmError, setDmError] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editMessageText, setEditMessageText] = useState('');
  const [editMessageId, setEditMessageId] = useState(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const [room, setRoom] = useState(null);
  const [newRoom, setNewRoom] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [readyState, setReadyState] = useState(0);
  const [replyTo, setReplyTo] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [activeUsers, setActiveUsers] = useState([]); 
  const [showUserList, setShowUserList] = useState(false); 
  const [unreadCounts, setUnreadCounts] = useState({});
  
  const [hiddenMessages, setHiddenMessages] = useState([]);

  const [showSettings, setShowSettings] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  
  const [profilePic, setProfilePic] = useState(localStorage.getItem(`profile_pic_${username}`) || null);
  const [uploadingPic, setUploadingPic] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [roomMembers, setRoomMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [manageError, setManageError] = useState('');
  const [manageSuccess, setManageSuccess] = useState('');
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojis = ['😀', '😂', '😍', '😎', '😭', '👍', '👎', '❤️', '🔥', '🎉', '🙏', '💯', '🤔', '👀', '🙌'];

  // --- Theme State ---
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const ws = useRef(null);
  const chatEndRef = useRef(null);

  const [rooms, setRooms] = useState(['general']);

  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    const savedUsername = localStorage.getItem('username');
    
    if (savedToken) {
      setToken(savedToken);
      if (savedUsername) {
        setUsername(savedUsername);
        const savedPic = localStorage.getItem(`profile_pic_${savedUsername}`);
        if (savedPic) setProfilePic(savedPic);
      }
      setIsLoggedIn(true);
    }
  }, []);

  const fetchRooms = async () => {
    const currentUsername = localStorage.getItem('username');
    if (!currentUsername) return;

    try {
      const res = await fetch(`https://tubonge-backend-0d7b.onrender.com/api/rooms/?username=${currentUsername}`);
      const data = await res.json();
      if (data.rooms) {
        setRooms(data.rooms);
      }
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    }
  };

  useEffect(() => {
    if (username) {
      fetchRooms();
      const savedPic = localStorage.getItem(`profile_pic_${username}`);
      if (savedPic) setProfilePic(savedPic);
    }
  }, [username]); 

  useEffect(() => {
    if (!isLoggedIn) return; 

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        return; 
    }

    if (ws.current) ws.current.close();

    const targetRoom = room || 'general';
    ws.current = new WebSocket(`wss://tubonge-backend-0d7b.onrender.com/ws/chat/${targetRoom}/?username=${username}`);

    ws.current.onopen = () => {
      setReadyState(1);
      ws.current.send(JSON.stringify({
        action: 'mark_as_read',
        username: username
      }));
    };
    ws.current.onclose = () => {
      setReadyState(3);
    };
    ws.current.onerror = () => setReadyState(3);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.action === 'delete') {
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === data.id 
              ? { ...msg, message: "⚠️ This message was unsent." } 
              : msg
          )
        );
      } else if (data.action === 'edit') {
        setMessages((prev) => 
          prev.map((msg) => msg.id === data.id ? { ...msg, message: data.message, is_edited: true } : msg)
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
      } 
      else if (data.action === 'messages_read') {
        setMessages(prev => 
          prev.map(msg => {
            if (msg.username !== username) {
              const currentReadBy = msg.read_by ? msg.read_by.split(',') : [];
              if (!currentReadBy.includes(data.reader)) {
                return { ...msg, read_by: msg.read_by ? `${msg.read_by},${data.reader}` : data.reader };
              }
            }
            return msg;
          })
        );
      }
      else {
        if (data.room === room) {
          setMessages((prev) => [...prev, data]);
          if (data.username !== username && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
              action: 'mark_as_read',
              username: username
            }));
          }
        } else if (data.username !== username) {
          setUnreadCounts(prev => ({
            ...prev,
            [data.room]: (prev[data.room] || 0) + 1
          }));
        }
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [isLoggedIn, room, username]); 

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
    const url = `https://tubonge-backend-0d7b.onrender.com/api/${endpoint}/`;

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
          localStorage.setItem('username', username);
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
      const res = await fetch('https://tubonge-backend-0d7b.onrender.com/api/reset-password/', {
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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');

    if (newPassword !== confirmPassword) {
      setSettingsError('New passwords do not match.');
      return;
    }

    try {
      const res = await fetch('https://tubonge-backend-0d7b.onrender.com/api/change-password/', {
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

  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingPic(true);
    setSettingsError('');
    setSettingsSuccess('');

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      localStorage.setItem(`profile_pic_${username}`, base64String);
      setProfilePic(base64String);
      setSettingsSuccess('Profile picture updated!');
      setUploadingPic(false);
    };
    reader.onerror = () => {
      setSettingsError('Failed to read file.');
      setUploadingPic(false);
    };
    reader.readAsDataURL(file);
  };

  const checkAdminStatus = async () => {
    try {
      const res = await fetch(`https://tubonge-backend-0d7b.onrender.com/api/check-admin/?username=${username}&room=${room}`);
      const data = await res.json();
      setIsAdmin(data.is_admin);
      if (data.is_admin) {
        fetchRoomMembers();
        setShowManageModal(true);
      } else {
        alert("You are not an admin of this room.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRoomMembers = async () => {
    try {
      const res = await fetch(`https://tubonge-backend-0d7b.onrender.com/api/room-members/?room=${room}`);
      const data = await res.json();
      setRoomMembers(data.members);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setManageError('');
    setManageSuccess('');
    try {
      const res = await fetch('https://tubonge-backend-0d7b.onrender.com/api/add-member/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_username: username, room_name: room, new_member_username: newMemberName })
      });
      const data = await res.json();
      if (res.ok) {
        setManageSuccess(data.message);
        setNewMemberName('');
        fetchRoomMembers();
      } else {
        setManageError(data.error || 'Failed to add member');
      }
    } catch (err) {
      setManageError('Server error');
    }
  };

  const handleRemoveMember = async (memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName}?`)) return;
    setManageError('');
    setManageSuccess('');
    try {
      const res = await fetch('https://tubonge-backend-0d7b.onrender.com/api/remove-member/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_username: username, room_name: room, member_to_remove: memberName })
      });
      const data = await res.json();
      if (res.ok) {
        setManageSuccess(data.message);
        fetchRoomMembers();
      } else {
        setManageError(data.error || 'Failed to remove member');
      }
    } catch (err) {
      setManageError('Server error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    setToken(null);
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setProfilePic(null);
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
    setShowEmojiPicker(false); 
    
    ws.current.send(JSON.stringify({
      action: 'typing',
      username: username,
      is_typing: false
    }));
  };

  const handleDeleteMessage = (id) => {
    if (readyState !== 1) {
      alert("You are offline. Please check your connection.");
      return;
    }
    ws.current.send(JSON.stringify({
      action: 'delete',
      id: id
    }));
  };

  const handleEditMessage = (id, currentMessage) => {
    setEditMessageId(id);
    setEditMessageText(currentMessage);
    setEditModalOpen(true);
  };

  const saveEditedMessage = () => {
    if (editMessageText.trim() !== '' && readyState === 1) {
      ws.current.send(JSON.stringify({
        action: 'edit',
        id: editMessageId,
        message: editMessageText
      }));
    }
    setEditModalOpen(false);
  };

  const openConfirmModal = (messageText, actionFunction) => {
    setConfirmMessage(messageText);
    setConfirmAction(() => actionFunction);
    setConfirmModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('https://tubonge-backend-0d7b.onrender.com/api/upload/', {
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

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const formattedRoom = newRoom.trim().toLowerCase().replace(/\s+/g, '-');
    if (!formattedRoom) return;

    try {
      const res = await fetch('https://tubonge-backend-0d7b.onrender.com/api/create-room/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, room_name: formattedRoom })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setNewRoom(''); 
        setRoom(data.room_name); 
        setIsAdmin(true); 
        fetchRooms();
      } else {
        alert(data.error || 'Failed to create room');
      }
    } catch (err) {
      alert('Server error');
    }
  };

  const handleStartDm = async () => {
    if (!dmTargetUser || dmTargetUser === username) return;
    setDmError('');
    const dmRoomName = [username, dmTargetUser].sort().join('-');
    
    try {
      const res = await fetch('https://tubonge-backend-0d7b.onrender.com/api/create-room/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, room_name: dmRoomName })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setDmError(data.error || 'Could not create DM.');
        return;
      }
      
      await fetch('https://tubonge-backend-0d7b.onrender.com/api/add-member/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_username: username, room_name: data.room_name, new_member_username: dmTargetUser })
      });
      
      setRoom(data.room_name);
      fetchRooms();
      setShowDmModal(false);
      setDmTargetUser('');
    } catch (err) {
      setDmError('Network error. Please try again.');
    }
  };

  const getAvatarColor = (name) => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const connectionStatus = readyState === 1 ? 'Online' : readyState === 0 ? 'Connecting...' : 'Offline';

  // --- LANDING PAGE ---
  if (!isLoggedIn && showLanding) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-100'}`}>
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-600/20 to-transparent"></div>
        
        <div className="relative z-10 max-w-2xl w-full text-center">
          <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white font-bold text-5xl mx-auto mb-8 shadow-2xl shadow-indigo-500/30">
            #
          </div>
          <h1 className={`text-5xl font-extrabold mb-6 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Welcome to <span className="text-indigo-400">TubongeApp</span>
          </h1>
          <p className={`text-lg mb-12 max-w-lg mx-auto leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Simple, reliable and private. Message privately, make calls and share files with your friends, family and colleagues.
          </p>
          <button 
            onClick={() => setShowLanding(false)}
            className="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-full transition-all shadow-lg shadow-indigo-500/30 hover:scale-105"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  // --- LOGIN / REGISTER / RESET SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-100'}`}>
        <div className={`p-10 rounded-3xl shadow-2xl w-full max-w-md border text-center relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-300'}`}>
          
          <button 
            onClick={() => setShowLanding(true)}
            className={`absolute top-4 left-4 text-sm font-bold transition z-10 ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
          >
            ← Back
          </button>

          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          
          <h2 className={`text-4xl font-extrabold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {isResetting ? 'Reset Password' : isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className={`mb-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {isResetting ? 'Enter your username, security answer, and new password.' : isRegistering ? 'Sign up to join the chat.' : 'Log in to your account.'}
          </p>
          
          {authError && <p className="text-red-400 mb-4 text-sm">{authError}</p>}
          
          <form onSubmit={isResetting ? handleResetPassword : handleAuth} className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Username" 
              className={`w-full p-4 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition border ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`}
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />

            {isRegistering && (
              <select 
                className={`w-full p-4 rounded-xl focus:outline-none focus:border-indigo-500 border ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`}
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
                className={`w-full p-4 rounded-xl focus:outline-none focus:border-indigo-500 transition border ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`}
                value={answer} 
                onChange={e => setAnswer(e.target.value)} 
                required 
              />
            )}

            <input 
              type="password" 
              placeholder={isResetting ? "New Password" : "Password"} 
              className={`w-full p-4 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition border ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`}
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />

            {isRegistering && (
              <input 
                type="password" 
                placeholder="Confirm Password" 
                className={`w-full p-4 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition border ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`}
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
                  className={`text-sm transition ${theme === 'dark' ? 'text-slate-500 hover:text-slate-400' : 'text-slate-500 hover:text-slate-700'}`}
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

          <div className={`mt-8 pt-6 border-t text-center ${theme === 'dark' ? 'border-slate-800' : 'border-gray-300'}`}>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
              Built by <span className="text-indigo-400 font-bold">Simiyu Lawrence</span>
            </p>
            <p className={`text-[10px] mt-1 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-500'}`}>
              simiyulawrence176@gmail.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- CHAT ROOM UI (Merged Layout) ---
  return (
    <div className={`min-h-screen flex justify-center transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-100'}`}>
      
      {/* Main Container - Full width on mobile, constrained on desktop */}
      <div className={`w-full max-w-2xl flex flex-col h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
        
        {/* ================= TOP HEADER (Replaces Sidebar) ================= */}
        <div className={`p-4 border-b ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-300'}`}>
          
          {/* Row 1: Title, Theme Toggle, Profile */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">#</div>
              <h2 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>TubongeApp</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition ${theme === 'dark' ? 'bg-slate-800 text-yellow-400' : 'bg-gray-200 text-slate-800'}`}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button onClick={() => setShowSettings(true)} className={`p-2 rounded-lg transition ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-gray-200 text-slate-600'}`}>
                ⚙️
              </button>
              <button onClick={handleLogout} className={`p-2 rounded-lg transition ${theme === 'dark' ? 'bg-slate-800 text-red-400' : 'bg-gray-200 text-red-500'}`}>
                🚪
              </button>
            </div>
          </div>

          {/* Row 2: User Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0 ${profilePic ? 'bg-transparent' : getAvatarColor(username)}`}>
              {profilePic ? (
                <img src={profilePic} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                username.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{username}</p>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> {connectionStatus}
              </p>
            </div>
          </div>

          {/* Row 3: Action Buttons */}
          <div className="flex gap-2">
            <form onSubmit={handleCreateRoom} className="flex-1 flex gap-2">
              <input 
                type="text" 
                placeholder="+ New room" 
                className={`flex-1 p-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-slate-900'}`}
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
              />
              <button type="submit" className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold text-sm transition">
                Add
              </button>
            </form>
            <button 
              onClick={() => setShowDmModal(true)}
              className={`px-3 py-2 border rounded-xl font-bold text-sm transition ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white' : 'bg-gray-200 hover:bg-gray-300 border-gray-300 text-slate-900'}`}
            >
              💬 DM
            </button>
          </div>
        </div>

        {/* ================= CHAT LIST ================= */}
        {!room && (
          <div className={`flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Your Chats</h3>
            {rooms.map((r) => (
              <button 
                key={r}
                onClick={() => { 
                  setRoom(r); 
                  setMessages([]); 
                  setReplyTo(null); 
                  setUnreadCounts(prev => ({ ...prev, [r]: 0 })); 
                }}
                className={`w-full text-left px-4 py-4 rounded-xl font-medium transition flex items-center justify-between border ${theme === 'dark' ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200' : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-slate-800'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getAvatarColor(r)}`}>
                    #
                  </div>
                  <span className="truncate text-lg"># {r}</span>
                </div>
                {unreadCounts[r] > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {unreadCounts[r]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ================= ACTIVE CHAT AREA ================= */}
        {room && (
          <div className="flex-1 flex flex-col h-full">
            {/* Chat Header */}
            <div className={`h-16 px-4 border-b flex justify-between items-center ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-300'}`}>
              <div className="flex items-center gap-3">
                <button onClick={() => setRoom(null)} className="text-indigo-400 hover:text-indigo-300 font-bold text-2xl">←</button>
                <div>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}># {room}</h2>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{activeUsers.length} Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { fetchRoomMembers(); setShowManageModal(true); }}
                  className={`text-xs px-2 py-1 rounded-lg border transition ${theme === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-gray-200 text-slate-700 border-gray-300'}`}
                >
                  Members
                </button>
                <button 
                  onClick={checkAdminStatus}
                  className={`text-xs px-2 py-1 rounded-lg border transition ${theme === 'dark' ? 'bg-slate-800 text-indigo-400 border-slate-700' : 'bg-gray-200 text-indigo-600 border-gray-300'}`}
                >
                  Manage
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className={`flex-1 p-4 overflow-y-auto flex flex-col gap-4 custom-scrollbar ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
              {messages.length === 0 && (
                <div className={`flex flex-col items-center justify-center h-full ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`}>👋</div>
                  <p>This is the start of the #{room} room.</p>
                </div>
              )}
              
              {messages.map((msg, index) => {
                if (hiddenMessages.includes(msg.id)) return null;

                const isMe = msg.username === username;
                const repliedMessage = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;
                const msgPic = localStorage.getItem(`profile_pic_${msg.username}`);
                
                const readers = msg.read_by ? msg.read_by.split(',') : [];
                const hasBeenRead = readers.some(r => r !== msg.username && r.trim() !== '');

                return (
                  <div key={msg.id || index} className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold overflow-hidden ${msgPic ? 'bg-transparent' : getAvatarColor(msg.username)}`}>
                      {msgPic ? (
                        <img src={msgPic} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        msg.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%]`}>
                      <div className="flex items-center gap-1 mb-1 px-1 flex-wrap">
                        <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{msg.username}</span>
                        <span className={`text-[9px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {msg.is_edited && <span className="ml-1 italic">(edited)</span>}
                          {isMe && hasBeenRead && (
                            <span className="ml-1 text-blue-500 font-bold" title="Read">✓✓</span>
                          )}
                        </span>
                      </div>

                      {msg.id && (
                        <div className="flex items-center gap-2 mb-1">
                          <button onClick={() => setReplyTo(msg)} className="text-indigo-400 text-[9px] font-bold">[Reply]</button>
                          {isMe && (
                            <>
                              <button onClick={() => handleEditMessage(msg.id, msg.message)} className="text-yellow-400 text-[9px] font-bold">[Edit]</button>
                              <button 
                                onClick={() => {
                                  openConfirmModal("Delete this message only for yourself?", () => {
                                    setHiddenMessages(prev => [...prev, msg.id]);
                                  });
                                }} 
                                className="text-slate-400 text-[9px] font-bold"
                              >
                                [Delete]
                              </button>
                              <button 
                                onClick={() => {
                                  openConfirmModal("Unsend this message for everyone?", () => {
                                    handleDeleteMessage(msg.id);
                                  });
                                }} 
                                className="text-red-400 text-[9px] font-bold"
                              >
                                [Unsend]
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {repliedMessage && (
                        <div className={`mb-1 px-2 py-1 border-l-2 border-indigo-500 rounded text-[10px] truncate max-w-full ${theme === 'dark' ? 'bg-slate-800/50 text-slate-400' : 'bg-gray-100 text-slate-600'}`}>
                          Replying to {repliedMessage.username}
                        </div>
                      )}

                      <div className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                        isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : theme === 'dark' ? 'bg-slate-800 text-slate-200 rounded-tl-sm' : 'bg-gray-100 text-slate-900 rounded-tl-sm'
                      } ${msg.message === "⚠️ This message was unsent." ? 'italic opacity-60' : ''}`}>
                        {msg.message.includes('📎 File:') ? (
                          /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.message) ? (
                            <img 
                              src={`https://tubonge-backend-0d7b.onrender.com${msg.message.replace('📎 File: ', '')}`} 
                              alt="Uploaded" 
                              className="max-w-full rounded-lg max-h-48 object-cover"
                              onClick={() => window.open(`https://tubonge-backend-0d7b.onrender.com${msg.message.replace('📎 File: ', '')}`, '_blank')}
                            />
                          ) : (
                            <a href={`https://tubonge-backend-0d7b.onrender.com${msg.message.replace('📎 File: ', '')}`} target="_blank" rel="noopener noreferrer" className="underline">
                              📄 View File
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
                <div className={`text-xs italic px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {Object.keys(typingUsers).filter(u => u !== username).join(', ')} is typing...
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-3 border-t ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-300'}`}>
              {replyTo && (
                <div className={`flex justify-between items-center px-3 py-1 border rounded-t-lg text-xs mb-1 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gray-100 border-gray-300 text-slate-700'}`}>
                  <span className="truncate">Replying to {replyTo.username}</span>
                  <button onClick={() => setReplyTo(null)} className="text-red-400 font-bold">✕</button>
                </div>
              )}
              
              <div className="relative">
                {showEmojiPicker && (
                  <div className={`absolute bottom-14 left-0 border rounded-xl p-2 shadow-2xl flex flex-wrap gap-1 w-56 z-50 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`}>
                    {emojis.map((emoji, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => {
                          setMessage(prev => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className={`text-xl rounded p-1 transition ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className={`cursor-pointer px-3 py-2 rounded-xl flex items-center justify-center transition ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-gray-200 text-slate-900'}`}>
                  📎
                </label>

                <button 
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`px-3 py-2 rounded-xl flex items-center justify-center transition ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-gray-200 text-slate-900'}`}
                >
                  😀
                </button>
                
                <textarea 
                  placeholder={`Message #${room}...`}
                  className={`flex-1 p-2 rounded-xl focus:outline-none focus:border-indigo-500 transition resize-none h-[44px] max-h-32 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-slate-900'}`}
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition text-white disabled:opacity-50 flex items-center h-[44px]"
                  disabled={readyState !== 1}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* --- ALL YOUR MODALS REMAIN EXACTLY THE SAME --- */}
      
      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-md border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-300'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Settings</h2>
              <button onClick={() => setShowSettings(false)} className={`text-xl ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>✕</button>
            </div>
            
            {settingsError && <p className="text-red-400 mb-4 text-sm text-center">{settingsError}</p>}
            {settingsSuccess && <p className="text-green-400 mb-4 text-sm text-center">{settingsSuccess}</p>}
            
            <div className="flex flex-col items-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl overflow-hidden mb-3 ${profilePic ? 'bg-transparent' : getAvatarColor(username)}`}>
                {profilePic ? (
                  <img src={profilePic} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  username.charAt(0).toUpperCase()
                )}
              </div>
              <label htmlFor="profile-pic-upload" className="cursor-pointer text-sm text-indigo-400 hover:text-indigo-300 font-bold transition">
                {uploadingPic ? 'Uploading...' : 'Change Profile Picture'}
              </label>
              <input id="profile-pic-upload" type="file" accept="image/*" onChange={handleProfilePicUpload} className="hidden" />
            </div>

            <div className={`border-t pt-4 ${theme === 'dark' ? 'border-slate-800' : 'border-gray-300'}`}>
              <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Change Password</h3>
              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                <input type="password" placeholder="Current Password" className={`w-full p-4 rounded-xl focus:outline-none focus:border-indigo-500 border ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
                <input type="password" placeholder="New Password" className={`w-full p-4 rounded-xl focus:outline-none focus:border-indigo-500 border ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                <input type="password" placeholder="Confirm New Password" className={`w-full p-4 rounded-xl focus:outline-none focus:border-indigo-500 border ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white transition">Update Password</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE MEMBERS MODAL */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-md border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-300'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Manage #{room}</h2>
              <button onClick={() => setShowManageModal(false)} className={`text-xl ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>✕</button>
            </div>

            {manageError && <p className="text-red-400 mb-4 text-sm text-center">{manageError}</p>}
            {manageSuccess && <p className="text-green-400 mb-4 text-sm text-center">{manageSuccess}</p>}

            <form onSubmit={handleAddMember} className="flex gap-2 mb-6">
              <input type="text" placeholder="Username to add..." className={`flex-1 p-3 rounded-xl focus:outline-none focus:border-indigo-500 border ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required />
              <button type="submit" className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition">Add</button>
            </form>

            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Current Members</h3>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar">
              {roomMembers.map((member, idx) => {
                const memberPic = localStorage.getItem(`profile_pic_${member.username}`);
                return (
                  <div key={idx} className={`flex justify-between items-center p-3 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0 ${memberPic ? 'bg-transparent' : getAvatarColor(member.username)}`}>
                        {memberPic ? <img src={memberPic} alt="Avatar" className="w-full h-full object-cover" /> : member.username.charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{member.username}</span>
                      {member.role === 'admin' && <span className="text-[10px] bg-indigo-600/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">Admin</span>}
                    </div>
                    {member.username !== username && (
                      <button onClick={() => handleRemoveMember(member.username)} className="text-red-400 hover:text-red-300 text-xs font-bold transition">Remove</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DM MODAL */}
      {showDmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-md border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-300'}`}>
            <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>New Direct Message</h2>
            <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Enter the username of the person you want to chat with.</p>
            <input type="text" placeholder="Username" className={`w-full p-4 rounded-xl focus:outline-none focus:border-indigo-500 transition mb-4 border ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={dmTargetUser} onChange={(e) => setDmTargetUser(e.target.value)} autoFocus />
            {dmError && <p className="text-red-400 mb-4 text-sm">{dmError}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowDmModal(false); setDmTargetUser(''); setDmError(''); }} className={`px-6 py-3 font-bold transition ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Cancel</button>
              <button onClick={handleStartDm} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition shadow-lg shadow-indigo-500/30">Start Chat</button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM EDIT MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-md border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-300'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Edit Message</h2>
            <textarea className={`w-full p-4 rounded-xl focus:outline-none focus:border-indigo-500 transition resize-none h-32 mb-4 border ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={editMessageText} onChange={(e) => setEditMessageText(e.target.value)} autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditModalOpen(false)} className={`px-6 py-3 font-bold transition ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Cancel</button>
              <button onClick={saveEditedMessage} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition shadow-lg shadow-indigo-500/30">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM MODAL */}
      {confirmModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-md border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-300'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Are you sure?</h2>
            <p className={`mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{confirmMessage}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModalOpen(false)} className={`px-6 py-3 font-bold transition ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Cancel</button>
              <button onClick={() => { if (confirmAction) confirmAction(); setConfirmModalOpen(false); }} className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold transition shadow-lg shadow-red-500/30">Yes, Proceed</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;