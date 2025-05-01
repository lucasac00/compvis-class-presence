"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Upload, CheckCircle, User, Video } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Student {
  id: number
  name: string
  image_path: string
}

interface RecognizedStudent extends Student {
  recognized: boolean
  timestamp?: string
}

export default function UploadAttendancePage() {
  const params = useParams()
  const classId = params.classId as string
  const router = useRouter()
  const { toast } = useToast()
  
  const [classInfo, setClassInfo] = useState<{ description: string } | null>(null)
  const [students, setStudents] = useState<RecognizedStudent[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch class info and enrolled students
  useEffect(() => {
    const fetchClassInfo = async () => {
      try {
        const classResponse = await fetch(`http://localhost:8000/classes/${classId}`)
        if (!classResponse.ok) throw new Error("Failed to fetch class information")
        const classData = await classResponse.json()
        setClassInfo(classData)

        const studentsResponse = await fetch(`http://localhost:8000/classes/${classId}/students`)
        if (!studentsResponse.ok) throw new Error("Failed to fetch enrolled students")
        const studentsData = await studentsResponse.json()

        setStudents(
          studentsData.map((student: Student) => ({
            ...student,
            recognized: false,
          }))
        )
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load class data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchClassInfo()
  }, [classId, toast])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      setSelectedFile(event.target.files[0])
    }
  }

  const processVideoAttendance = async () => {
    if (!selectedFile || !currentSessionId) return

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append("video_file", selectedFile)
      console.log("Uploading video file:", selectedFile.name)
      const response = await fetch(
        `http://localhost:8000/bouts/${currentSessionId}/process-video`,
        {
          method: "POST",
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      const recognizedIds = new Set(result.recognized_students)

      setStudents(prevStudents => 
        prevStudents.map(student => ({
          ...student,
          recognized: recognizedIds.has(student.id),
          timestamp: result.processing_time
        }))
      )

      toast({
        title: "Video Processed",
        description: `Recognized ${result.total_recognized} students`,
      })
    } catch (error) {
      console.error("Error processing video:", error)
      toast({
        title: "Processing Error",
        description: "Failed to process video. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }
  // Start a new bout session
  const startBoutSession = async () => {
    try {
      const response = await fetch(`http://localhost:8000/classes/${classId}/bouts`, {
        method: "POST"
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const sessionData = await response.json()
      setCurrentSessionId(sessionData.id)
      setStudents(prev => prev.map(s => ({ ...s, recognized: false, timestamp: undefined })))
    } catch (error) {
      console.error('Error starting bout:', error)
      toast({ 
        title: 'Error', 
        description: 'Failed to start session: ' + error.message,
        variant: 'destructive' 
      })
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No Video Selected",
        description: "Please select a video file first",
        variant: "destructive",
      })
      return
    }

    if (!currentSessionId) {
      await startBoutSession()
    }
    
    await processVideoAttendance()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading class information...</p>
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
            Upload Attendance
            {classInfo && <span className="ml-2 text-lg font-normal">- {classInfo.description}</span>}
          </h1>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
            id="video-upload"
            disabled={isProcessing}
          />
          <label
            htmlFor="video-upload"
            className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${
              isProcessing 
                ? "bg-gray-300 cursor-not-allowed" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            <Upload className="mr-2 h-4 w-4" />
            {selectedFile ? selectedFile.name : "Select Video"}
          </label>
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || isProcessing}
          >
            {isProcessing ? "Processing..." : "Upload and Process"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Video className="mr-2 h-5 w-5" />
              Video Upload
            </CardTitle>
            <CardDescription>
              Upload a pre-recorded video for attendance processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-slate-950 rounded-md overflow-hidden flex items-center justify-center">
              {selectedFile ? (
                <video
                  controls
                  className="w-full h-full object-contain bg-black"
                  src={URL.createObjectURL(selectedFile)}
                />
              ) : (
                <div className="text-center text-slate-500">
                  <Video className="h-12 w-12 mx-auto mb-2" />
                  <p>Select a video file to preview</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Student Attendance
            </CardTitle>
            <CardDescription>
              Students will be marked present based on video analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] overflow-y-auto space-y-2">
              {students.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No students enrolled in this class
                </p>
              ) : (
                students.map((student) => (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between p-3 rounded-md ${
                      student.recognized 
                        ? "bg-green-50 dark:bg-green-950/30" 
                        : "bg-slate-100 dark:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage 
                          src={`http://localhost:8000/static/${student.image_path}`} 
                          alt={student.name} 
                        />
                        <AvatarFallback>
                          {student.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        {student.recognized && student.timestamp && (
                          <p className="text-xs text-muted-foreground">
                            Recognized at {new Date(student.timestamp).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {student.recognized ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Badge variant="outline">Not Present</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}