'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { chatAPI } from '@/lib/api';
import { FiArrowLeft, FiMessageCircle } from 'react-icons/fi';
import UserProfileModal from '@/components/UserProfileModal';

interface LastMessage {
  _id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

interface OtherParticipant {
  _id: string;
  name: string;
  avatar?: string;
}

interface Conversation {
  _id: string;
  postId: string | {
    _id: string;
    title: string;
    sport: string;
  };
  participants: OtherParticipant[];
  isMatch: 'no' | 'waiting' | 'confirm';
  updatedAt: string;
  lastMessage: LastMessage | null;
  otherParticipant: OtherParticipant | null;
  postTitle: string;
  postSport: string;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/feed');
      return;
    }

    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    try {
      const response = await chatAPI.getConversationsWithDetails(user!.id);
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (days === 1) {
      return 'Hôm qua';
    } else if (days < 7) {
      return `${days} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const getDisplayName = (conv: Conversation) => {
    if (conv.otherParticipant) {
      return conv.otherParticipant.name;
    }
    return 'Người dùng';
  };

  const getDisplayAvatar = (conv: Conversation) => {
    if (conv.otherParticipant?.avatar) {
      return conv.otherParticipant.avatar;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Đang tải tin nhắn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <FiArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Tin nhắn
            </h1>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                <FiMessageCircle className="h-10 w-10 text-blue-500" />
              </div>
              <p className="mt-6 text-lg font-semibold text-gray-800">
                Chưa có cuộc trò chuyện nào
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Nhắn tin với người đăng bài để bắt đầu trò chuyện
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl px-2 py-2">
            {conversations.map((conv, index) => {
              const displayName = getDisplayName(conv);
              const displayAvatar = getDisplayAvatar(conv);
              const lastMessage = conv.lastMessage;
              const isOwnMessage = lastMessage?.senderId === user?.id;

              return (
                <button
                  key={conv._id}
                  onClick={() => {
                    const postId =
                      typeof conv.postId === 'string'
                        ? conv.postId
                        : conv.postId._id;
                    // navigate to chat page and pass conversationId to open exact conversation
                    router.push(`/chat/${postId}?conversationId=${conv._id}`);
                  }}
                  className="group w-full rounded-xl px-4 py-3 text-left transition-all hover:bg-white hover:shadow-md"
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (conv.otherParticipant?._id && conv.otherParticipant._id !== user?.id) {
                            setSelectedUserId(conv.otherParticipant._id);
                            setIsProfileModalOpen(true);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {displayAvatar ? (
                          <img
                            src={displayAvatar}
                            alt={displayName}
                            className="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow-md transition-transform group-hover:scale-105 hover:ring-blue-400"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-md ring-2 ring-white transition-transform group-hover:scale-105 hover:ring-blue-400">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </button>
                      {conv.isMatch === 'confirm' && (
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 ring-2 ring-white">
                          <span className="text-[10px]">✓</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (conv.otherParticipant?._id && conv.otherParticipant._id !== user?.id) {
                              setSelectedUserId(conv.otherParticipant._id);
                              setIsProfileModalOpen(true);
                            }
                          }}
                          className="font-semibold text-gray-800 truncate hover:text-blue-600 transition-colors cursor-pointer text-left"
                        >
                          {displayName}
                        </button>
                        {lastMessage && (
                          <span className="flex-shrink-0 text-xs font-medium text-gray-400">
                            {formatTime(lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5">
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {lastMessage ? (
                            <>
                              {isOwnMessage && (
                                <span className="font-medium text-gray-400">
                                  Bạn:{' '}
                                </span>
                              )}
                              {lastMessage.content}
                            </>
                          ) : (
                            <span className="text-gray-400 italic">
                              {conv.postTitle || 'Chưa có tin nhắn'}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {conv.postSport}
                        </span>
                        {conv.isMatch === 'confirm' && (
                          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                            Đã chốt kèo
                          </span>
                        )}
                        {conv.isMatch === 'waiting' && (
                          <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
                            Chờ xác nhận
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
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
    </div>
  );
}

