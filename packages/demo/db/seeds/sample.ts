import type { Kysely } from 'ajo-kit/database'

import { password } from 'ajo-kit-auth'
import { bundles } from '../../src/abilities'

const people = 'https://dummyjson.com/users?limit=10'

/** Replaces the demo data with sample people; the fetch runs before any table is cleared. */
export async function seed(db: Kysely<any>): Promise<void> {
	const response = await fetch(people)
	if (!response.ok) throw new Error(`Failed to fetch ${people}`)
	const { users } = await response.json() as { users: { firstName: string; lastName: string; email: string }[] }
	const hash = await password.hash('password')
	const now = Date.now()
	const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString()

	for (const table of ['messages', 'participants', 'chats', 'members', 'sessions', 'tokens', 'resets', 'roles', 'users']) {
		await db.deleteFrom(table).execute()
	}

	await db.insertInto('roles').values([
		{ id: 1, name: 'admin', abilities: JSON.stringify(bundles.admin) },
		{ id: 2, name: 'user', abilities: JSON.stringify(bundles.user) },
	]).execute()

	const { id: cristian } = await db.insertInto('users').values({
		name: 'Cristian Falcone',
		email: 'cristian@example.com',
		password: hash,
		verified: ago(0),
	}).returning('id').executeTakeFirstOrThrow()

	await db.insertInto('members').values({ user: cristian, role: 1 }).execute()

	const ids: number[] = []

	for (const person of users) {
		const { id } = await db.insertInto('users').values({
			name: `${person.firstName} ${person.lastName}`,
			email: person.email,
			password: hash,
		}).returning('id').executeTakeFirstOrThrow()

		await db.insertInto('members').values({ user: id, role: 2 }).execute()
		ids.push(id)
	}

	const [emily, michael, sophia, james, olivia, liam, ava, noah, isabella, ethan] = ids

	// Ages and last reads are minutes ago (null: never read); `every` is the minutes between messages, oldest first.
	const chats: {
		name: string | null
		age: number
		seen: [user: number, minutes: number | null][]
		every: number
		lines: [user: number, text: string][]
	}[] = [
		{
			name: null,
			age: 1440,
			seen: [[cristian, 1], [emily, 5]],
			every: 2,
			lines: [
				[cristian, 'Hey Emily! How are you?'],
				[emily, 'Hi Cristian! Doing great, thanks. How about you?'],
				[cristian, 'Pretty good. Been working on the new project all week'],
				[emily, 'Oh nice, the chat app thing?'],
				[cristian, 'Yeah exactly. By the way, have you tried the new dark mode?'],
				[emily, 'Yes! It looks amazing'],
				[cristian, 'Thanks, spent way too long on the color palette'],
				[emily, 'The accent color is perfect though'],
				[cristian, 'Glad you think so. Olivia said the same thing'],
				[emily, 'Great minds think alike haha'],
				[cristian, 'Haha true. Oh and I added group chats too'],
				[emily, 'Finally! We need that for the team'],
				[cristian, 'Yeah, already created one for the project'],
				[emily, 'Who\'s in it?'],
				[cristian, 'You, me, Michael, Sophia, and James so far'],
				[emily, 'Perfect team. Add Olivia too?'],
				[cristian, 'Good idea, will do'],
				[emily, 'When is the deadline for the project?'],
				[cristian, 'End of the month ideally'],
				[emily, 'That\'s tight but doable'],
				[cristian, 'Yeah if we focus on the core features first'],
				[emily, 'Agreed. What\'s left?'],
				[cristian, 'Read receipts and notifications'],
				[emily, 'Hey I gotta run to a meeting. Talk later?'],
				[cristian, 'Sure thing! Have a good one'],
				[emily, 'Thanks, you too!'],
				[cristian, 'Oh wait, one more thing'],
				[emily, 'Yeah?'],
				[cristian, 'Can you review the PR when you get a chance?'],
				[emily, 'Of course! I\'ll look at it after the meeting'],
				[cristian, 'Perfect, no rush'],
				[emily, 'Cool. Talk later!'],
				[cristian, 'Later!'],
				[emily, 'Hey I\'m back! Just reviewed the PR'],
				[cristian, 'Oh that was quick! What do you think?'],
				[emily, 'Looks great overall. Clean code as always'],
				[cristian, 'Thanks! Any concerns?'],
				[emily, 'None, everything looks solid'],
				[cristian, 'Approved then?'],
				[emily, 'Approved! Ship it'],
				[cristian, 'Merging now'],
				[emily, 'Let me know when it\'s deployed'],
				[cristian, 'Will do. Should be live in a few minutes'],
				[emily, 'Exciting!'],
				[cristian, 'And... deployed!'],
				[emily, 'Let me check... wow it\'s fast!'],
				[cristian, 'Let\'s get the team to test it too'],
				[emily, 'I\'ll ping everyone in the group chat'],
				[cristian, 'Perfect. Great teamwork today!'],
				[emily, 'Always! Have a good evening Cristian'],
				[cristian, 'You too Emily, see you tomorrow!'],
				[emily, 'See ya!'],
			],
		},
		{
			name: 'Project Team',
			age: 720,
			seen: [[cristian, 10], [emily, 15], [michael, 30], [sophia, 60], [james, 45], [olivia, 20]],
			every: 15,
			lines: [
				[cristian, 'Welcome everyone to the project chat!'],
				[emily, 'Hey team!'],
				[michael, 'Great, finally a group chat'],
				[sophia, 'Hi all, excited to be here'],
				[james, 'What\'s the plan for this week?'],
				[cristian, 'First priority is finishing the chat feature'],
				[olivia, 'I can help with the UI testing'],
				[michael, 'I\'ll handle the backend optimizations'],
				[sophia, 'I can work on the notification system'],
				[emily, 'I\'ll do code review for everything'],
				[james, 'And I\'ll update the documentation'],
				[cristian, 'Perfect, everyone has a clear task'],
				[olivia, 'Should we do a standup tomorrow morning?'],
				[cristian, 'Good idea. 10am work for everyone?'],
				[michael, 'Works for me'],
				[sophia, 'Same here'],
				[emily, 'I have a meeting at 10, can we do 10:30?'],
				[cristian, '10:30 it is then'],
				[james, 'Sounds good'],
				[olivia, 'See everyone then!'],
			],
		},
		{
			name: null,
			age: 360,
			seen: [[michael, 120], [sophia, 100]],
			every: 30,
			lines: [
				[michael, 'Hey Sophia, did you see the new design specs?'],
				[sophia, 'Not yet, where are they?'],
				[michael, 'I shared them in the project folder'],
				[sophia, 'Found them, thanks! These look great'],
				[michael, 'Right? The designer really nailed it'],
				[sophia, 'The color scheme is much better than v1'],
				[michael, 'Agreed. Let me know if you have questions'],
				[sophia, 'Will do!'],
			],
		},
		{
			name: null,
			age: 180,
			seen: [[cristian, 3], [james, 8]],
			every: 10,
			lines: [
				[james, 'Hey Cristian, quick question about the API'],
				[cristian, 'Sure, what\'s up?'],
				[james, 'How should I document the SSE events?'],
				[cristian, 'Good question. The kit README shows the pattern'],
				[james, 'Oh perfect, that covers everything I need'],
				[cristian, 'Let me know if anything is unclear'],
				[james, 'Will do, thanks!'],
			],
		},
		{
			name: 'Water Cooler',
			age: 2880,
			seen: [[liam, 50], [ava, 55], [noah, 60], [isabella, 70], [ethan, 40]],
			every: 20,
			lines: [
				[liam, 'Anyone watching the game tonight?'],
				[ava, 'Which game?'],
				[liam, 'The finals!'],
				[noah, 'I\'ll be watching for sure'],
				[isabella, 'Count me in too'],
				[ethan, 'Let\'s do a watch party'],
				[ava, 'Great idea! My place?'],
				[noah, 'Works for me'],
				[liam, 'I\'ll bring snacks'],
				[isabella, 'And I\'ll bring drinks'],
				[ethan, 'See you all at 7!'],
				[ava, 'Can\'t wait!'],
			],
		},
		{ name: null, age: 5, seen: [[cristian, null], [olivia, null]], every: 0, lines: [] },
	]

	for (const { name, age, seen, every, lines } of chats) {
		const { id: chat } = await db.insertInto('chats').values({ name, created: ago(age) })
			.returning('id').executeTakeFirstOrThrow()

		await db.insertInto('participants').values(seen.map(([user, minutes]) => ({
			chat,
			user,
			seen: minutes === null ? null : ago(minutes),
		}))).execute()

		if (lines.length === 0) continue

		await db.insertInto('messages').values(lines.map(([user, text], index) => ({
			chat,
			user,
			text,
			created: ago((lines.length - index) * every),
		}))).execute()
	}

	console.log(`  ${users.length + 1} users, ${chats.length} chats`)
}
