"use client"

import { useState } from "react"
import { MoreHorizontal, Upload, Download, RotateCcw, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { CurrencyConverterWidget } from "@/components/currency-converter-widget"

interface PageActionsMenuProps {
  entityType: 'clients' | 'projects' | 'invoices'
  onExport?: () => void
  onResetColumns?: () => void
  showResetColumns?: boolean
}

export function PageActionsMenu({ entityType, onExport, onResetColumns, showResetColumns = false }: PageActionsMenuProps) {
  const router = useRouter()
  const [showCurrencyConverter, setShowCurrencyConverter] = useState(false)

  const handleImport = () => {
    router.push(`/dashboard/${entityType}/import`)
  }

  const handleExport = () => {
    onExport?.()
  }

  return (
    <div className="flex items-center gap-2">
      {/* Currency Converter for Projects and Invoices */}
      {(entityType === 'projects' || entityType === 'invoices') && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCurrencyConverter(true)}
            className="h-8"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Currency
          </Button>
          <CurrencyConverterWidget
            isOpen={showCurrencyConverter}
            onClose={() => setShowCurrencyConverter(false)}
          />
        </>
      )}
      
      {/* Actions Menu */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleImport}>
          <Upload className="mr-2 h-4 w-4" />
          Import
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </DropdownMenuItem>
        {showResetColumns && onResetColumns && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onResetColumns}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Column Settings
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  )
} 