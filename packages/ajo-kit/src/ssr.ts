import * as devalue from 'devalue'

/** Encodes SSR state without producing executable script content. */
export const serialize = (value: unknown) => devalue.stringify(value)

/** Restores values encoded by the SSR serializer, including non-JSON data types. */
export const parse = <T = unknown>(value: string) => devalue.parse(value) as T

/** Embeds encoded hydration state in a non-executable JSON script element. */
export const script = (value: unknown) =>
	`<script type="application/json" id="__SSR__">${serialize(value)}</script>`
