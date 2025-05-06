"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Video, Upload } from "lucide-react"

interface Class {
  id: number
  description: string
}

export default function ClassSelector() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch(`${api}/classes/`)
        if (!response.ok) throw new Error("Failed to fetch classes")
        const data = await response.json()
        setClasses(data)
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

  const handleLiveAttendance = () => {
    if (!selectedClass) {
      toast({
        title: "Error",
        description: "Please select a class first",
        variant: "destructive",
      })
      return
    }
    router.push(`/attendance/${selectedClass}`)
  }

  const handleUploadAttendance = () => {
    if (!selectedClass) {
      toast({
        title: "Error",
        description: "Please select a class first",
        variant: "destructive",
      })
      return
    }
    router.push(`/attendance/${selectedClass}/upload`)
  }

  if (loading) {
    return <div className="flex justify-center p-4">Loading classes...</div>
  }

  if (classes.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground mb-4">No classes found. Create a class first to take attendance.</p>
        <Button asChild>
          <Link href="/classes/new">Create Class</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Class</label>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger>
            <SelectValue placeholder="Select a class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((classItem) => (
              <SelectItem key={classItem.id} value={classItem.id.toString()}>
                {classItem.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        <Button 
          onClick={handleLiveAttendance} 
          disabled={!selectedClass}
          className="w-full"
        >
          <Video className="mr-2 h-4 w-4" />
          Start Live Attendance
        </Button>
        
        <Button 
          onClick={handleUploadAttendance} 
          disabled={!selectedClass}
          className="w-full"
          variant="secondary"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Pre-recorded Video
        </Button>
      </div>
    </div>
  )
}