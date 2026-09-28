import type { Preset } from 'unocss'

// Links inside running text: the link colour, underlined at rest and heavier
// on hover. The focus ring stands 2 px off the word, so it never touches its
// first and last letters. Behind :where(), so a class on the link still wins.
const inlineLinks = [
  '.playa-inline-links :where(a){color:var(--link);text-decoration-line:underline;text-underline-offset:4px;border-radius:calc(var(--radius) - 0.5rem);outline-offset:2px}',
  '.playa-inline-links :where(a:hover){text-decoration-thickness:2px}',
].join('')

// Outline items in a group are one list, not cards stacked edge to edge: the
// group is the panel and a hairline separates its rows. The rows touch (a gap
// the author set would leave a blank band above each hairline), so the panel
// is the one outcome; spaced cards are outline items in a plain grid. The
// group draws a border, not an inset ring, so a hovered row cannot cover it;
// the rows keep their focus ring inside, where the panel does not clip it.
const group = '.playa-item-group'
const row = '>[data-slot=item][data-variant=outline]'
const itemGroup = [
  `${group}:has(${row}){gap:0;overflow:hidden;border:1px solid var(--border);border-radius:calc(var(--radius) + 0.25rem);background-color:var(--card);color:var(--card-foreground)}`,
  `${group}${row}{border-radius:0;box-shadow:none;--focus-offset:calc(var(--focus-width) * -1)}`,
  `${group}${row}+[data-variant=outline]{border-block-start:1px solid var(--border)}`,
].join('')

/** Shortcuts and rules of Card, Alert, Empty, Item, Avatar, Attachment, Bubble, Message, MessageScroller, Marker, Chip, Skeleton, Separator, Typography, AspectRatio, Collapsible, Accordion, Carousel, ScrollArea and Resizable. */
export const surfaces: Preset = {
  name: 'ajo-ui-playa-surfaces',
  // In the preflight layer, emitted only where a family uses them.
  rules: [
    ['playa-inline-links', [inlineLinks], { layer: 'preflights' }],
    ['playa-item-group', [itemGroup], { layer: 'preflights' }],
  ],
}
