"use client"

import { ColumnDef } from "@tanstack/react-table"
import {
  ArrowUpDown,
  Mail,
  Phone,
  Building,
  MapPin,
  CheckCircle,
  Clock,
  GitBranch,
  User,
  Building2,
  Briefcase,
  Activity,
  Copy,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { formatCurrency } from "@/lib/currency"
import { Client } from "@/hooks/use-clients"
import { SortableHeader } from "@/components/table/column-utils"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"

const clientStatusConfig = {
  active: {
    label: "Active",
    icon: CheckCircle,
    variant: "outline" as const,
    iconClassName: "text-green-500",
  },
  pipeline: {
    label: "Pipeline",
    icon: GitBranch,
    variant: "outline" as const,
    iconClassName: "text-purple-500",
  },
  closed: {
    label: "Closed",
    icon: Clock,
    variant: "outline" as const,
    iconClassName: "text-gray-400",
  },
}

interface ClientColumnConfig {
  onStatusChange?: (clientId: string, newStatus: string) => void
  onProjectClick?: (projectId: string) => void
  onEditClient?: (client: any) => void
  refetch?: () => void
}

export function createClientColumns(columnConfig: ClientColumnConfig): ColumnDef<Client>[] {
  
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const columns: ColumnDef<Client>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center w-full">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="h-4 w-4"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center w-full">
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
        <SortableHeader column={column} icon={User} className="px-0">
          Name
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const client = row.original
        const name = row.getValue("name") as string
        
        return (
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:opacity-80"
            onClick={() => columnConfig.onEditClient?.(client)}
          >
            <ClientAvatar 
              name={name} 
              avatarUrl={client.avatar_url}
              size="xs"
            />
            <span className="font-medium truncate text-gray-900 dark:text-gray-100 hover:underline" title={name}>
              {name}
            </span>
          </div>
        )
      },
      size: 250,
    },
    {
      accessorKey: "company",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Building2} className="px-0">
          Company
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const company = row.getValue("company") as string
        return company ? (
          <span className="text-sm text-muted-foreground truncate" title={company}>
            {company}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
      size: 200,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Mail} className="px-0">
          Email
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const email = row.getValue("email") as string
        return email ? (
          <div className="relative group/cell w-full">
            <a 
              href={`mailto:${email}`} 
              className="text-sm text-muted-foreground hover:text-foreground truncate block"
              title={email}
            >
              {email}
            </a>
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover/cell:opacity-100 transition-opacity z-10"
              onClick={(e) => {
                e.stopPropagation()
                handleCopyToClipboard(email, "Email")
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
      size: 250,
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Phone} className="px-0">
          Phone
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string
        return phone ? (
          <div className="relative group/cell w-full">
            <a 
              href={`tel:${phone}`} 
              className="text-sm text-muted-foreground hover:text-foreground truncate block"
              title={phone}
            >
              {phone}
            </a>
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover/cell:opacity-100 transition-opacity z-10"
              onClick={(e) => {
                e.stopPropagation()
                handleCopyToClipboard(phone, "Phone")
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
      size: 150,
    },
    {
      id: "location",
      header: ({ column }) => (
        <SortableHeader column={column} icon={MapPin} className="px-0">
          Location
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const client = row.original
        const parts = [client.city, client.state, client.country].filter(Boolean)
        const location = parts.join(", ")
        
        return location ? (
          <span className="text-sm text-muted-foreground truncate" title={location}>
            {location}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
      size: 200,
    },
    {
      id: "projects",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Briefcase} className="px-0">
          Projects
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const projects = row.original.projects || []
        const activeProjects = projects.filter(p => p.status === 'active').length
        const totalProjects = projects.length
        
        return (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {activeProjects}/{totalProjects}
            </Badge>
          </div>
        )
      },
      size: 120,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Activity} className="px-0">
          Status
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const config = clientStatusConfig[status as keyof typeof clientStatusConfig] || clientStatusConfig.active
        const Icon = config.icon
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge variant={config.variant} className="flex items-center space-x-1 cursor-pointer">
                <Icon className={`h-3 w-3 ${config.iconClassName}`} />
                <span>{config.label}</span>
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {Object.entries(clientStatusConfig).map(([key, statusConfig]) => {
                const StatusIcon = statusConfig.icon
                return (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => columnConfig.onStatusChange?.(row.original.id, key)}
                    disabled={status === key}
                  >
                    <StatusIcon className={`mr-2 h-3 w-3 ${statusConfig.iconClassName}`} />
                    {statusConfig.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      size: 120,
    },
    {
      accessorKey: "client_since",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Calendar} className="px-0">
          Client Since
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const client = row.original
        const date = client.client_since ? new Date(client.client_since) : undefined
        
        return (
          <div className="w-full max-w-[100px]">
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-sm text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer w-full text-left">
                  {date ? format(date, "MMM d, yyyy") : "—"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    // Update client_since date
                    if (columnConfig.onStatusChange && newDate) {
                      columnConfig.onStatusChange(client.id, `client_since:${newDate.toISOString()}`)
                    }
                  }}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2030}
                />
              </PopoverContent>
            </Popover>
          </div>
        )
      },
      size: 140,
    },
  ]

  return columns
} 