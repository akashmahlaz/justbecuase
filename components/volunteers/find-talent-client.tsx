"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import {
  Search,
  Filter,
  MapPin,
  Clock,
  Star,
  Lock,
  Unlock,
  IndianRupee,
  Heart,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react"
import { skillCategories } from "@/lib/skills-data"

interface Volunteer {
  id: string
  userId?: string
  name?: string
  avatar?: string
  headline?: string
  location?: string
  city?: string
  country?: string
  hoursPerWeek?: number
  skills?: { categoryId: string; subskillId: string; level?: string }[]
  volunteerType?: "free" | "paid"
  hourlyRate?: number
  rating?: number
  completedProjects?: number
}

interface FindTalentClientProps {
  volunteers: Volunteer[]
  unlockedProfileIds: string[]
}

export function FindTalentClient({ volunteers, unlockedProfileIds }: FindTalentClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")

  // Separate volunteers by type
  const paidVolunteers = volunteers.filter((v) => v.volunteerType === "paid")
  const freeVolunteers = volunteers.filter((v) => v.volunteerType === "free")

  // Check if volunteer profile is unlocked
  const isUnlocked = (volunteerId: string) => {
    return unlockedProfileIds.includes(volunteerId)
  }

  // Get unique locations
  const locations = useMemo(() => {
    const locs = new Set<string>()
    volunteers.forEach((v) => {
      if (v.location) locs.add(v.location)
      if (v.city) locs.add(v.city)
    })
    return Array.from(locs).filter(Boolean).slice(0, 10)
  }, [volunteers])

  // Filter volunteers
  const filterVolunteers = (vols: Volunteer[]) => {
    return vols.filter((v) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const nameMatch = v.name?.toLowerCase().includes(query)
        const headlineMatch = v.headline?.toLowerCase().includes(query)
        const locationMatch = v.location?.toLowerCase().includes(query) || 
                             v.city?.toLowerCase().includes(query) ||
                             v.country?.toLowerCase().includes(query)
        const skillMatch = v.skills?.some(s => 
          s.subskillId?.toLowerCase().includes(query) ||
          s.categoryId?.toLowerCase().includes(query)
        )
        if (!nameMatch && !headlineMatch && !locationMatch && !skillMatch) return false
      }

      // Category filter
      if (categoryFilter && categoryFilter !== "all") {
        const hasCategory = v.skills?.some(s => {
          const categoryId = s.categoryId?.toLowerCase() || ""
          return categoryId.includes(categoryFilter.toLowerCase())
        })
        if (!hasCategory) return false
      }

      // Location filter
      if (locationFilter && locationFilter !== "all") {
        const matchLocation = v.location?.toLowerCase().includes(locationFilter.toLowerCase()) ||
                             v.city?.toLowerCase().includes(locationFilter.toLowerCase())
        if (!matchLocation) return false
      }

      return true
    })
  }

  const filteredAll = filterVolunteers(volunteers)
  const filteredPaid = filterVolunteers(paidVolunteers)
  const filteredFree = filterVolunteers(freeVolunteers)

  const hasActiveFilters = searchQuery.trim() !== "" || categoryFilter !== "all" || locationFilter !== "all"

  const clearFilters = () => {
    setSearchQuery("")
    setCategoryFilter("all")
    setLocationFilter("all")
  }

  return (
    <>
      {/* Search & Filters */}
      <Card className="mb-8">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by skills, name, or location..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {skillCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="outline" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {filteredAll.length} of {volunteers.length} volunteers</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <IndianRupee className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">Profile Visibility</h3>
              <p className="text-sm text-muted-foreground">
                <strong>Paid volunteers</strong> (charge for services) have fully visible profiles.{" "}
                <strong>Free volunteers</strong> (work for free) require a small fee to unlock their full profile.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="all">
            All Volunteers
            <Badge variant="secondary" className="ml-2">{filteredAll.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="paid">
            <IndianRupee className="h-3 w-3 mr-1" />
            Paid
            <Badge variant="secondary" className="ml-2">{filteredPaid.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="free">
            <Heart className="h-3 w-3 mr-1" />
            Free
            <Badge variant="secondary" className="ml-2">{filteredFree.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="recommended">
            <Sparkles className="h-3 w-3 mr-1" />
            Recommended
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <VolunteerGrid
            volunteers={filteredAll}
            isUnlocked={isUnlocked}
          />
        </TabsContent>

        <TabsContent value="paid">
          <VolunteerGrid
            volunteers={filteredPaid}
            isUnlocked={isUnlocked}
          />
        </TabsContent>

        <TabsContent value="free">
          <VolunteerGrid
            volunteers={filteredFree}
            isUnlocked={isUnlocked}
          />
        </TabsContent>

        <TabsContent value="recommended">
          <RecommendedVolunteers 
            volunteers={volunteers.slice(0, 6)} 
            isUnlocked={isUnlocked}
          />
        </TabsContent>
      </Tabs>
    </>
  )
}

function VolunteerGrid({
  volunteers,
  isUnlocked,
}: {
  volunteers: Volunteer[]
  isUnlocked: (id: string) => boolean
}) {
  if (volunteers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No volunteers found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {volunteers.map((volunteer) => (
        <VolunteerCard
          key={volunteer.id || volunteer.userId}
          volunteer={volunteer}
          unlocked={volunteer.volunteerType === "paid" || isUnlocked(volunteer.id || volunteer.userId || "")}
        />
      ))}
    </div>
  )
}

function VolunteerCard({
  volunteer,
  unlocked,
}: {
  volunteer: Volunteer
  unlocked: boolean
}) {
  const isFree = volunteer.volunteerType === "free"
  const volunteerId = volunteer.id || volunteer.userId || ""

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4 mb-4">
          <div className="relative shrink-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {volunteer.avatar ? (
                <img
                  src={volunteer.avatar}
                  alt={unlocked ? volunteer.name : "Volunteer"}
                  className={`w-full h-full object-cover ${isFree && !unlocked ? "blur-sm" : ""}`}
                />
              ) : (
                <span className="text-lg sm:text-xl font-bold text-muted-foreground">
                  {unlocked ? volunteer.name?.charAt(0) : "?"}
                </span>
              )}
            </div>
            {isFree && !unlocked && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
              {unlocked ? volunteer.name : "Volunteer"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {volunteer.headline || "Skilled Volunteer"}
            </p>
          </div>
          <Badge variant={isFree ? "secondary" : "outline"} className="shrink-0 text-xs">
            {isFree ? "Free" : `₹${volunteer.hourlyRate}/hr`}
          </Badge>
        </div>

        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground mb-4">
          {unlocked && (volunteer.location || volunteer.city) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">{volunteer.location || volunteer.city}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            {volunteer.hoursPerWeek || 10} hrs/week
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 shrink-0" />
            {volunteer.rating || "New"} ({volunteer.completedProjects || 0} projects)
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {volunteer.skills?.slice(0, 3).map((skill, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {skill.subskillId}
            </Badge>
          ))}
          {(volunteer.skills?.length || 0) > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{(volunteer.skills?.length || 0) - 3}
            </Badge>
          )}
        </div>

        {isFree && !unlocked ? (
          <Button className="w-full" size="sm" asChild>
            <Link href={`/volunteers/${volunteerId}`}>
              <Unlock className="h-4 w-4 mr-2" />
              Unlock Profile
            </Link>
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm" asChild>
              <Link href={`/volunteers/${volunteerId}`}>
                View Profile
              </Link>
            </Button>
            <Button size="sm" className="flex-1 text-xs sm:text-sm" asChild>
              <Link href={`/volunteers/${volunteerId}?action=contact`}>
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Contact
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecommendedVolunteers({ 
  volunteers,
  isUnlocked 
}: { 
  volunteers: Volunteer[]
  isUnlocked: (id: string) => boolean 
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-4">
        Volunteers recommended based on your active projects and hiring history
      </p>
      <VolunteerGrid
        volunteers={volunteers}
        isUnlocked={isUnlocked}
      />
    </div>
  )
}
