# TimKeo Frontend

Frontend cho ứng dụng TimKeo - Nền tảng kết nối người chơi thể thao.

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env.local` từ `.env.local.example`:
```bash
cp .env.local.example .env.local
```

3. Cập nhật các biến môi trường trong `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3001
```

4. Chạy development server:
```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:3001`

## Cấu trúc

- `/app/onboarding` - Màn hình onboarding với 3-4 slides
- `/app/sport-selection` - Chọn môn thể thao yêu thích
- `/app/feed` - Feed chính hiển thị các bài đăng
- `/app/create-post` - Tạo bài đăng mới (cần đăng nhập)
- `/app/chat/[postId]` - Trò chuyện với người đăng bài (cần đăng nhập)
- `/app/profile` - Hồ sơ người dùng
- `/app/auth/callback` - Callback sau khi đăng nhập Google

## Tính năng

- ✅ Onboarding flow với slides
- ✅ Chọn nhiều môn thể thao yêu thích
- ✅ Feed hiển thị posts
- ✅ Đăng nhập Google OAuth
- ✅ Tạo bài đăng (cần đăng nhập)
- ✅ Chat real-time với WebSocket
- ✅ Chỉnh sửa môn thể thao trong hồ sơ

## Lưu ý

1. **Backend cần cấu hình**: Đảm bảo backend có biến môi trường `FRONTEND_URL` để redirect sau khi đăng nhập Google.

2. **CORS**: Backend cần cho phép CORS từ frontend URL.

3. **WebSocket**: Chat sử dụng Socket.IO, đảm bảo backend WebSocket gateway đã được cấu hình.
