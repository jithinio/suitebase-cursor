"use client"

import * as React from "react"
import { ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { countries, type Country } from "@/lib/countries"

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  onCountryChange?: (country: Country) => void
  selectedCountry?: Country
  placeholder?: string
  className?: string
}

export function PhoneInput({
  value = "",
  onChange,
  onCountryChange,
  selectedCountry,
  placeholder = "Enter phone number",
  className,
  ...props
}: PhoneInputProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [currentCountry, setCurrentCountry] = React.useState<Country>(
    selectedCountry || countries.find(c => c.code === 'US') || countries[0]
  )
  const prevValueRef = React.useRef(value)

  // Initialize phone number from value prop
  React.useEffect(() => {
    if (value && value !== prevValueRef.current) {
      const phoneWithoutCode = value.replace(/^\+\d+\s*/, "")
      setPhoneNumber(phoneWithoutCode)
      prevValueRef.current = value
    } else if (!value && phoneNumber === "") {
      // Initialize with empty state
      prevValueRef.current = ""
    }
  }, [value, phoneNumber])

  React.useEffect(() => {
    if (selectedCountry) {
      setCurrentCountry(selectedCountry)
    }
  }, [selectedCountry])

  React.useEffect(() => {
    const fullNumber = `${currentCountry.phoneCode} ${phoneNumber}`.trim()
    if (onChange && fullNumber !== prevValueRef.current) {
      onChange(fullNumber)
      prevValueRef.current = fullNumber
    }
  }, [currentCountry, phoneNumber, onChange])

  const handleCountrySelect = React.useCallback((country: Country) => {
    setCurrentCountry(country)
    onCountryChange?.(country)
    setOpen(false)
    setSearchQuery("")
  }, [onCountryChange])

  const handlePhoneChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setPhoneNumber(newValue)
  }, [])

  const filteredCountries = React.useMemo(() => {
    if (!searchQuery) return countries.slice(0, 20) // Show first 20 countries by default
    return countries.filter(country => 
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.phoneCode.includes(searchQuery)
    ).slice(0, 20)
  }, [searchQuery])

  return (
    <div className={cn("flex", className)}>
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[80px] h-9 justify-between border-r-0 rounded-r-none px-3 py-1 text-base bg-transparent shadow-sm hover:bg-transparent hover:border-ring focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
          >
            <span className="text-sm font-medium">{currentCountry.phoneCode}</span>
            <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 max-h-[300px]" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search countries..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <div className="max-h-60 overflow-y-auto">
              <CommandList className="max-h-60 overflow-y-auto">
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {filteredCountries.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} ${country.code} ${country.phoneCode}`}
                      onSelect={() => handleCountrySelect(country)}
                      className="flex items-center space-x-2"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{country.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {country.code} • {country.phoneCode}
                        </div>
                      </div>
                      {currentCountry.code === country.code && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        {...props}
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        className="flex-1 h-9 rounded-l-none"
      />
    </div>
  )
} 