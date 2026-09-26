import type { Children } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from 'ajo-ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from 'ajo-ui/avatar'
import { Calendar } from 'ajo-ui/calendar'
import { Carousel, CarouselContent, CarouselItem } from 'ajo-ui/carousel'
import { ChartContainer } from 'ajo-ui/chart'
import { Checkbox } from 'ajo-ui/checkbox'
import { CheckboxGroup, CheckboxGroupItem } from 'ajo-ui/checkbox-group'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from 'ajo-ui/collapsible'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from 'ajo-ui/command'
import { ContextMenu, ContextMenuTrigger } from 'ajo-ui/context-menu'
import { DataTable } from 'ajo-ui/data-table'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from 'ajo-ui/dialog'
import { DirectionProvider } from 'ajo-ui/direction'
import { Drawer, DrawerContent } from 'ajo-ui/drawer'
import { Field } from 'ajo-ui/field'
import { InputDate } from 'ajo-ui/input-date'
import { InputGroup, InputGroupInput } from 'ajo-ui/input-group'
import { InputOTP, InputOTPGroup, InputOTPSlot } from 'ajo-ui/input-otp'
import { Menu, MenuContent, MenuItem, MenuRadioGroup, MenuRadioItem, MenuSub, MenuSubContent, MenuSubTrigger, MenuTrigger } from 'ajo-ui/menu'
import { Menubar, MenubarMenu, MenubarTrigger } from 'ajo-ui/menubar'
import { MessageScroller, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from 'ajo-ui/message-scroller'
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from 'ajo-ui/navigation-menu'
import { Popover, PopoverContent, PopoverTrigger } from 'ajo-ui/popover'
import { Progress } from 'ajo-ui/progress'
import { RadioGroup, RadioGroupItem } from 'ajo-ui/radio-group'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from 'ajo-ui/resizable'
import { Select, SelectContent, SelectItem, SelectList, SelectTrigger, SelectValue } from 'ajo-ui/select'
import { Sidebar, SidebarContent, SidebarProvider } from 'ajo-ui/sidebar'
import { Slider } from 'ajo-ui/slider'
import { Switch } from 'ajo-ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'ajo-ui/tabs'
import { Toaster, toast } from 'ajo-ui/toast'
import { Toggle } from 'ajo-ui/toggle'
import { ToggleGroup, ToggleGroupItem } from 'ajo-ui/toggle-group'
import { Toolbar, ToolbarSeparator } from 'ajo-ui/toolbar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from 'ajo-ui/tooltip'
import { VirtualList } from 'ajo-ui/virtual-list'

// The ajo/html host is protocol-only (signal/next/return/throw, no DOM), so
// any ungated browser wiring in a stateful root's setup phase crashes SSR.
// Every public family from packages/ajo-ui renders here with minimal args.
const roots: Record<string, () => Children> = {
	accordion: () => jsx(Accordion, {
		children: jsx(AccordionItem, {
			children: [
				jsx(AccordionTrigger, { children: 'Trigger' }),
				jsx(AccordionContent, { children: 'Content' }),
			],
			value: 'one',
		}),
	}),
	avatar: () => jsx(Avatar, {
		children: [
			jsx(AvatarImage, { alt: 'Avatar', src: 'avatar.png' }),
			jsx(AvatarFallback, { children: 'AB' }),
		],
	}),
	calendar: () => jsx(Calendar, {}),
	carousel: () => jsx(Carousel, {
		children: jsx(CarouselContent, {
			children: jsx(CarouselItem, { children: 'Slide' }),
		}),
	}),
	chart: () => jsx(ChartContainer, {
		id: 'visits',
		config: { visits: { color: 'oklch(0.6 0.1 250)', label: 'Visits' } },
		data: [{ month: 'Jan', visits: 10 }],
		palette: ['oklch(0.6 0.1 250)'],
		type: 'bar',
		xKey: 'month',
	}),
	checkbox: () => jsx(Checkbox, {}),
	'checkbox-group': () => jsx(CheckboxGroup, {
		children: jsx(CheckboxGroupItem, { value: 'one' }),
	}),
	collapsible: () => jsx(Collapsible, {
		children: [
			jsx(CollapsibleTrigger, { children: 'Toggle' }),
			jsx(CollapsibleContent, { children: 'Content' }),
		],
	}),
	command: () => jsx(Command, {
		children: [
			jsx(CommandInput, {}),
			jsx(CommandList, {
				children: [
					jsx(CommandEmpty, { children: 'No results' }),
					jsx(CommandItem, { children: 'Item', value: 'one' }),
				],
			}),
		],
	}),
	'context-menu': () => jsx(ContextMenu, {
		children: [
			jsx(ContextMenuTrigger, { children: 'Target' }),
			jsx(MenuContent, {
				children: jsx(MenuItem, { children: 'Item' }),
			}),
		],
	}),
	'data-table': () => jsx(DataTable, {
		columns: [{ label: 'Name', value: 'name' }],
		getRowKey: (person: { id: string; name: string }) => person.id,
		label: 'People',
		rows: [{ id: '1', name: 'Ada' }],
	}),
	dialog: () => jsx(Dialog, {
		children: [
			jsx(DialogTrigger, { children: 'Open' }),
			jsx(DialogContent, {
				children: [
					jsx(DialogTitle, { children: 'Title' }),
					jsx(DialogDescription, { children: 'Description' }),
				],
			}),
		],
	}),
	direction: () => jsx(DirectionProvider, { children: 'Content', dir: 'rtl' }),
	drawer: () => jsx(Drawer, {
		children: [
			jsx(DialogTrigger, { children: 'Open' }),
			jsx(DrawerContent, { children: jsx(DialogTitle, { children: 'Title' }) }),
		],
	}),
	menu: () => jsx(Menu, {
		children: [
			jsx(MenuTrigger, { children: 'Open' }),
			jsx(MenuContent, {
				children: [
					jsx(MenuItem, { children: 'Item' }),
					jsx(MenuSub, {
						children: [
							jsx(MenuSubTrigger, { children: 'More' }),
							jsx(MenuSubContent, {
								children: jsx(MenuItem, { children: 'Sub item' }),
							}),
						],
					}),
				],
			}),
		],
	}),
	'menu-radio-group': () => jsx(Menu, {
		children: [
			jsx(MenuTrigger, { children: 'Open' }),
			jsx(MenuContent, {
				children: jsx(MenuRadioGroup, {
					children: [
						jsx(MenuRadioItem, { children: 'One', value: 'one' }),
						jsx(MenuRadioItem, { children: 'Two', value: 'two' }),
					],
					value: 'one',
				}),
			}),
		],
	}),
	field: () => jsx(Field, { children: 'Field', name: 'email' }),
	'input-date': () => jsx(InputDate, { name: 'dob' }),
	'input-group': () => jsx(InputGroup, { children: jsx(InputGroupInput, {}) }),
	'input-otp': () => jsx(InputOTP, {
		children: jsx(InputOTPGroup, { children: jsx(InputOTPSlot, { index: 0 }) }),
	}),
	menubar: () => jsx(Menubar, {
		children: jsx(MenubarMenu, {
			children: [
				jsx(MenubarTrigger, { children: 'File' }),
				jsx(MenuContent, { children: jsx(MenuItem, { children: 'New' }) }),
			],
			value: 'file',
		}),
	}),
	'message-scroller': () => jsx(MessageScrollerProvider, {
		children: jsx(MessageScroller, {
			children: jsx(MessageScrollerViewport, {
				children: jsx(MessageScrollerContent, {
					children: jsx(MessageScrollerItem, { children: 'Hello', messageId: 'one' }),
				}),
			}),
		}),
	}),
	'navigation-menu': () => jsx(NavigationMenu, {
		children: jsx(NavigationMenuList, {
			children: jsx(NavigationMenuItem, {
				children: [
					jsx(NavigationMenuTrigger, { children: 'Docs' }),
					jsx(NavigationMenuContent, {
						children: jsx(NavigationMenuLink, { children: 'Link', href: '#' }),
					}),
				],
				value: 'docs',
			}),
		}),
	}),
	popover: () => jsx(Popover, {
		children: [
			jsx(PopoverTrigger, { children: 'Open' }),
			jsx(PopoverContent, { children: 'Content' }),
		],
		description: 'Popover description',
		label: 'Popover content',
	}),
	'popover-hover': () => jsx(Popover, {
		children: [
			jsx(PopoverTrigger, { children: 'Open' }),
			jsx(PopoverContent, { children: 'Content' }),
		],
		label: 'Hover content',
		openOn: 'hover',
	}),
	progress: () => jsx(Progress, { value: 50 }),
	'radio-group': () => jsx(RadioGroup, {
		children: jsx(RadioGroupItem, { value: 'one' }),
	}),
	resizable: () => jsx(ResizablePanelGroup, {
		children: [
			jsx(ResizablePanel, { children: 'One' }),
			jsx(ResizableHandle, {}),
			jsx(ResizablePanel, { children: 'Two' }),
		],
	}),
	select: () => jsx(Select, {
		children: [
			jsx(SelectTrigger, { children: jsx(SelectValue, { placeholder: 'Pick' }) }),
			jsx(SelectContent, {
				children: jsx(SelectList, {
					children: jsx(SelectItem, { children: 'One', value: 'one' }),
				}),
			}),
		],
	}),
	sidebar: () => jsx(SidebarProvider, {
		children: jsx(Sidebar, { children: jsx(SidebarContent, { children: 'Nav' }) }),
	}),
	slider: () => jsx(Slider, {}),
	switch: () => jsx(Switch, {}),
	tabs: () => jsx(Tabs, {
		children: [
			jsx(TabsList, { children: jsx(TabsTrigger, { children: 'One', value: 'one' }) }),
			jsx(TabsContent, { children: 'Content', value: 'one' }),
		],
	}),
	toast: () => jsx(Toaster, {}),
	toggle: () => jsx(Toggle, { children: 'Bold' }),
	'toggle-group': () => jsx(ToggleGroup, {
		children: jsx(ToggleGroupItem, { children: 'One', value: 'one' }),
	}),
	toolbar: () => jsx(Toolbar, {
		children: [
			jsx('button', { children: 'Action', type: 'button' }),
			jsx(ToolbarSeparator, {}),
		],
	}),
	'virtual-list': () => jsx(VirtualList, {
		estimateSize: 40,
		getItemKey: (item: string) => item,
		items: ['Item'],
		renderItem: (item: string) => item,
	}),
	tooltip: () => jsx(Tooltip, {
		children: [
			jsx(TooltipTrigger, { children: 'Hover' }),
			jsx(TooltipContent, { children: 'Tip' }),
		],
	}),
	'tooltip-provider': () => jsx(TooltipProvider, {
		children: jsx(Tooltip, {
			children: [
				jsx(TooltipTrigger, { children: 'Hover' }),
				jsx(TooltipContent, { children: 'Tip' }),
			],
		}),
	}),
}

for (const [family, root] of Object.entries(roots)) {
	test(`SSR renders the ${family} family without browser wiring`, () => {
		const html = ssr(root())
		expect(html.length).toBeGreaterThan(0)
	})
}

test('SSR toast() returns an id and leaves the shared store untouched', () => {
	const id = toast('Request-local', { position: 'top-left' })
	const html = ssr(jsx(Toaster, {}))

	expect(typeof id).toBe('string')
	expect(html).not.toContain('Request-local')
	expect(html).not.toContain('data-slot="toast"')
})

test('SSR Popover keeps one manual semantic surface with stable trigger relations', () => {
	const html = ssr(roots.popover())
	const trigger = html.match(/<button[^>]*data-slot="popover-trigger"[^>]*>/)?.[0]
	const content = html.match(/<div[^>]*data-slot="popover-content"[^>]*>/)?.[0]
	const contentId = trigger?.match(/aria-controls="([^"]+)"/)?.[1]
	const titleId = content?.match(/aria-labelledby="([^"]+)"/)?.[1]
	const descriptionId = content?.match(/aria-describedby="([^"]+)"/)?.[1]

	expect(trigger).toBeDefined()
	expect(content).toBeDefined()
	expect(contentId).toBeTruthy()
	expect(trigger).toContain('aria-expanded="false"')
	expect(trigger).toContain('aria-haspopup="dialog"')
	expect(trigger).toContain('data-state="closed"')
	expect(content).toContain(`id="${contentId}"`)
	expect(content).toContain('popover="manual"')
	expect(content).toContain('data-state="closed"')
	expect(content).toContain('role="dialog"')
	expect(titleId).toBeTruthy()
	expect(descriptionId).toBeTruthy()
	expect(html).toContain(`<h2 data-slot="popover-title" id="${titleId}">Popover content</h2>`)
	expect(html).toContain(`<p data-slot="popover-description" id="${descriptionId}">Popover description</p>`)
	expect(html.match(/popover="manual"/g)).toHaveLength(1)
	expect(html.match(/data-slot="popover-content"/g)).toHaveLength(1)
})

test('SSR Popover omits description markup and relation when description is absent', () => {
	const html = ssr(roots['popover-hover']())
	const content = html.match(/<div[^>]*data-slot="popover-content"[^>]*>/)?.[0]

	expect(content).toContain('role="dialog"')
	expect(content).toContain('aria-labelledby=')
	expect(content).not.toContain('aria-describedby')
	expect(html).not.toContain('data-slot="popover-description"')
})

test('SSR Tooltip keeps positioning at the root and one manual semantic surface', () => {
	const html = ssr(jsx(Tooltip, {
		children: [
			jsx(TooltipTrigger, { 'aria-describedby': 'field-help field-error field-help', children: 'Hover' }),
			jsx(TooltipContent, { children: 'Tip', id: 'ignored-tip', role: 'dialog', tabindex: '0' }),
		],
		gap: 12,
		placement: 'top-start',
	}))
	const trigger = html.match(/<button[^>]*data-slot="tooltip-trigger"[^>]*>/)?.[0]
	const content = html.match(/<div[^>]*data-slot="tooltip-content"[^>]*>/)?.[0]
	const describedBy = trigger?.match(/aria-describedby="([^"]+)"/)?.[1]
	const contentId = describedBy?.split(/\s+/).at(-1)

	expect(trigger).toBeDefined()
	expect(content).toBeDefined()
	expect(contentId).toBeTruthy()
	expect(contentId).not.toBe('ignored-tip')
	expect(describedBy).toBe(`field-help field-error ${contentId}`)
	expect(trigger).toContain('data-state="closed"')
	expect(content).toContain(`id="${contentId}"`)
	expect(content).toContain('popover="manual"')
	expect(content).toContain('data-state="closed"')
	expect(content).toContain('role="tooltip"')
	expect(content).not.toContain('tabindex=')
	expect(html).not.toMatch(/(?:data-side-preference|data-side-offset|data-align|placement|gap)=/)
	expect(html.match(/popover="manual"/g)).toHaveLength(1)
	expect(html.match(/data-slot="tooltip-content"/g)).toHaveLength(1)
})

test('SSR Menu owns root positioning and manual semantics for every level', () => {
	const html = ssr(jsx(Menu, {
		children: [
			jsx(MenuTrigger, { children: 'Open', id: 'menu-source' }),
			jsx(MenuContent, {
				children: jsx(MenuSub, {
					children: [
						jsx(MenuSubTrigger, { children: 'More', id: 'submenu-source' }),
						jsx(MenuSubContent, {
							children: jsx(MenuItem, { children: 'Nested' }),
							hidden: true,
							id: 'ignored-submenu',
							popover: 'auto',
							role: 'dialog',
							tabindex: '0',
						}),
					],
				}),
				id: 'ignored-menu',
				popover: 'auto',
				role: 'dialog',
				tabindex: '0',
			}),
		],
		gap: 10,
		placement: 'bottom-end',
	}))
	const trigger = html.match(/<button[^>]*data-slot="menu-trigger"[^>]*>/)?.[0]
	const content = html.match(/<div[^>]*data-slot="menu-content"[^>]*>/)?.[0]
	const subTrigger = html.match(/<div[^>]*data-slot="menu-sub-trigger"[^>]*>/)?.[0]
	const subContent = html.match(/<div[^>]*data-slot="menu-sub-content"[^>]*>/)?.[0]
	const contentId = trigger?.match(/aria-controls="([^"]+)"/)?.[1]
	const triggerId = trigger?.match(/id="([^"]+)"/)?.[1]
	const subContentId = subTrigger?.match(/aria-controls="([^"]+)"/)?.[1]
	const subTriggerId = subTrigger?.match(/id="([^"]+)"/)?.[1]

	expect(contentId).toBeTruthy()
	expect(triggerId).toBeTruthy()
	expect(subContentId).toBeTruthy()
	expect(subTriggerId).toBeTruthy()
	expect(trigger).toContain('aria-expanded="false"')
	expect(trigger).toContain('aria-haspopup="menu"')
	expect(content).toContain(`id="${contentId}"`)
	expect(triggerId).toBe('menu-source')
	expect(content).toContain('aria-labelledby="menu-source"')
	expect(content).toContain('popover="manual"')
	expect(content).toContain('role="menu"')
	expect(content).toContain('tabindex="-1"')
	expect(subTrigger).toContain('aria-expanded="false"')
	expect(subContent).toContain(`id="${subContentId}"`)
	expect(subTriggerId).toBe('submenu-source')
	expect(subContent).toContain('aria-labelledby="submenu-source"')
	expect(subContent).toContain('popover="manual"')
	expect(subContent).toContain('role="menu"')
	expect(subContent).toContain('tabindex="-1"')
	expect(subContent).not.toContain('hidden')
	expect(html).not.toContain('ignored-menu')
	expect(html).not.toContain('ignored-submenu')
	expect(html).not.toMatch(/(?:data-side-preference|data-side-offset|data-align-offset|data-collision-padding)=/)
	expect(html.match(/popover="manual"/g)).toHaveLength(2)
})

test('SSR Menubar owns shared root positioning and manual menu semantics', () => {
	const html = ssr(jsx(Menubar, {
		children: jsx(MenubarMenu, {
			children: [
				jsx(MenubarTrigger, { children: 'File', id: 'menubar-source' }),
				jsx(MenuContent, {
					children: jsx(MenuItem, { children: 'New' }),
					id: 'ignored-menubar-content',
					popover: 'auto',
					role: 'dialog',
					tabindex: '0',
				}),
			],
			value: 'file',
		}),
		gap: 10,
		placement: 'top-end',
	}))
	const root = html.match(/<div[^>]*data-slot="menubar"[^>]*>/)?.[0]
	const trigger = html.match(/<button[^>]*data-slot="menubar-trigger"[^>]*>/)?.[0]
	const content = html.match(/<div[^>]*data-slot="menu-content"[^>]*>/)?.[0]
	const contentId = trigger?.match(/aria-controls="([^"]+)"/)?.[1]

	expect(root).toBeTruthy()
	expect(root).not.toMatch(/(?:gap|placement)=/)
	expect(trigger).toContain('id="menubar-source"')
	expect(trigger).toContain('data-menubar-trigger="true"')
	expect(trigger).toContain('data-value="file"')
	expect(trigger).toContain('role="menuitem"')
	expect(contentId).toBeTruthy()
	expect(content).toContain(`id="${contentId}"`)
	expect(content).toContain('aria-labelledby="menubar-source"')
	expect(content).toContain('popover="manual"')
	expect(content).toContain('role="menu"')
	expect(content).toContain('tabindex="-1"')
	expect(content).not.toContain('ignored-menubar-content')
})

test('SSR ContextMenu relates its real trigger without a fake anchor', () => {
	const html = ssr(jsx(ContextMenu, {
		children: [
			jsx(ContextMenuTrigger, { children: 'Target', id: 'context-source' }),
			jsx(MenuContent, {
				children: jsx(MenuItem, { children: 'Open' }),
			}),
		],
	}))
	const trigger = html.match(/<div[^>]*data-slot="context-menu-trigger"[^>]*>/)?.[0]
	const content = html.match(/<div[^>]*data-slot="menu-content"[^>]*>/)?.[0]
	const contentId = trigger?.match(/aria-controls="([^"]+)"/)?.[1]

	expect(trigger).toContain('id="context-source"')
	expect(contentId).toBeTruthy()
	expect(content).toContain(`id="${contentId}"`)
	expect(content).toContain('aria-labelledby="context-source"')
	expect(content).toContain('popover="manual"')
	expect(html).not.toContain('context-menu-anchor')
})

test('SSR Progress clamps the value to max and passes caller value text through', () => {
	const html = ssr(jsx(Progress, { 'aria-valuetext': '32 of 32 files', max: 32, value: 40 }))

	expect(html).toContain('aria-valuetext="32 of 32 files"')
	expect(html).toContain('aria-valuemax="32"')
	expect(html).toContain('aria-valuenow="32"')
	expect(html).toContain('data-state="complete"')
	expect(html).toContain('<div aria-hidden="true" data-slot="progress-indicator" style="transform:translateX(-0%)"></div>')
	expect(ssr(jsx(Progress, { value: -5 }))).toContain('aria-valuenow="0"')
	expect(ssr(jsx(Progress, {}))).not.toContain('aria-valuenow')
})
