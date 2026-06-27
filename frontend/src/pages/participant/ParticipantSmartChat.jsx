import React, { useState, useEffect, useRef } from 'react';
import ParticipantLayout from '../../components/layout/ParticipantLayout';
import { fetchChatMessages, sendChatMessage } from '../../services/committee';
import { fetchDashboard } from '../../api/participant';

export default function ParticipantSmartChat() {
  const [activeTab, setActiveTab] = useState('team'); // 'team' or 'mentor'
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState({ team: [], mentor: [] });
  
  // 🎤 Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // 📁 File Attachment States
  const fileInputRef = useRef(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // 📹 Video Call State
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);

  // 🎯 INNOVATION: Collapsible Milestone Panel States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [milestones, setMilestones] = useState([
    { id: 'm1', label: 'Ideation & Wireframing', icon: '🏁', completed: true },
    { id: 'm2', label: 'Frontend UI Prototype', icon: '🎨', completed: false },
    { id: 'm3', label: 'Backend Architecture & APIs', icon: '⚙️', completed: false },
    { id: 'm4', label: 'Core Integration & Testing', icon: '🚀', completed: false },
    { id: 'm5', label: 'Pitch Deck & Video submission', icon: '🎥', completed: false }
  ]);

  const [currentUser, setCurrentUser] = useState({
    name: 'Loading...',
    email: '',
    avatar: '👤',
    teamId: '',
    teamName: 'Your Team',
    mentorName: 'Not yet assigned',
    eventId: ''
  });

  const hasMentor = currentUser.mentorName && !currentUser.mentorName.includes('Not yet assigned') && !currentUser.mentorName.includes('Awaiting Assignment');

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const getDownloadableUrl = (url) => {
    if (!url) return '';
    if (url.includes('cloudinary.com') && url.includes('/image/upload/')) {
      return url.replace('/image/upload/', '/image/upload/fl_attachment/');
    }
    return url;
  };

  // Calculate dynamic progress values
  const completedCount = milestones.filter(m => m.completed).length;
  const progressPercent = Math.round((completedCount / milestones.length) * 100);

  // Handle milestone checking & sync updates directly into the feed
  const toggleMilestone = async (id, currentLabel, wasCompleted) => {
    const nextState = !wasCompleted;
    
    // 1. Optimistic local state update
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, completed: nextState } : m));

    // 2. Transmit milestone state switch log directly to the chat context stream
    try {
      await sendChatMessage({
        eventId: currentUser.eventId,
        teamId: currentUser.teamId,
        participantId: currentUser.email,
        channel: activeTab,
        message: `📢 Milestone Alert: "${currentLabel}" marked as ${nextState ? '✅ COMPLETED' : '❌ INCOMPLETE'}!`,
        senderName: currentUser.name,
        senderEmail: currentUser.email
      });
      syncActiveFeed();
    } catch (err) {
      console.error("Failed to broadcast milestone transaction status context:", err);
    }
  };

  useEffect(() => {
    async function resolveUserIdentity() {
      try {
        const dash = await fetchDashboard();
        if (dash && dash.team) {
          const selfMember = dash.team.members?.find(m => m.is_self) || {};
          setCurrentUser({
            name: selfMember.name || "Karan Singh",
            email: selfMember.email || "",
            avatar: selfMember.name === "Karan Singh" ? "🦁" : "👤", 
            teamId: dash.team.team_id || "",
            teamName: dash.team.team_name || "Active Workspace Node",
            mentorName: dash.team.mentor_name ? `${dash.team.mentor_name} (${dash.team.mentor_company || 'Advisor'})` : 'Awaiting Assignment',
            eventId: dash.team.event_id || "default_event"
          });
        }
      } catch (err) {
        console.error("Failed to query authenticated session profile payload:", err);
      }
    }
    resolveUserIdentity();
  }, []);

  const syncActiveFeed = async () => {
    if (!currentUser.teamId || !currentUser.eventId) return;
    try {
      const data = await fetchChatMessages(currentUser.eventId, currentUser.teamId, activeTab);
      if (data && data.messages) {
        setMessages(prev => {
          const currentCount = prev[activeTab]?.length || 0;
          const newCount = data.messages.length;
          
          if (newCount > currentCount && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
            if (isNearBottom) {
              setTimeout(() => scrollToBottom('smooth'), 100);
            }
          }
          return { ...prev, [activeTab]: data.messages };
        });
      }
    } catch (err) {
      console.warn("Sync loop refreshing stream connections...", err.message);
    }
  };

  useEffect(() => {
    if (!isVideoCallActive) {
      setTimeout(() => scrollToBottom('auto'), 50);
    }
  }, [activeTab, isVideoCallActive]);

  useEffect(() => {
    if (currentUser.teamId && currentUser.eventId) {
      syncActiveFeed();
      const pollerId = setInterval(syncActiveFeed, 4000);
      return () => clearInterval(pollerId);
    }
  }, [activeTab, currentUser.teamId, currentUser.eventId]);

  useEffect(() => {
    if (!hasMentor && activeTab === 'mentor') {
      setActiveTab('team');
    }
  }, [hasMentor, activeTab]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        handleSendAudio(audioBlob, audioUrl);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Please allow microphone access to send voice messages.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSendAudio = async (audioBlob, localAudioUrl) => {
    const localTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const optimisticBubble = {
      id: Date.now(),
      sender: currentUser.name,
      text: "🎤 Uploading Voice Note...", 
      audio_url: localAudioUrl, 
      email: currentUser.email,
      timestamp: localTime,
      avatar: currentUser.avatar
    };

    setMessages(prev => ({ ...prev, [activeTab]: [...(prev[activeTab] || []), optimisticBubble] }));
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob);
      formData.append('upload_preset', 'synapse_voice_uploads'); 
      formData.append('folder', `Synapse_App/VoiceNotes/${currentUser.teamId}`);

      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/ddvrirasp/video/upload`, {
        method: 'POST',
        body: formData
      });

      const cloudinaryData = await cloudinaryRes.json();
      if (!cloudinaryData.secure_url) {
        throw new Error("Cloudinary upload failed");
      }

      const permanentAudioUrl = cloudinaryData.secure_url;

      await sendChatMessage({
        eventId: currentUser.eventId,
        teamId: currentUser.teamId,
        participantId: currentUser.email,
        channel: activeTab,
        message: "🎤 Voice Message",
        audio_url: permanentAudioUrl,
        senderName: currentUser.name,
        senderEmail: currentUser.email
      });
      
      syncActiveFeed(); 
    } catch (err) {
      console.error("Failed to upload/sync voice message:", err);
      alert("Failed to upload voice message. Please try again.");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let detectedType = 'document';
    if (file.type.startsWith('image/')) {
      detectedType = 'image';
    } else if (file.type.startsWith('audio/')) {
      detectedType = 'audio';
    }

    const localTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const optimisticBubble = {
      id: Date.now(),
      sender: currentUser.name,
      text: `📁 Uploading ${file.name}...`,
      email: currentUser.email,
      timestamp: localTime,
      avatar: currentUser.avatar
    };

    setMessages(prev => ({ ...prev, [activeTab]: [...(prev[activeTab] || []), optimisticBubble] }));
    setIsUploadingFile(true);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'synapse_voice_uploads'); 
      formData.append('folder', `Synapse_App/Files/${currentUser.teamId}`);

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      let resourceEndpoint = 'raw';
      if (detectedType === 'image' || isPdf) {
        resourceEndpoint = 'image'; 
      } else if (detectedType === 'audio') {
        resourceEndpoint = 'video';
      }

      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/ddvrirasp/${resourceEndpoint}/upload`, {
        method: 'POST',
        body: formData
      });

      const cloudinaryData = await cloudinaryRes.json();
      if (!cloudinaryData.secure_url) {
        throw new Error("Cloudinary file upload failed");
      }

      let targetFileUrl = cloudinaryData.secure_url;

      if (isPdf && !targetFileUrl.toLowerCase().endsWith('.pdf')) {
        targetFileUrl = `${targetFileUrl}.pdf`;
      }

      await sendChatMessage({
        eventId: currentUser.eventId,
        teamId: currentUser.teamId,
        participantId: currentUser.email,
        channel: activeTab,
        message: `Shared an attachment: ${file.name}`,
        senderName: currentUser.name,
        senderEmail: currentUser.email,
        fileUrl: targetFileUrl,
        file_url: targetFileUrl,
        fileType: detectedType,
        file_type: detectedType,
        fileName: file.name,
        file_name: file.name
      });

      if (fileInputRef.current) fileInputRef.current.value = "";
      syncActiveFeed();
    } catch (err) {
      console.error("Failed to process file upload stream:", err);
      alert("Failed to upload attachment. Please try again.");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFormSubmission = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser.teamId) return;

    const textToSend = inputText;
    setInputText('');

    const localTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const optimisticBubble = {
      id: Date.now(),
      sender: currentUser.name,
      text: textToSend,
      email: currentUser.email,
      timestamp: localTime,
      avatar: currentUser.avatar
    };

    setMessages(prev => ({ ...prev, [activeTab]: [...(prev[activeTab] || []), optimisticBubble] }));
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      await sendChatMessage({
        eventId: currentUser.eventId,
        teamId: currentUser.teamId,
        participantId: currentUser.email,
        channel: activeTab,
        message: textToSend,
        senderName: currentUser.name,
        senderEmail: currentUser.email
      });
      syncActiveFeed();
    } catch (err) {
      console.error("Failed to sync transmission:", err);
    }
  };

  const jitsiRoomUrl = `https://meet.jit.si/Synapse_Node_${currentUser.teamId?.replace(/[^a-zA-Z0-9]/g, '') || 'Lobby'}`;

  return (
    <ParticipantLayout pageTitle="Synapse Chat" pageSubtitle={`Active Node Room: ${currentUser.teamName}`}>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 109px)', minHeight: '600px', paddingBottom: '20px' }}>
        
        {/* MAIN STRUCTURAL GRID WRAPPER */}
        <div style={{ display: 'flex', flex: 1, gap: '20px', width: '100%', height: '100%', overflow: 'hidden' }}>
          
          {/* LEFT CHAT SECTION PANEL */}
          <section style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)' }}>
            
            {/* HEADER TABS & VIDEO TOGGLE */}
            <div style={{ display: 'flex', justifyContent: 'space-between', background: '#1e293b', padding: '16px 24px', borderBottom: '1px solid #334155', alignItems: 'center', zIndex: 10 }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={() => setActiveTab('team')}
                  style={{ background: activeTab === 'team' ? 'rgba(79, 70, 229, 0.15)' : 'transparent', color: activeTab === 'team' ? '#818cf8' : '#94a3b8', border: activeTab === 'team' ? '1px solid rgba(79, 70, 229, 0.5)' : '1px solid transparent', padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  👥 Team Channel
                </button>
                <button
                  onClick={() => hasMentor && setActiveTab('mentor')}
                  disabled={!hasMentor}
                  title={!hasMentor ? "A mentor has not been assigned to your team yet." : ""}
                  style={{ background: activeTab === 'mentor' ? 'rgba(6, 182, 212, 0.15)' : 'transparent', color: !hasMentor ? '#475569' : activeTab === 'mentor' ? '#22d3ee' : '#94a3b8', border: activeTab === 'mentor' ? '1px solid rgba(6, 182, 212, 0.5)' : '1px solid transparent', padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: !hasMentor ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }}
                >
                  🎓 Mentor Channel {!hasMentor && '🔒'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                {/* SIDEBAR TOGGLE ACTION TRIGGER BUTTON */}
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  title={isSidebarOpen ? "Collapse Checklist Sidepanel" : "Expand Checklist Sidepanel"}
                  style={{ background: '#1e293b', color: isSidebarOpen ? '#818cf8' : '#94a3b8', border: '1px solid #334155', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  🎯
                </button>

                <button
                  onClick={() => setIsVideoCallActive(!isVideoCallActive)}
                  style={{ background: isVideoCallActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: isVideoCallActive ? '#f87171' : '#34d399', border: isVideoCallActive ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(16, 185, 129, 0.5)', padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }}
                >
                  {isVideoCallActive ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                      End Video Call
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      Join Video Room
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* DYNAMIC CONTENT AREA */}
            {isVideoCallActive ? (
              <div style={{ flex: 1, background: '#000', display: 'flex', flexDirection: 'column' }}>
                <iframe
                  src={`${jitsiRoomUrl}#config.prejoinPageEnabled=false`}
                  allow="camera; microphone; fullscreen; display-capture"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Team Video Call"
                />
              </div>
            ) : (
              <div ref={scrollContainerRef} style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundColor: '#0f172a' }}>
                {messages[activeTab] && messages[activeTab].map((msg) => {
                  const isMe = msg.email === currentUser.email;
                  const displayName = msg.sender ? msg.sender.replace(" (You)", "") : "User"; 

                  const targetAudioTrack = msg.audio || msg.audioUrl || msg.audio_url;
                  const fileLink = msg.fileUrl || msg.file_url;
                  const fileType = msg.fileType || msg.file_type;
                  const fileName = msg.fileName || msg.file_name || "Attachment File";

                  // Render standard or system logs differently if needed
                  const isSystemAlert = msg.text?.includes("📢 Milestone Alert:");

                  return (
                    <div key={msg.id} style={{ display: 'flex', width: '100%', justifyContent: isSystemAlert ? 'center' : isMe ? 'flex-end' : 'flex-start' }}>
                      {isSystemAlert ? (
                        <div style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px dashed #4f46e5', color: '#a5b4fc', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                          {msg.text}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '10px', maxWidth: '75%' }}>
                          {!isMe && (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1e293b', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, marginBottom: '2px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                              {msg.avatar || "👤"}
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            {!isMe && <span style={{ fontSize: '12px', fontWeight: '600', color: '#818cf8', marginBottom: '6px', marginLeft: '4px' }}>{displayName}</span>}
                            
                            <div style={{ 
                              background: isMe ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' : '#1e293b', 
                              color: isMe ? '#ffffff' : '#e2e8f0', 
                              padding: '12px 16px', 
                              borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px', 
                              border: isMe ? '1px solid #4f46e5' : '1px solid #334155', 
                              fontSize: '14.5px', 
                              lineHeight: '1.6',
                              boxShadow: isMe ? '0 4px 12px rgba(79, 70, 229, 0.3)' : '0 4px 12px rgba(0,0,0,0.1)'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {msg.text && <div>{msg.text}</div>}
                                
                                {targetAudioTrack && (
                                  <audio controls src={targetAudioTrack} style={{ height: '36px', maxWidth: '220px', outline: 'none', marginTop: '4px' }} />
                                )}

                                {fileLink && (
                                  <div style={{ marginTop: '4px' }}>
                                    {fileType === 'image' ? (
                                      <a href={fileLink} target="_blank" rel="noreferrer">
                                        <img src={fileLink} alt={fileName} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }} />
                                      </a>
                                    ) : fileType === 'audio' ? (
                                      <audio controls src={fileLink} style={{ height: '36px', maxWidth: '220px' }} />
                                    ) : (
                                      <a href={getDownloadableUrl(fileLink)} download={fileName} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px', color: '#38bdf8', textDecoration: 'none', fontWeight: '500', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        📄 <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px', fontSize: '13px' }}>{fileName}</span>
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <div style={{ fontSize: '10px', color: isMe ? 'rgba(255,255,255,0.7)' : '#64748b', textAlign: 'right', marginTop: '6px', fontWeight: '500' }}>
                                {msg.timestamp}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* INPUT AREA */}
            {!isVideoCallActive && (
              <div style={{ padding: '16px 24px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', borderTop: '1px solid #1e293b', zIndex: 10 }}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" />

                <form onSubmit={handleFormSubmission} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: (isRecording || isUploadingFile) ? 'rgba(239, 68, 68, 0.1)' : '#1e293b', padding: '6px 6px 6px 20px', borderRadius: '30px', border: (isRecording || isUploadingFile) ? '1px solid #ef4444' : '1px solid #334155', transition: 'all 0.3s ease' }}>
                  {isRecording ? (
                    <div style={{ flex: 1, color: '#ef4444', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                      Recording Audio... Click Stop to Send
                    </div>
                  ) : isUploadingFile ? (
                    <div style={{ flex: 1, color: '#38bdf8', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🌐 Uploading Asset Content Stream... Please Wait
                    </div>
                  ) : (
                    <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={activeTab === 'team' ? "Message your team..." : "Ask your mentor..."} style={{ flex: 1, background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '15px', outline: 'none', padding: '8px 0' }} />
                  )}

                  {!isRecording && !isUploadingFile && (
                    <button type="button" onClick={() => fileInputRef.current?.click()} title="Upload File Attachment" style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'} onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </button>
                  )}

                  {!isUploadingFile && (
                    <button type="button" onClick={isRecording ? stopRecording : startRecording} title={isRecording ? "Stop & Send Audio" : "Record Audio"} style={{ background: 'transparent', color: isRecording ? '#ef4444' : '#94a3b8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', transition: 'color 0.2s' }}>
                      {isRecording ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16"><path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/><path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z"/></svg>
                      )}
                    </button>
                  )}

                  {!isRecording && !isUploadingFile && (
                    <button type="submit" disabled={!inputText.trim()} style={{ background: inputText.trim() ? (activeTab === 'team' ? '#4f46e5' : '#06b6d4') : '#334155', color: inputText.trim() ? '#fff' : '#64748b', border: 'none', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: inputText.trim() ? 'pointer' : 'default', transition: 'all 0.2s ease' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" style={{ marginLeft: inputText.trim() ? '-2px' : '0' }}><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/></svg>
                    </button>
                  )}
                </form>
              </div>
            )}
          </section>

          {/* 🎯 RIGHT SIDEBAR: LIVE DELIVERABLE TRACKER */}
          <aside style={{
            width: isSidebarOpen ? '320px' : '0px',
            opacity: isSidebarOpen ? 1 : 0,
            visibility: isSidebarOpen ? 'visible' : 'hidden',
            background: '#0f172a',
            border: isSidebarOpen ? '1px solid #1e293b' : 'none',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)'
          }}>
            {/* Sidebar Title */}
            <div style={{ padding: '20px 24px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: '700', letterSpacing: '0.3px' }}>
                🚀 Node Deliverables
              </h3>
              <span style={{ background: 'rgba(79, 70, 229, 0.2)', color: '#818cf8', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '8px' }}>
                LIVE
              </span>
            </div>

            {/* Progress Bar Header Area */}
            <div style={{ padding: '20px 24px', background: 'rgba(30, 41, 59, 0.4)', borderBottom: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', fontWeight: '600' }}>
                <span style={{ color: '#94a3b8' }}>Submission Ready</span>
                <span style={{ color: '#34d399' }}>{progressPercent}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5 0%, #34d399 100%)', borderRadius: '10px', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Checklist Scroller Body */}
            <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {milestones.map((milestone) => (
                <div 
                  key={milestone.id} 
                  onClick={() => toggleMilestone(milestone.id, milestone.label, milestone.completed)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    background: milestone.completed ? 'rgba(16, 185, 129, 0.04)' : '#1e293b',
                    border: milestone.completed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #334155',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: milestone.completed ? 'none' : '0 4px 6px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = milestone.completed ? 'rgba(16, 185, 129, 0.5)' : '#4f46e5';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = milestone.completed ? 'rgba(16, 185, 129, 0.3)' : '#334155';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {/* Custom Checkbox Node */}
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    border: milestone.completed ? '2px solid #10b981' : '2px solid #64748b',
                    background: milestone.completed ? '#10b981' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '11px',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}>
                    {milestone.completed && '✓'}
                  </div>

                  {/* Label Context Text */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '16px' }}>{milestone.icon}</span>
                    <span style={{
                      fontSize: '13.5px',
                      fontWeight: '500',
                      color: milestone.completed ? '#64748b' : '#e2e8f0',
                      textDecoration: milestone.completed ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      transition: 'color 0.2s'
                    }}>
                      {milestone.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Information Footer block inside panel */}
            <div style={{ padding: '16px 20px', background: 'rgba(30, 41, 59, 0.3)', borderTop: '1px solid #1e293b', fontSize: '11px', color: '#64748b', textAlign: 'center', lineHeight: '1.4' }}>
              Checking milestones updates your workspace status automatically.
            </div>
          </aside>

        </div>

      </div>
    </ParticipantLayout>
  );
}