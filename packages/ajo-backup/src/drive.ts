import { readFileSync } from 'node:fs'

interface Credentials {
	client_id: string
	client_secret: string
	refresh_token: string
}

/** Google Drive backup destination and OAuth credentials file. */
export interface Options {
	credentials: string
	folder: string
	name?: string
}

/** Google Drive file storage adapter used by backup tasks. */
export interface Drive {
	upload(path: string, name?: string): Promise<void>
	remove(name: string): Promise<void>
	download(name: string, dest: string): Promise<boolean>
}

interface Token {
	value: string
	expires: number
}

let token: Token | null = null

async function authorize(credentials: Credentials): Promise<string> {

	if (token && Date.now() < token.expires - 60_000) {
		return token.value
	}

	const response = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: credentials.client_id,
			client_secret: credentials.client_secret,
			refresh_token: credentials.refresh_token,
			grant_type: 'refresh_token',
		}),
	})

	if (!response.ok) {
		const body = await response.text()
		throw new Error(`Auth failed: ${response.status} ${body}`)
	}

	const data = await response.json() as { access_token: string; expires_in: number }

	token = {
		value: data.access_token,
		expires: Date.now() + data.expires_in * 1000,
	}

	return token.value
}

async function request(url: string, options: RequestInit, retries = 3): Promise<Response> {

	const response = await fetch(url, options)

	if (response.ok) return response

	if (retries > 0 && (response.status === 429 || response.status >= 500)) {
		const delay = Math.pow(2, 3 - retries) * 1000 + Math.random() * 1000
		await new Promise(resolve => setTimeout(resolve, delay))
		return request(url, options, retries - 1)
	}

	const body = await response.text()

	throw new Error(`Request failed: ${response.status} ${body}`)
}

/** Create a Google Drive adapter for upload, remove, and download operations. */
export function drive(config: Options): Drive {

	const credentials: Credentials = JSON.parse(readFileSync(config.credentials, 'utf8'))
	const cache = new Map<string, string>() // name → file id

	async function upload(path: string, name?: string) {

		const filename = name ?? config.name

		if (!filename) throw new Error('Missing file name')

		const access = await authorize(credentials)
		const content = new Blob([readFileSync(path)])
		const file = cache.get(filename)

		const metadata = new Blob(
			[JSON.stringify(file ? {} : { name: filename, parents: [config.folder] })],
			{ type: 'application/json' }
		)

		const form = new FormData()

		form.append('metadata', metadata)
		form.append('file', content)

		const url = file
			? `https://www.googleapis.com/upload/drive/v3/files/${file}?uploadType=multipart`
			: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

		const response = await request(url, {
			method: file ? 'PATCH' : 'POST',
			headers: { Authorization: `Bearer ${access}` },
			body: form,
		})

		if (!file) {
			const created = await response.json() as { id: string }
			cache.set(filename, created.id)
		}
	}

	async function remove(name: string) {

		const file = cache.get(name)

		if (!file) return

		const access = await authorize(credentials)

		await request(`https://www.googleapis.com/drive/v3/files/${file}`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${access}` },
		})

		cache.delete(name)
	}

	async function find(name: string): Promise<string | null> {

		const cached = cache.get(name)

		if (cached) return cached

		const access = await authorize(credentials)
		const query = `name='${name}' and '${config.folder}' in parents and trashed=false`
		const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`

		const response = await request(url, {
			headers: { Authorization: `Bearer ${access}` },
		})

		const data = await response.json() as { files: { id: string }[] }
		const id = data.files[0]?.id ?? null

		if (id) cache.set(name, id)

		return id
	}

	async function download(name: string, dest: string) {

		const file = await find(name)

		if (!file) return false

		const access = await authorize(credentials)

		const response = await request(`https://www.googleapis.com/drive/v3/files/${file}?alt=media`, {
			headers: { Authorization: `Bearer ${access}` },
		})

		const buffer = Buffer.from(await response.arrayBuffer())
		const { writeFileSync } = await import('node:fs')

		writeFileSync(dest, buffer)

		return true
	}

	return { upload, remove, download }
}
