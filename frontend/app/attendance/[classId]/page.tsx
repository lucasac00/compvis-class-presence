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
  const api = process.env.NEXT_PUBLIC_API_BASE_URL;
  const wsUrl = process.env.NEXT_PUBLIC_WS_BASE_URL;
  const params = useParams()
  const classId = params.classId as string
  const router = useRouter()
  const { toast } = useToast()
  
  const [classInfo, setClassInfo] = useState<{ description: string } | null>(null)
  const [students, setStudents] = useState<RecognizedStudent[]>([])
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [faceCounts, setFaceCounts] = useState({ total: 0, recognized: 0, unrecognized: 0 });
  const [faceLocations, setFaceLocations] = useState<Array<[number, number, number, number]>>([]);
  const [recognitionStatus, setRecognitionStatus] = useState<boolean[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<NodeJS.Timeout>()

  // Fetch class info and enrolled students
  useEffect(() => {
    const fetchClassInfo = async () => {
      try {
        const classResponse = await fetch(`${api}/classes/${classId}`)
        if (!classResponse.ok) throw new Error("Failed to fetch class information")
        const classData = await classResponse.json()
        setClassInfo(classData)

        const studentsResponse = await fetch(`${api}/classes/${classId}/students`)
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
      if (wsRef.current) {
        wsRef.current.close(1000)
      }
    }
  }, [currentSessionId, isActive, toast])

  // Drawing boundaries around faces
  // Add drawing effect
  useEffect(() => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawBoxes = () => {
      // Match canvas size to video display
      const videoRect = video.getBoundingClientRect();
      canvas.width = videoRect.width;
      canvas.height = videoRect.height;
      
      // Clear previous frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calculate scaling factors
      const scaleX = videoRect.width / video.videoWidth;
      const scaleY = videoRect.height / video.videoHeight;

      // Draw all face boxes
      faceLocations.forEach(([top, right, bottom, left], index) => {
        const isRecognized = recognitionStatus[index] || false;
        ctx.strokeStyle = isRecognized ? '#00FF00' : '#FF0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          left * scaleX,
          top * scaleY,
          (right - left) * scaleX,
          (bottom - top) * scaleY
        );
      });

      requestAnimationFrame(drawBoxes);
    };

    drawBoxes();
  }, [faceLocations]);

  const connectWebSocket = () => {
    if (!currentSessionId) return;
    wsRef.current = new WebSocket(`${wsUrl}/ws/attendance/${currentSessionId}`)

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

      if (data.face_locations && data.recognition_status) {
        setFaceLocations(data.face_locations);
        setRecognitionStatus(data.recognition_status);
      }

      const total = data.total_faces || 0;
      const recognized = data.recognized?.length || 0;
      setFaceCounts({
        total: total,
        recognized: recognized,
        unrecognized: total - recognized
      });
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
      intervalRef.current = setInterval(captureAndSendFrame, 500)
    }
  }


  const toggleAttendance = async () => {
    if (!isActive) {
      try {
        const response = await fetch(`${api}/classes/${classId}/bouts`, { 
          method: 'POST' 
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const sessionData = await response.json();
        setCurrentSessionId(sessionData.id);
        setStudents(prev => prev.map(s => ({ ...s, recognized: false, timestamp: undefined })));
        setIsActive(true);
      } catch (error) {
        console.error('Error starting bout:', error);
        toast({ 
          title: 'Error', 
          description: 'Failed to start session: ' + error.message,
          variant: 'destructive' 
        });
      }
    } else {
      try {
        if (currentSessionId) {
          await fetch(`${api}/bouts/${currentSessionId}/end`, { method: 'PATCH' });
        }
        setIsActive(false);
        setCurrentSessionId(null);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to end session', variant: 'destructive' });
      }
    }
  };

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
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                    onCanPlay={handleVideoCanPlay}
                  />
                  <canvas 
                    ref={overlayCanvasRef} 
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  />
                </>
              ) : (
                <div className="text-center text-slate-500">
                  <Camera className="h-12 w-12 mx-auto mb-2" />
                  <p>Click "Start Recognition" to activate the camera</p>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              {isActive && (
                <>
                  <div className="absolute top-2 right-2">
                    <Badge variant="destructive" className="animate-pulse">
                      Recording
                    </Badge>
                  </div>
                  <div className="absolute top-2 left-2 flex gap-2">
                    <Badge variant="outline" className="bg-background">
                      Faces: {faceCounts.total}
                    </Badge>
                    <Badge variant="outline" className="bg-background">
                      Recognized: {faceCounts.recognized}
                    </Badge>
                    <Badge variant="outline" className="bg-background">
                      Unrecognized: {faceCounts.unrecognized}
                    </Badge>
                  </div>
                </>
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
                        <AvatarImage src={`${api}/static/${student.image_path}`} alt={student.name} />
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