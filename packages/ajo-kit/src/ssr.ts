import { parse, stringify } from 'devalue'

export const serializeSSR = (value: unknown) => stringify(value)

export const parseSSR = <T = unknown>(value: string) => parse(value) as T

export const renderSSRScript = (value: unknown) =>
	`<script type="application/json" id="__SSR__">${serializeSSR(value)}</script>`
