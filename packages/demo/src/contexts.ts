import { context } from 'ajo/context'

export const UnreadContext = context<number>(0)

export type ThemeMode = 'system' | 'light' | 'dark'

export interface Theme {
	mode: ThemeMode
	set: (next: ThemeMode) => void
	cycle: () => void
}

export const ThemeContext = context<Theme>({
	mode: 'system',
	set: () => {},
	cycle: () => {},
})
