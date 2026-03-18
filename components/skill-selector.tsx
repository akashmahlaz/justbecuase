"use client"

import * as React from "react"
import { useState, useMemo, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { skillCategories } from "@/lib/skills-data"
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectedSkill {
  categoryId: string
  subskillId: string
  name: string
  priority: string
  isCustom?: boolean
}

interface SkillSelectorProps {
  selectedSkills: SelectedSkill[]
  onChange: (skills: SelectedSkill[]) => void
  maxSkills?: number
  labels?: {
    searchPlaceholder?: string
    noResults?: string
    addCustom?: string
    selectedSkills?: string
    mustHave?: string
    niceToHave?: string
    removeSkill?: string
    selectSkills?: string
    skillsSelected?: string
    customSkill?: string
  }
}

// Flatten all skills for search
const allSkills = skillCategories.flatMap((cat) =>
  cat.subskills.map((sub) => ({
    categoryId: cat.id,
    categoryName: cat.name,
    subskillId: sub.id,
    name: sub.name,
  }))
)

export function SkillSelector({
  selectedSkills,
  onChange,
  maxSkills = 15,
  labels = {},
}: SkillSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    searchPlaceholder = "Search skills...",
    noResults = "No skills found.",
    addCustom = "Add custom skill",
    selectedSkills: selectedLabel = "Selected Skills",
    mustHave = "Must Have",
    niceToHave = "Nice to Have",
    removeSkill = "Remove",
    selectSkills = "Search & add skills...",
    skillsSelected = "skills selected",
    customSkill = "custom",
  } = labels

  const selectedIds = useMemo(
    () => new Set(selectedSkills.map((s) => s.subskillId)),
    [selectedSkills]
  )

  const handleSelect = (skill: {
    categoryId: string
    subskillId: string
    name: string
  }) => {
    if (selectedIds.has(skill.subskillId)) {
      // Deselect
      onChange(selectedSkills.filter((s) => s.subskillId !== skill.subskillId))
    } else if (selectedSkills.length < maxSkills) {
      // Select
      onChange([
        ...selectedSkills,
        {
          categoryId: skill.categoryId,
          subskillId: skill.subskillId,
          name: skill.name,
          priority: "must-have",
        },
      ])
    }
  }

  const handleAddCustom = () => {
    const trimmed = search.trim()
    if (!trimmed || trimmed.length < 2) return

    // Check if it already exists
    const customId = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")

    if (selectedIds.has(customId)) return
    if (selectedSkills.length >= maxSkills) return

    // Check if it matches an existing skill
    const existingSkill = allSkills.find(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (existingSkill) {
      handleSelect(existingSkill)
    } else {
      onChange([
        ...selectedSkills,
        {
          categoryId: "custom",
          subskillId: customId,
          name: trimmed,
          priority: "must-have",
          isCustom: true,
        },
      ])
    }

    setSearch("")
  }

  const handleRemove = (subskillId: string) => {
    onChange(selectedSkills.filter((s) => s.subskillId !== subskillId))
  }

  const togglePriority = (subskillId: string) => {
    onChange(
      selectedSkills.map((s) =>
        s.subskillId === subskillId
          ? {
              ...s,
              priority: s.priority === "must-have" ? "nice-to-have" : "must-have",
            }
          : s
      )
    )
  }

  const hasSearchText = search.trim().length >= 2
  const isSearchMatchingExisting = allSkills.some(
    (s) => s.name.toLowerCase() === search.trim().toLowerCase()
  )
  const showAddCustom = hasSearchText && !isSearchMatchingExisting

  return (
    <div className="space-y-3">
      {/* Search Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-transparent font-normal text-muted-foreground hover:text-foreground"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0" />
              <span>
                {selectedSkills.length > 0
                  ? `${selectedSkills.length} ${skillsSelected}`
                  : selectSkills}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command shouldFilter={true}>
            <CommandInput
              ref={inputRef}
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter" && showAddCustom) {
                  e.preventDefault()
                  handleAddCustom()
                }
              }}
            />
            <CommandList>
              <CommandEmpty>
                <div className="space-y-2">
                  <p className="text-muted-foreground">{noResults}</p>
                  {hasSearchText && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent"
                      onClick={handleAddCustom}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {addCustom}: &quot;{search.trim()}&quot;
                    </Button>
                  )}
                </div>
              </CommandEmpty>

              {skillCategories.map((category) => (
                <CommandGroup key={category.id} heading={category.name}>
                  {category.subskills.map((subskill) => {
                    const isSelected = selectedIds.has(subskill.id)
                    return (
                      <CommandItem
                        key={subskill.id}
                        value={subskill.name}
                        onSelect={() =>
                          handleSelect({
                            categoryId: category.id,
                            subskillId: subskill.id,
                            name: subskill.name,
                          })
                        }
                        disabled={!isSelected && selectedSkills.length >= maxSkills}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="flex-1">{subskill.name}</span>
                        {isSelected && (
                          <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                            ✓
                          </Badge>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}

              {/* Add custom skill option at bottom of results */}
              {showAddCustom && (
                <CommandGroup heading={customSkill}>
                  <CommandItem
                    value={`custom-${search.trim()}`}
                    onSelect={handleAddCustom}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {addCustom}: &quot;{search.trim()}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Skills Display */}
      {selectedSkills.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {selectedLabel} ({selectedSkills.length}/{maxSkills})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((skill) => (
              <Badge
                key={skill.subskillId}
                variant={skill.priority === "must-have" ? "default" : "secondary"}
                className={cn(
                  "group cursor-pointer gap-1.5 pr-1 transition-colors",
                  skill.priority === "must-have"
                    ? "bg-primary text-primary-foreground hover:bg-primary/80"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
                onClick={() => togglePriority(skill.subskillId)}
                title={`Click to toggle: ${skill.priority === "must-have" ? mustHave : niceToHave}`}
              >
                <span className="truncate max-w-50">{skill.name}</span>
                {skill.isCustom && (
                  <span className="text-[9px] opacity-60 uppercase">{customSkill}</span>
                )}
                <span className="text-[9px] opacity-70 ml-0.5">
                  {skill.priority === "must-have" ? "★" : "☆"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(skill.subskillId)
                  }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-background/20 transition-colors"
                  aria-label={`${removeSkill} ${skill.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            ★ = {mustHave} · ☆ = {niceToHave} · Click badge to toggle priority
          </p>
        </div>
      )}
    </div>
  )
}
