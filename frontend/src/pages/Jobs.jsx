import { useEffect, useState } from 'react'
import { Plus, Play } from 'lucide-react'
import { toast } from 'sonner'
import cronstrue from 'cronstrue'
import client from '../api/client'
import JobForm from '../components/JobForm'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'

function cronLabel(expr) {
  try { return cronstrue.toString(expr, { locale: 'es' }) }
  catch { return expr }
}

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  function loadJobs() {
    setLoading(true)
    client.get('/jobs/')
      .then(res => { setJobs(res.data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }

  useEffect(() => { loadJobs() }, [])

  function handleSave(form) {
    const req = editing ? client.put(`/jobs/${editing.id}`, form) : client.post('/jobs/', form)
    req.then(() => { setShowForm(false); setEditing(null); loadJobs(); toast.success(editing ? 'Job actualizado' : 'Job creado') })
       .catch(err => toast.error(err.response?.data?.detail || err.message))
  }
  function handleDelete(job) {
    if (!confirm(`¿Eliminar "${job.name}"?`)) return
    client.delete(`/jobs/${job.id}`)
      .then(() => { loadJobs(); toast.success(`Job "${job.name}" eliminado`) })
      .catch(err => toast.error(err.response?.data?.detail || err.message))
  }
  function handleRun(job) {
    client.post(`/jobs/${job.id}/run`)
      .then(() => toast.success(`"${job.name}" lanzado en segundo plano`))
      .catch(err => toast.error(err.response?.data?.detail || err.message))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jobs programados</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona los envíos automáticos de reportes</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true) }}>
          <Plus className="w-4 h-4" /> Crear Job
        </Button>
      </div>

      {showForm && (
        <JobForm
          job={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 text-sm">{error}</div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No hay jobs creados todavía.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Query ID</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium text-slate-900">{job.name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">#{job.query_id}</TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{cronLabel(job.cron_expr)}</span>
                      <span className="block font-mono text-xs text-slate-400">{job.cron_expr}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="uppercase">{job.format}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={job.active ? 'success' : 'outline'}>
                        {job.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleRun(job)}
                          title="Ejecutar ahora">
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="sm"
                          onClick={() => { setEditing(job); setShowForm(true) }}>
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(job)}>
                          Eliminar
                        </Button>
                      </div>
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
