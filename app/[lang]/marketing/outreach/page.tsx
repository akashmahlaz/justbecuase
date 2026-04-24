import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

export default function OutreachPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5 text-orange-600" />
          Outreach Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        Coming soon — Generate personalized outreach emails for Enterprise partnerships.
      </CardContent>
    </Card>
  )
}
