import { cn } from '@/lib/cn'

/**
 * Read-only star row. Fractional ratings are rendered by clipping a filled
 * overlay — no half-star glyphs needed.
 */
export function StarRating({
  value,
  count,
  size = 'md',
  className,
}: {
  value: number
  count?: number
  size?: 'sm' | 'md'
  className?: string
}) {
  const clamped = Math.max(0, Math.min(5, value))
  const px = size === 'sm' ? 'text-[14px]' : 'text-[16px]'

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn('relative inline-block leading-none tracking-[0.08em]', px)}
        role="img"
        aria-label={`${clamped.toFixed(1)} out of 5`}
      >
        <span className="text-[#d8d4cc]">★★★★★</span>
        <span
          className="absolute inset-0 overflow-hidden whitespace-nowrap text-amber"
          style={{ width: `${(clamped / 5) * 100}%` }}
          aria-hidden
        >
          ★★★★★
        </span>
      </span>
      {count === undefined ? (
        <span className="hud text-[12px] text-mist">{clamped.toFixed(1)}</span>
      ) : count > 0 ? (
        <span className="hud text-[12px] text-mist">
          {clamped.toFixed(1)}
          <span className="text-dimmer"> ({count})</span>
        </span>
      ) : (
        <span className="text-[12px] text-dimmer">No reviews yet</span>
      )}
    </span>
  )
}

/**
 * Star picker for the review form. Radio inputs styled with peer-based CSS, so
 * it submits inside a Server Action form without any JavaScript.
 *
 * The stars are laid out in reverse (5→1) so a CSS sibling selector can light up
 * every star at or below the hovered/checked one.
 */
export function StarPicker({ name = 'rating', defaultValue = 5 }: { name?: string; defaultValue?: number }) {
  return (
    <div className="flex flex-row-reverse items-center justify-end gap-1">
      {[5, 4, 3, 2, 1].map((n) => (
        <label
          key={n}
          className={cn(
            'group cursor-pointer text-2xl leading-none text-[#d8d4cc] transition-colors',
            'has-[:checked]:text-amber hover:text-amber/70',
            // Light up the stars below this one too: they are later siblings.
            '[&:has(:checked)~label]:text-amber [&:hover~label]:text-amber/70',
          )}
          title={`${n} star${n === 1 ? '' : 's'}`}
        >
          <input
            type="radio"
            name={name}
            value={n}
            defaultChecked={n === defaultValue}
            className="sr-only"
          />
          ★<span className="sr-only">{n} stars</span>
        </label>
      ))}
    </div>
  )
}
