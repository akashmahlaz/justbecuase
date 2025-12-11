import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function VolunteersHero() {
  return (
    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Find Skilled Volunteers
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Connect with talented professionals ready to contribute their skills to your cause
          </p>
          
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by skills, location, or name..."
              className="pl-10 pr-4 py-6 text-base bg-background"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <span className="text-sm text-muted-foreground">Popular:</span>
            {["Marketing", "Web Development", "Graphic Design", "Content Writing", "Fundraising"].map(
              (skill) => (
                <button
                  key={skill}
                  className="text-sm px-3 py-1 rounded-full bg-background border hover:border-primary transition-colors"
                >
                  {skill}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
