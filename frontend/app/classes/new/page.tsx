"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { MultiSelect } from "@/components/multi-select"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

interface Student {
  id: number
  name: string
  image_path: string
}

export default function NewClassPage() {
  const [description, setDescription] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingStudents, setFetchingStudents] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  // Fetch all students when the component mounts
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch("http://localhost:8000/students/")
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
        setFetchingStudents(false)
      }
    }

    fetchStudents()
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Please enter a class description",
        variant: "destructive",
      })
      return
    }

    if (selectedStudents.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one student for the class",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // First create the class
      const classResponse = await fetch("http://localhost:8000/classes/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `description=${encodeURIComponent(description)}`,
      })

      if (!classResponse.ok) {
        throw new Error("Failed to create class")
      }

      const classData = await classResponse.json()
      const classId = classData.id

      // Then enroll the selected students
      const enrollmentPromises = selectedStudents.map(async (studentId) => {
        const enrollResponse = await fetch("http://localhost:8000/enrollments/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_id: Number.parseInt(studentId),
            class_id: classId,
          }),
        })

        if (!enrollResponse.ok) {
          throw new Error(`Failed to enroll student ${studentId}`)
        }
      })

      await Promise.all(enrollmentPromises)

      toast({
        title: "Success",
        description: "Class created and students enrolled successfully",
      })

      router.push("/classes")
      router.refresh()
    } catch (error) {
      console.error("Error creating class:", error)
      toast({
        title: "Error",
        description: "Failed to create class. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Convert students to options format for MultiSelect
  const studentOptions = students.map((student) => ({
    value: student.id.toString(),
    label: student.name,
  }))

  // If there are no students, show a message and link to create students
  if (!fetchingStudents && students.length === 0) {
    return (
      <div className="max-w-md mx-auto">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Students Available</AlertTitle>
          <AlertDescription>
            You need to add students before creating a class. Please add at least one student first.
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/students/new">Add Student</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Class</CardTitle>
          <CardDescription>Create a new classroom session and enroll students</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Class Description</Label>
              <Input
                id="description"
                placeholder="Enter class description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading || fetchingStudents}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="students">Enroll Students</Label>
              {fetchingStudents ? (
                <div className="text-sm text-muted-foreground">Loading students...</div>
              ) : (
                <>
                  <MultiSelect
                    options={studentOptions}
                    selected={selectedStudents}
                    onChange={setSelectedStudents}
                    placeholder="Select students to enroll..."
                    emptyMessage="No more students available."
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{selectedStudents.length} student(s) selected</p>
                </>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading || fetchingStudents}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || fetchingStudents}>
              {loading ? "Creating..." : "Create Class"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
