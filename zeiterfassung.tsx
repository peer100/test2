"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, User, Edit, Trash, X, Check, RefreshCw, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
// Entfernen Sie diese Zeile:
// import { supabase } from "./lib/supabase"

// Und ersetzen Sie sie durch:
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  "https://your-project-id.supabase.co", // Hier Ihre Supabase URL einfügen
  "your-anon-key-here", // Hier Ihren Anon Key einfügen
)
// import { useToast } from "@/hooks/use-toast"

interface TimeEntry {
  id: string
  date: string
  sv_number: string
  employees: string[]
  work_type: string
  start_time: string
  stop_time: string
  work_hours: number
  travel_hours: number
  created_at?: string
  updated_at?: string
}

interface UserType {
  username: string
  role: "employee" | "admin"
}

export default function Zeiterfassung() {
  // const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loading, setLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<"tracking" | "overview" | "employees">("tracking")
  const [date, setDate] = useState("")
  const [svNumber, setSvNumber] = useState("")
  const [workType, setWorkType] = useState("REP")
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [selectedTravelTime, setSelectedTravelTime] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [currentWorkTime, setCurrentWorkTime] = useState(0)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSvNumber, setSelectedSvNumber] = useState<string | null>(null)

  // Edit mode state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [editDate, setEditDate] = useState("")
  const [editSvNumber, setEditSvNumber] = useState("")
  const [editWorkType, setEditWorkType] = useState("")
  const [editSelectedEmployees, setEditSelectedEmployees] = useState<Set<string>>(new Set())
  const [editTravelTime, setEditTravelTime] = useState(0)
  const [editWorkHours, setEditWorkHours] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const employees = ["MST", "PS", "BJ", "JP", "Praktikant"]
  const travelTimes = [0, 0.25, 0.5, 0.75, 1, 1.5, 2]
  const workTypes = ["REP", "MAT", "W", "REKLAR"]

  // Check for saved login on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser")
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }
  }, [])

  // Load entries from database
  const loadEntries = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading entries:", error)
        alert("Einträge konnten nicht geladen werden.")
        return
      }

      setEntries(data || [])
    } catch (error) {
      console.error("Error:", error)
      alert("Verbindung zur Datenbank fehlgeschlagen.")
    } finally {
      setLoading(false)
    }
  }

  // Load entries on mount and when user changes
  useEffect(() => {
    if (currentUser) {
      loadEntries()
      // Set today's date as default
      const today = new Date().toISOString().split("T")[0]
      setDate(today)
    }
  }, [currentUser])

  // Timer effect
  useEffect(() => {
    if (startTime) {
      timerRef.current = setInterval(() => {
        const diff = new Date().getTime() - startTime.getTime()
        setCurrentWorkTime(diff / 3600000) // Convert to hours
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setCurrentWorkTime(0)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [startTime])

  const handleLogin = async () => {
    setLoginError("")
    setLoading(true)

    try {
      // Check if user exists in database
      const { data: userData, error } = await supabase
        .from("users")
        .select("username, role")
        .eq("username", loginUsername)
        .single()

      if (error || !userData) {
        setLoginError("Ungültiger Benutzername!")
        setLoading(false)
        return
      }

      // Simple password check (in production, use proper authentication)
      if (loginPassword !== "1234") {
        setLoginError("Ungültiges Passwort!")
        setLoading(false)
        return
      }

      const user: UserType = {
        username: userData.username,
        role: userData.role as "employee" | "admin",
      }

      setCurrentUser(user)
      localStorage.setItem("currentUser", JSON.stringify(user))

      alert(`Willkommen, ${user.username}!`)
    } catch (error) {
      console.error("Login error:", error)
      setLoginError("Anmeldung fehlgeschlagen!")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem("currentUser")
    setLoginUsername("")
    setLoginPassword("")
    setLoginError("")
    setEntries([])

    // Reset timer if running
    if (startTime) {
      setStartTime(null)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    alert("Sie wurden erfolgreich abgemeldet.")
  }

  const formatTime = (date: Date): string => {
    return date.toTimeString().slice(0, 8)
  }

  const msToRoundedQuarterHours = (ms: number): number => {
    const hours = ms / 3600000
    if (hours <= 0) return 0
    return Math.max(0.25, Math.ceil(hours / 0.25) * 0.25)
  }

  const handleEmployeeToggle = (employee: string) => {
    const newSelected = new Set(selectedEmployees)
    if (newSelected.has(employee)) {
      newSelected.delete(employee)
    } else {
      newSelected.add(employee)
    }
    setSelectedEmployees(newSelected)
  }

  const handleEditEmployeeToggle = (employee: string) => {
    const newSelected = new Set(editSelectedEmployees)
    if (newSelected.has(employee)) {
      newSelected.delete(employee)
    } else {
      newSelected.add(employee)
    }
    setEditSelectedEmployees(newSelected)
  }

  const handleStart = () => {
    if (!date) {
      alert("Bitte ein Datum auswählen!")
      return
    }
    if (!svNumber.trim()) {
      alert("Bitte eine SV Nummer eingeben!")
      return
    }
    if (selectedEmployees.size === 0) {
      alert("Bitte mindestens einen Mitarbeiter auswählen!")
      return
    }
    if (startTime !== null) {
      alert("Der Timer läuft bereits!")
      return
    }

    setStartTime(new Date())
    alert("Zeiterfassung wurde gestartet.")
  }

  const handleStop = async () => {
    if (startTime === null) {
      alert("Timer wurde noch nicht gestartet!")
      return
    }

    setLoading(true)

    try {
      const stopTime = new Date()
      const diffMs = stopTime.getTime() - startTime.getTime()
      const workHours = msToRoundedQuarterHours(diffMs)
      const travelHours = selectedTravelTime

      const newEntry = {
        date,
        sv_number: svNumber.trim(),
        employees: Array.from(selectedEmployees),
        work_type: workType,
        start_time: formatTime(startTime),
        stop_time: formatTime(stopTime),
        work_hours: workHours,
        travel_hours: travelHours,
      }

      const { error } = await supabase.from("time_entries").insert([newEntry])

      if (error) {
        console.error("Error saving entry:", error)
        alert("Eintrag konnte nicht gespeichert werden.")
        return
      }

      // Reload entries
      await loadEntries()

      // Reset form
      setStartTime(null)
      setSelectedEmployees(new Set())
      setSelectedTravelTime(0)

      alert(`Arbeitszeit: ${workHours.toFixed(2)}h, Fahrzeit: ${travelHours.toFixed(2)}h`)
    } catch (error) {
      console.error("Error:", error)
      alert("Unerwarteter Fehler beim Speichern.")
    } finally {
      setLoading(false)
    }
  }

  const handleEditEntry = (entry: TimeEntry) => {
    if (currentUser?.role !== "admin") return

    setEditingEntry(entry)
    setEditDate(entry.date)
    setEditSvNumber(entry.sv_number)
    setEditWorkType(entry.work_type)
    setEditSelectedEmployees(new Set(entry.employees))
    setEditTravelTime(entry.travel_hours)
    setEditWorkHours(entry.work_hours)
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingEntry || currentUser?.role !== "admin") return

    setLoading(true)

    try {
      const { error } = await supabase
        .from("time_entries")
        .update({
          date: editDate,
          sv_number: editSvNumber,
          work_type: editWorkType,
          employees: Array.from(editSelectedEmployees),
          travel_hours: editTravelTime,
          work_hours: editWorkHours,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingEntry.id)

      if (error) {
        console.error("Error updating entry:", error)
        alert("Eintrag konnte nicht aktualisiert werden.")
        return
      }

      await loadEntries()
      setEditDialogOpen(false)
      setEditingEntry(null)

      alert("Der Eintrag wurde erfolgreich bearbeitet.")
    } catch (error) {
      console.error("Error:", error)
      alert("Unerwarteter Fehler beim Bearbeiten.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (currentUser?.role !== "admin") return

    if (!confirm("Sind Sie sicher, dass Sie diesen Eintrag löschen möchten?")) {
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.from("time_entries").delete().eq("id", entryId)

      if (error) {
        console.error("Error deleting entry:", error)
        alert("Eintrag konnte nicht gelöscht werden.")
        return
      }

      await loadEntries()

      alert("Der Eintrag wurde erfolgreich gelöscht.")
    } catch (error) {
      console.error("Error:", error)
      alert("Unerwarteter Fehler beim Löschen.")
    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = (entriesToCalculate: TimeEntry[]) => {
    return entriesToCalculate.reduce(
      (acc, entry) => ({
        workHours: acc.workHours + entry.work_hours,
        travelHours: acc.travelHours + entry.travel_hours,
        totalHours: acc.totalHours + entry.work_hours + entry.travel_hours,
      }),
      { workHours: 0, travelHours: 0, totalHours: 0 },
    )
  }

  // Filter entries based on user role
  const getFilteredEntries = () => {
    if (currentUser?.role === "admin") {
      return entries
    } else if (currentUser?.role === "employee") {
      return entries.filter((entry) => entry.employees.includes(currentUser.username))
    }
    return []
  }

  const filteredEntries = getFilteredEntries().filter((entry) =>
    entry.sv_number.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totals = calculateTotals(getFilteredEntries())
  const filteredTotals = calculateTotals(filteredEntries)

  // Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-600">
          <CardHeader>
            <CardTitle className="text-center text-green-400 text-2xl">Zeiterfassung - Anmeldung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Benutzername:</label>
              <Input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Mitarbeitername oder 'admin'"
                className="bg-gray-700 border-gray-600 text-gray-100"
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Passwort:</label>
              <Input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="1234"
                className="bg-gray-700 border-gray-600 text-gray-100"
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                disabled={loading}
              />
            </div>
            {loginError && <div className="text-red-400 text-sm text-center">{loginError}</div>}
            <Button
              onClick={handleLogin}
              className="w-full bg-green-400 text-gray-900 hover:bg-green-500"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Anmelden...
                </>
              ) : (
                "Anmelden"
              )}
            </Button>
            <div className="text-xs text-gray-400 text-center mt-4">
              <p>Verfügbare Benutzer: {employees.join(", ")}, admin</p>
              <p>Passwort für alle: 1234</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-green-400">Zeiterfassung</h1>
        <div className="flex items-center gap-4">
          <Button
            onClick={loadEntries}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-100 hover:bg-gray-700"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw size={16} />}
          </Button>
          <div className="flex items-center gap-2 text-green-400">
            <User size={20} />
            <span className="font-medium">
              {currentUser.username} {currentUser.role === "admin" && "(Admin)"}
            </span>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-100 hover:bg-gray-700"
          >
            <LogOut size={16} className="mr-2" />
            Abmelden
          </Button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-700 flex justify-center gap-4 p-2">
        <Button
          variant={activeTab === "tracking" ? "default" : "secondary"}
          onClick={() => setActiveTab("tracking")}
          className={activeTab === "tracking" ? "bg-green-400 text-gray-900 hover:bg-green-500" : ""}
        >
          Zeiterfassung
        </Button>
        <Button
          variant={activeTab === "overview" ? "default" : "secondary"}
          onClick={() => setActiveTab("overview")}
          className={activeTab === "overview" ? "bg-green-400 text-gray-900 hover:bg-green-500" : ""}
        >
          SV Übersicht
        </Button>
        {currentUser.role === "admin" && (
          <Button
            variant={activeTab === "employees" ? "default" : "secondary"}
            onClick={() => setActiveTab("employees")}
            className={activeTab === "employees" ? "bg-green-400 text-gray-900 hover:bg-green-500" : ""}
          >
            Mitarbeiter Übersicht
          </Button>
        )}
      </nav>

      <main className="max-w-6xl mx-auto p-4">
        {activeTab === "tracking" && (
          <div className="space-y-6">
            {/* Form */}
            <Card className="bg-gray-800 border-gray-600">
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Datum:</label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-gray-100"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">SV Nummer:</label>
                    <Input
                      type="text"
                      placeholder="z.B. 12345"
                      value={svNumber}
                      onChange={(e) => setSvNumber(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-gray-100"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Typ:</label>
                    <Select value={workType} onValueChange={setWorkType} disabled={loading}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {workTypes.map((type) => (
                          <SelectItem key={type} value={type} className="text-gray-100">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Mitarbeiter (Mehrfachauswahl):</label>
                  <div className="flex flex-wrap gap-2">
                    {employees.map((employee) => (
                      <Button
                        key={employee}
                        variant="outline"
                        size="sm"
                        onClick={() => handleEmployeeToggle(employee)}
                        disabled={loading}
                        className={`${
                          selectedEmployees.has(employee)
                            ? "bg-green-400 text-gray-900 border-green-400 hover:bg-green-500"
                            : "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
                        }`}
                      >
                        {employee}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Fahrzeit (einfach auswählbar):</label>
                  <div className="flex flex-wrap gap-2">
                    {travelTimes.map((time) => (
                      <Button
                        key={time}
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTravelTime(time)}
                        disabled={loading}
                        className={`${
                          selectedTravelTime === time
                            ? "bg-green-400 text-gray-900 border-green-400 hover:bg-green-500"
                            : "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
                        }`}
                      >
                        {time === 0 ? "0" : time.toFixed(2)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleStart}
                    disabled={startTime !== null || loading}
                    className={`${
                      startTime !== null
                        ? "bg-green-600 text-gray-900"
                        : "bg-green-400 text-gray-900 hover:bg-green-500"
                    }`}
                  >
                    Start
                  </Button>
                  <Button onClick={handleStop} disabled={startTime === null || loading} variant="destructive">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Speichern...
                      </>
                    ) : (
                      "Stopp"
                    )}
                  </Button>
                </div>

                <div className="text-lg font-bold text-green-400">
                  Arbeitszeit: {currentWorkTime.toFixed(2)} Stunden
                </div>
              </CardContent>
            </Card>

            {/* Entries Table */}
            <Card className="bg-gray-800 border-gray-600">
              <CardContent className="p-6">
                {loading && (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-green-400" />
                    <span className="ml-2 text-green-400">Lade Daten...</span>
                  </div>
                )}

                {!loading && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-700">
                          <th className="border border-gray-600 p-2 text-green-400">Datum</th>
                          <th className="border border-gray-600 p-2 text-green-400">SV Nummer</th>
                          <th className="border border-gray-600 p-2 text-green-400">Mitarbeiter</th>
                          <th className="border border-gray-600 p-2 text-green-400">Typ</th>
                          <th className="border border-gray-600 p-2 text-green-400">Start</th>
                          <th className="border border-gray-600 p-2 text-green-400">Stopp</th>
                          <th className="border border-gray-600 p-2 text-green-400">Arbeitszeit (h)</th>
                          <th className="border border-gray-600 p-2 text-green-400">Fahrzeit (h)</th>
                          <th className="border border-gray-600 p-2 text-green-400">Gesamtzeit (h)</th>
                          {currentUser.role === "admin" && (
                            <th className="border border-gray-600 p-2 text-green-400">Aktionen</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredEntries().map((entry) => (
                          <tr key={entry.id}>
                            <td className="border border-gray-600 p-2 text-center">{entry.date}</td>
                            <td className="border border-gray-600 p-2 text-center">{entry.sv_number}</td>
                            <td className="border border-gray-600 p-2 text-center">{entry.employees.join(", ")}</td>
                            <td className="border border-gray-600 p-2 text-center">{entry.work_type}</td>
                            <td className="border border-gray-600 p-2 text-center">{entry.start_time}</td>
                            <td className="border border-gray-600 p-2 text-center">{entry.stop_time}</td>
                            <td className="border border-gray-600 p-2 text-center">{entry.work_hours.toFixed(2)}</td>
                            <td className="border border-gray-600 p-2 text-center">{entry.travel_hours.toFixed(2)}</td>
                            <td className="border border-gray-600 p-2 text-center">
                              {(entry.work_hours + entry.travel_hours).toFixed(2)}
                            </td>
                            {currentUser.role === "admin" && (
                              <td className="border border-gray-600 p-2 text-center">
                                <div className="flex justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditEntry(entry)}
                                    className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300"
                                    disabled={loading}
                                  >
                                    <Edit size={16} />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                                    disabled={loading}
                                  >
                                    <Trash size={16} />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-700 font-bold text-green-400">
                          <td
                            colSpan={currentUser.role === "admin" ? 6 : 6}
                            className="border border-gray-600 p-2 text-right"
                          >
                            Gesamt:
                          </td>
                          <td className="border border-gray-600 p-2 text-center">{totals.workHours.toFixed(2)}</td>
                          <td className="border border-gray-600 p-2 text-center">{totals.travelHours.toFixed(2)}</td>
                          <td className="border border-gray-600 p-2 text-center">{totals.totalHours.toFixed(2)}</td>
                          {currentUser.role === "admin" && <td className="border border-gray-600"></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-600">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Input
                    type="text"
                    placeholder="SV Nummer suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-gray-100 max-w-md"
                    disabled={loading}
                  />
                </div>

                {loading && (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-green-400" />
                    <span className="ml-2 text-green-400">Lade Daten...</span>
                  </div>
                )}

                {!loading && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-700">
                          <th className="border border-gray-600 p-2 text-green-400">SV Nummer</th>
                          <th className="border border-gray-600 p-2 text-green-400">Gesamtarbeitszeit (h)</th>
                          <th className="border border-gray-600 p-2 text-green-400">Gesamtfahrzeit (h)</th>
                          <th className="border border-gray-600 p-2 text-green-400">Gesamtzeit (h)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(new Set(filteredEntries.map((entry) => entry.sv_number))).map((svNumber) => {
                          const svEntries = getFilteredEntries().filter((e) => e.sv_number === svNumber)
                          const svTotals = calculateTotals(svEntries)

                          return (
                            <React.Fragment key={svNumber}>
                              <tr
                                className={`cursor-pointer hover:bg-gray-700 ${selectedSvNumber === svNumber ? "bg-gray-700" : ""}`}
                                onClick={() => setSelectedSvNumber(selectedSvNumber === svNumber ? null : svNumber)}
                              >
                                <td className="border border-gray-600 p-2 text-center font-medium">{svNumber}</td>
                                <td className="border border-gray-600 p-2 text-center">
                                  {svTotals.workHours.toFixed(2)}
                                </td>
                                <td className="border border-gray-600 p-2 text-center">
                                  {svTotals.travelHours.toFixed(2)}
                                </td>
                                <td className="border border-gray-600 p-2 text-center">
                                  {svTotals.totalHours.toFixed(2)}
                                </td>
                              </tr>

                              {selectedSvNumber === svNumber && (
                                <tr>
                                  <td colSpan={4} className="border border-gray-600 p-0">
                                    <div className="bg-gray-900 p-4">
                                      <h3 className="text-green-400 font-medium mb-2">Details für SV {svNumber}</h3>
                                      <table className="w-full border-collapse">
                                        <thead>
                                          <tr className="bg-gray-800">
                                            <th className="border border-gray-700 p-2 text-green-400">Datum</th>
                                            <th className="border border-gray-700 p-2 text-green-400">Mitarbeiter</th>
                                            <th className="border border-gray-700 p-2 text-green-400">Typ</th>
                                            <th className="border border-gray-700 p-2 text-green-400">Start</th>
                                            <th className="border border-gray-700 p-2 text-green-400">Stopp</th>
                                            <th className="border border-gray-700 p-2 text-green-400">
                                              Arbeitszeit (h)
                                            </th>
                                            <th className="border border-gray-700 p-2 text-green-400">Fahrzeit (h)</th>
                                            <th className="border border-gray-700 p-2 text-green-400">
                                              Gesamtzeit (h)
                                            </th>
                                            {currentUser.role === "admin" && (
                                              <th className="border border-gray-700 p-2 text-green-400">Aktionen</th>
                                            )}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {svEntries.map((entry) => (
                                            <tr key={entry.id}>
                                              <td className="border border-gray-700 p-2 text-center">{entry.date}</td>
                                              <td className="border border-gray-700 p-2 text-center">
                                                {entry.employees.join(", ")}
                                              </td>
                                              <td className="border border-gray-700 p-2 text-center">
                                                {entry.work_type}
                                              </td>
                                              <td className="border border-gray-700 p-2 text-center">
                                                {entry.start_time}
                                              </td>
                                              <td className="border border-gray-700 p-2 text-center">
                                                {entry.stop_time}
                                              </td>
                                              <td className="border border-gray-700 p-2 text-center">
                                                {entry.work_hours.toFixed(2)}
                                              </td>
                                              <td className="border border-gray-700 p-2 text-center">
                                                {entry.travel_hours.toFixed(2)}
                                              </td>
                                              <td className="border border-gray-700 p-2 text-center">
                                                {(entry.work_hours + entry.travel_hours).toFixed(2)}
                                              </td>
                                              {currentUser.role === "admin" && (
                                                <td className="border border-gray-700 p-2 text-center">
                                                  <div className="flex justify-center gap-2">
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={() => handleEditEntry(entry)}
                                                      className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300"
                                                      disabled={loading}
                                                    >
                                                      <Edit size={16} />
                                                    </Button>
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={() => handleDeleteEntry(entry.id)}
                                                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                                                      disabled={loading}
                                                    >
                                                      <Trash size={16} />
                                                    </Button>
                                                  </div>
                                                </td>
                                              )}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-700 font-bold text-green-400">
                          <td className="border border-gray-600 p-2 text-right">Gesamt:</td>
                          <td className="border border-gray-600 p-2 text-center">
                            {filteredTotals.workHours.toFixed(2)}
                          </td>
                          <td className="border border-gray-600 p-2 text-center">
                            {filteredTotals.travelHours.toFixed(2)}
                          </td>
                          <td className="border border-gray-600 p-2 text-center">
                            {filteredTotals.totalHours.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "employees" && currentUser.role === "admin" && (
          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-600">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-green-400 mb-4">Mitarbeiter Übersicht (Admin)</h2>

                {loading && (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-green-400" />
                    <span className="ml-2 text-green-400">Lade Daten...</span>
                  </div>
                )}

                {!loading && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse mb-6">
                        <thead>
                          <tr className="bg-gray-700">
                            <th className="border border-gray-600 p-2 text-green-400">Mitarbeiter</th>
                            <th className="border border-gray-600 p-2 text-green-400">Gesamtarbeitszeit (h)</th>
                            <th className="border border-gray-600 p-2 text-green-400">Gesamtfahrzeit (h)</th>
                            <th className="border border-gray-600 p-2 text-green-400">Gesamtzeit (h)</th>
                            <th className="border border-gray-600 p-2 text-green-400">Arbeitstage</th>
                            <th className="border border-gray-600 p-2 text-green-400">Bearbeitete SV-Nummern</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employees.map((employee) => {
                            const employeeEntries = entries.filter((entry) => entry.employees.includes(employee))

                            if (employeeEntries.length === 0) return null

                            const employeeTotals = calculateTotals(employeeEntries)
                            const workDays = [...new Set(employeeEntries.map((entry) => entry.date))].sort()
                            const svNumbers = [...new Set(employeeEntries.map((entry) => entry.sv_number))].sort()

                            return (
                              <tr key={employee}>
                                <td className="border border-gray-600 p-2 text-center font-medium">{employee}</td>
                                <td className="border border-gray-600 p-2 text-center">
                                  {employeeTotals.workHours.toFixed(2)}
                                </td>
                                <td className="border border-gray-600 p-2 text-center">
                                  {employeeTotals.travelHours.toFixed(2)}
                                </td>
                                <td className="border border-gray-600 p-2 text-center">
                                  {employeeTotals.totalHours.toFixed(2)}
                                </td>
                                <td className="border border-gray-600 p-2 text-center">
                                  <div className="text-sm">
                                    {workDays.length} Tage
                                    <div className="text-xs text-gray-400 mt-1">
                                      {workDays.slice(0, 3).join(", ")}
                                      {workDays.length > 3 && "..."}
                                    </div>
                                  </div>
                                </td>
                                <td className="border border-gray-600 p-2 text-center">
                                  <div className="text-sm">
                                    {svNumbers.slice(0, 3).join(", ")}
                                    {svNumbers.length > 3 && ` (+${svNumbers.length - 3} weitere)`}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <h3 className="text-lg font-bold text-green-400 mb-4 mt-8">Tagesübersicht</h3>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-700">
                            <th className="border border-gray-600 p-2 text-green-400">Datum</th>
                            <th className="border border-gray-600 p-2 text-green-400">Mitarbeiter</th>
                            <th className="border border-gray-600 p-2 text-green-400">Arbeitszeit (h)</th>
                            <th className="border border-gray-600 p-2 text-green-400">Fahrzeit (h)</th>
                            <th className="border border-gray-600 p-2 text-green-400">Gesamtzeit (h)</th>
                            <th className="border border-gray-600 p-2 text-green-400">SV-Nummern</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...new Set(entries.map((entry) => entry.date))]
                            .sort()
                            .reverse()
                            .map((date) => {
                              const dayEntries = entries.filter((entry) => entry.date === date)
                              const dayEmployees = [...new Set(dayEntries.flatMap((entry) => entry.employees))]

                              return dayEmployees.map((employee, index) => {
                                const employeeDayEntries = dayEntries.filter((entry) =>
                                  entry.employees.includes(employee),
                                )
                                const dayTotals = calculateTotals(employeeDayEntries)
                                const daySvNumbers = [...new Set(employeeDayEntries.map((entry) => entry.sv_number))]

                                return (
                                  <tr key={`${date}-${employee}`}>
                                    {index === 0 && (
                                      <td
                                        className="border border-gray-600 p-2 text-center font-medium bg-gray-750"
                                        rowSpan={dayEmployees.length}
                                      >
                                        {date}
                                      </td>
                                    )}
                                    <td className="border border-gray-600 p-2 text-center">{employee}</td>
                                    <td className="border border-gray-600 p-2 text-center">
                                      {dayTotals.workHours.toFixed(2)}
                                    </td>
                                    <td className="border border-gray-600 p-2 text-center">
                                      {dayTotals.travelHours.toFixed(2)}
                                    </td>
                                    <td className="border border-gray-600 p-2 text-center">
                                      {dayTotals.totalHours.toFixed(2)}
                                    </td>
                                    <td className="border border-gray-600 p-2 text-center text-sm">
                                      {daySvNumbers.join(", ")}
                                    </td>
                                  </tr>
                                )
                              })
                            })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-gray-800 text-gray-100 border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-green-400">Eintrag bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Datum:</label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-gray-100"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">SV Nummer:</label>
                <Input
                  type="text"
                  value={editSvNumber}
                  onChange={(e) => setEditSvNumber(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-gray-100"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Typ:</label>
              <Select value={editWorkType} onValueChange={setEditWorkType} disabled={loading}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {workTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-gray-100">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mitarbeiter:</label>
              <div className="flex flex-wrap gap-2">
                {employees.map((employee) => (
                  <Button
                    key={employee}
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditEmployeeToggle(employee)}
                    disabled={loading}
                    className={`${
                      editSelectedEmployees.has(employee)
                        ? "bg-green-400 text-gray-900 border-green-400 hover:bg-green-500"
                        : "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
                    }`}
                  >
                    {employee}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Arbeitszeit (h):</label>
                <Input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={editWorkHours}
                  onChange={(e) => setEditWorkHours(Number.parseFloat(e.target.value) || 0)}
                  className="bg-gray-700 border-gray-600 text-gray-100"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fahrzeit (h):</label>
                <div className="flex flex-wrap gap-2">
                  {travelTimes.map((time) => (
                    <Button
                      key={time}
                      variant="outline"
                      size="sm"
                      onClick={() => setEditTravelTime(time)}
                      disabled={loading}
                      className={`${
                        editTravelTime === time
                          ? "bg-green-400 text-gray-900 border-green-400 hover:bg-green-500"
                          : "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
                      }`}
                    >
                      {time === 0 ? "0" : time.toFixed(2)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-gray-600 text-gray-100 hover:bg-gray-700"
              disabled={loading}
            >
              <X size={16} className="mr-2" />
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-green-400 text-gray-900 hover:bg-green-500"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Check size={16} className="mr-2" />
                  Speichern
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
