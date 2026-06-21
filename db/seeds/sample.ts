import type { Kysely } from 'ajo-kit/database'

import { password } from 'ajo-auth'
import { bundles } from '../../src/abilities'

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url)
	if (!response.ok) throw new Error(`Failed to fetch ${url}`)
	return response.json()
}

// Offset a date by minutes relative to a base
const ago = (base: Date, minutes: number) => new Date(base.getTime() - minutes * 60_000).toISOString()

export async function seed(db: Kysely<any>): Promise<void> {

	const data = await fetchJson<{ users: any[] }>('https://dummyjson.com/users?limit=10')
	const hash = await password.hash('password')

	// Clear existing data
	await db.deleteFrom('messages').execute()
	await db.deleteFrom('participants').execute()
	await db.deleteFrom('chats').execute()
	await db.deleteFrom('members').execute()
	await db.deleteFrom('sessions').execute()
	await db.deleteFrom('tokens').execute()
	await db.deleteFrom('resets').execute()
	await db.deleteFrom('roles').execute()
	await db.deleteFrom('users').execute()

	// Roles
	const roles = [
		{ id: 1, name: 'admin', abilities: JSON.stringify(bundles.admin) },
		{ id: 2, name: 'user', abilities: JSON.stringify(bundles.user) },
	]

	await db.insertInto('roles').values(roles).execute()
	console.log(`  ${roles.length} roles`)

	// Admin user (cristian)
	const { id: cristian } = await db.insertInto('users').values({
		name: 'Cristian Falcone',
		email: 'cristian@example.com',
		password: hash,
		verified: new Date().toISOString(),
	}).returning('id').executeTakeFirstOrThrow()

	await db.insertInto('members').values({ user: cristian, role: 1 }).execute()
	console.log(`  1 admin (cristian@example.com)`)

	// Fetch sample users from DummyJSON
	const userIds: number[] = []

	for (const u of data.users) {
		const { id } = await db.insertInto('users').values({
			name: `${u.firstName} ${u.lastName}`,
			email: u.email,
			password: hash,
		}).returning('id').executeTakeFirstOrThrow()

		await db.insertInto('members').values({ user: id, role: 2 }).execute()
		userIds.push(id)
	}

	console.log(`  ${data.users.length} users`)

	// --- Chats ---

	const now = new Date()
	const [emily, michael, sophia, james, olivia, liam, ava, noah, isabella, ethan] = userIds

	// 1. Direct chat: Cristian & Emily — MANY messages (120+) for pagination testing
	const { id: chat1 } = await db.insertInto('chats').values({ name: null, created: ago(now, 1440) }).returning('id').executeTakeFirstOrThrow()
	await db.insertInto('participants').values([
		{ chat: chat1, user: cristian, seen: ago(now, 1) },
		{ chat: chat1, user: emily, seen: ago(now, 5) },
	]).execute()

	const longConvo: { chat: number; user: number; text: string; created: string }[] = []
	const lines = [
		[cristian, 'Hey Emily! How are you?'],
		[emily, 'Hi Cristian! Doing great, thanks. How about you?'],
		[cristian, 'Pretty good. Been working on the new project all week'],
		[emily, 'Oh nice, the chat app thing?'],
		[cristian, 'Yeah exactly. Trying to get the message loading right'],
		[emily, 'What do you mean?'],
		[cristian, 'Well right now it loads all messages at once which is not great'],
		[emily, 'Ah yeah that would be slow with a lot of messages'],
		[cristian, 'Exactly. So I\'m implementing cursor-based pagination'],
		[emily, 'Like how Slack does it?'],
		[cristian, 'Similar! Load last 50, then scroll up for more'],
		[emily, 'That sounds really clean'],
		[cristian, 'And the SSE events only send new messages now, not the whole list'],
		[emily, 'Makes sense, way less data over the wire'],
		[cristian, 'Right. The client just appends and deduplicates'],
		[emily, 'Deduplicates how?'],
		[cristian, 'A Set of message IDs. If the SSE sends one we already have, skip it'],
		[emily, 'Clever. What about scroll position when loading old messages?'],
		[cristian, 'Capture scrollHeight before prepending, adjust scrollTop after'],
		[emily, 'Oh that\'s the classic trick. Does it work well?'],
		[cristian, 'Perfectly smooth actually'],
		[emily, 'Nice! Can I test it?'],
		[cristian, 'Sure, I\'ll deploy the dev version later today'],
		[emily, 'Awesome, looking forward to it'],
		[cristian, 'By the way, have you tried the new dark mode?'],
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
		[cristian, 'Message pagination, read receipts, and notifications'],
		[emily, 'Pagination is almost done right?'],
		[cristian, 'Yeah, just testing edge cases now'],
		[emily, 'What kind of edge cases?'],
		[cristian, 'Like what happens when you scroll up while a new message arrives'],
		[emily, 'Oh tricky. Does it jump to the bottom?'],
		[cristian, 'Not anymore! Only auto-scrolls if you\'re already at the bottom'],
		[emily, 'Smart. That was annoying in the old version'],
		[cristian, 'Tell me about it. Also fixed the burst scenario'],
		[emily, 'Burst scenario?'],
		[cristian, 'When multiple messages arrive between SSE updates'],
		[emily, 'Ah right, the debouncing thing'],
		[cristian, 'Exactly. Now the event returns last 5 as a buffer'],
		[emily, 'So even if 3 arrive at once, none get lost?'],
		[cristian, 'Correct'],
		[emily, 'Really solid engineering'],
		[cristian, 'Thanks! Been studying how Signal and Matrix handle it'],
		[emily, 'Oh those are good references'],
		[cristian, 'Yeah, Zulip too. Their anchor-based pagination is elegant'],
		[emily, 'I used to use Zulip at my old company'],
		[cristian, 'How was it?'],
		[emily, 'Great for organized discussions. Threads are amazing'],
		[cristian, 'Maybe we should add threads eventually'],
		[emily, 'One step at a time haha'],
		[cristian, 'True true'],
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
		[emily, 'Just one small thing - the error handling in load()'],
		[cristian, 'What about it?'],
		[emily, 'If the fetch fails, maybe show a retry button?'],
		[cristian, 'Good point, I\'ll add that'],
		[emily, 'Also the loading indicator could use a spinner animation'],
		[cristian, 'True, just "Loading..." is a bit plain'],
		[emily, 'Yeah a subtle spinner would be nicer'],
		[cristian, 'I\'ll use the one from the design system'],
		[emily, 'Perfect. Everything else looks solid'],
		[cristian, 'Approved then?'],
		[emily, 'Approved! Ship it'],
		[cristian, 'Merging now'],
		[emily, 'Let me know when it\'s deployed'],
		[cristian, 'Will do. Should be live in a few minutes'],
		[emily, 'Exciting!'],
		[cristian, 'And... deployed!'],
		[emily, 'Let me check... wow it\'s fast!'],
		[cristian, 'Right? The cursor pagination makes a huge difference'],
		[emily, 'Scrolling up is seamless too'],
		[cristian, 'No position jumps?'],
		[emily, 'None at all. Smooth as butter'],
		[cristian, 'Music to my ears'],
		[emily, 'The "Beginning of conversation" message is a nice touch'],
		[cristian, 'Small details matter'],
		[emily, 'Agreed. This is production ready in my opinion'],
		[cristian, 'Let\'s get the team to test it too'],
		[emily, 'I\'ll ping everyone in the group chat'],
		[cristian, 'Perfect. Great teamwork today!'],
		[emily, 'Always! Have a good evening Cristian'],
		[cristian, 'You too Emily, see you tomorrow!'],
		[emily, 'See ya!'],
	] as const

	for (let i = 0; i < lines.length; i++) {
		const [user, text] = lines[i]
		longConvo.push({ chat: chat1, user, text, created: ago(now, (lines.length - i) * 2) })
	}

	await db.insertInto('messages').values(longConvo).execute()
	console.log(`  chat 1 (direct): cristian & emily — ${longConvo.length} messages`)

	// 2. Group chat: Project Team
	const { id: chat2 } = await db.insertInto('chats').values({ name: 'Project Team', created: ago(now, 720) }).returning('id').executeTakeFirstOrThrow()
	await db.insertInto('participants').values([
		{ chat: chat2, user: cristian, seen: ago(now, 10) },
		{ chat: chat2, user: emily, seen: ago(now, 15) },
		{ chat: chat2, user: michael, seen: ago(now, 30) },
		{ chat: chat2, user: sophia, seen: ago(now, 60) },
		{ chat: chat2, user: james, seen: ago(now, 45) },
		{ chat: chat2, user: olivia, seen: ago(now, 20) },
	]).execute()

	const groupMessages = [
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
	] as const

	const groupValues = groupMessages.map(([user, text], i) => ({
		chat: chat2, user, text, created: ago(now, (groupMessages.length - i) * 15),
	}))

	await db.insertInto('messages').values(groupValues).execute()
	console.log(`  chat 2 (group): Project Team — ${groupValues.length} messages`)

	// 3. Direct chat: Michael & Sophia — short conversation
	const { id: chat3 } = await db.insertInto('chats').values({ name: null, created: ago(now, 360) }).returning('id').executeTakeFirstOrThrow()
	await db.insertInto('participants').values([
		{ chat: chat3, user: michael, seen: ago(now, 120) },
		{ chat: chat3, user: sophia, seen: ago(now, 100) },
	]).execute()

	const chat3Messages = [
		[michael, 'Hey Sophia, did you see the new design specs?'],
		[sophia, 'Not yet, where are they?'],
		[michael, 'I shared them in the project folder'],
		[sophia, 'Found them, thanks! These look great'],
		[michael, 'Right? The designer really nailed it'],
		[sophia, 'The color scheme is much better than v1'],
		[michael, 'Agreed. Let me know if you have questions'],
		[sophia, 'Will do!'],
	] as const

	const chat3Values = chat3Messages.map(([user, text], i) => ({
		chat: chat3, user, text, created: ago(now, (chat3Messages.length - i) * 30),
	}))

	await db.insertInto('messages').values(chat3Values).execute()
	console.log(`  chat 3 (direct): michael & sophia — ${chat3Values.length} messages`)

	// 4. Direct chat: Cristian & James — a few recent messages
	const { id: chat4 } = await db.insertInto('chats').values({ name: null, created: ago(now, 180) }).returning('id').executeTakeFirstOrThrow()
	await db.insertInto('participants').values([
		{ chat: chat4, user: cristian, seen: ago(now, 3) },
		{ chat: chat4, user: james, seen: ago(now, 8) },
	]).execute()

	const chat4Messages = [
		[james, 'Hey Cristian, quick question about the API'],
		[cristian, 'Sure, what\'s up?'],
		[james, 'How should I document the SSE events?'],
		[cristian, 'Good question. Check ai/architecture.md for the pattern'],
		[james, 'Oh perfect, that covers everything I need'],
		[cristian, 'Let me know if anything is unclear'],
		[james, 'Will do, thanks!'],
	] as const

	const chat4Values = chat4Messages.map(([user, text], i) => ({
		chat: chat4, user, text, created: ago(now, (chat4Messages.length - i) * 10),
	}))

	await db.insertInto('messages').values(chat4Values).execute()
	console.log(`  chat 4 (direct): cristian & james — ${chat4Values.length} messages`)

	// 5. Group chat: Random — casual chat with no unread (everyone's seen everything)
	const { id: chat5 } = await db.insertInto('chats').values({ name: 'Water Cooler', created: ago(now, 2880) }).returning('id').executeTakeFirstOrThrow()
	await db.insertInto('participants').values([
		{ chat: chat5, user: liam, seen: ago(now, 50) },
		{ chat: chat5, user: ava, seen: ago(now, 55) },
		{ chat: chat5, user: noah, seen: ago(now, 60) },
		{ chat: chat5, user: isabella, seen: ago(now, 70) },
		{ chat: chat5, user: ethan, seen: ago(now, 40) },
	]).execute()

	const chat5Messages = [
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
	] as const

	const chat5Values = chat5Messages.map(([user, text], i) => ({
		chat: chat5, user, text, created: ago(now, (chat5Messages.length - i) * 20),
	}))

	await db.insertInto('messages').values(chat5Values).execute()
	console.log(`  chat 5 (group): Water Cooler — ${chat5Values.length} messages`)

	// 6. Direct chat: Cristian & Olivia — empty chat (just created, no messages)
	const { id: chat6 } = await db.insertInto('chats').values({ name: null, created: ago(now, 5) }).returning('id').executeTakeFirstOrThrow()
	await db.insertInto('participants').values([
		{ chat: chat6, user: cristian, seen: null },
		{ chat: chat6, user: olivia, seen: null },
	]).execute()

	console.log(`  chat 6 (direct): cristian & olivia — 0 messages (empty)`)
	console.log(`  6 chats total`)
}
