import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import client from '../api/client'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'

const EMPTY = { name: '', emails: '' }

export default function Groups() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)

  function loadGroups() {
    setLoading(true)
    client.get('/groups/')
      .then(res => { setGroups(res.data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }

  useEffect(() => { loadGroups() }, [])

  function openCreate() { setEditing(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(g)  { setEditing(g); setForm({ name: g.name, emails: g.emails }); setShowForm(true) }

  function handleSubmit(e) {
    e.preventDefault()
    const req = editing ? client.put(`/groups/${editing.id}`, form) : client.post('/groups/', form)
    req.then(() => { setShowForm(false); setEditing(null); loadGroups(); toast.success(editing ? 'Grupo actualizado' : 'Grupo creado') })
       .catch(err => toast.error(err.response?.data?.detail || err.message))
  }
  function handleDelete(g) {
    if (!confirm(`¿Eliminar grupo "${g.name}"?`)) return
    client.delete(`/groups/${g.id}`)
      .then(() => { loadGroups(); toast.success(`Grupo "${g.name}" eliminado`) })
      .catch(err => toast.error(err.response?.data?.detail || err.message))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Grupos de destinatarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Listas de emails que recibirán los reportes</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Crear Grupo
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? 'Editar Grupo' : 'Nuevo Grupo'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gname">Nombre del grupo</Label>
                <Input id="gname" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required placeholder="Equipo Ventas" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gemails">Emails (separados por coma)</Label>
                <Input id="gemails" value={form.emails}
                  onChange={e => setForm(f => ({ ...f, emails: e.target.value }))}
                  required placeholder="ana@empresa.com, luis@empresa.com" />
              </div>
              <div className="sm:col-span-2 flex gap-2 pt-1 border-t border-slate-100">
                <Button type="submit">Guardar</Button>
                <Button type="button" variant="outline"
                  onClick={() => { setShowForm(false); setEditing(null) }}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 text-sm">{error}</div>
          ) : groups.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No hay grupos creados todavía.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Destinatarios</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium text-slate-900">{g.name}</TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">{g.emails}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(g)}>Editar</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(g)}>Eliminar</Button>
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
