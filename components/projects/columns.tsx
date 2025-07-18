"use client"

import type { ColumnDef } from "@tanstack/react-table"
import {
  ArrowUpDown,
  MoreHorizontal,
  CheckCircle,
  Clock,
  Pause,
  XCircle,
  Eye,
  Edit,
  FileText,
  Trash2,
  Calendar,
  GitBranch,
  User,
  Activity,
  DollarSign,
  Minus,
  Plus,
  CalendarDays,
  Building2,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { useSettings } from "@/components/settings-provider"
import { DatePickerTable } from "@/components/ui/date-picker-table"

export type Project = {
  id: string
  name: string
  status: string
  start_date?: string
  due_date?: string
  budget?: number
  expenses?: number
  received?: number
  pending?: number
  created_at: string
  clients?: {
    name: string
    company?: string
    avatar_url?: string | null
  }
}

const statusConfig = {
  active: {
    label: "Active",
    icon: Clock,
    variant: "outline" as const,
    iconClassName: "text-blue-500",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    variant: "outline" as const,
    iconClassName: "text-green-500",
  },
  on_hold: {
    label: "On Hold",
    icon: Pause,
    variant: "outline" as const,
    iconClassName: "text-yellow-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    variant: "outline" as const,
    iconClassName: "text-gray-400",
  },
  pipeline: {
    label: "Pipeline",
    icon: GitBranch,
    variant: "outline" as const,
    iconClassName: "text-purple-500",
  },
}

interface ColumnActions {
  onEditProject: (project: Project) => void
  onCreateInvoice: (project: Project) => void
  onDeleteProject: (project: Project) => void
  onStatusChange: (project: Project, newStatus: string) => void
  onDateChange: (project: Project, field: 'start_date' | 'due_date', date: Date | undefined) => void
}

// Reusable sortable header component with compact design
function SortableHeader({ 
  column, 
  children, 
  icon: Icon 
}: { 
  column: any; 
  children: React.ReactNode; 
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> 
}) {
  const sortDirection = column.getIsSorted()
  
  return (
    <div className="px-2 py-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto p-0 font-medium text-sm hover:bg-transparent focus:outline-none flex items-center"
            style={{ gap: '6px' }}
          >
            <Icon 
              className="flex-shrink-0" 
              style={{ 
                width: '12px', 
                height: '12px',
                minWidth: '12px',
                minHeight: '12px'
              }} 
            />
            <span className="text-sm font-medium">{children}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-32 p-1" 
          align="start" 
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="grid gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start h-8 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation()
                column.toggleSorting(false)
              }}
            >
              <ArrowUp className="mr-2 h-3 w-3" />
              Asc
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start h-8 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation()
                column.toggleSorting(true)
              }}
            >
              <ArrowDown className="mr-2 h-3 w-3" />
              Desc
            </Button>
            {sortDirection && (
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-8 focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation()
                  column.clearSorting()
                }}
              >
                <ChevronsUpDown className="mr-2 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function createColumns(actions: ColumnActions): ColumnDef<Project>[] {
  const { formatDate } = useSettings()
  
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center px-2 py-1 w-full">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="h-4 w-4"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center px-2 py-1 w-full">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="h-4 w-4"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Building2}>
          Project Name
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        return (
          <div className="px-2 py-1 w-full min-w-0">
            <div 
              className="truncate font-medium cursor-pointer transition-colors hover:text-primary text-sm" 
              title={project.name}
              onClick={() => actions.onEditProject(project)}
            >
              {project.name}
            </div>
          </div>
        )
      },
      enableHiding: false,
    },
    {
      id: "client",
      accessorFn: (row) => row.clients?.name || "",
      header: ({ column }) => (
        <SortableHeader column={column} icon={User}>
          Client
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const client = row.original.clients
        return client ? (
          <div className="flex items-center space-x-2 px-2 py-1 w-full min-w-0">
            <ClientAvatar name={client.name} avatarUrl={client.avatar_url} size="sm" className="flex-shrink-0" />
            <div className="truncate font-normal flex-1 min-w-0 text-sm" title={client.name}>
              {client.name}
            </div>
          </div>
        ) : (
          <div className="px-2 py-1 w-full">
            <span className="text-muted-foreground text-sm">No client</span>
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Activity}>
          Status
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        const status = row.getValue("status") as string
        const config = statusConfig[status as keyof typeof statusConfig]

        if (!config) {
          return <span className="text-muted-foreground">Unknown</span>
        }

        const Icon = config.icon

        return (
          <div className="px-2 py-1 w-full">
            <Popover>
              <PopoverTrigger asChild>
                <Badge variant={config.variant} className="cursor-pointer hover:bg-slate-100 transition-colors font-normal text-sm focus:outline-none focus-visible:outline-none">
                  <Icon className={`mr-1.5 h-3 w-3 ${config.iconClassName}`} />
                  {config.label}
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="grid gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${project.status === 'active' ? 'bg-accent' : ''}`}
                    onClick={() => actions.onStatusChange(project, 'active')}
                    disabled={project.status === 'active'}
                  >
                    <Clock className="mr-2 h-3 w-3 text-green-500" />
                    Active
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${project.status === 'completed' ? 'bg-accent' : ''}`}
                    onClick={() => actions.onStatusChange(project, 'completed')}
                    disabled={project.status === 'completed'}
                  >
                    <CheckCircle className="mr-2 h-3 w-3 text-blue-500" />
                    Completed
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${project.status === 'on_hold' ? 'bg-accent' : ''}`}
                    onClick={() => actions.onStatusChange(project, 'on_hold')}
                    disabled={project.status === 'on_hold'}
                  >
                    <Pause className="mr-2 h-3 w-3 text-yellow-500" />
                    On Hold
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${project.status === 'cancelled' ? 'bg-accent' : ''}`}
                    onClick={() => actions.onStatusChange(project, 'cancelled')}
                    disabled={project.status === 'cancelled'}
                  >
                    <XCircle className="mr-2 h-3 w-3 text-red-500" />
                    Cancelled
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${project.status === 'pipeline' ? 'bg-accent' : ''}`}
                    onClick={() => actions.onStatusChange(project, 'pipeline')}
                    disabled={project.status === 'pipeline'}
                  >
                    <GitBranch className="mr-2 h-3 w-3 text-purple-500" />
                    Pipeline
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "start_date",
      header: ({ column }) => (
        <SortableHeader column={column} icon={CalendarDays}>
          Start Date
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        const startDate = row.getValue("start_date") as string
        const date = startDate ? new Date(startDate) : undefined

        return (
          <div className="px-2 py-1 w-full min-w-0">
            <div className="min-w-0">
              <DatePickerTable
                date={date}
                onSelect={(newDate) => actions.onDateChange(project, 'start_date', newDate)}
                placeholder="Start date"
              />
            </div>
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "budget",
      header: ({ column }) => (
        <SortableHeader column={column} icon={DollarSign}>
          Budget
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const budget = row.getValue("budget") as number
        return (
          <div className="px-2 py-1 w-full">
            {budget ? (
              <span className="truncate font-normal text-sm">{formatCurrency(budget)}</span>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "expenses",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Minus}>
          Expenses
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const expenses = row.getValue("expenses") as number
        return (
          <div className="px-2 py-1 w-full">
            {expenses ? (
              <span className="truncate font-normal text-sm">{formatCurrency(expenses)}</span>
            ) : (
              <span className="text-muted-foreground text-sm">{formatCurrency(0)}</span>
            )}
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "received",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Plus}>
          Received
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const received = row.getValue("received") as number
        return (
          <div className="px-2 py-1 w-full">
            {received ? (
              <span className="truncate font-normal text-sm">{formatCurrency(received)}</span>
            ) : (
              <span className="text-muted-foreground text-sm">{formatCurrency(0)}</span>
            )}
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "pending",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Clock}>
          Pending
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        // Auto-calculate pending amount: budget - received = pending
        const budget = project.budget || 0
        const received = project.received || 0
        const pending = Math.max(0, budget - received) // Ensure it's not negative
        
                return (
          <div className="px-2 py-1 w-full">
            <span className="truncate font-normal text-sm">{formatCurrency(pending)}</span>
          </div>
        )
        },
        enableHiding: true,
      },
      {
        accessorKey: "due_date",
        header: ({ column }) => (
          <SortableHeader column={column} icon={Calendar}>
            Due Date
          </SortableHeader>
        ),
      cell: ({ row }) => {
        const project = row.original
        const dueDate = row.getValue("due_date") as string
        const date = dueDate ? new Date(dueDate) : undefined

                    return (
            <div className="px-2 py-1 w-full min-w-0">
              <div className="min-w-0">
                <DatePickerTable
                  date={date}
                  onSelect={(newDate) => actions.onDateChange(project, 'due_date', newDate)}
                  placeholder="Due date"
                />
              </div>
            </div>
          )
      },
      enableHiding: true,
    },
  ]
}
