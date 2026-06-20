import * as devalue from 'devalue'

export const serialize = (value: unknown) => devalue.stringify(value)

export const parse = <T = unknown>(value: string) => devalue.parse(value) as T

export const script = (value: unknown) =>
	`<script type="application/json" id="__SSR__">${serialize(value)}</script>`
