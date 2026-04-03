import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

export default function SkillsDemandPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-5 text-orange-600" />
          Skills Demand Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        Coming soon — Analyze which skills NGOs are hiring for most to align volunteer training.
      </CardContent>
    </Card>
  )
}
