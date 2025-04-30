"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Calendar, Download } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"

interface Attendance {
  id: number
  student_id: number
  class_id: number
  register_time: string
  presence: boolean
  //student_name?: string
}

interface ClassInfo {
  id: number
  description: string
}

export default function ClassAttendancePage() {
  const params = useParams()
  const classId = params.classId as string
  const router = useRouter()
  const { toast } = useToast()

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch class details
        const classResponse = await fetch(`http://localhost:8000/classes/${classId}`)
        if (!classResponse.ok) {
          throw new Error("Failed to fetch class information")
        }
        const classData = await classResponse.json()
        setClassInfo(classData)

        // Fetch attendance records
        const attendanceResponse = await fetch(`http://localhost:8000/classes/${classId}/attendance`)
        if (!attendanceResponse.ok) {
          throw new Error("Failed to fetch attendance records")
        }
        const attendanceData = await attendanceResponse.json()
        setAttendanceRecords(attendanceData)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load attendance data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [classId, toast])

  const exportToCSV = () => {
    if (!attendanceRecords.length || !classInfo) return

    // Prepare CSV content
    //const headers = ["Student ID", "Student Name", "Register Time", "Presence"]
    const headers = ["Student ID", "Register Time", "Presence"]
    const rows = attendanceRecords.map((record) => [
      record.student_id,
      //record.student_name || "Unknown",
      record.register_time,
      record.presence ? "Yes" : "No",
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `attendance_class_${classId}_${format(new Date(), "yyyy-MM-dd")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading attendance records...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">
            Attendance Records
            {classInfo && <span className="ml-2 text-lg font-normal">- {classInfo.description}</span>}
          </h1>
        </div>
        <Button onClick={exportToCSV} disabled={attendanceRecords.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Class Details
          </CardTitle>
          <CardDescription>
            {classInfo?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceRecords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No attendance records found for this class</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Register Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.student_id}</TableCell>
                    {/* <TableCell className="font-medium">{record.student_name || "Unknown"}</TableCell> */}
                    <TableCell>{format(new Date(record.register_time), "PPp")}</TableCell>
                    <TableCell>
                      {record.presence ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Presence
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Absent
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
