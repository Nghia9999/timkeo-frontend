import React, { useState } from 'react';
import { ratingAPI } from '@/lib/api';
import { BsStarFill, BsStar } from 'react-icons/bs';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  raterId: string;
  rateeId: string;
  onSubmitted?: () => void;
}

export default function RatingModal({ isOpen, onClose, matchId, raterId, rateeId, onSubmitted }: Props) {
  const [score, setScore] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const submit = async () => {
    setLoading(true);
    try {
      await ratingAPI.create({ matchId, raterId, rateeId, score, comment });
      onSubmitted?.();
      onClose();
    } catch (e) {
      console.error('Failed to submit rating', e);
      alert('Không thể gửi đánh giá, thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Đánh giá người chơi</h3>
        <p className="mt-1 text-sm text-gray-600">Cho người chơi này một đánh giá ngắn.</p>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setScore(n)}
                aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                className="p-1"
              >
                {score >= n ? (
                  <BsStarFill className="h-7 w-7 text-yellow-400" />
                ) : (
                  <BsStar className="h-7 w-7 text-gray-300" />
                )}
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ghi chú (tuỳ chọn)"
            className="mt-4 w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none"
            rows={4}
          />

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="rounded-md px-4 py-2 text-sm bg-white border border-gray-200">Huỷ</button>
            <button
              onClick={submit}
              disabled={loading}
              className="rounded-md px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center gap-2"
            >
              {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
