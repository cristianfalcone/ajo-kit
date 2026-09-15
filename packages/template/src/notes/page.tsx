import type { Stateful } from 'ajo'
import type { PageArgs } from 'ajo-kit'
import { action } from 'ajo-kit/client'
import Button from 'ajo-ui-playa/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'ajo-ui-playa/card'
import type { Note } from '../database'

type Data = {
	user: { name: string; email: string; verified: boolean }
	notes: Note[]
	mail: { id: string; subject: string; text: string; link?: string }[] | null
}

const Notes: Stateful<PageArgs<Data>> = function* () {
	const add = action('add')
	const remove = action('remove')
	const verify = action<{ message: string }>('verify')
	const email = action<{ message: string }>('email')
	const logout = action('logout')

	for (const { data } of this) {
		if (!data) { yield null; continue }
		const error = add.error ?? remove.error ?? email.error ?? verify.error ?? logout.error

		yield (
			<>
				<div class="flex items-center justify-between gap-4">
					<p class="text-sm text-muted-foreground">{data.user.name} · {data.user.email}</p>
					<form method="post" action="?/logout" set:onsubmit={logout.submit}>
						<Button type="submit" variant="ghost" disabled={logout.loading}>Sign out</Button>
					</form>
				</div>
				<Card>
					<CardHeader>
						<CardTitle role="heading" aria-level={1}>My notes</CardTitle>
						<CardDescription>Visible only to you. Open another tab to see changes arrive live.</CardDescription>
					</CardHeader>
					<CardContent class="space-y-6">
						<form class="space-y-2" method="post" action="?/add" set:onsubmit={add.submit}>
							<label for="note">New note</label>
							<div class="flex gap-2">
								<input id="note" name="text" class="h-9 min-w-0 flex-1 rounded-md border bg-transparent px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50" maxlength={160} required disabled={add.loading} />
								<Button type="submit" disabled={add.loading}>{add.loading ? 'Adding…' : 'Add'}</Button>
							</div>
						</form>
						{error && <p class="text-sm text-danger" role="alert">{error.message}</p>}
						<p class="text-sm text-muted-foreground" role="status">{data.notes.length} recent notes · showing the latest 50</p>
						{data.notes.length ? <ul class="divide-y">
							{data.notes.map(note => <li key={note.id} class="flex items-start justify-between gap-4 py-3">
								<div class="min-w-0">
									<p class="break-words">{note.text}</p>
									<time class="text-xs text-muted-foreground">{note.created}</time>
								</div>
								<Button type="button" variant="ghost" disabled={remove.loading} aria-label={`Delete note: ${note.text}`} set:onclick={() => remove.invoke({ id: note.id })}>Delete</Button>
							</li>)}
						</ul> : <p class="text-muted-foreground">No notes yet. Add your first thought above.</p>}
						{!data.user.verified && <form class="space-y-2" method="post" action="?/verify" set:onsubmit={verify.submit}>
							<p class="text-sm">Verify your email before sending your notes.</p>
							<Button type="submit" variant="outline" disabled={verify.loading}>{verify.loading ? 'Sending…' : 'Send verification email'}</Button>
							{verify.data && <p class="text-sm" role="status">{verify.data.message}</p>}
						</form>}
						<form class="space-y-2" method="post" action="?/email" set:onsubmit={email.submit}>
							<Button type="submit" variant="outline" disabled={email.loading || !data.user.verified}>{email.loading ? 'Sending…' : 'Email my notes'}</Button>
							{email.data && <p class="text-sm" role="status">{email.data.message}</p>}
						</form>
					</CardContent>
				</Card>
				{data.mail !== null && <Card>
					<CardHeader>
						<CardTitle role="heading" aria-level={2}>Development mailbox</CardTitle>
						<CardDescription>Only your messages appear here. Nothing is sent to an email provider.</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						{data.mail.length ? data.mail.map(message => <article key={message.id} class="space-y-2 rounded-md border p-4">
							<h3 class="font-medium">{message.subject}</h3>
							<pre class="whitespace-pre-wrap break-words text-sm">{message.text}</pre>
							{message.link && <a href={message.link} class="text-sm underline">Verify this email</a>}
						</article>) : <p class="text-sm text-muted-foreground">Request verification or email your notes to capture a message.</p>}
					</CardContent>
				</Card>}
			</>
		)
	}
}

export default Notes
