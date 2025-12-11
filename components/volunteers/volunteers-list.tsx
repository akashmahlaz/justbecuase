import { browseVolunteers } from "@/lib/actions"
import { VolunteerCard } from "./volunteer-card"

export async function VolunteersList() {
  const volunteers = await browseVolunteers()

  if (volunteers.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-medium text-foreground mb-2">No volunteers found</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or check back later
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground">
          Showing <span className="font-medium text-foreground">{volunteers.length}</span> volunteers
        </p>
        <select className="text-sm border rounded-md px-3 py-1.5 bg-background">
          <option>Best Match</option>
          <option>Most Experienced</option>
          <option>Highest Rated</option>
          <option>Newest</option>
        </select>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {volunteers.map((volunteer) => (
          <VolunteerCard key={volunteer.id} volunteer={volunteer} />
        ))}
      </div>
    </div>
  )
}
