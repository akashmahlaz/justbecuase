"use client"

import * as React from "react"
import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { skillCategories } from "@/lib/skills-data"
import { Check, Plus, Search, X, Sparkles, ChevronDown, ChevronUp } from "lucide-react"
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
  const [search, setSearch] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = useCallback((skill: {
    categoryId: string
    subskillId: string
    name: string
  }) => {
    if (selectedIds.has(skill.subskillId)) {
      onChange(selectedSkills.filter((s) => s.subskillId !== skill.subskillId))
    } else if (selectedSkills.length < maxSkills) {
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
  }, [selectedIds, selectedSkills, maxSkills, onChange])

  const handleAddCustom = useCallback(() => {
    const trimmed = search.trim()
    if (!trimmed || trimmed.length < 2) return

    const customId = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")

    if (selectedIds.has(customId)) return
    if (selectedSkills.length >= maxSkills) return

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
  }, [search, selectedIds, selectedSkills, maxSkills, onChange, handleSelect])

  const handleRemove = useCallback((subskillId: string) => {
    onChange(selectedSkills.filter((s) => s.subskillId !== subskillId))
  }, [selectedSkills, onChange])

  const togglePriority = useCallback((subskillId: string) => {
    onChange(
      selectedSkills.map((s) =>
        s.subskillId === subskillId
          ? { ...s, priority: s.priority === "must-have" ? "nice-to-have" : "must-have" }
          : s
      )
    )
  }, [selectedSkills, onChange])

  const toggleCategory = useCallback((catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }, [])

  const searchLower = search.toLowerCase().trim()
  const hasSearchText = searchLower.length >= 2
  const isSearchMatchingExisting = allSkills.some(
    (s) => s.name.toLowerCase() === searchLower
  )
  const showAddCustom = hasSearchText && !isSearchMatchingExisting

  // Filter skills based on search
  const filteredCategories = useMemo(() => {
    if (!hasSearchText) return skillCategories
    return skillCategories
      .map((cat) => ({
        ...cat,
        subskills: cat.subskills.filter(
          (sub) =>
            sub.name.toLowerCase().includes(searchLower) ||
            cat.name.toLowerCase().includes(searchLower)
        ),
      }))
      .filter((cat) => cat.subskills.length > 0)
  }, [searchLower, hasSearchText])

  const showDropdown = isFocused
  const atLimit = selectedSkills.length >= maxSkills

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Search Input — always visible */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder={atLimit ? `Maximum ${maxSkills} skills reached` : searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && showAddCustom) {
              e.preventDefault()
              handleAddCustom()
            }
            if (e.key === "Escape") {
              setIsFocused(false)
              inputRef.current?.blur()
            }
          }}
          disabled={atLimit}
          className="pl-10 pr-10 h-11 bg-background"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div className="relative z-50">
          <div className="absolute inset-x-0 top-0 max-h-80 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200">
            {/* Add custom skill — prominent at top when searching */}
            {showAddCustom && (
              <button
                type="button"
                onClick={handleAddCustom}
                className="flex items-center gap-3 w-full px-4 py-3 text-left bg-primary/5 hover:bg-primary/10 border-b border-border transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">
                    {addCustom}: &ldquo;{search.trim()}&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground">Press Enter to add as a custom skill</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">{customSkill}</Badge>
              </button>
            )}

            {filteredCategories.length === 0 && !showAddCustom ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">{noResults}</p>
                {search.trim().length >= 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={handleAddCustom}
                  >
                    <Plus className="h-3 w-3" />
                    {addCustom}: &ldquo;{search.trim()}&rdquo;
                  </Button>
                )}
              </div>
            ) : (
              filteredCategories.map((category) => {
                const isExpanded = hasSearchText || expandedCategories.has(category.id)
                const selectedInCategory = category.subskills.filter((s) =>
                  selectedIds.has(s.id)
                ).length

                return (
                  <div key={category.id} className="border-b border-border last:border-0">
                    {/* Category header */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className={cn(
                        "flex items-center gap-2 w-full px-4 py-2.5 text-left transition-colors hover:bg-accent/50",
                        isExpanded && "bg-accent/30"
                      )}
                    >
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                        {category.name}
                      </span>
                      {selectedInCategory > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                          {selectedInCategory}
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>

                    {/* Subskills */}
                    {isExpanded && (
                      <div className="px-2 pb-2">
                        <div className="flex flex-wrap gap-1.5 px-2">
                          {category.subskills.map((subskill) => {
                            const isSelected = selectedIds.has(subskill.id)
                            const disabled = !isSelected && atLimit

                            return (
                              <button
                                key={subskill.id}
                                type="button"
                                onClick={() =>
                                  !disabled &&
                                  handleSelect({
                                    categoryId: category.id,
                                    subskillId: subskill.id,
                                    name: subskill.name,
                                  })
                                }
                                disabled={disabled}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150",
                                  isSelected
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-accent/60 text-foreground hover:bg-accent hover:shadow-sm",
                                  disabled && "opacity-40 cursor-not-allowed"
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                                {subskill.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Selected Skills Display */}
      {selectedSkills.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {selectedLabel} ({selectedSkills.length}/{maxSkills})
            </p>
            <p className="text-xs text-muted-foreground">
              ★ {mustHave} · ☆ {niceToHave} · Click to toggle
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((skill) => (
              <Badge
                key={skill.subskillId}
                variant={skill.priority === "must-have" ? "default" : "secondary"}
                className={cn(
                  "group cursor-pointer gap-1.5 pr-1 transition-all duration-150 hover:shadow-sm",
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
        </div>
      )}
    </div>
  )
}
