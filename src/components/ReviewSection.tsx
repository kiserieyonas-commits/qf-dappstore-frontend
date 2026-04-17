'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { getReviews, submitReview, deleteReview, markReviewHelpful } from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  _id: string
  reviewer: string
  username: string | null
  rating: number
  comment?: string
  helpful: number
  createdAt: string
  updatedAt: string
}

interface ReviewSectionProps {
  dappId: string | number
  builderAddress: string
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
}: {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const [hover, setHover] = useState(0)
  const sizeClass = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg'

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`${sizeClass} transition-all duration-100 ${
            (hover || value) >= star ? 'text-yellow-400' : 'text-gray-600'
          } ${!readonly ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReviewSection({ dappId, builderAddress }: ReviewSectionProps) {
  const { address, isConnected } = useAccount()

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'recent' | 'helpful'>('recent')

  // Form state
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Track which reviews this session's user has already marked helpful
  const [helpfulMarked, setHelpfulMarked] = useState<Set<string>>(new Set())

  const myReview = address
    ? reviews.find((r) => r.reviewer.toLowerCase() === address.toLowerCase())
    : undefined

  const isBuilder =
    address && builderAddress && builderAddress.toLowerCase() === address.toLowerCase()

  const loadReviews = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getReviews(dappId, { sort })
      setReviews(data.reviews ?? [])
    } catch {
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [dappId, sort])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  // Pre-fill form when user already has a review
  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating)
      setComment(myReview.comment ?? '')
    } else {
      setRating(0)
      setComment('')
    }
  }, [myReview?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!address || !rating) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      await submitReview(dappId, {
        reviewer: address,
        rating,
        comment: comment.trim() || undefined,
      })
      setSubmitSuccess(true)
      await loadReviews()
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!address) return
    if (!window.confirm('Delete your review? This cannot be undone.')) return

    try {
      await deleteReview(dappId, address)
      setRating(0)
      setComment('')
      await loadReviews()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete review')
    }
  }

  async function handleHelpful(reviewId: string) {
    if (helpfulMarked.has(reviewId)) return
    try {
      const data = await markReviewHelpful(dappId, reviewId)
      setReviews((prev) =>
        prev.map((r) => (r._id === reviewId ? { ...r, helpful: data.helpful } : r))
      )
      setHelpfulMarked((prev) => new Set(prev).add(reviewId))
    } catch {
      // silent fail
    }
  }

  function shortAddr(addr: string) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // ─── Rating stats ────────────────────────────────────────────────────────

  const avgRating =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="bg-[#0f1729] border border-cyan-500/20 rounded-xl p-5 space-y-6">
      <h2 className="text-lg font-semibold text-white">Reviews &amp; Ratings</h2>

      {/* ── Rating summary ── */}
      {reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center p-4 bg-white/3 rounded-lg border border-white/5">
          <div className="text-center flex-shrink-0">
            <div className="text-5xl font-bold text-cyan-400">{avgRating.toFixed(1)}</div>
            <div className="flex justify-center mt-1">
              <StarRating value={Math.round(avgRating)} readonly size="sm" />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="flex-1 w-full space-y-1.5">
            {ratingDist.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 w-2 text-right">{star}</span>
                <span className="text-yellow-400">★</span>
                <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-gray-500 w-4 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Review form ── */}
      {isConnected && !isBuilder && (
        <div className="border border-cyan-500/20 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">
            {myReview ? 'Edit Your Review' : 'Write a Review'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Star rating *</label>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Review (optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Share your experience with this dApp..."
                className="w-full bg-[#0a0e1a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none transition-colors"
              />
              <div className="text-xs text-gray-600 text-right mt-0.5">
                {comment.length}/500
              </div>
            </div>

            {submitError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {submitError}
              </p>
            )}
            {submitSuccess && (
              <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                Review submitted successfully!
              </p>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                type="submit"
                disabled={submitting || !rating}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-200"
              >
                {submitting ? 'Submitting…' : myReview ? 'Update Review' : 'Submit Review'}
              </button>
              {myReview && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 border border-red-500/30 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Delete Review
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {isConnected && isBuilder && (
        <p className="text-xs text-gray-500 italic px-1">
          You cannot review your own dApp.
        </p>
      )}

      {!isConnected && (
        <p className="text-xs text-gray-500 px-1">
          Connect your wallet to leave a review. You must have transacted with this dApp.
        </p>
      )}

      {/* ── Sort + review list ── */}
      <div className="space-y-4">
        {reviews.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">Sort by:</span>
            {(['recent', 'helpful'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  sort === s
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-white border border-transparent'
                }`}
              >
                {s === 'recent' ? 'Most Recent' : 'Most Helpful'}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-500 text-sm py-8">Loading reviews…</div>
        ) : reviews.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            No reviews yet. Be the first to review this dApp!
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => {
              const isOwn = address && review.reviewer.toLowerCase() === address.toLowerCase()
              const alreadyHelpful = helpfulMarked.has(review._id)
              const displayName = review.username || shortAddr(review.reviewer)
              const initial = review.username
                ? review.username.charAt(0).toUpperCase()
                : review.reviewer.charAt(2).toUpperCase()

              return (
                <div
                  key={review._id}
                  className={`border rounded-xl p-4 space-y-2 transition-colors ${
                    isOwn
                      ? 'border-cyan-500/30 bg-cyan-500/5'
                      : 'border-white/5 bg-white/[0.02]'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-cyan-500/20 flex items-center justify-center text-xs text-cyan-400 font-bold flex-shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                          {displayName}
                          {isOwn && (
                            <span className="text-xs text-cyan-400/70 font-normal">(you)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(review.createdAt)}</div>
                      </div>
                    </div>
                    <StarRating value={review.rating} readonly size="sm" />
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-sm text-gray-300 leading-relaxed pl-10">{review.comment}</p>
                  )}

                  {/* Footer actions */}
                  <div className="flex items-center gap-4 pt-1 pl-10">
                    <button
                      onClick={() => handleHelpful(review._id)}
                      disabled={alreadyHelpful}
                      className={`text-xs flex items-center gap-1 transition-colors ${
                        alreadyHelpful
                          ? 'text-cyan-400 cursor-default'
                          : 'text-gray-500 hover:text-cyan-400'
                      }`}
                    >
                      👍 Helpful{review.helpful > 0 ? ` (${review.helpful})` : ''}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
