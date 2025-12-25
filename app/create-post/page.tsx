'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { postAPI } from '@/lib/api';
import { FiArrowLeft } from 'react-icons/fi';
import dynamic from 'next/dynamic';
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

const sports = [
  'Football',
  'Basketball',
  'Tennis',
  'Badminton',
  'Volleyball',
  'Table Tennis',
  'Swimming',
  'Running',
  'Cycling',
  'Gym',
];

export default function CreatePostPage() {
  const [formData, setFormData] = useState({
    sport: '',
    title: '',
    content: '',
    startTime: '',
    endTime: '',
    googleMapsUrl: '',
    image: '',
  });
  const [loading, setLoading] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  // separate controls so minutes can only be 0 or 30
  const [startDateOnly, setStartDateOnly] = useState('');
  const [startHour, setStartHour] = useState('');
  const [startMinute, setStartMinute] = useState('0');
  const [endDateOnly, setEndDateOnly] = useState('');
  const [endHour, setEndHour] = useState('');
  const [endMinute, setEndMinute] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState<number>(120); // allowed: 60, 90, 120
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  // helper removed (we now build ISO-like strings from separate controls)

  const addHours = (d: Date, hours: number) => {
    const nd = new Date(d.getTime());
    nd.setHours(nd.getHours() + hours);
    return nd;
  };

  const roundUpTo30 = (d: Date) => {
    const nd = new Date(d.getTime());
    nd.setSeconds(0, 0);
    const m = nd.getMinutes();
    if (m === 0 || m === 30) return nd;
    if (m < 30) {
      nd.setMinutes(30);
      return nd;
    }
    nd.setMinutes(0);
    nd.setHours(nd.getHours() + 1);
    return nd;
  };

  const addMinutes = (d: Date, mins: number) => {
    const nd = new Date(d.getTime());
    nd.setMinutes(nd.getMinutes() + mins);
    return nd;
  };

  const buildLocal = (dateStr: string, hourStr: string, minuteStr: string) => {
    if (!dateStr) return '';
    const pad = (n: string) => n.padStart(2, '0');
    return `${dateStr}T${pad(hourStr)}:${pad(minuteStr)}`;
  };

  const formatDateLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // initialize controls once on mount from formData if present, otherwise default to rounded now
  useEffect(() => {
    if (formData.startTime) {
      const s = new Date(formData.startTime);
      if (!isNaN(s.getTime())) {
        const dateOnly = formatDateLocal(s);
        const hour = String(s.getHours()).padStart(2, '0');
        const minute = String(s.getMinutes()).padStart(2, '0');
        setStartDateOnly((prev) => prev || dateOnly);
        setStartHour((prev) => prev || hour);
        setStartMinute((prev) => prev || minute);
      }
    } else {
      const now = roundUpTo30(new Date());
      setStartDateOnly((prev) => prev || formatDateLocal(now));
      setStartHour((prev) => prev || String(now.getHours()).padStart(2, '0'));
      setStartMinute((prev) => prev || String(now.getMinutes()).padStart(2, '0'));
    }

    if (formData.endTime) {
      const e = new Date(formData.endTime);
      if (!isNaN(e.getTime())) {
        const dateOnly = formatDateLocal(e);
        const hour = String(e.getHours()).padStart(2, '0');
        const minute = String(e.getMinutes()).padStart(2, '0');
        setEndDateOnly((prev) => prev || dateOnly);
        setEndHour((prev) => prev || hour);
        setEndMinute((prev) => prev || minute);
      }
    } else {
      const now = roundUpTo30(new Date());
      const endDefault = addHours(now, 2);
      setEndDateOnly((prev) => prev || formatDateLocal(endDefault));
      setEndHour((prev) => prev || String(endDefault.getHours()).padStart(2, '0'));
      setEndMinute((prev) => prev || String(endDefault.getMinutes()).padStart(2, '0'));
    }
  }, [formData.startTime, formData.endTime]);

  // when controls change, update formData
  useEffect(() => {
    const s = buildLocal(startDateOnly, startHour, startMinute);
    const e = buildLocal(endDateOnly, endHour, endMinute);
    setFormData((p) => ({ ...p, startTime: s, endTime: e }));
  }, [startDateOnly, startHour, startMinute, endDateOnly, endHour, endMinute]);

  // when start or duration changes, compute end = start + durationMinutes
  useEffect(() => {
    const sStr = buildLocal(startDateOnly, startHour, startMinute);
    if (!sStr) return;
    const s = new Date(sStr);
    if (isNaN(s.getTime())) return;

    let endDefault: Date;
    if (durationMinutes % 60 === 0) {
      endDefault = addHours(s, durationMinutes / 60);
    } else {
      // for 90 minutes
      endDefault = addMinutes(s, durationMinutes);
    }

    setEndDateOnly(formatDateLocal(endDefault));
    setEndHour(String(endDefault.getHours()).padStart(2, '0'));
    setEndMinute(String(endDefault.getMinutes()).padStart(2, '0'));
  }, [startDateOnly, startHour, startMinute, durationMinutes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Vui lòng đăng nhập');
      return;
    }
    setTimeError(null);
    const now = new Date();
    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setTimeError('Vui lòng chọn thời gian bắt đầu và kết thúc hợp lệ');
      return;
    }

    if (start.getTime() < now.getTime() - 60 * 1000) {
      // allow a tiny slack (1 minute) for client clock differences
      setTimeError('Thời gian bắt đầu phải là thời gian hiện tại hoặc trong tương lai');
      return;
    }

    if (end.getTime() <= start.getTime()) {
      setTimeError('Thời gian kết thúc phải lớn hơn thời gian bắt đầu');
      return;
    }

    setLoading(true);
    try {
      let location:
        | {
            latitude: number;
            longitude: number;
          }
        | undefined;

      if (formData.googleMapsUrl) {
        // Thử parse lat/lng từ link Google Maps
        let lat: number | null = null;
        let lng: number | null = null;

        // Case 1: dạng .../@lat,lng,...
        const atMatch = formData.googleMapsUrl.match(
          /@(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/,
        );
        if (atMatch) {
          lat = parseFloat(atMatch[1]);
          lng = parseFloat(atMatch[3]);
        } else {
          // Case 2: bất kỳ hai số dạng lat,lng trong chuỗi
          const coordMatch = formData.googleMapsUrl.match(
            /(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/,
          );
          if (coordMatch) {
            lat = parseFloat(coordMatch[1]);
            lng = parseFloat(coordMatch[3]);
          }
        }

        if (lat !== null && lng !== null) {
          location = {
            latitude: lat,
            longitude: lng,
          };
        }
      }

      const postData = {
        userId: user.id,
        sport: formData.sport,
        title: formData.title,
        content: formData.content,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        location,
        status: 'active',
        image: formData.image || undefined,
      };

      await postAPI.create(postData);
      router.push('/feed');
    } catch (error) {
      console.error('Failed to create post:', error);
  const err = error as { response?: { data?: { message?: string } } } | undefined;
  alert(err?.response?.data?.message || 'Có lỗi xảy ra khi tạo bài đăng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center"
            >
              <FiArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Tạo bài đăng</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sport */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Môn thể thao *
            </label>
            <select
              required
              value={formData.sport}
              onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Chọn môn thể thao</option>
              {sports.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tiêu đề *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="VD: Tìm đối bóng đá cuối tuần"
            />
          </div>

          {/* Content */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nội dung *
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Nội dung bài đăng của bạn..."
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Thời gian bắt đầu *
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                required
                value={startDateOnly}
                onChange={(e) => {
                  setStartDateOnly(e.target.value);
                  setTimeError(null);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />

              <select
                value={startHour}
                onChange={(e) => {
                  setStartHour(e.target.value);
                  setTimeError(null);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const v = String(i).padStart(2, '0');
                  return (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  );
                })}
              </select>

              <select
                value={startMinute}
                onChange={(e) => {
                  setStartMinute(e.target.value);
                  setTimeError(null);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="00">00</option>
                <option value="30">30</option>
              </select>
            </div>
          </div>

          {/* Duration (fixed options) */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Thời lượng *
            </label>
            <select
              value={String(durationMinutes)}
              onChange={(e) => {
                setDurationMinutes(parseInt(e.target.value, 10));
                setTimeError(null);
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="60">1 giờ</option>
              <option value="90">1 giờ 30 phút</option>
              <option value="120">2 giờ</option>
            </select>
          </div>

          {/* End Time */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Thời gian kết thúc *
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                required
                value={endDateOnly}
                disabled
                title="Thời gian kết thúc cố định là +2 giờ so với bắt đầu"
                className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-gray-600"
              />

              <select
                value={endHour}
                disabled
                title="Giờ kết thúc cố định là +2 giờ so với bắt đầu"
                className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-gray-600"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const v = String(i).padStart(2, '0');
                  return (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  );
                })}
              </select>

              <select
                value={endMinute}
                disabled
                title="Phút kết thúc cố định là +2 giờ so với bắt đầu"
                className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-gray-600"
              >
                <option value="00">00</option>
                <option value="30">30</option>
              </select>
            </div>
            <p className="mt-1 text-sm text-gray-500">Thời gian kết thúc được đặt cố định: cách thời gian bắt đầu 2 giờ.</p>
            {timeError && (
              <p className="mt-1 text-sm text-red-600">{timeError}</p>
            )}
          </div>

          {/* Google Maps selection (optional) */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Vị trí (Google Maps) - tùy chọn
            </label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!('geolocation' in navigator)) {
                      alert('Trình duyệt không hỗ trợ định vị');
                      return;
                    }
                    try {
                      const pos = await new Promise<GeolocationPosition>((res, rej) =>
                        navigator.geolocation.getCurrentPosition(res, rej),
                      );
                      const lat = pos.coords.latitude;
                      const lng = pos.coords.longitude;
                      const url = `https://www.google.com/maps?q=${lat},${lng}`;
                      setFormData((p) => ({ ...p, googleMapsUrl: url }));
                    } catch (err) {
                      console.error(err);
                      alert('Không thể lấy vị trí hiện tại');
                    }
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                >
                  Sử dụng vị trí hiện tại
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const input = prompt('Nhập toạ độ theo dạng: lat,lng (ví dụ 10.762622,106.660172)');
                    if (!input) return;
                    const m = input.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
                    if (!m) {
                      alert('Toạ độ không hợp lệ');
                      return;
                    }
                    const lat = parseFloat(m[1]);
                    const lng = parseFloat(m[2]);
                    const url = `https://www.google.com/maps?q=${lat},${lng}`;
                    setFormData((p) => ({ ...p, googleMapsUrl: url }));
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 bg-white hover:bg-gray-50"
                >
                  Nhập toạ độ
                </button>

                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="rounded-lg border border-gray-300 px-3 py-2 bg-white hover:bg-gray-50"
                >
                  Chọn trên bản đồ
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, googleMapsUrl: '' }))}
                  className="rounded-lg border border-red-300 px-3 py-2 text-red-600 bg-white hover:bg-red-50"
                >
                  Xoá
                </button>
              </div>

              <input
                type="text"
                readOnly
                value={formData.googleMapsUrl}
                placeholder="Chưa chọn vị trí"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500">
                Bạn có thể chọn vị trí hiện tại hoặc nhập toạ độ; hệ thống sẽ lưu link Google Maps.
              </p>
            </div>
          </div>

          {/* Image selection (optional) */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Hình ảnh (tùy chọn)
            </label>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result as string | null;
                    if (result) {
                      // store base64 data URL in formData.image
                      setFormData((p) => ({ ...p, image: result }));
                    }
                  };
                  reader.readAsDataURL(file);
                }}
                className="w-full"
              />

              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="Hoặc dán URL hình ảnh"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, image: '' }))}
                  className="rounded-lg border border-red-300 px-3 py-2 text-red-600 bg-white hover:bg-red-50"
                >
                  Xoá
                </button>
              </div>

              {formData.image && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-1">Xem trước:</p>
                  <div className="h-48 w-full overflow-hidden rounded-lg border border-gray-200">
                    {/* If it's a data URL or URL, show it */}
                    <img src={formData.image} alt="preview" className="h-full w-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang tạo...' : 'Đăng bài'}
          </button>
        </form>
      </div>
      {/* Map picker modal */}
      <MapPicker
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onSelect={(lat, lng) => {
          const url = `https://www.google.com/maps?q=${lat},${lng}`;
          setFormData((p) => ({ ...p, googleMapsUrl: url }));
        }}
        initialLatLng={null}
      />
    </div>
  );
}

