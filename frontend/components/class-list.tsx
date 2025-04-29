"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye, Video, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface Class {
  id: number
  description: string
  student_count?: number
}

export default function ClassList() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch("http://localhost:8000/classes/")
        if (!response.ok) {
          throw new Error("Failed to fetch classes")
        }
        const data = await response.json()

        // Fetch enrollment counts for each class
        const classesWithCounts = await Promise.all(
          data.map(async (classItem: Class) => {
            try {
              const enrollmentResponse = await fetch(`http://localhost:8000/classes/${classItem.id}/students`)
              if (enrollmentResponse.ok) {
                const students = await enrollmentResponse.json()
                return {
                  ...classItem,
                  student_count: students.length,
                }
              }
              return classItem
            } catch (error) {
              console.error(`Error fetching enrollments for class ${classItem.id}:`, error)
              return classItem
            }
          }),
        )

        setClasses(classesWithCounts)
      } catch (error) {
        console.error("Error fetching classes:", error)
        toast({
          title: "Error",
          description: "Failed to load classes. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchClasses()
  }, [toast])

  const startAttendance = (classId: number) => {
    router.push(`/attendance/${classId}`)
  }

  const viewAttendance = (classId: number) => {
    router.push(`/classes/${classId}/attendance`)
  }

  if (loading) {
    return <div className="flex justify-center p-4">Loading classes...</div>
  }

  if (classes.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground mb-4">No classes found. Create your first class to get started.</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Enrolled Students</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {classes.map((classItem) => (
          <TableRow key={classItem.id}>
            <TableCell>{classItem.id}</TableCell>
            <TableCell className="font-medium">{classItem.description}</TableCell>
            {/* <TableCell>{format(new Date(classItem.start_time), "PPp")}</TableCell> */}
            <TableCell>
              <Badge variant="secondary" className="flex items-center w-fit">
                <Users className="h-3 w-3 mr-1" />
                {classItem.student_count || 0}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" className="mr-2" onClick={() => startAttendance(classItem.id)}>
                <Video className="h-4 w-4 mr-1" />
                Take Attendance
              </Button>
              <Button variant="outline" size="sm" onClick={() => viewAttendance(classItem.id)}>
                <Eye className="h-4 w-4 mr-1" />
                View Records
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
