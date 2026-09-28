import type { Stateless, WithChildren } from 'ajo'
import { locale, type Action } from 'ajo-kit'
import { buttonVariants, type ButtonSize, type ButtonVariant } from 'ajo-ui-playa/button'
import { Card, CardContent } from 'ajo-ui-playa/card'
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from 'ajo-ui-playa/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ajo-ui-playa/tooltip'

/** Reads ISO timestamps and SQLite `YYYY-MM-DD HH:MM:SS` ones, which are UTC. */
export const instant = (value: string) => new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)

const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

/** Relative time from now, such as "now", "5 minutes ago" or "2 days ago". */
export const ago = (value: string) => {
	const seconds = Math.round((instant(value).getTime() - Date.now()) / 1000)
	const size = Math.abs(seconds)

	if (size < 45) return relative.format(0, 'second')
	if (size < 3600) return relative.format(Math.round(seconds / 60), 'minute')
	if (size < 86_400) return relative.format(Math.round(seconds / 3600), 'hour')

	return relative.format(Math.round(seconds / 86_400), 'day')
}

/** Browser and system from a user agent; Edge before Chrome and Android before Linux, since their agents name both. */
export const agent = (ua: string | null) => {
	if (!ua) return 'Unknown device'

	const browser = ua.includes('Edg') ? 'Edge'
		: ua.includes('Firefox') ? 'Firefox'
		: ua.includes('Chrome') ? 'Chrome'
		: ua.includes('Safari') ? 'Safari'
		: 'Browser'

	const os = ua.includes('Windows') ? 'Windows'
		: ua.includes('Android') ? 'Android'
		: /iPhone|iPad/.test(ua) ? 'iOS'
		: ua.includes('Mac') ? 'macOS'
		: ua.includes('Linux') ? 'Linux'
		: ''

	return os ? `${browser} on ${os}` : browser
}

type Link = {
	href: string
	label: string
	icon: string
	badge?: number
	danger?: boolean
}

type SideNavArgs = WithChildren<{
	label: string
	links: Link[]
}>

/** Section layout with a static side menu; the longest link that prefixes the path is current. */
export const SideNav: Stateless<SideNavArgs> = ({ label, links, children }) => {
	const url = globalThis.location?.pathname ?? '/'
	const current = links
		.filter(({ href }) => url === href || url.startsWith(`${href}/`))
		.reduce<Link | undefined>((best, link) => best && best.href.length >= link.href.length ? best : link, undefined)

	return (
		// Static collapsible="none" sidebar: mod+b would toggle invisible state, so disable the shortcut.
		<SidebarProvider shortcut={false} class="min-h-0 flex-col gap-8 py-8 lg:flex-row">
			<Sidebar collapsible="none" variant="floating" class="md:w-full lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)] lg:w-56 lg:self-start">
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>{label}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{links.map(link => (
									<SidebarMenuItem key={link.href}>
										<SidebarMenuButton
											as="a"
											href={link.href}
											isActive={link === current}
											class={link.danger && link !== current ? 'text-danger hover:bg-danger/10 hover:text-danger' : undefined}
										>
											<span class={`${link.icon} size-4 shrink-0`} />
											<span>{link.label}</span>
										</SidebarMenuButton>
										{link.badge ? (
											<SidebarMenuBadge class="bg-danger text-danger-foreground">
												{link.badge}
											</SidebarMenuBadge>
										) : null}
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>
			<div class="flex-1 min-w-0">
				{children}
			</div>
		</SidebarProvider>
	)
}

type StatTone = 'accent' | 'danger'

const statTones: Record<StatTone, { icon: string; text: string; value: string }> = {
	accent: {
		icon: 'bg-primary/10 inset-ring-primary/25',
		text: 'text-gold-text',
		value: 'text-card-foreground',
	},
	danger: {
		icon: 'bg-danger/10 inset-ring-danger/25',
		text: 'text-danger',
		value: 'text-danger',
	},
}

type StatArgs = {
	icon: string
	label: string
	value: number | string
	tone?: StatTone
	href?: string
}

/** One figure with its icon and label; a link when it has an href. */
export const Stat: Stateless<StatArgs> = ({ icon, label, value, tone = 'accent', href }) => {
	const styles = statTones[tone]
	const body = (
		<CardContent class="flex items-center gap-4">
			<div class={`flex size-12 shrink-0 items-center justify-center rounded-lg inset-ring ${styles.icon}`}>
				<span class={`${icon} size-6 ${styles.text}`} />
			</div>
			<div class="min-w-0">
				<p class={`text-2xl font-semibold leading-tight tabular-nums ${styles.value}`}>{value}</p>
				<p class="truncate text-sm text-muted-foreground">{label}</p>
			</div>
		</CardContent>
	)

	return href
		? <Card as="a" href={href} size="sm" class="transition-colors hover:bg-accent hover:text-accent-foreground">{body}</Card>
		: <Card size="sm">{body}</Card>
}

type IconActionArgs = {
	action: Action<unknown>
	label: string
	icon: string
	name?: string
	value?: string | number
	variant?: ButtonVariant
	size?: ButtonSize
	class?: string
}

/** An icon button named by its tooltip that submits through the action form path, so the CSRF proof is sent. */
export const IconAction: Stateless<IconActionArgs> = ({
	action,
	label,
	icon,
	name,
	value,
	variant = 'danger-ghost',
	size = 'icon-sm',
	class: classes,
}) => (
	<form set:onsubmit={action.submit}>
		{name && <input type="hidden" name={name} value={value} />}
		<Tooltip delayDuration={500}>
			<TooltipTrigger
				type="submit"
				aria-label={label}
				disabled={action.loading}
				data-variant={variant}
				class={buttonVariants({ variant, size, class: classes })}
			>
				<span class={`${icon} size-4`} />
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	</form>
)
