import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'
import Button from 'ajo-ui-playa/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'ajo-ui-playa/card'
import type { Note } from '/src/database'

type Data = { notes: Note[] }

const Notes: Stateful<PageArgs<Data>> = function* () {

	const add = action<{ note: Note }>('add')

	for (const { data } of this) {
		const notes = data?.notes ?? []

		yield (
			<main class="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
				<Card>
					<CardHeader>
						<CardTitle>Notes</CardTitle>
						<CardDescription>
							The loader is server truth; emitted topics deliver committed changes back here.
						</CardDescription>
					</CardHeader>
					<CardContent class="space-y-6">
						<form class="flex gap-2" set:onsubmit={add.submit}>
							<label class="sr-only" for="note">Note</label>
							<input
								id="note"
								name="text"
								class="h-9 min-w-0 flex-1 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								placeholder="Write a short note"
								maxlength={160}
								disabled={add.loading}
								required
							/>
							<Button type="submit" disabled={add.loading}>
								{add.loading ? 'Adding…' : 'Add'}
							</Button>
						</form>

						{add.error && <p class="text-sm text-danger" role="alert">{add.error.message}</p>}

						{notes.length ? (
							<ul class="divide-y">
								{notes.map(note => (
									<li key={note.id} class="flex items-start justify-between gap-4 py-3">
										<span>{note.text}</span>
										<time class="shrink-0 text-xs text-muted-foreground">{note.created}</time>
									</li>
								))}
							</ul>
						) : (
							<p class="text-sm text-muted-foreground">No notes yet.</p>
						)}
					</CardContent>
				</Card>
			</main>
		)
	}
}

export default Notes
