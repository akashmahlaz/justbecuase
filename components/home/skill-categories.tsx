import type React from "react"
import Link from "next/link"
import { getSkillCategoryCounts } from "@/lib/actions"
import { Megaphone, Code, Palette, Calculator, Target, Users, Heart } from "lucide-react"

const iconMap: { [key: string]: React.ElementType } = {
  Megaphone,
  Code,
  Palette,
  Calculator,
  Target,
  Users,
  Heart,
}

export async function SkillCategories() {
  // Fetch real project counts from database
  const categories = await getSkillCategoryCounts()
  
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Find Projects By Skill</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Browse opportunities that match your expertise. Every skill has the power to create change.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category) => {
            const Icon = iconMap[category.icon] || Code
            return (
              <Link
                key={category.id}
                href={`/projects?skill=${encodeURIComponent(category.id)}`}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{category.count} projects</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
