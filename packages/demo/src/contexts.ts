import { context } from 'ajo/context'

export const UnreadContext = context<number>(0)

export type ThemeMode = 'system' | 'light' | 'dark'

export interface Theme {
	mode: ThemeMode
	cycle: () => void
}

export const ThemeContext = context<Theme>({
	mode: 'system',
	cycle: () => {},
})
