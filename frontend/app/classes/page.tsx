import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import ClassList from "@/components/class-list"

export default function ClassesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Classes</h1>
        <Link href="/classes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Class
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class List</CardTitle>
          <CardDescription>Manage classroom sessions and view attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <ClassList />
        </CardContent>
      </Card>
    </div>
  )
}
