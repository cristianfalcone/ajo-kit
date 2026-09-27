// Native details enter/exit: ::details-content transitions block-size to auto
// (via the preflight's interpolate-size opt-in), with allow-discrete
// content-visibility so closing content stays visible while it shrinks.
// Engines without ::details-content keep the instant toggle.
export const disclosureContent = '[&::details-content]:overflow-hidden [&::details-content]:[block-size:0] [&[open]::details-content]:[block-size:auto] [&::details-content]:transition-[block-size,content-visibility] [&::details-content]:duration-200 [&::details-content]:ease-out [&::details-content]:[transition-behavior:allow-discrete] motion-reduce:[&::details-content]:transition-none'
