import { parse as read, stringify } from 'devalue'

export const serialize = (value: unknown) => stringify(value)

export const parse = <T = unknown>(value: string) => read(value) as T

export const script = (value: unknown) =>
	`<script type="application/json" id="__SSR__">${serialize(value)}</script>`