import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

export default function VolunteerMatchPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5 text-orange-600" />
          Volunteer Match
        </CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        Coming soon — Match volunteers&apos; skills to NGO open positions discovered via TheirStack.
      </CardContent>
    </Card>
  )
}
