import type { Children } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Avatar,
	AvatarFallback,
	AvatarImage,
	Calendar,
	Carousel,
	CarouselContent,
	CarouselItem,
	ChartContainer,
	Checkbox,
	CheckboxGroup,
	CheckboxGroupItem,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	DataTable,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
	DirectionProvider,
	Drawer,
	DrawerContent,
	DrawerTitle,
	DrawerTrigger,
	Menu,
	MenuContent,
	MenuItem,
	MenuRadioGroup,
	MenuRadioItem,
	MenuSub,
	MenuSubContent,
	MenuSubTrigger,
	MenuTrigger,
	Field,
	InputDate,
	InputGroup,
	InputGroupInput,
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
	Menubar,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarTrigger,
	MessageScroller,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Progress,
	RadioGroup,
	RadioGroupItem,
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	Select,
	SelectContent,
	SelectItem,
	SelectList,
	SelectTrigger,
	SelectValue,
	Sidebar,
	SidebarContent,
	SidebarProvider,
	Slider,
	Switch,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Toaster,
	Toggle,
	ToggleGroup,
	ToggleGroupItem,
	Toolbar,
	ToolbarSeparator,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from 'ajo-ui'

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
		chartId: 'visits',
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
			jsx(ContextMenuContent, {
				children: jsx(ContextMenuItem, { children: 'Item' }),
			}),
		],
	}),
	'data-table': () => jsx(DataTable, {
		columns: [{ accessorKey: 'name', header: 'Name' }],
		data: [{ id: '1', name: 'Ada' }],
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
			jsx(DrawerTrigger, { children: 'Open' }),
			jsx(DrawerContent, { children: jsx(DrawerTitle, { children: 'Title' }) }),
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
				jsx(MenubarContent, { children: jsx(MenubarItem, { children: 'New' }) }),
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
	}),
	'popover-hover': () => jsx(Popover, {
		children: [
			jsx(PopoverTrigger, { children: 'Open' }),
			jsx(PopoverContent, { children: 'Content' }),
		],
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
