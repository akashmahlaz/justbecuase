"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Filter, X } from "lucide-react"
import { skillCategories, causes } from "@/lib/skills-data"

export function VolunteersFilters() {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedCauses, setSelectedCauses] = useState<string[]>([])
  const [volunteerType, setVolunteerType] = useState<string>("all")
  const [workMode, setWorkMode] = useState<string>("all")

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((s) => s !== skillId)
        : [...prev, skillId]
    )
  }

  const handleCauseToggle = (causeId: string) => {
    setSelectedCauses((prev) =>
      prev.includes(causeId)
        ? prev.filter((c) => c !== causeId)
        : [...prev, causeId]
    )
  }

  const clearFilters = () => {
    setSelectedSkills([])
    setSelectedCauses([])
    setVolunteerType("all")
    setWorkMode("all")
  }

  const hasFilters =
    selectedSkills.length > 0 ||
    selectedCauses.length > 0 ||
    volunteerType !== "all" ||
    workMode !== "all"

  return (
    <Card className="sticky top-24">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Volunteer Type */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Volunteer Type</Label>
          <RadioGroup value={volunteerType} onValueChange={setVolunteerType}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="type-all" />
              <Label htmlFor="type-all" className="text-sm font-normal cursor-pointer">
                All Volunteers
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="free" id="type-free" />
              <Label htmlFor="type-free" className="text-sm font-normal cursor-pointer">
                Free Volunteers
                <Badge variant="outline" className="ml-2 text-xs">Premium</Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="paid" id="type-paid" />
              <Label htmlFor="type-paid" className="text-sm font-normal cursor-pointer">
                Paid Volunteers
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Work Mode */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Work Mode</Label>
          <RadioGroup value={workMode} onValueChange={setWorkMode}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="mode-all" />
              <Label htmlFor="mode-all" className="text-sm font-normal cursor-pointer">
                Any
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="remote" id="mode-remote" />
              <Label htmlFor="mode-remote" className="text-sm font-normal cursor-pointer">
                Remote
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="onsite" id="mode-onsite" />
              <Label htmlFor="mode-onsite" className="text-sm font-normal cursor-pointer">
                On-site
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hybrid" id="mode-hybrid" />
              <Label htmlFor="mode-hybrid" className="text-sm font-normal cursor-pointer">
                Hybrid
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Skills */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Skills</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {skillCategories.slice(0, 6).map((category) => (
              <div key={category.id} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{category.name}</p>
                {category.subskills.slice(0, 3).map((skill) => (
                  <div key={skill.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={skill.id}
                      checked={selectedSkills.includes(skill.id)}
                      onCheckedChange={() => handleSkillToggle(skill.id)}
                    />
                    <Label
                      htmlFor={skill.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {skill.name}
                    </Label>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Causes */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Causes</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
            {causes.map((cause) => (
              <div key={cause.id} className="flex items-center space-x-2">
                <Checkbox
                  id={cause.id}
                  checked={selectedCauses.includes(cause.id)}
                  onCheckedChange={() => handleCauseToggle(cause.id)}
                />
                <Label
                  htmlFor={cause.id}
                  className="text-sm font-normal cursor-pointer flex items-center gap-1"
                >
                  <span>{cause.icon}</span>
                  {cause.name}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Apply Filters Button (for mobile) */}
        <Button className="w-full lg:hidden">Apply Filters</Button>
      </CardContent>
    </Card>
  )
}
