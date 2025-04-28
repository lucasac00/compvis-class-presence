import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, BookOpen, CheckSquare } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Marrow Attendance System</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students
            </CardTitle>
            <CardDescription>Manage student profiles</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Add, view, and manage student information and photos for facial recognition.</p>
            <Link href="/students">
              <Button className="w-full">
                Manage Students
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Classes
            </CardTitle>
            <CardDescription>Manage classroom sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Create and manage class sessions for attendance tracking.</p>
            <Link href="/classes">
              <Button className="w-full">
                Manage Classes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Attendance
            </CardTitle>
            <CardDescription>Monitor real-time attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Start facial recognition to track attendance for active classes.</p>
            <Link href="/attendance">
              <Button className="w-full">
                Take Attendance
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
