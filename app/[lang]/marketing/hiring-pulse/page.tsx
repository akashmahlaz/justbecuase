import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"

export default function HiringPulsePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-5 text-orange-600" />
          Hiring Pulse Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        Coming soon — Track NGO hiring trends over time to identify partnership windows.
      </CardContent>
    </Card>
  )
}
