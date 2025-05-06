"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Student {
  id: number
  name: string
  image_path: string
}

export default function StudentList() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchStudents = async () => {
      console.log(api)
      console.log(`${api}/students/`)
      try {
        const response = await fetch(`${api}/students/`)
        if (!response.ok) {
          throw new Error("Failed to fetch students")
        }
        const data = await response.json()
        setStudents(data)
      } catch (error) {
        console.error("Error fetching students:", error)
        toast({
          title: "Error",
          description: "Failed to load students. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [toast])

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`${api}/students/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to delete student")
      }
      setStudents((prev) => prev.filter((s) => s.id !== id))
      toast({
        title: "Student Deleted",
        description: `Student with ID ${id} was successfully deleted.`,
      })
    } catch (error) {
      console.error("Error deleting student:", error)
      toast({
        title: "Error",
        description: "Failed to delete student. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="flex justify-center p-4">Loading students...</div>
  }

  if (students.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground mb-4">No students found. Add your first student to get started.</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Photo</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>ID</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student) => (
          <TableRow key={student.id}>
            <TableCell>
              <Avatar>
                <AvatarImage src={`${api}/static/${student.image_path}`} alt={student.name} />
                <AvatarFallback>{student.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </TableCell>
            <TableCell className="font-medium">{student.name}</TableCell>
            <TableCell>{student.id}</TableCell>
            <TableCell className="text-right">
              {/* <Button variant="ghost" size="icon">
                <Edit className="h-4 w-4" />
              </Button> */}
              <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
