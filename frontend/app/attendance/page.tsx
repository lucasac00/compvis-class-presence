import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ClassSelector from "@/components/class-selector"

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Attendance</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Take Attendance</CardTitle>
          <CardDescription>Select a class to start taking attendance with facial recognition</CardDescription>
        </CardHeader>
        <CardContent>
          <ClassSelector />
        </CardContent>
      </Card>
    </div>
  )
}
