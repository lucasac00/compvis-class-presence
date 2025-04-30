"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Camera, CheckCircle, User } from "lucide-react"
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

export default function AttendancePage() {
  const params = useParams()
  const classId = params.classId as string
  const router = useRouter()
  const { toast } = useToast()

  const [classInfo, setClassInfo] = useState<{ description: string } | null>(null)
  const [students, setStudents] = useState<RecognizedStudent[]>([])
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<NodeJS.Timeout>()

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
          })),
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

  // Setup webcam and WebSocket connection
  useEffect(() => {
    const setupWebcam = async () => {
      if (!videoRef.current) return

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        })
        videoRef.current.srcObject = stream
      } catch (error) {
        console.error("Error accessing webcam:", error)
        toast({
          title: "Webcam Error",
          description: "Could not access your camera. Please check permissions.",
          variant: "destructive",
        })
      }
    }

    if (isActive) {
      setupWebcam()
      connectWebSocket()
    } else {
      // Cleanup
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop())
        videoRef.current.srcObject = null
      }
      if (wsRef.current) wsRef.current.close()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [isActive, toast])

  const connectWebSocket = () => {
    wsRef.current = new WebSocket(`ws://localhost:8000/ws/attendance/${classId}`)

    wsRef.current.onopen = () => {
      toast({
        title: "Connected",
        description: "Facial recognition is now active",
      })
    }

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        })
        return
      }

      if (data.recognized?.length > 0) {
        setStudents(prev => prev.map(student => ({
          ...student,
          recognized: data.recognized.includes(student.id) || student.recognized,
          timestamp: data.recognized.includes(student.id) ? data.timestamp : student.timestamp,
        })))

        data.recognized.forEach((id: number) => {
          const student = students.find(s => s.id === id && !s.recognized)
          if (student) {
            toast({
              title: "Student Recognized",
              description: `${student.name} is now marked present`,
            })
          }
        })
      }
    }

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to the recognition service",
        variant: "destructive",
      })
    }
  }

  const captureAndSendFrame = () => {
    if (!canvasRef.current || !videoRef.current || !wsRef.current) return
    if (wsRef.current.readyState !== WebSocket.OPEN) return

    const context = canvasRef.current.getContext('2d')
    if (!context) return

    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)

    canvasRef.current.toBlob(
      (blob) => {
        if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(blob)
        }
      },
      'image/jpeg',
      0.8
    )
  }

  const handleVideoCanPlay = () => {
    if (isActive && !intervalRef.current) {
      intervalRef.current = setInterval(captureAndSendFrame, 1000)
    }
  }

  const toggleAttendance = () => {
    setIsActive(!isActive)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
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
            Taking Attendance
            {classInfo && <span className="ml-2 text-lg font-normal">- {classInfo.description}</span>}
          </h1>
        </div>
        <Button onClick={toggleAttendance} variant={isActive ? "destructive" : "default"}>
          {isActive ? "Stop Recognition" : "Start Recognition"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="mr-2 h-5 w-5" />
              Camera Feed
            </CardTitle>
            <CardDescription>Position students' faces clearly in the camera view</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-slate-950 rounded-md overflow-hidden flex items-center justify-center">
              {isActive ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                  onCanPlay={handleVideoCanPlay}
                />
              ) : (
                <div className="text-center text-slate-500">
                  <Camera className="h-12 w-12 mx-auto mb-2" />
                  <p>Click "Start Recognition" to activate the camera</p>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              {isActive && (
                <div className="absolute top-2 right-2">
                  <Badge variant="destructive" className="animate-pulse">
                    Recording
                  </Badge>
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
            <CardDescription>Students will be marked present when recognized</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] overflow-y-auto space-y-2">
              {students.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No students enrolled in this class</p>
              ) : (
                students.map((student) => (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between p-3 rounded-md ${
                      student.recognized ? "bg-green-50 dark:bg-green-950/30" : "bg-slate-100 dark:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={`http://localhost:8000/static/${student.image_path}`} alt={student.name} />
                        <AvatarFallback>{student.name.substring(0, 2).toUpperCase()}</AvatarFallback>
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