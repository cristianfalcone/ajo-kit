import { describe, expect, test } from 'vitest'
import { migrationFile } from '../src/migrate'

describe('ajo-kit migrations', () => {
	test('migration filenames use only the project local sequence', () => {
		expect(migrationFile([
			'0001_initial.js',
			'0002_types.d.ts',
		], ' Add User/Profile ')).toBe('0002_add_user_profile.ts')
		expect(() => migrationFile([], '---')).toThrow('must contain a letter or number')
	})
})
