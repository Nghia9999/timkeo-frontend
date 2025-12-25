'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { chatAPI, userAPI, postAPI } from '@/lib/api';
import { FiArrowLeft, FiSend, FiMessageCircle } from 'react-icons/fi';
import { io, Socket } from 'socket.io-client';
import UserProfileModal from '@/components/UserProfileModal';
import RatingModal from '@/components/RatingModal';

interface Chat {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  _id: string;
  postId: string;
  participants: string[];
    isMatch: 'no' | 'waiting' | 'confirm';
    confirmBy?: string;
}

export default function ChatPage() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [newMessageInfo, setNewMessageInfo] = useState<Chat | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [otherParticipant, setOtherParticipant] = useState<{ _id: string; name: string; avatar?: string } | null>(null);
  const [postInactive, setPostInactive] = useState(false);
  const [postOwnerId, setPostOwnerId] = useState<string | null>(null);
  const [postMatchId, setPostMatchId] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;
  const search = useSearchParams();
  const conversationIdFromQuery = search.get('conversationId');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/feed');
      return;
    }

    loadConversation();
  }, [postId, user]);

  useEffect(() => {
    if (!user || !conversation) return;

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const newSocket = io(API_BASE_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket');
      // Join personal user room so we receive notifications even outside this conversation
      newSocket.emit('join_user', { userId: user.id });
      newSocket.emit('join_conversation', { conversationId: conversation._id });
    });

    newSocket.on('new_message', (data: Chat) => {
      setChats((prev) => {
        // avoid duplicates when same message arrives multiple times
        if (prev.some((c) => c._id === data._id)) return prev;
        return [...prev, data];
      });
      // Thông báo nhỏ khi có tin nhắn mới từ người khác
      if (data.senderId !== user.id) {
        setNewMessageInfo(data);
        setTimeout(() => setNewMessageInfo(null), 3000);
      }
    });

    newSocket.on('conversation_updated', async (data: any) => {
      try {
        // Ensure we refresh post-level status whenever any conversation update arrives
        // so the confirm button is disabled immediately if the post was matched elsewhere.
        try {
          const postResp = await postAPI.getOne(postId);
          const post = postResp.data as any;
          const matchId = post.matchId ? String(post.matchId) : null;
          setPostMatchId(matchId);
          setPostInactive(String(post.status || '').toLowerCase() === 'inactive');
          const ownerId = typeof post.userId === 'string' ? post.userId : (post.userId && post.userId._id) || null;
          setPostOwnerId(ownerId);
        } catch (e) {
          // non-fatal; proceed to handle conversation update
        }

        // If this update is for our current conversation and became confirmed, open rating
        if (conversation && data._id === conversation._id) {
          setConversation(data);
          if (data.isMatch === 'confirm') {
            // refresh post to get matchId
            try {
              const postResp = await postAPI.getOne(postId);
              const post = postResp.data as any;
              const matchId = post.matchId ? String(post.matchId) : null;
              setPostMatchId(matchId);

              // If there's a matchId, check whether current user already rated
              let alreadyRated = false;
              if (matchId && user) {
                try {
                  const r = await (await import('@/lib/api')).ratingAPI.findByMatch(matchId);
                  const ratings = r.data as any[];
                  alreadyRated = ratings.some((rt) => String(rt.raterId) === String(user.id));
                } catch (e) {
                  console.error('Failed to check existing ratings', e);
                }
              }

              const dismissedKey = `rating_dismissed_${matchId}_${user?.id}`;
              const dismissed = typeof window !== 'undefined' && matchId ? localStorage.getItem(dismissedKey) === 'true' : false;

              if (!alreadyRated && !dismissed) {
                setShowRatingModal(true);
              }
            } catch (e) {
              console.error('Failed to refresh post after conversation update', e);
            }
          }
        }
      } catch (e) {
        console.error('Error handling conversation_updated', e);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [conversation, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const loadConversation = async () => {
    try {
      // Load post info to determine if it's inactive (client-side guard)
      try {
        const postResp = await postAPI.getOne(postId);
        const post = postResp.data as any;
        const ownerId = typeof post.userId === 'string' ? post.userId : (post.userId && post.userId._id) || null;
        setPostOwnerId(ownerId);
        setPostInactive(String(post.status || '').toLowerCase() === 'inactive');
        setPostMatchId(post.matchId ? String(post.matchId) : null);
      } catch (e) {
        console.error('Failed to load post info:', e);
      }
      // Nếu có conversationId trong query param, ưu tiên lấy conversation đó
      if (conversationIdFromQuery) {
        const resp = await chatAPI.getConversationById(conversationIdFromQuery);
        const conv = resp.data;
        if (conv) {
          setConversation(conv);
          loadChats(conv._id);
          // try to load other participant info when possible
          try {
            const otherId = (conv.participants || []).find((p: string) => p !== user?.id);
            if (otherId) {
              const u = await userAPI.getOne(otherId);
              setOtherParticipant(u.data);
            }
          } catch (e) {
            console.error(e);
          }
          setLoading(false);
          return;
        }
      }
      // Tìm conversation theo postId
      const response = await chatAPI.getConversationsByPost(postId);
      const conversations = response.data;

      let conv: Conversation | null = null;

      // Tìm conversation có user hiện tại
      if (user) {
        conv =
          conversations.find((c: Conversation) =>
            c.participants.includes(user.id),
          ) || null;
      }

      // Nếu chưa có, tạo mới (chỉ khi user không phải chủ bài, vì đã chặn ở feed)
      if (!conv && user) {
        const createResponse = await chatAPI.createConversation({
          postId,
          participants: [user.id],
          isMatch: 'no',
        });
        conv = createResponse.data;
      }

      if (conv) {
        setConversation(conv);
        loadChats(conv._id);
        // load other participant info
        try {
          const otherId = (conv.participants || []).find((p: string) => p !== user?.id);
          if (otherId) {
            const u = await userAPI.getOne(otherId);
            setOtherParticipant(u.data);
          }
        } catch (e) {
          console.error(e);
        }
        // socket sẽ join sau khi useEffect socket chạy
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conversation?.isMatch === 'confirm') {
      // Open rating modal when match confirmed, but only if not already rated/dismissed
      (async () => {
        try {
          const postResp = await postAPI.getOne(postId);
          const post = postResp.data as any;
          const matchId = post.matchId ? String(post.matchId) : null;
          setPostMatchId(matchId);

          let alreadyRated = false;
          if (matchId && user) {
            try {
              const r = await (await import('@/lib/api')).ratingAPI.findByMatch(matchId);
              const ratings = r.data as any[];
              alreadyRated = ratings.some((rt) => String(rt.raterId) === String(user.id));
            } catch (e) {
              console.error('Failed to check existing ratings', e);
            }
          }

          const dismissedKey = `rating_dismissed_${matchId}_${user?.id}`;
          const dismissed = typeof window !== 'undefined' && matchId ? localStorage.getItem(dismissedKey) === 'true' : false;

          if (!alreadyRated && !dismissed) setShowRatingModal(true);
        } catch (e) {
          console.error(e);
        }
      })();
    }
  }, [conversation?.isMatch]);

  const loadChats = async (conversationId: string) => {
    try {
      const response = await chatAPI.getChats(conversationId);
      console.log('Loaded chats:', response.data);
      setChats(response.data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const cancelMatch = async () => {
    if (!conversation) return;
    try {
      const updated = await chatAPI.updateConversation(conversation._id, {
        isMatch: 'no',
        waitingBy: null,
      });
      setConversation(updated.data);
    } catch (e) {
      console.error('Failed to cancel match:', e);
      alert('Không thể huỷ, thử lại sau.');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversation || !user || !socket) return;

    const chatData = {
      conversationId: conversation._id,
      senderId: user.id,
      content: message,
    };

    // Gửi qua WebSocket để realtime
    socket.emit('send_message', chatData);
    setMessage('');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Đang tải cuộc trò chuyện...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <FiArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Trò chuyện
                </h1>
                <p className="text-xs text-gray-500">{otherParticipant?.name || 'Chat realtime'}</p>
              </div>
            </div>
            {conversation && (
              (() => {
                const baseDisabled =
                  conversation.isMatch === 'confirm' ||
                  (conversation.isMatch === 'waiting' && conversation.waitingBy === user?.id);
                const postClosed = Boolean(postMatchId) || (postInactive && user?.id !== postOwnerId);

                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                      if (!conversation || !user) return;
                      if (postClosed) {
                        if (postMatchId) {
                          alert('Bài viết đã được chốt kèo, không thể chốt hoặc xác nhận nữa.');
                        } else {
                          alert('Bài đăng đã không còn hoạt động, không thể chốt kèo.');
                        }
                        return;
                      }
                      try {
                        if (conversation.isMatch === 'no') {
                          const updated = await chatAPI.updateConversation(conversation._id, {
                            isMatch: 'waiting',
                            waitingBy: user.id,
                          });
                          setConversation(updated.data);
                          return;
                        }

                        if (conversation.isMatch === 'waiting' && conversation.confirmBy !== user.id) {
                          const updated = await chatAPI.updateConversation(conversation._id, {
                            isMatch: 'confirm',
                          });
                          setConversation(updated.data);
                          try {
                            const postResp = await postAPI.getOne(postId);
                            const post = postResp.data as any;
                            const matchId = post.matchId ? String(post.matchId) : null;
                            setPostMatchId(matchId);

                            // check existing ratings and dismissed flag
                            let alreadyRated = false;
                            if (matchId && user) {
                              try {
                                const r = await (await import('@/lib/api')).ratingAPI.findByMatch(matchId);
                                const ratings = r.data as any[];
                                alreadyRated = ratings.some((rt) => String(rt.raterId) === String(user.id));
                              } catch (e) {
                                console.error('Failed to check existing ratings', e);
                              }
                            }
                            const dismissedKey = `rating_dismissed_${matchId}_${user?.id}`;
                            const dismissed = typeof window !== 'undefined' && matchId ? localStorage.getItem(dismissedKey) === 'true' : false;

                            if (!alreadyRated && !dismissed) {
                              setShowRatingModal(true);
                            }
                          } catch (e) {
                            console.error('Failed to refresh post after confirm', e);
                          }
                          alert('✓ Đã chốt kèo!');
                          return;
                        }
                      } catch (e) {
                        console.error(e);
                        alert('Không thể chốt kèo, thử lại sau.');
                      }
                      }}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm transition-all ${
                        baseDisabled
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : postClosed
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md hover:scale-105 active:scale-95'
                      }`}
                      disabled={Boolean(baseDisabled) || postClosed}
                    >
                      {conversation.isMatch === 'no' && 'Chốt kèo'}
                      {conversation.isMatch === 'waiting' && conversation.waitingBy === user?.id && 'Chờ xác nhận'}
                      {conversation.isMatch === 'waiting' && conversation.waitingBy !== user?.id && 'Xác nhận'}
                      {conversation.isMatch === 'confirm' && '✓ Đã chốt kèo'}
                    </button>

                    {conversation.isMatch === 'waiting' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelMatch();
                        }}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        Huỷ
                      </button>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-[url('https://static.xx.fbcdn.net/rsrc.php/v3/yV/r/FhOLTyUvlNF.png')] bg-repeat bg-fixed">
        <div className="mx-auto max-w-2xl space-y-3">
          {chats.length === 0 ? (
            <div className="flex h-full items-center justify-center py-20">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <FiMessageCircle className="h-8 w-8 text-blue-500" />
                </div>
                <p className="mt-4 text-gray-500 font-medium">Chưa có tin nhắn nào</p>
                <p className="mt-1 text-sm text-gray-400">Bắt đầu cuộc trò chuyện ngay!</p>
              </div>
            </div>
          ) : (
            chats.map((chat, index) => {
              const isOwn = chat.senderId === user?.id;
              return (
                <div
                  key={chat._id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                  style={{
                    animationDelay: `${index * 30}ms`,
                  }}
                >
                  <div className={`flex max-w-[75%] items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isOwn && (
                      <button
                        onClick={() => {
                          // Tìm người đối thoại từ conversation participants
                          if (conversation) {
                            const otherParticipant = conversation.participants.find(
                              (p) => p !== user?.id
                            );
                            if (otherParticipant) {
                              setSelectedUserId(otherParticipant);
                              setIsProfileModalOpen(true);
                            }
                          }
                        }}
                        className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 ring-2 ring-white shadow-sm cursor-pointer hover:ring-blue-400 transition-all hover:scale-110"
                      />
                    )}
                    <div
                      className={`group rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all hover:shadow-md ${
                        isOwn
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                      }`}
                    >
                      <p className="leading-relaxed break-words">{chat.content}</p>
                      <p
                        className={`mt-1.5 text-[10px] font-medium ${
                          isOwn ? 'text-blue-100' : 'text-gray-400'
                        }`}
                      >
                        {new Date(chat.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* New message toast */}
      {newMessageInfo && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-20 w-full max-w-xs -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
          <div className="rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 text-xs text-white shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-medium">Tin nhắn mới:</span>
            </div>
            <p className="mt-1 font-semibold truncate">{newMessageInfo.content}</p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 bg-white/90 backdrop-blur-sm shadow-lg">
        <form onSubmit={sendMessage} className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={!message.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <FiSend className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>

      {/* User Profile Modal */}
      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedUserId(null);
          }}
        />
      )}
      <RatingModal
        isOpen={showRatingModal && Boolean(postMatchId) && Boolean(otherParticipant)}
        onClose={() => {
          // remember dismissal so modal won't reappear for this match & user
          try {
            const key = `rating_dismissed_${postMatchId}_${user?.id}`;
            if (typeof window !== 'undefined' && postMatchId) localStorage.setItem(key, 'true');
          } catch (e) {
            console.error(e);
          }
          setShowRatingModal(false);
        }}
        matchId={postMatchId || ''}
        raterId={user?.id || ''}
        rateeId={otherParticipant?._id || ''}
        onSubmitted={() => {
          // mark as done so modal won't reappear
          try {
            const key = `rating_dismissed_${postMatchId}_${user?.id}`;
            if (typeof window !== 'undefined' && postMatchId) localStorage.setItem(key, 'true');
          } catch (e) {
            console.error(e);
          }
          setShowRatingModal(false);
        }}
      />
    </div>
  );
}

