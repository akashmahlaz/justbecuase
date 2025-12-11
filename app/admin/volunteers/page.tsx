import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getAllVolunteers, verifyVolunteer } from "@/lib/actions"
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  MoreHorizontal,
  Download,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

export default async function AdminVolunteersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Manage Volunteers</h1>
          <p className="text-muted-foreground">
            View and manage all volunteer profiles
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, or location..." className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volunteers Table */}
      <Suspense fallback={<TableSkeleton />}>
        <VolunteersTable />
      </Suspense>
    </div>
  )
}

async function VolunteersTable() {
  const { data: volunteers, total, page, totalPages } = await getAllVolunteers()

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">
          All Volunteers ({total})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Volunteer</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Skills</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((volunteer) => (
                <tr key={volunteer.userId} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        V
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{volunteer.bio?.slice(0, 20) || "Volunteer"}</p>
                        <p className="text-sm text-muted-foreground">{volunteer.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-foreground">
                    {volunteer.city}, {volunteer.country}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={volunteer.volunteerType === "free" ? "default" : "secondary"}
                    >
                      {volunteer.volunteerType}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      {volunteer.skills.slice(0, 2).map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {skill.subskillId}
                        </Badge>
                      ))}
                      {volunteer.skills.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{volunteer.skills.length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {volunteer.isVerified ? (
                        <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Unverified
                        </Badge>
                      )}
                      {!volunteer.isActive && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/volunteers/${volunteer.userId}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {volunteer.isVerified ? (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Remove Verification
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Verify
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
