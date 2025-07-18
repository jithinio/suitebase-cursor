"use client"

import { useEffect, useState } from "react"
import { Plus, Eye, Mail, Download, Trash2, X, Send, Loader2, Edit, ChevronDown, User, Building, MapPin, Phone, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { PageActionsMenu } from "@/components/page-actions-menu"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createColumns, type Invoice } from "@/components/invoices/columns"
import { DataTable } from "@/components/invoices/data-table"
import { formatCurrency, formatCurrencyWithConversion, getDefaultCurrency } from "@/lib/currency"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { useSettings } from "@/components/settings-provider"

// Mock data removed - invoices will be loaded from database

// Mock data removed - clients will be loaded from database

export default function InvoicesPage() {
  const router = useRouter()
  const { settings } = useSettings()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false)
  const [sendInvoiceOpen, setSendInvoiceOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [clientDetailsOpen, setClientDetailsOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null)
  const [undoData, setUndoData] = useState<{ items: Invoice[], timeout: NodeJS.Timeout } | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  
  // Send invoice form state
  const [sendForm, setSendForm] = useState({
    to: "",
    subject: "",
    message: ""
  })

  useEffect(() => {
    fetchInvoices()
  }, [])

  // Cleanup undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoData) {
        clearTimeout(undoData.timeout)
      }
    }
  }, [undoData])

  // Refresh invoices when page becomes visible (e.g., coming back from generate page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchInvoices()
      }
    }

    const handleFocus = () => {
      fetchInvoices()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  async function fetchInvoices() {
    try {
      if (isSupabaseConfigured()) {
        // Fetch from Supabase with invoice items - automatically filtered by RLS policies
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select(`
            *,
            clients:client_id (id, name, company, email, phone, address, city, state, zip_code, country),
            projects:project_id (name),
            invoice_items (
              id,
              description,
              quantity,
              rate,
              amount
            )
          `)
          .order('created_at', { ascending: false })

        if (invoicesError) {
          console.error('Error fetching invoices:', invoicesError)
          throw invoicesError
        }

        // Transform the data to match the expected format
        const transformedInvoices = invoicesData.map((invoice: any) => ({
          ...invoice,
          items: invoice.invoice_items || []
        }))

        setInvoices(transformedInvoices)
      } else {
        // Use mock data as fallback, including generated invoices
        const generatedInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
        
        // Ensure generated invoices have items
        const processedGeneratedInvoices = generatedInvoices.map((invoice: any) => ({
          ...invoice,
          items: invoice._items || []
        }))
        
        const allInvoices = [...processedGeneratedInvoices].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setInvoices(allInvoices)
      }
    } catch (error) {
      console.error("Error fetching invoices:", error)
      // Use only generated invoices as fallback
      const generatedInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
      const processedGeneratedInvoices = generatedInvoices.map((invoice: any) => ({
        ...invoice,
        items: invoice._items || []
      }))
      const allInvoices = [...processedGeneratedInvoices].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setInvoices(allInvoices)
      setError("Connection error")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvoice = () => {
    router.push("/dashboard/invoices/generate")
  }

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setViewDetailsOpen(true)
  }

  const handleSendInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    
    // Check if client has email
    if (!invoice.clients?.email) {
      toast.error('Client email not found', {
        description: 'Please add an email address for this client before sending.'
      })
      return
    }
    
    setSendForm({
      to: invoice.clients.email,
      subject: `Invoice ${invoice.invoice_number} from ${settings.companyName || 'Your Company'}`,
      message: `Dear ${invoice.clients?.name || 'Client'},\n\nPlease find attached your invoice ${invoice.invoice_number} for ${formatCurrency(invoice.total_amount)}.\n\nDue date: ${new Date(invoice.due_date).toLocaleDateString()}\n\nThank you for your business!\n\nBest regards,\n${settings.companyName || 'Your Company'}`
    })
    setSendInvoiceOpen(true)
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    if (downloadingPDF) return // Prevent multiple simultaneous downloads
    setDownloadingPDF(invoice.id)
    try {
      console.log('📥 Download PDF - Starting download for invoice:', invoice.invoice_number)
      
      // Get saved template settings from Supabase settings
      let templateSettings = null
      
      // Template ID migration mapping
      const migrateTemplateId = (templateId: string) => {
        const migrationMap: { [key: string]: string } = {
          'stripe-inspired': 'modern',
          'contra-inspired': 'bold',
          'mercury-inspired': 'classic',
          'notion-inspired': 'slate'
        }
        return migrationMap[templateId] || templateId
      }
      
      // First try to get from settings (Supabase)
      if (settings.invoiceTemplate && Object.keys(settings.invoiceTemplate).length > 0) {
        templateSettings = {
          ...settings.invoiceTemplate,
          templateId: migrateTemplateId(settings.invoiceTemplate.templateId)
        }
        console.log('✅ Download PDF - Template settings loaded from Supabase')
      } else {
        console.log('❌ Download PDF - No Supabase template found, checking localStorage')
        // Fallback to localStorage if no Supabase template exists
        const savedTemplate = localStorage.getItem('invoice-template-settings')
        if (savedTemplate) {
          try {
            const parsed = JSON.parse(savedTemplate)
            templateSettings = {
              ...parsed,
              templateId: migrateTemplateId(parsed.templateId)
            }
            console.log('✅ Download PDF - Template settings loaded from localStorage')
          } catch (error) {
            console.error('❌ Download PDF - Error parsing saved template:', error)
          }
        } else {
          console.log('❌ Download PDF - No template found in localStorage either')
        }
      }
      
      // Get company information from settings
      let companyInfo = {
        companyName: settings.companyName || "Your Company",
        companyAddress: "123 Business St\nCity, State 12345",
        companyEmail: "contact@yourcompany.com", 
        companyPhone: "+1 (555) 123-4567",
      }

      // Load company info from settings
      const savedCompanyInfo = localStorage.getItem('company-info')
      if (savedCompanyInfo) {
        try {
          const parsed = JSON.parse(savedCompanyInfo)
          companyInfo = {
            companyName: parsed.companyName || settings.companyName || companyInfo.companyName,
            companyAddress: parsed.companyAddress || companyInfo.companyAddress,
            companyEmail: parsed.companyEmail || companyInfo.companyEmail,
            companyPhone: parsed.companyPhone || companyInfo.companyPhone,
          }
        } catch (error) {
          console.error('Error parsing company info:', error)
        }
      }
      
      // Fetch full client details if we have a client ID
      let fullClientData = null
      if (invoice.clients) {
        // Use the client data from the invoice directly
        fullClientData = invoice.clients
      }
      
      // Create enhanced invoice with full client data
      const enhancedInvoice: any = {
        ...invoice,
        clients: fullClientData ? {
          name: fullClientData.name,
          company: fullClientData.company,
          email: fullClientData.email,
          phone: fullClientData.phone,
          address: fullClientData.address,
          city: fullClientData.city,
          state: fullClientData.state,
          zip_code: fullClientData.zip_code,
          country: fullClientData.country
        } : invoice.clients
      }
      
      // Merge all template settings with company info
      const defaultTemplate = {
        templateId: 'modern',
        logoSize: [80],
        logoBorderRadius: [8],
        invoicePadding: [48],
        fontFamily: 'inter',
        fontSize: [14],
        lineHeight: [1.6],
        tableHeaderSize: [13],
        primaryColor: '#000000',
        secondaryColor: '#666666',
        accentColor: '#0066FF',
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E5E5',
        currency: 'USD',
        showLogo: true,
        showInvoiceNumber: true,
        showDates: true,
        showPaymentTerms: true,
        showNotes: true,
        showTaxId: false,
        showItemDetails: true,
        notes: '',
      }
      
      const fullTemplate = {
        ...defaultTemplate,
        // Override with saved template settings from Supabase
        ...templateSettings,
        // Override with company info
        companyName: companyInfo.companyName,
        companyAddress: companyInfo.companyAddress,
        companyEmail: companyInfo.companyEmail,
        companyPhone: companyInfo.companyPhone,
        logoUrl: templateSettings?.logoUrl || settings.companyLogo || ""
      }
      
      console.log('🔧 Download PDF - Using template:', fullTemplate.templateId)
      
      // Generate PDF using the Puppeteer API
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice: enhancedInvoice,
          template: fullTemplate,
          companyInfo: companyInfo
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`PDF generation failed: ${errorData.details}`)
      }

      // Download the PDF
      const pdfBlob = await response.blob()
      const url = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoice.invoice_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`Invoice ${invoice.invoice_number} downloaded successfully!`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setDownloadingPDF(null)
    }
  }

  const handleDeleteInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setDeleteConfirmOpen(true)
  }

  const handleBatchDelete = (invoices: Invoice[], onUndo: (items: Invoice[]) => void) => {
    if (invoices.length === 0) return
    confirmBatchDelete(invoices, onUndo)
  }

  const handleUndo = (deletedInvoices: Invoice[]) => {
    // Clear any existing undo timeout
    if (undoData) {
      clearTimeout(undoData.timeout)
    }
    
    // Restore the deleted invoices
    setInvoices(prev => [...deletedInvoices, ...prev])
    setUndoData(null)
    
    toast.success(`${deletedInvoices.length} invoice${deletedInvoices.length > 1 ? 's' : ''} restored!`)
  }

  const confirmBatchDelete = async (invoicesToDelete: Invoice[], onUndo: (items: Invoice[]) => void) => {
    if (invoicesToDelete.length === 0) return

    // Show progress toast for operations with 3+ items or after 1 second delay
    const showProgress = invoicesToDelete.length >= 3
    let progressToastId: string | number | undefined
    let progressTimeout: NodeJS.Timeout | undefined

    try {
      // Set up progress notification for longer operations
      if (showProgress) {
        progressToastId = toast.loading(`Deleting ${invoicesToDelete.length} invoice${invoicesToDelete.length > 1 ? 's' : ''}...`, {
          description: "Please wait while we process your request."
        })
      } else {
        // For smaller operations, show progress toast after 1 second delay
        progressTimeout = setTimeout(() => {
          progressToastId = toast.loading(`Deleting ${invoicesToDelete.length} invoice${invoicesToDelete.length > 1 ? 's' : ''}...`, {
            description: "Please wait while we process your request."
          })
        }, 1000)
      }

      const deletedIds: string[] = []
      
      for (let i = 0; i < invoicesToDelete.length; i++) {
        const invoice = invoicesToDelete[i]
        try {
          if (isSupabaseConfigured()) {
            // Delete from Supabase database
            console.log('Deleting invoice from Supabase:', invoice.id)
            
            // First delete invoice items
            const { error: itemsError } = await supabase
              .from('invoice_items')
              .delete()
              .eq('invoice_id', invoice.id)

            if (itemsError) {
              console.error('Error deleting invoice items:', itemsError)
              // Continue with invoice deletion even if items deletion fails
            }

            // Then delete the invoice
            const { error: invoiceError } = await supabase
              .from('invoices')
              .delete()
              .eq('id', invoice.id)

            if (invoiceError) {
              throw invoiceError
            }

            console.log('Invoice deleted successfully from database')
          } else {
            // Demo mode: delete from session storage
            console.log('Deleting invoice from session storage (demo mode):', invoice.id)
            const existingInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
            const updatedInvoices = existingInvoices.filter((inv: any) => inv.id !== invoice.id)
            sessionStorage.setItem('demo-invoices', JSON.stringify(updatedInvoices))
            console.log('Invoice deleted from session storage')
          }
          
          deletedIds.push(invoice.id)

          // Update progress for larger operations
          if (progressToastId) {
            const progress = Math.round(((i + 1) / invoicesToDelete.length) * 100)
            toast.loading(`Deleting invoices... ${i + 1}/${invoicesToDelete.length} (${progress}%)`, {
              id: progressToastId,
              description: `Processing "${invoice.invoice_number}"`
            })
          }
        } catch (error) {
          console.error(`Error deleting invoice ${invoice.invoice_number}:`, error)
        }
      }

      // Clear progress notifications
      if (progressTimeout) {
        clearTimeout(progressTimeout)
      }
      if (progressToastId) {
        toast.dismiss(progressToastId)
      }
      
      // Get the successfully deleted invoices
      const deletedInvoices = invoicesToDelete.filter(inv => deletedIds.includes(inv.id))
      
      // Remove successfully deleted invoices from local state
      setInvoices(invoices.filter(inv => !deletedIds.includes(inv.id)))
      
      if (deletedIds.length === invoicesToDelete.length) {
        // Clear any existing undo timeout
        if (undoData) {
          clearTimeout(undoData.timeout)
        }
        
        // Set up new undo timeout (30 seconds)
        const timeout = setTimeout(() => {
          setUndoData(null)
        }, 30000)
        
        setUndoData({ items: deletedInvoices, timeout })
        
        // Show toast with undo action
        toast.success(`${deletedIds.length} invoice${deletedIds.length > 1 ? 's' : ''} deleted successfully`, {
          action: {
            label: "Undo",
            onClick: () => handleUndo(deletedInvoices),
          },
        })
      } else {
        toast.success(`${deletedIds.length} of ${invoicesToDelete.length} invoices deleted successfully`)
        if (deletedIds.length < invoicesToDelete.length) {
          toast.error(`${invoicesToDelete.length - deletedIds.length} invoice${invoicesToDelete.length - deletedIds.length > 1 ? 's' : ''} failed to delete`)
        }
      }
    } catch (error) {
      console.error('Error during batch delete:', error)
      
      // Clear progress notifications on error
      if (progressTimeout) {
        clearTimeout(progressTimeout)
      }
      if (progressToastId) {
        toast.dismiss(progressToastId)
      }
      
      toast.error('Failed to delete invoices. Please try again.')
    }
  }

  const confirmDeleteInvoice = async () => {
    if (!selectedInvoice) return

    try {
      if (isSupabaseConfigured()) {
        // Delete from Supabase database
        console.log('Deleting invoice from Supabase:', selectedInvoice.id)
        
        // First delete invoice items
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', selectedInvoice.id)

        if (itemsError) {
          console.error('Error deleting invoice items:', itemsError)
          // Continue with invoice deletion even if items deletion fails
        }

        // Then delete the invoice
        const { error: invoiceError } = await supabase
          .from('invoices')
          .delete()
          .eq('id', selectedInvoice.id)

        if (invoiceError) {
          throw invoiceError
        }

        console.log('Invoice deleted successfully from database')
      } else {
        // Demo mode: delete from session storage
        console.log('Deleting invoice from session storage (demo mode):', selectedInvoice.id)
        const existingInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
        const updatedInvoices = existingInvoices.filter((inv: any) => inv.id !== selectedInvoice.id)
        sessionStorage.setItem('demo-invoices', JSON.stringify(updatedInvoices))
        console.log('Invoice deleted from session storage')
      }

      // Remove from local state
      setInvoices(invoices.filter(inv => inv.id !== selectedInvoice.id))
      
      toast.success(`Invoice ${selectedInvoice.invoice_number} deleted successfully!`)
    } catch (error) {
      console.error('Error deleting invoice:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to delete invoice: ${errorMessage}`)
    } finally {
      setDeleteConfirmOpen(false)
      setSelectedInvoice(null)
    }
  }

  const handleSendInvoiceSubmit = async () => {
    if (!selectedInvoice || sendingEmail) return

    setSendingEmail(true)
    try {
      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          clientEmail: sendForm.to,
          clientName: selectedInvoice.clients?.name || 'Client',
          senderName: settings.companyName || 'Your Company',
          senderEmail: 'noreply@jithin.io',
          customMessage: sendForm.message,
          subject: sendForm.subject
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      // Update invoice status to sent
      setInvoices(invoices.map(inv => 
        inv.id === selectedInvoice.id 
          ? { ...inv, status: 'sent' }
          : inv
      ))
      
      toast.success(`Invoice ${selectedInvoice.invoice_number} sent to ${sendForm.to}!`)
    } catch (error) {
      console.error('Error sending invoice:', error)
      toast.error('Failed to send invoice', {
        description: error instanceof Error ? error.message : 'Please try again later'
      })
    } finally {
      setSendingEmail(false)
      setSendInvoiceOpen(false)
      setSelectedInvoice(null)
    }
  }

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('invoices')
          .update({ status: newStatus })
          .eq('id', invoiceId)

        if (error) {
          throw error
        }

        // Update local state
        setInvoices(invoices.map(inv => 
          inv.id === invoiceId ? { ...inv, status: newStatus } : inv
        ))

        // Update selected invoice if it's the one being modified
        if (selectedInvoice?.id === invoiceId) {
          setSelectedInvoice({ ...selectedInvoice, status: newStatus })
        }

        toast.success(`Invoice status updated to ${newStatus}`)
      } else {
        // For demo mode, update session storage
        const generatedInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
        const updatedInvoices = generatedInvoices.map((inv: any) => 
          inv.id === invoiceId ? { ...inv, status: newStatus } : inv
        )
        sessionStorage.setItem('demo-invoices', JSON.stringify(updatedInvoices))

        // Update local state
        setInvoices(invoices.map(inv => 
          inv.id === invoiceId ? { ...inv, status: newStatus } : inv
        ))

        // Update selected invoice if it's the one being modified
        if (selectedInvoice?.id === invoiceId) {
          setSelectedInvoice({ ...selectedInvoice, status: newStatus })
        }

        toast.success(`Invoice status updated to ${newStatus}`)
      }
    } catch (error) {
      console.error('Error updating invoice status:', error)
      toast.error('Failed to update invoice status')
    }
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: Clock },
      sent: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: Send },
      paid: { label: "Paid", color: "bg-green-100 text-green-700", icon: CheckCircle },
      overdue: { label: "Overdue", color: "bg-red-100 text-red-700", icon: XCircle },
      cancelled: { label: "Cancelled", color: "bg-gray-50 text-gray-600", icon: XCircle },
    }
    return configs[status as keyof typeof configs] || configs.draft
  }

  const getProjectStatusConfig = (status: string) => {
    const configs = {
      active: {
        label: "Active",
        variant: "outline" as const,
        iconClassName: "text-green-500",
      },
      completed: {
        label: "Completed",
        variant: "outline" as const,
        iconClassName: "text-blue-500",
      },
      on_hold: {
        label: "On Hold",
        variant: "outline" as const,
        iconClassName: "text-yellow-500",
      },
      cancelled: {
        label: "Cancelled",
        variant: "outline" as const,
        iconClassName: "text-gray-400",
      },
    }
    return configs[status as keyof typeof configs] || {
      label: status.replace('_', ' ').toUpperCase(),
      variant: "outline" as const,
      iconClassName: "text-gray-400",
    }
  }

  const handleClientClick = async (client: { name: string; company?: string; id?: string }) => {
    try {
      // Try to fetch full client details if we have an ID
      if (client.id && isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('clients')
          .select(`
            *,
            projects (
              id,
              name,
              status
            )
          `)
          .eq('id', client.id)
          .single()

        if (data && !error) {
          setSelectedClient(data)
        } else {
          // Fallback to basic client info
          setSelectedClient(client)
        }
      } else {
        // Use the basic client info we have
        setSelectedClient(client)
      }
      
      setClientDetailsOpen(true)
    } catch (error) {
      console.error('Error fetching client details:', error)
      setSelectedClient(client)
      setClientDetailsOpen(true)
    }
  }

  const handleViewInvoice = (invoice: Invoice) => {
    router.push(`/dashboard/invoices/${invoice.id}/preview?action=view`)
  }

  const handleEditInvoice = (invoice: Invoice) => {
    // Store invoice data for editing
    const editData = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      clientId: invoice.clients?.id || null,
      clientName: invoice.clients?.name,
      clientCompany: invoice.clients?.company,
      amount: invoice.amount,
      taxAmount: invoice.tax_amount,
      totalAmount: invoice.total_amount,
      currency: invoice.currency,
      status: invoice.status,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      notes: invoice.notes,
      paymentTerms: invoice.terms,
      items: invoice.items || [],
      projectName: invoice.projects?.name
    }
    
    sessionStorage.setItem('edit-invoice-data', JSON.stringify(editData))
    
    toast.success('Opening invoice for editing...')
    
    // Navigate to generate page
    router.push('/dashboard/invoices/generate?edit=true')
  }

  const handleStatusChangeFromActions = async (invoice: Invoice, newStatus: string) => {
    await handleStatusChange(invoice.id, newStatus)
  }

  const handleProjectClick = (projectName: string) => {
    // Navigate to projects page and search for the project
    window.location.href = `/dashboard/projects?search=${encodeURIComponent(projectName)}`
  }

  const handleExport = () => {
    // Create CSV content
    const headers = ['Invoice Number', 'Amount', 'Tax Amount', 'Total Amount', 'Currency', 'Status', 'Issue Date', 'Due Date', 'Client Name', 'Client Company', 'Project Name', 'Notes', 'Created At']
    const csvContent = [
      headers.join(','),
      ...invoices.map(invoice => [
        invoice.invoice_number,
        invoice.amount,
        invoice.tax_amount,
        invoice.total_amount,
        invoice.currency,
        invoice.status,
        invoice.issue_date,
        invoice.due_date,
        invoice.clients?.name || '',
        invoice.clients?.company || '',
        invoice.projects?.name || '',
        invoice.notes || '',
        invoice.created_at || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success(`Exported ${invoices.length} invoices to CSV`)
  }

  const columnActions = {
    onViewDetails: handleViewDetails,
    onEditInvoice: handleEditInvoice,
    onSendInvoice: handleSendInvoice,
    onViewInvoice: handleViewInvoice,
    onDeleteInvoice: handleDeleteInvoice,
    onStatusChange: handleStatusChangeFromActions,
    onClientClick: handleClientClick,
    onProjectClick: handleProjectClick,
    downloadingPDF,
  }

  const columns = createColumns(columnActions)

  if (loading) {
    return (
      <>
        <PageHeader
          title="Invoices"
        />
        <PageContent>
          <div className="flex items-center justify-center h-[calc(100vh-300px)]">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-gray-200 dark:border-gray-700"></div>
                <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-600">Loading invoices</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Please wait a moment...</p>
              </div>
            </div>
          </div>
        </PageContent>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Invoices"
        action={<PageActionsMenu entityType="invoices" onExport={handleExport} />}
      />
      <PageContent>
        {error && (
          <Alert className="border-yellow-200 bg-yellow-50 mb-4">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {error}
            </AlertDescription>
          </Alert>
        )}
        <div className="overflow-x-auto">
          <DataTable 
            columns={columns} 
            data={invoices} 
            onCreateInvoice={handleCreateInvoice}
            onBatchDelete={handleBatchDelete}
            contextActions={{
              onViewDetails: handleViewDetails,
              onEditInvoice: handleEditInvoice,
              onSendInvoice: handleSendInvoice,
              onViewInvoice: handleViewInvoice,
              onDeleteInvoice: handleDeleteInvoice,
              onStatusChange: handleStatusChangeFromActions,
              downloadingPDF,
            }}
          />
        </div>
      </PageContent>

      {/* Invoice Details Modal */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="sr-only">
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Complete information for invoice {selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          <div className="border border-gray-200 shadow-sm bg-white rounded-lg">
            <div className="p-6">
              {selectedInvoice && (
                <>
                  {/* Header with Invoice Icon */}
                  <div className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-blue-100 border border-blue-200 rounded-full p-2.5 w-fit shadow-sm">
                        <Eye className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Invoice Details</h3>
                        <p className="text-sm text-gray-500 mt-1">Complete invoice information</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Invoice number</p>
                        <p className="text-sm font-medium text-gray-900 font-mono">{selectedInvoice.invoice_number}</p>
                      </div>
                    </div>
                  </div>

                  {/* Divider Line */}
                  <div className="border-t border-dotted border-gray-300 -mx-6 mb-6"></div>

                  {/* Client & Date Info */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">Bill to</p>
                        <p className="font-medium text-gray-900">{selectedInvoice.clients?.name || 'N/A'}</p>
                        {selectedInvoice.clients?.company && (
                          <p className="text-sm text-gray-600">{selectedInvoice.clients.company}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-start text-sm">
                      <div>
                        <p className="text-gray-500">Issue date</p>
                        <p className="text-gray-900 font-medium">{new Date(selectedInvoice.issue_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Due date</p>
                        <p className="text-gray-900 font-medium">{new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Select 
                          value={selectedInvoice.status} 
                          onValueChange={(value) => handleStatusChange(selectedInvoice.id, value)}
                        >
                          <SelectTrigger className="w-32 h-9 text-sm rounded-lg shadow-xs">
                            <SelectValue>
                              <div className="flex items-center">
                                {(() => {
                                  const config = getStatusConfig(selectedInvoice.status)
                                  const Icon = config.icon
                                  return (
                                    <>
                                      <Icon className="mr-2 h-4 w-4" />
                                      {config.label}
                                    </>
                                  )
                                })()}
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="w-40">
                            <SelectItem value="draft" className="flex items-center py-2">
                              <div className="flex items-center">
                                <Clock className="mr-2 h-4 w-4 text-gray-600" />
                                Draft
                              </div>
                            </SelectItem>
                            <SelectItem value="sent" className="flex items-center py-2">
                              <div className="flex items-center">
                                <Send className="mr-2 h-4 w-4 text-blue-600" />
                                Sent
                              </div>
                            </SelectItem>
                            <SelectItem value="paid" className="flex items-center py-2">
                              <div className="flex items-center">
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                Paid
                              </div>
                            </SelectItem>
                            <SelectItem value="overdue" className="flex items-center py-2">
                              <div className="flex items-center">
                                <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                Overdue
                              </div>
                            </SelectItem>
                            <SelectItem value="cancelled" className="flex items-center py-2">
                              <div className="flex items-center">
                                <XCircle className="mr-2 h-4 w-4 text-gray-600" />
                                Cancelled
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Items */}
                  {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                    <div className="mb-6">
                      <div className="border-t border-dotted border-gray-300 -mx-6 mb-4"></div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Items</h4>
                      <div className="space-y-3">
                        {selectedInvoice.items.map((item, index) => (
                          <div key={item.id || index} className="flex justify-between items-center">
                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {item.description || `Item ${index + 1}`}
                              </p>
                              <span className="text-xs text-gray-400">•</span>
                              <p className="text-xs text-gray-500 shrink-0">
                                {item.quantity} × {formatCurrency(item.rate, selectedInvoice.currency)}
                              </p>
                            </div>
                            <div className="ml-4 shrink-0">
                              <p className="text-sm font-medium tabular-nums text-gray-900">
                                {formatCurrency(item.amount, selectedInvoice.currency)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Amount Breakdown */}
                  <div>
                    <div className="border-t border-dotted border-gray-300 -mx-6 mb-6"></div>
                    <div className="space-y-3">
                      {selectedInvoice.currency && selectedInvoice.currency !== getDefaultCurrency() && (
                        <div className="flex justify-between p-2 bg-blue-50 border border-blue-200 rounded text-xs mb-3">
                          <span className="text-blue-700 font-medium">Currency:</span>
                          <span className="text-blue-700">{selectedInvoice.currency}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Subtotal</span>
                        <span className="text-sm font-medium tabular-nums">
                          {selectedInvoice.currency && selectedInvoice.currency !== getDefaultCurrency()
                            ? formatCurrencyWithConversion(selectedInvoice.amount, selectedInvoice.currency, getDefaultCurrency())
                            : formatCurrency(selectedInvoice.amount, selectedInvoice.currency)
                          }
                        </span>
                      </div>
                      
                      {selectedInvoice.tax_amount > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Tax</span>
                          <span className="text-sm font-medium tabular-nums">
                            {selectedInvoice.currency && selectedInvoice.currency !== getDefaultCurrency()
                              ? formatCurrencyWithConversion(selectedInvoice.tax_amount, selectedInvoice.currency, getDefaultCurrency())
                              : formatCurrency(selectedInvoice.tax_amount, selectedInvoice.currency)
                            }
                          </span>
                        </div>
                      )}
                      
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-medium text-gray-900">Total</span>
                          <span className="text-lg font-semibold tabular-nums text-gray-900">
                            {selectedInvoice.currency && selectedInvoice.currency !== getDefaultCurrency()
                              ? formatCurrencyWithConversion(selectedInvoice.total_amount, selectedInvoice.currency, getDefaultCurrency())
                              : formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency)
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project, Terms & Notes Information */}
                  {(selectedInvoice.projects?.name || selectedInvoice.terms || selectedInvoice.notes) && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <div className="space-y-4">
                        {selectedInvoice.projects?.name && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Project</p>
                            <Button
                              variant="ghost"
                              className="p-0 h-auto text-sm font-medium text-gray-900"
                              onClick={() => handleProjectClick(selectedInvoice.projects!.name)}
                            >
                              {selectedInvoice.projects.name}
                            </Button>
                          </div>
                        )}
                        {selectedInvoice.terms && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Payment Terms</p>
                            <p className="text-sm text-gray-700">{selectedInvoice.terms}</p>
                          </div>
                        )}
                        {selectedInvoice.notes && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Notes</p>
                            <p className="text-sm text-gray-700">{selectedInvoice.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons - Horizontally Stacked */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => handleDownloadPDF(selectedInvoice)}
                        disabled={downloadingPDF === selectedInvoice.id}
                        size="sm"
                        className="flex-1"
                      >
                        {downloadingPDF === selectedInvoice.id ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-1.5 h-4 w-4" />
                        )}
                        {downloadingPDF === selectedInvoice.id ? 'Generating PDF...' : 'Download PDF'}
                      </Button>
                      
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewDetailsOpen(false)
                          handleSendInvoice(selectedInvoice)
                        }}
                        className="flex-1"
                      >
                        <Send className="mr-1.5 h-4 w-4" />
                        Send Invoice
                      </Button>

                      {/* Edit Button for editable invoices */}
                      {(['draft', 'sent', 'overdue'].includes(selectedInvoice.status)) && (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewDetailsOpen(false)
                            handleEditInvoice(selectedInvoice)
                          }}
                          className="flex-1"
                        >
                          <Edit className="mr-1.5 h-4 w-4" />
                          Edit
                        </Button>
                      )}

                      <Button 
                        variant="outline"
                        onClick={() => setViewDetailsOpen(false)}
                        className="flex-1"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Invoice Modal */}
      <Dialog open={sendInvoiceOpen} onOpenChange={setSendInvoiceOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Send Invoice</span>
            </DialogTitle>
            <DialogDescription>
              Send {selectedInvoice?.invoice_number} via email
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                value={sendForm.to}
                onChange={(e) => setSendForm({...sendForm, to: e.target.value})}
                placeholder="client@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={sendForm.subject}
                onChange={(e) => setSendForm({...sendForm, subject: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                value={sendForm.message}
                onChange={(e) => setSendForm({...sendForm, message: e.target.value})}
                rows={6}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSendInvoiceOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendInvoiceSubmit} disabled={sendingEmail}>
                {sendingEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                <Mail className="mr-2 h-4 w-4" />
                )}
                {sendingEmail ? 'Sending...' : 'Send Invoice'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice {selectedInvoice?.invoice_number}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteInvoice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Client Details Modal */}
      <Dialog open={clientDetailsOpen} onOpenChange={setClientDetailsOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="sr-only">
            <DialogTitle>Client Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedClient?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="border border-gray-200 shadow-sm bg-white rounded-lg">
            <div className="p-6">
              {selectedClient && (
                <>
                  {/* Header with Client Icon */}
                  <div className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-blue-100 border border-blue-200 rounded-full p-2.5 w-fit shadow-sm">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Client Details</h3>
                        <p className="text-sm text-gray-500 mt-1">Complete client information</p>
                      </div>
                      <div className="text-right">
                        {selectedClient.avatar_url && (
                          <ClientAvatar 
                            name={selectedClient.name} 
                            avatarUrl={selectedClient.avatar_url}
                            size="lg"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider Line */}
                  <div className="border-t border-dotted border-gray-300 -mx-6 mb-6"></div>

                  {/* Client Information */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Name</p>
                        <p className="font-medium text-gray-900">{selectedClient.name}</p>
                      </div>
                      {selectedClient.company && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Company</p>
                          <p className="text-gray-900">{selectedClient.company}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {selectedClient.email && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Email</p>
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <p className="text-gray-900 text-sm">{selectedClient.email}</p>
                          </div>
                        </div>
                      )}
                      {selectedClient.phone && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Phone</p>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <p className="text-gray-900 text-sm">{selectedClient.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {(selectedClient.address || selectedClient.city || selectedClient.state || selectedClient.country) && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Address</p>
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div className="text-gray-900 text-sm">
                            {selectedClient.address && <div>{selectedClient.address}</div>}
                            <div>
                              {[selectedClient.city, selectedClient.state, selectedClient.zip_code].filter(Boolean).join(', ')}
                            </div>
                            {selectedClient.country && <div>{selectedClient.country}</div>}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedClient.notes && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Notes</p>
                        <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded">{selectedClient.notes}</p>
                      </div>
                    )}

                    {selectedClient.projects && selectedClient.projects.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 mb-3">Projects</p>
                        <div className="space-y-2">
                          {selectedClient.projects.map((project: any) => (
                            <div key={project.id} className="flex items-center justify-between p-3 border rounded">
                              <Button
                                variant="ghost"
                                className="p-0 h-auto text-sm font-medium text-gray-900"
                                onClick={() => handleProjectClick(project.name)}
                              >
                                {project.name}
                              </Button>
                              <Badge
                                variant={getProjectStatusConfig(project.status).variant}
                                className="text-xs text-zinc-700 font-medium"
                              >
                                <div className={`w-2 h-2 rounded-full mr-1.5 ${getProjectStatusConfig(project.status).iconClassName?.replace('text-', 'bg-') || 'bg-gray-400'}`}></div>
                                {getProjectStatusConfig(project.status).label}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => {
                          setClientDetailsOpen(false)
                          // Navigate to clients page to edit
                          router.push('/dashboard/clients')
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Edit className="mr-1.5 h-4 w-4" />
                        Edit Client
                      </Button>
                      
                      <Button 
                        onClick={() => {
                          // Store client data for invoice creation
                          sessionStorage.setItem('invoice-client-data', JSON.stringify({
                            clientId: selectedClient.id,
                            clientName: selectedClient.name,
                            clientCompany: selectedClient.company,
                            clientEmail: selectedClient.email,
                          }))
                          setClientDetailsOpen(false)
                          router.push('/dashboard/invoices/generate')
                        }}
                        size="sm"
                        className="flex-1"
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Create Invoice
                      </Button>

                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setClientDetailsOpen(false)}
                        className="flex-1"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
