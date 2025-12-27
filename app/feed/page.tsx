'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { chatAPI, postAPI } from '@/lib/api';
import { FiPlus, FiMessageCircle, FiUser } from 'react-icons/fi';
import UserProfileModal from '@/components/UserProfileModal';
import MapThumbnail from '@/components/MapThumbnail';
import { getLatLngFromLocation } from '@/lib/geo';

interface PostUser {
  _id: string;
  name: string;
  avatar?: string;
}

interface Post {
  _id: string;
  userId: string | PostUser;
  sport: string;
  title: string;
  content: string;
  startTime: string;
  endTime: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  status: string;
  image?: string;
  createdAt: string;
  interestedUserId?: any[];
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [onlyPreferredSports, setOnlyPreferredSports] = useState<boolean>(false);
  const [hasNewMessages, setHasNewMessages] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const router = useRouter();
  const { user, login } = useAuth();

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (!user) {
      setHasNewMessages(false);
      return;
    }

    const checkMessages = async () => {
      try {
        const convRes = await chatAPI.getConversationsByUser(user.id);
        const conversations = convRes.data as {
          _id: string;
          postId: string;
          participants: string[];
          isMatch: 'no' | 'waiting' | 'confirm';
        }[];

        if (!conversations.length) {
          setHasNewMessages(false);
          return;
        }

        // Lấy last message của từng conversation (đơn giản, chấp nhận thêm call)
        let hasNew = false;
        for (const conv of conversations) {
          const chatsRes = await chatAPI.getChats(conv._id);
          const chats = chatsRes.data as {
            senderId: string;
          }[];
          if (!chats.length) continue;
          const last = chats[chats.length - 1];
          if (last.senderId !== user.id) {
            hasNew = true;
            break;
          }
        }

        setHasNewMessages(hasNew);
      } catch (e) {
        console.error('Failed to check messages:', e);
      }
    };

    checkMessages();
  }, [user]);

  const loadPosts = async () => {
    try {
      const response = await postAPI.getAll();
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = () => {
    if (!user) {
      login();
      return;
    }
    router.push('/create-post');
  };

  const handleChat = (post: Post) => {
    if (!user) {
      login();
      return;
    }

    (async () => {
      try {
        // Kiểm tra server đã có conversation cho post này và user chưa
        const convRes = await chatAPI.getConversationsByPost(post._id);
        const conversations = convRes.data as any[];
        let existingConv = null;
        if (user) {
          existingConv = conversations.find((c) => c.participants?.includes(user.id));
        }

        if (existingConv) {
          // navigate to the specific existing conversation
          router.push(`/chat/${post._id}?conversationId=${existingConv._id}`);
          return;
        }

        if (!existingConv && user) {
          // Tạo mới conversation (server sẽ tự thêm post owner vào participants)
          const createRes = await chatAPI.createConversation({ postId: post._id, participants: [user.id], isMatch: 'no' });
          const createdConv = createRes.data;
          router.push(`/chat/${post._id}?conversationId=${createdConv._id}`);
          return;
        }
      } catch (e) {
        console.error('Failed to ensure conversation exists:', e);
      } finally {
        // fallback navigation if something went wrong
        router.push(`/chat/${post._id}`);
      }
    })();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  };

  const preferredSports: string[] = useMemo(() => {
    if (!user?.sport) return [];
    try {
      const parsed = JSON.parse(user.sport);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
    return [];
  }, [user]);

  const filteredAndSortedPosts = useMemo(() => {
    const now = new Date();

    let result = [...posts];

    // Filter by sport
    if (sportFilter !== 'all') {
      result = result.filter((p) => p.sport === sportFilter);
    }

    // Filter by time
    if (timeFilter === 'today') {
      result = result.filter((p) => {
        const start = new Date(p.startTime);
        return (
          start.getFullYear() === now.getFullYear() &&
          start.getMonth() === now.getMonth() &&
          start.getDate() === now.getDate()
        );
      });
    } else if (timeFilter === 'next3days') {
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      result = result.filter((p) => {
        const start = new Date(p.startTime);
        return start >= now && start <= threeDaysLater;
      });
    }

    // Ưu tiên các môn yêu thích
    if (preferredSports.length > 0) {
      result.sort((a, b) => {
        const aPreferred = preferredSports.includes(a.sport) ? 1 : 0;
        const bPreferred = preferredSports.includes(b.sport) ? 1 : 0;
        if (aPreferred !== bPreferred) return bPreferred - aPreferred;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      if (onlyPreferredSports) {
        result = result.filter((p) => preferredSports.includes(p.sport));
      }
    } else {
      // Nếu không có môn yêu thích, sort theo createdAt mới nhất
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return result;
  }, [posts, sportFilter, timeFilter, preferredSports, onlyPreferredSports]);

  const availableSports = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (p.sport) set.add(p.sport);
    });
    return Array.from(set);
  }, [posts]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Đang tải bài đăng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              TimKeo
            </h1>
            <div className="flex items-center gap-2">
              {user && (
                <button
                  onClick={() => router.push('/messages')}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-all hover:bg-gray-100 hover:scale-105 active:scale-95"
                  title="Tin nhắn"
                >
                  <FiMessageCircle className="h-6 w-6" />
                  {hasNewMessages && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 border-2 border-white animate-pulse" />
                  )}
                </button>
              )}
              {user && (
                <button
                  onClick={() => router.push('/profile')}
                  className="flex items-center gap-2 rounded-full px-2 py-1.5 transition-all hover:bg-gray-100 hover:scale-105 active:scale-95"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-8 w-8 rounded-full ring-2 ring-white shadow-md"
                  />
                  <span className="hidden sm:inline font-medium text-gray-700">{user.name}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-2xl px-4 pt-4">
        <div className="mb-4 rounded-2xl bg-white/80 backdrop-blur-sm p-4 shadow-md border border-gray-100 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col flex-1 min-w-[140px]">
            <span className="text-xs font-semibold text-gray-600 mb-1.5">Môn chơi</span>
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Tất cả</option>
              {availableSports.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col flex-1 min-w-[140px]">
            <span className="text-xs font-semibold text-gray-600 mb-1.5">Thời gian</span>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Tất cả</option>
              <option value="today">Trong hôm nay</option>
              <option value="next3days">Trong 3 ngày tới</option>
            </select>
          </div>

          {preferredSports.length > 0 && (
            <button
              onClick={() => setOnlyPreferredSports((v) => !v)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95 ${
                onlyPreferredSports
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              ⭐ Ưu tiên môn yêu thích
            </button>
          )}
        </div>
      </div>

      {/* Posts */}
      <div className="mx-auto max-w-2xl px-4 py-6">
        {filteredAndSortedPosts.length === 0 ? (
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-12 text-center shadow-lg border border-gray-100">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
              <FiPlus className="h-10 w-10 text-blue-500" />
            </div>
            <p className="mt-6 text-lg font-semibold text-gray-800">Chưa có bài đăng nào</p>
            <p className="mt-2 text-sm text-gray-500">Hãy tạo bài đăng đầu tiên để bắt đầu!</p>
            <button
              onClick={handleCreatePost}
              className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-white font-semibold shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
            >
              Tạo bài đăng đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredAndSortedPosts.map((post, index) => {
                const postUser =
                  typeof post.userId === 'string'
                    ? undefined
                    : (post.userId as PostUser);
                const interestedCount = post.interestedUserId
                  ? post.interestedUserId.length
                  : 0;

                const start = new Date(post.startTime);
                const isExpired = !isNaN(start.getTime()) && start.getTime() < Date.now();
                const matchId = (post as any).matchId ?? null;
                const isMatched = Boolean(matchId);

                return (
              <div
                key={post._id}
                className="group rounded-2xl bg-white/80 backdrop-blur-sm p-5 shadow-md border border-gray-100 transition-all hover:shadow-xl hover:scale-[1.01]"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {postUser?.avatar ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const ownerId =
                            typeof post.userId === 'string'
                              ? post.userId
                              : (post.userId as PostUser)._id;
                          if (ownerId && ownerId !== user?.id) {
                            setSelectedUserId(ownerId);
                            setIsProfileModalOpen(true);
                          }
                        }}
                        className="cursor-pointer"
                      >
                                <img
                                  src={postUser.avatar}
                                  alt={postUser.name}
                                  className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-md transition-transform group-hover:scale-105 hover:ring-blue-400"
                                  width={48}
                                  height={48}
                                  loading="lazy"
                                />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const ownerId =
                            typeof post.userId === 'string'
                              ? post.userId
                              : (post.userId as PostUser)._id;
                          if (ownerId && ownerId !== user?.id) {
                            setSelectedUserId(ownerId);
                            setIsProfileModalOpen(true);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-bold text-white shadow-md ring-2 ring-white transition-transform group-hover:scale-105 hover:ring-blue-400">
                          {(postUser?.name || 'U')
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      </button>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const ownerId =
                              typeof post.userId === 'string'
                                ? post.userId
                                : (post.userId as PostUser)._id;
                            if (ownerId && ownerId !== user?.id) {
                              setSelectedUserId(ownerId);
                              setIsProfileModalOpen(true);
                            }
                          }}
                          className="text-base font-bold text-gray-800 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {postUser?.name || 'Người chơi ẩn danh'}
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {post.sport}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(post.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isMatched ? (
                    <span className="rounded-full bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-1 text-sm font-semibold text-green-700 shadow-sm">
                      ✓ Đã chốt
                    </span>
                  ) : isExpired ? (
                    <span className="rounded-full bg-red-100 px-4 py-1 text-sm font-semibold text-red-700 shadow-sm">
                      Đã hết hạn
                    </span>
                  ) : (
                    <span className="rounded-full bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-1 text-sm font-semibold text-green-700 shadow-sm">
                      {post.status}
                    </span>
                  )}
                </div>

                <h2 className="mb-2 text-lg font-bold text-gray-900">
                  {post.title}
                </h2>
                <p className="mb-4 text-gray-700 leading-relaxed">{post.content}</p>

                {post.image && (
                  <img
                    src={post.image}
                    alt={post.title}
                    className="mb-4 w-full max-h-96 rounded-xl object-contain shadow-md transition-transform group-hover:scale-[1.02]"
                    loading="lazy"
                    style={{ display: 'block', margin: '0 auto' }}
                  />
                )}

                <div className="mb-4 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50 p-3 text-sm">
                  <p className="font-medium text-gray-700">
                    ⏰ {formatDate(post.startTime)} - {formatDate(post.endTime)}
                  </p>
          {(() => {
            const p = post as unknown as Record<string, unknown>;
            const coords = getLatLngFromLocation(p.location) ?? getLatLngFromLocation(p.googleMapsUrl) ?? null;
            if (!coords) return null;
            return (
              <>
                <a href={formatGoogleMapsUrl(coords.lat, coords.lng)} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                  <MapThumbnail lat={coords.lat} lng={coords.lng} />
                </a>

                <a
                  href={formatGoogleMapsUrl(coords.lat, coords.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-blue-600 font-medium shadow-sm transition-all hover:shadow-md hover:scale-105"
                >
                  📍 Xem trên bản đồ
                </a>

                {/* DEBUG: show parsed coords for each post */}
                <div className="mt-1 text-xs text-gray-500">{`Parsed coords: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`}</div>
              </>
            );
          })()}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleChat(post)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white font-semibold shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                  >
                    <FiMessageCircle className="h-5 w-5" />
                    <span>Nhắn tin</span>
                  </button>
                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3">
                    <span className="text-sm font-semibold text-gray-600">
                      👀 {interestedCount}
                    </span>
                    <span className="text-xs text-gray-500">quan tâm</span>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleCreatePost}
        className="fixed bottom-6 right-6 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl transition-all hover:shadow-3xl hover:scale-110 active:scale-95"
      >
        <FiPlus className="h-7 w-7" />
      </button>

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

